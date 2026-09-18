import { ContractError, MAX_ATTACHMENT_BYTES, MAX_EXPANDED_BYTES, MAX_JSON_BYTES, isSafeText, markdownErrors } from './ballot-contract.js';

const MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain', 'text/markdown']);
const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
const signature = (bytes, values, offset = 0) => values.every((value, index) => bytes[offset + index] === value);
const ascii = bytes => new TextDecoder('latin1').decode(bytes);

export async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) throw new ContractError('This browser requires a secure context to check embedded files. Open the app on HTTPS or localhost.');
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

function typeCheck(bytes, mimeType, fileName) {
  if (!MIME.has(mimeType)) throw new ContractError(`${fileName}: unsupported embedded file type.`);
  const fail = () => { throw new ContractError(`${fileName}: file bytes do not match ${mimeType}, or the file contains active content.`); };
  if (!bytes.length) fail();
  if (mimeType === 'image/png' && (!signature(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) || bytes.length < 33)) fail();
  if (mimeType === 'image/jpeg' && (!signature(bytes, [255, 216, 255]) || !signature(bytes, [255, 217], bytes.length - 2))) fail();
  if (mimeType === 'image/gif' && !['GIF87a', 'GIF89a'].includes(ascii(bytes.slice(0, 6)))) fail();
  if (mimeType === 'image/webp' && (ascii(bytes.slice(0, 4)) !== 'RIFF' || ascii(bytes.slice(8, 12)) !== 'WEBP')) fail();
  if (mimeType === 'application/pdf') {
    const body = ascii(bytes);
    if (!body.startsWith('%PDF-') || !/%%EOF\s*$/.test(body)) fail();
    // PDF names may spell ASCII bytes as #xx. Decode names before the active-action check.
    const names = body.replace(/#([0-9a-f]{2})/gi, (_, pair) => String.fromCharCode(parseInt(pair, 16)));
    if (/\/(?:JavaScript|JS|OpenAction|AA|Launch|RichMedia|EmbeddedFile|SubmitForm|ImportData|GoToR|XFA)\b/i.test(names)) fail();
  }
  if (mimeType.startsWith('text/')) {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail(); }
    if (!isSafeText(text)) fail();
  }
}

function base64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
  return btoa(binary);
}
function fromBase64(value) {
  if (typeof value !== 'string' || value.length > MAX_JSON_BYTES || value.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new ContractError('Invalid or oversized attachment base64.');
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (base64(bytes) !== value) throw new ContractError('Attachment base64 is not canonical.');
  return bytes;
}

async function readBounded(stream, cap, label, signal) {
  const reader = stream.getReader();
  let total = 0; const chunks = [];
  try {
    while (true) {
      if (signal?.aborted) throw new ContractError('Embedded file preparation was cancelled.');
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > cap) throw new ContractError(`${label}: expanded file exceeds its declared size or the attachment limits.`);
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const result = new Uint8Array(total); let offset = 0;
  chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.byteLength; });
  return result;
}

export async function encodeAttachment({ id, fileName, mimeType, bytes }) {
  const value = typeof bytes === 'string' ? encoder.encode(bytes) : new Uint8Array(bytes);
  if (value.length > MAX_ATTACHMENT_BYTES) throw new ContractError(`${fileName}: attachment exceeds the 25 MiB expanded file limit.`);
  typeCheck(value, mimeType, fileName);
  if (typeof CompressionStream !== 'function') throw new ContractError('This browser does not support gzip compression.');
  const compressed = await readBounded(new Blob([value]).stream().pipeThrough(new CompressionStream('gzip')), MAX_JSON_BYTES, fileName);
  return { id, fileName, mimeType, encoding: 'gzip-base64', data: base64(compressed), uncompressedBytes: value.length, sha256: await sha256(value) };
}

export async function prepareResources(attachments = [], { signal } = {}) {
  if (!Array.isArray(attachments) || attachments.length > 100) throw new ContractError('Invalid attachment collection.');
  const entries = new Map(); let total = 0; let disposed = false;
  const dispose = () => { for (const entry of entries.values()) URL.revokeObjectURL(entry.url); entries.clear(); disposed = true; };
  try {
    for (const attachment of attachments) {
      const { id, fileName, mimeType, encoding, data, uncompressedBytes, sha256: expectedHash } = attachment;
      if (entries.has(id)) throw new ContractError(`Duplicate attachment ID: ${id}.`);
      if (!MIME.has(mimeType) || encoding !== 'gzip-base64' || !Number.isSafeInteger(uncompressedBytes) || uncompressedBytes < 1 || uncompressedBytes > MAX_ATTACHMENT_BYTES || !/^[a-f0-9]{64}$/.test(expectedHash)) throw new ContractError(`${fileName}: invalid attachment metadata.`);
      if (total + uncompressedBytes > MAX_EXPANDED_BYTES) throw new ContractError('Embedded files exceed the 100 MiB expanded total limit.');
      if (typeof DecompressionStream !== 'function') throw new ContractError('This browser does not support embedded gzip files.');
      const compressed = fromBase64(data);
      if (!signature(compressed, [31, 139, 8])) throw new ContractError(`${fileName}: attachment must contain gzip bytes.`);
      let bytes;
      try { bytes = await readBounded(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')), Math.min(uncompressedBytes, MAX_ATTACHMENT_BYTES, MAX_EXPANDED_BYTES - total), fileName, signal); }
      catch (error) { if (error instanceof ContractError) throw error; throw new ContractError(`${fileName}: gzip data is corrupt or incomplete.`); }
      if (bytes.length !== uncompressedBytes) throw new ContractError(`${fileName}: expanded byte count does not match.`);
      if (await sha256(bytes) !== expectedHash) throw new ContractError(`${fileName}: SHA-256 integrity check failed.`);
      typeCheck(bytes, mimeType, fileName);
      if (mimeType === 'text/markdown') {
        const errors = markdownErrors(new TextDecoder().decode(bytes), attachments, fileName);
        if (errors.length) throw new ContractError(errors.join('\n'));
      }
      total += bytes.length;
      const blob = new Blob([bytes], { type: mimeType });
      entries.set(id, { attachment, bytes, blob, url: URL.createObjectURL(blob) });
    }
    return { url: id => !disposed && entries.get(id)?.url || '', get: id => !disposed ? entries.get(id) : undefined, has: id => !disposed && entries.has(id), dispose, get size() { return entries.size; }, get expandedBytes() { return total; } };
  } catch (error) { dispose(); throw error; }
}
