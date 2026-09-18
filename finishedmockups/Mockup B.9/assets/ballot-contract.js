import schemaValidate from './ballot-schema-validator.js';
import { marked } from '../../Mockup A/assets/vendor/marked.esm.js';

export const BALLOT_FORMAT = 'whatsonmyballot-ballot';
export const SCHEMA_VERSION = '1.0.0';
export const MAX_JSON_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_BYTES = MAX_JSON_BYTES;
export const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const COLORS = Object.freeze(['red', 'orange', 'yellow', 'green', 'blue', 'gray']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const utf8 = new TextEncoder();

export class ContractError extends Error {
  constructor(message, errors = []) { super(message); this.name = 'ContractError'; this.errors = errors; }
}

// Version dispatch is deliberate: add a real, tested migration here when one exists.
// A future version is never relabelled as today's schema.
const migrations = new Map([[SCHEMA_VERSION, value => value]]);
export function migrateBallot(value) {
  if (!value || !own(value, 'schemaVersion') || !migrations.has(value.schemaVersion)) throw new ContractError(`Unsupported ballot schema version: ${String(value?.schemaVersion || '(missing)')}. This app accepts ${SCHEMA_VERSION}.`);
  return migrations.get(value.schemaVersion)(value);
}

function checkPlainJson(value) {
  const seen = new WeakSet(); let count = 0;
  function visit(item, path, depth) {
    if (++count > 300000 || depth > 32) throw new ContractError('The ballot JSON is too complex.');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (typeof item !== 'object') throw new ContractError(`${path}: expected plain JSON values.`);
    if (seen.has(item)) throw new ContractError(`${path}: repeated object or circular reference is not JSON.`);
    seen.add(item);
    if (Array.isArray(item) ? Object.getPrototypeOf(item) !== Array.prototype : Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new ContractError(`${path}: custom prototypes are not accepted.`);
    if (Object.getOwnPropertySymbols(item).length) throw new ContractError(`${path}: symbol properties are not JSON.`);
    for (const key of Object.getOwnPropertyNames(item)) {
      if (Array.isArray(item) && key === 'length') continue;
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new ContractError(`${path}: unsafe property ${key}.`);
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !own(descriptor, 'value')) throw new ContractError(`${path}: getters are not JSON.`);
      if (!descriptor.enumerable) throw new ContractError(`${path}: hidden properties are not JSON.`);
      visit(descriptor.value, `${path}/${key}`, depth + 1);
    }
  }
  visit(value, '', 0);
}

export function isSafeHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

export function isSafeText(value) {
  return !/<\/?[a-z][^>]*>|<!|<\?/i.test(value) && !/(?:javascript|vbscript|data)\s*:/i.test(value) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}

export function markdownErrors(markdown, attachments = [], path = 'Markdown') {
  const errors = [], files = attachments instanceof Map ? attachments : new Map(attachments.map(item => [item.id, item]));
  marked.walkTokens(marked.lexer(markdown, { gfm: true }), token => {
    if (token.type === 'html') errors.push(`${path}: raw HTML is not allowed.`);
    if (token.type !== 'link' && token.type !== 'image') return;
    const href = token.href || '';
    if (isSafeHttps(href)) return;
    const match = /^attachment:([A-Za-z0-9][A-Za-z0-9._-]*)$/.exec(href);
    if (!match || !files.has(match[1])) { errors.push(`${path}: links and images require HTTPS or a known attachment:ID.`); return; }
    if (token.type === 'image' && !files.get(match[1]).mimeType.startsWith('image/')) errors.push(`${path}: Markdown images must reference an image attachment.`);
  });
  return errors;
}

export function validateBallot(value) {
  const errors = [];
  const fail = message => errors.push(message);
  try {
    checkPlainJson(value);
    const raw = JSON.stringify(value);
    if (utf8.encode(raw).byteLength > MAX_JSON_BYTES) throw new ContractError('The ballot JSON exceeds the 25 MiB limit.');
    const ballot = JSON.parse(raw);
    migrateBallot(ballot);
    if (!schemaValidate(ballot)) return { ok: false, errors: schemaValidate.errors.slice(0, 30).map(error => `${error.instancePath || '/'} ${error.message}${error.params?.additionalProperty ? ` (${error.params.additionalProperty})` : ''}`), ballot: null };
    ballot.authors ||= []; ballot.sources ||= []; ballot.attachments ||= [];
    const all = new Map(), byType = new Map();
    function add(record, type) {
      if (all.has(record.id)) fail(`Duplicate global ID: ${record.id}.`);
      all.set(record.id, type);
      if (!byType.has(type)) byType.set(type, new Map());
      byType.get(type).set(record.id, record);
    }
    add(ballot, 'ballot');
    for (const [key, type] of [['authors', 'author'], ['sources', 'source'], ['attachments', 'attachment'], ['groups', 'group'], ['pages', 'page'], ['contests', 'contest']]) ballot[key].forEach(item => add(item, type));
    ballot.pages.forEach(page => page.columns.forEach(column => add(column, 'column')));
    ballot.contests.forEach(contest => contest.options.forEach(option => add(option, 'option')));
    function reference(id, type, path) { if (!byType.get(type)?.has(id)) fail(`${path}: unknown ${type} ${id}.`); }
    function refs(ids, type, path) { (ids || []).forEach(id => reference(id, type, path)); }
    function content(item, path) {
      refs(item.details?.sourceIds, 'source', `${path}/details/sourceIds`);
      if (item.opinion) { reference(item.opinion.authorId, 'author', `${path}/opinion/authorId`); refs(item.opinion.sourceIds, 'source', `${path}/opinion/sourceIds`); }
      if (item.details?.markdown) errors.push(...markdownErrors(item.details.markdown, byType.get('attachment') || [], `${path}/details/markdown`));
    }
    const placed = new Map();
    ballot.pages.forEach(page => {
      if (!page.columns.some(column => column.contestIds.length)) fail(`Page ${page.id} must contain at least one contest.`);
      page.columns.forEach(column => column.contestIds.forEach(id => { reference(id, 'contest', `Column ${column.id}`); placed.set(id, (placed.get(id) || 0) + 1); }));
    });
    ballot.contests.forEach(contest => {
      reference(contest.groupId, 'group', `Contest ${contest.id}`);
      if (placed.get(contest.id) !== 1) fail(`Contest ${contest.id} must appear in exactly one page column.`);
      if (contest.maxSelections > contest.options.length) fail(`Contest ${contest.id} allows more selections than its option count.`);
      if (['proposal', 'retention', 'straight-party'].includes(contest.kind) && contest.maxSelections !== 1) fail(`Contest ${contest.id} (${contest.kind}) must allow exactly one selection.`);
      content(contest, `Contest ${contest.id}`);
      contest.options.forEach(option => {
        if (contest.kind === 'straight-party' && option.kind !== 'party') fail(`Straight-party contest ${contest.id} requires party options.`);
        if (['proposal', 'retention'].includes(contest.kind) && option.kind !== 'choice') fail(`${contest.kind} contest ${contest.id} requires choice options.`);
        if (contest.kind === 'candidate' && !['candidate', 'write-in'].includes(option.kind)) fail(`Candidate contest ${contest.id} requires candidate or write-in options.`);
        if (option.photoAttachmentId) {
          reference(option.photoAttachmentId, 'attachment', `Option ${option.id}/photoAttachmentId`);
          if (!byType.get('attachment')?.get(option.photoAttachmentId)?.mimeType.startsWith('image/')) fail(`Option ${option.id} photo must reference an image attachment.`);
        }
        if (option.website && !isSafeHttps(option.website)) fail(`Option ${option.id} website requires an HTTPS URL without credentials.`);
        content(option, `Option ${option.id}`);
      });
    });
    ballot.sources.forEach(source => { if (source.attachmentId) reference(source.attachmentId, 'attachment', `Source ${source.id}`); if (source.url && !isSafeHttps(source.url)) fail(`Source ${source.id} requires an HTTPS URL without credentials.`); });
    const expanded = ballot.attachments.reduce((sum, item) => sum + item.uncompressedBytes, 0);
    if (expanded > MAX_EXPANDED_BYTES) fail('Declared expanded attachments exceed the 100 MiB total limit.');
    ballot.attachments.forEach(item => { if (item.data.length % 4) fail(`Attachment ${item.id} requires padded base64 with a length divisible by four.`); });
    function textScan(item, path = '') {
      if (typeof item === 'string') { if (!isSafeText(item)) fail(`${path}: HTML, active URL schemes, or control characters are not allowed.`); return; }
      if (!item || typeof item !== 'object') return;
      for (const [key, child] of Object.entries(item)) if (key !== 'data') textScan(child, `${path}/${key}`);
    }
    textScan(ballot);
    return { ok: !errors.length, errors: errors.slice(0, 30), ballot: errors.length ? null : ballot };
  } catch (error) { return { ok: false, errors: [error.message || 'Invalid ballot JSON.'], ballot: null }; }
}

export async function parseBallot(text) {
  if (typeof text !== 'string') throw new ContractError('Choose a UTF-8 JSON file.');
  if (text.length > MAX_JSON_BYTES || utf8.encode(text).byteLength > MAX_JSON_BYTES) throw new ContractError('The ballot JSON exceeds the 25 MiB limit.');
  let value;
  try { value = JSON.parse(text); } catch { throw new ContractError('The file is not valid JSON. Use quoted keys, with no trailing commas or JavaScript comments.'); }
  const result = validateBallot(value);
  if (!result.ok) throw new ContractError(result.errors.join('\n'), result.errors);
  return result.ballot;
}

export function serializeBallot(value) {
  const result = validateBallot(value);
  if (!result.ok) throw new ContractError(result.errors.join('\n'), result.errors);
  return JSON.stringify(result.ballot, null, 2) + '\n';
}
