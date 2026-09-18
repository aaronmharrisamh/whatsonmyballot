export const clone = value => structuredClone(value);
export const normalizeText = value => value.replace(/\r\n?/g, '\n');
export function normalize(value) {
  if (typeof value === 'string') return normalizeText(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export const collections = { contest: 'contests', editorial: 'editorialContent', candidate: 'candidates', option: 'options', document: 'documents', source: 'sources' };
export function editableValues(record, group) {
  if (group === 'contest') return { officialTitleLines: record.officialTitle };
  if (group === 'candidate') return { officialNameLines: record.officialNameLines.join('\n'), websiteUrl: record.website.url || '' };
  if (group === 'option') return { officialLabel: record.officialLabel, websiteUrl: record.website.url || '' };
  if (group === 'document') return { markdown: record.markdown };
  if (group === 'source') return { title: record.title, url: record.url };
  return { paragraphs: record.detailParagraphs.join('\n\n') };
}
export function fieldLabel(key) {
  const labels = { officialTitleLines: 'Contest title (one printed line per row)', officialNameLines: 'Name (one printed line per row)', officialLabel: 'Choice label', websiteUrl: 'Website (HTTPS; optional)', overviewLine: 'Summary (optional)', paragraphs: 'Detail paragraphs (separate paragraphs with a blank line)', markdown: 'Details (Markdown; optional)', title: 'Title', url: 'Source link (HTTPS or attachment:id)' };
  return labels[key] || key;
}
export function groupLabel(group) { return { contest: 'contest title', editorial: 'details', candidate: 'candidate name and link', option: 'choice label', document: 'Markdown details', source: 'source details' }[group] || 'text'; }
export function recordLabel(content, id) {
  for (const collection of Object.values(collections)) {
    const item = content[collection].find(record => record.id === id);
    if (item) return item.officialTitle || item.officialName || item.officialLabel || item.title || (item.ownerId !== id ? recordLabel(content, item.ownerId) : 'Text');
  }
  return 'Text';
}
export function allGroups(content) { return Object.entries(collections).flatMap(([group, collection]) => content[collection].map(record => ({ id: record.id, group, label: recordLabel(content, record.id) }))); }
export function changedGroups(before, after) { return allGroups(after).filter(({ id, group }) => canonical(editableValues(before[collections[group]].find(record => record.id === id), group)) !== canonical(editableValues(after[collections[group]].find(record => record.id === id), group))); }
export function applyFields(content, original, draft, { mutate = false } = {}) {
  const next = mutate ? content : clone(content), collection = collections[draft.group];
  const record = next[collection]?.find(item => item.id === draft.id), baseline = original[collection]?.find(item => item.id === draft.id);
  if (!record || !baseline) throw new Error('This editable group is not in this ballot.');
  const values = normalize(draft.values);
  if (canonical(Object.keys(values).sort()) !== canonical(Object.keys(editableValues(record, draft.group)).sort()) || Object.values(values).some(value => typeof value !== 'string' || value.length > 10000000)) throw new Error('The draft fields do not match this editor.');
  if (draft.group === 'contest') {
    record.officialTitle = values.officialTitleLines; record.officialTitleLines = [...record.officialTitle.split('\n'), ...(record.officialTerm ? [record.officialTerm] : [])];
  } else if (draft.group === 'candidate') {
    record.officialNameLines = values.officialNameLines.split('\n'); record.officialName = record.officialNameLines.join('\n');
    record.website.url = values.websiteUrl || null;
  } else if (draft.group === 'option') {
    record.officialLabel = values.officialLabel; record.website.url = values.websiteUrl || null;
    for (const contest of next.contests) for (const slot of contest.writeIns) if (slot.id === record.id) { slot.officialLabel = values.officialLabel; slot.website.url = values.websiteUrl || null; }
  } else if (draft.group === 'editorial') {
    if (values.paragraphs !== record.detailParagraphs.join('\n\n')) record.detailParagraphs = values.paragraphs ? values.paragraphs.split(/\n\s*\n/) : [];
  } else Object.assign(record, values);
  return next;
}
