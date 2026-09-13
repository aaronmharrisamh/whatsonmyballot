import { referenceUrl } from '../../../sharedrefs/registry.js';
import validateSchema from './vendor/validate-content.js';
import { marked } from './vendor/marked.esm.js';
import { safeHttps } from './shared.js';
import { clone, normalize, canonical, editableValues, applyFields, collections, freeze } from './content-fields.js';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export function safeContentLink(value, content) {
  if (safeHttps(value)) return value;
  if (typeof value !== 'string' || /[\\%?#:\s]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return [...content.documents.map(doc => doc.markdownPath), ...content.officialPdfs.map(pdf => pdf.path)].includes(value) ? value : null;
}
export function envelope(seed, content, revision = 0) {
  return { format: 'whatsonmyballot-content', schemaVersion: '1.0.0', datasetId: seed.datasetId, baseDatasetVersion: seed.baseDatasetVersion, contentRevision: revision, exportedAt: new Date().toISOString(), content: clone(content) };
}
export async function loadOriginal(seed, fetchFile = key => fetch(referenceUrl(key))) {
  const original = normalize(clone(seed.content));
  for (const doc of original.documents) {
    if (!/^content\/candidates\/[a-z0-9-]+\.md$/.test(doc.markdownPath)) throw new Error('Unsupported bundled Markdown path.');
    const response = await fetchFile(doc.markdownPath);
    if (!response.ok) throw new Error('The bundled document could not load.');
    doc.markdown = normalize(await response.text());
  }
  validateEnvelope(envelope(seed, original), seed, original);
  return freeze(original);
}
export function validateEnvelope(value, seed, original) {
  if (!validateSchema(value)) throw new Error(`Content format is invalid: ${validateSchema.errors.slice(0, 3).map(error => `${error.instancePath || '/'} ${error.message}`).join('; ')}`);
  if (value.datasetId !== seed.datasetId || value.baseDatasetVersion !== seed.baseDatasetVersion) throw new Error('This file belongs to another ballot or original version.');
  const content = value.content, seen = new Set(), records = new Map();
  for (const entries of Object.values(content)) for (const record of entries) {
    if (seen.has(record.id)) throw new Error(`Duplicate ID: ${record.id}`);
    seen.add(record.id); records.set(record.id, record);
    for (const slot of record.writeIns || []) { if (seen.has(slot.id)) throw new Error(`Duplicate ID: ${slot.id}`); seen.add(slot.id); }
  }
  function references(item, key = '') {
    if (key !== 'id' && (key.endsWith('Id') || key.endsWith('Ids'))) {
      for (const id of Array.isArray(item) ? item : [item]) if (!records.has(id)) throw new Error(`Missing reference: ${id}`);
    } else if (Array.isArray(item)) item.forEach(entry => references(entry));
    else if (item && typeof item === 'object') Object.entries(item).forEach(([name, entry]) => references(entry, name));
  }
  references(content);
  for (const [key, entries] of Object.entries(content)) {
    if (canonical(entries.map(record => record.id)) !== canonical(original[key].map(record => record.id))) throw new Error(`The ${key} IDs and order must match this ballot.`);
  }
  // Reconstruct only supported text edits against the frozen original. Everything
  // else (including relationships, limits, files, hashes and verification flags)
  // must match. There is no unreviewed structural migration in version 1.
  let permitted = clone(original);
  // Do not resolve UI labels from an unvalidated owner graph: an imported cycle
  // must produce a compatibility error instead of recursing through labels.
  for (const [group, collection] of Object.entries(collections)) for (const record of content[collection]) {
    permitted = applyFields(permitted, original, { id: record.id, group, values: editableValues(record, group) }, { mutate: true });
  }
  if (canonical(permitted) !== canonical(content)) throw new Error('This file changes protected ballot fields or source status. Use the supported text editors with this baseline.');
  for (const candidate of content.candidates) if (candidate.website.url !== null && !safeHttps(candidate.website.url)) throw new Error(`Candidate website must use a safe HTTPS URL: ${candidate.officialName}`);
  for (const source of content.sources) if (!safeContentLink(source.url, original)) throw new Error(`Source link is not HTTPS or a bundled document: ${source.title}`);
  for (const doc of content.documents) marked.walkTokens(marked.lexer(doc.markdown, { gfm: true }), token => {
    if (token.type === 'link' && !safeContentLink(token.href, original)) throw new Error('A Markdown link must use HTTPS or point to a bundled document.');
    if (token.type === 'image') throw new Error('Use a source link instead of an embedded Markdown image.');
  });
  function safeText(item) {
    if (typeof item === 'string' && (/<\s*\/?\s*(?:script|iframe|svg|object|embed|style)\b|\bon[a-z]+\s*=/i.test(item) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(item))) throw new Error('Content has active HTML or control characters. Use plain text or Markdown.');
    if (Array.isArray(item)) item.forEach(safeText);
    else if (item && typeof item === 'object') Object.values(item).forEach(safeText);
  }
  safeText(content);
  return value;
}
export function parseImport(text, seed, original) {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('This file is too large. The limit is 5 MiB.');
  let parsed; try { parsed = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  const normalized = normalize(parsed);
  validateEnvelope(normalized, seed, original);
  return normalized;
}
