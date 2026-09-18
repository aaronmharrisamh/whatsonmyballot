import { validateBallot, isSafeText } from './ballot-contract.js';
import { exportBallot } from './ballot-adapter.js';
import { marked } from '../../Mockup A/assets/vendor/marked.esm.js';
import { safeHttps } from '../../Mockup A/assets/shared.js';
import { clone, normalize, canonical, editableValues, applyFields, collections, freeze } from './content-fields.js';
export const MAX_IMPORT_BYTES = 100000000;
export function safeContentLink(value, content) {
  if (safeHttps(value)) return value;
  if (typeof value !== 'string' || !value.startsWith('attachment:')) return null;
  return content.attachments?.some(attachment => attachment.path === value) ? value : null;
}
export function envelope(seed, content, revision = 0) { return { format: 'whatsonmyballot-content', schemaVersion: '1.0.0', datasetId: seed.datasetId, baseDatasetVersion: seed.baseDatasetVersion, contentRevision: revision, exportedAt: new Date().toISOString(), content: clone(content) }; }
export async function loadOriginal(seed) { const original = clone(seed.content); validateEnvelope(envelope(seed, original), seed, original); return freeze(original); }
export function validateEnvelope(value, seed, original) {
  if (!value || value.format !== 'whatsonmyballot-content' || value.schemaVersion !== '1.0.0' || value.datasetId !== seed.datasetId || value.baseDatasetVersion !== seed.baseDatasetVersion || !Number.isSafeInteger(value.contentRevision) || value.contentRevision < 0 || !value.content || typeof value.content !== 'object') throw new Error('This saved content does not match the active ballot.');
  const content = value.content;
  if (canonical(Object.keys(content).sort()) !== canonical(Object.keys(original).sort())) throw new Error('The saved ballot content has unsupported fields.');
  let permitted = clone(original);
  for (const [group, collection] of Object.entries(collections)) {
    if (!Array.isArray(content[collection]) || canonical(content[collection].map(record => record.id)) !== canonical(original[collection].map(record => record.id))) throw new Error('Saved record identities must match the active ballot.');
    for (const record of content[collection]) { const base = original[collection].find(item => item.id === record.id); if (canonical(editableValues(record, group)) !== canonical(editableValues(base, group))) permitted = applyFields(permitted, original, { id: record.id, group, values: editableValues(record, group) }, { mutate: true }); }
  }
  if (canonical(permitted) !== canonical(content)) throw new Error('The content changes protected ballot structure. Import a complete ballot to replace its structure.');
  for (const contest of content.contests) if (!contest.officialTitle.trim() || contest.officialTitle.length > 1000) throw new Error('A contest title is required (up to 1,000 characters).');
  for (const candidate of content.candidates) {
    if (!candidate.officialName.trim() || candidate.officialName.length > 1000) throw new Error('A candidate name is required (up to 1,000 characters).');
    if (candidate.website.url !== null && !safeHttps(candidate.website.url)) throw new Error('A candidate website must use HTTPS.');
  }
  for (const option of content.options) if (!option.officialLabel.trim() || option.officialLabel.length > 1000) throw new Error('A choice label is required (up to 1,000 characters).');
  for (const source of content.sources) if (!source.title.trim() || !safeContentLink(source.url, content)) throw new Error('Sources require a title and an HTTPS or embedded-attachment link.');
  for (const document of content.documents) marked.walkTokens(marked.lexer(document.markdown, { gfm: true }), token => {
    if (token.type === 'link' && !safeContentLink(token.href, content)) throw new Error('Markdown links must use HTTPS or attachment:id.');
    if (token.type === 'image' && !safeContentLink(token.href, content)) throw new Error('Markdown image links must use HTTPS or attachment:id.');
  });
  if (seed.canonicalBallot) { const result = validateBallot(exportBallot(seed.canonicalBallot, {content, baseline: original})); if (!result.ok) throw new Error(result.errors.join('\n')); }
  return value;
}
export function parseImport(text, seed, original) {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('The content file is too large.');
  let value; try { value = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  validateEnvelope(value, seed, original); return value;
}
