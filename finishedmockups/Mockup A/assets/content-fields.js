export const clone = value => structuredClone(value);
export const normalizeText = value => value.replace(/\r\n?/g, '\n');
export function normalize(value) {
  if (typeof value === 'string') return normalizeText(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  return value;
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export const collections = { contest: 'contests', editorial: 'editorialContent', candidate: 'candidates', document: 'documents', source: 'sources' };
export function editableValues(record, group) {
  if (group === 'contest') return { officialTitleLines: record.officialTitleLines.join('\n') };
  if (group === 'candidate') return { officialNameLines: record.officialNameLines.join('\n'), websiteUrl: record.website.url || '' };
  if (group === 'document') return { title: record.title, markdown: record.markdown, note: record.note };
  if (group === 'source') return { publisher: record.publisher, title: record.title, url: record.url };
  if (record.kind === 'candidate-summary') return { ...Object.fromEntries(record.sentences.map((value, i) => [`sentence${i + 1}`, value])), overviewLine: record.overviewLine, ...Object.fromEntries(record.detailParagraphs.map((value, i) => [`detail${i + 1}`, value])) };
  return { purposeSentence: record.purposeSentence, paragraph1: record.paragraphs[0], paragraph2: record.paragraphs[1] };
}
export function fieldLabel(key) {
  const names = { officialTitleLines: 'Race title (one printed line per row)', officialNameLines: 'Name (one printed line per row)', websiteUrl: 'Candidate website (HTTPS; optional)', purposeSentence: 'Purpose sentence', overviewLine: 'Short overview', title: 'Title', markdown: 'Document text (Markdown)', note: 'Document note', publisher: 'Source publisher', url: 'Source link (HTTPS or bundled document)' };
  return names[key] || key.replace(/^sentence(\d)$/, 'Summary sentence $1').replace(/^detail(\d)$/, 'Detail paragraph $1').replace(/^paragraph(\d)$/, 'Explanation paragraph $1');
}
export function groupLabel(group) { return { contest: 'race title', editorial: 'example text', candidate: 'candidate name and link', document: 'document', source: 'source details' }[group]; }
export function recordLabel(content, id) {
  for (const collection of Object.values(collections)) {
    const item = content[collection].find(record => record.id === id);
    if (item) return item.officialTitle || item.officialName || item.title || recordLabel(content, item.ownerId);
  }
  return 'Text';
}
export function allGroups(content) {
  return Object.entries(collections).flatMap(([group, collection]) => content[collection].map(record => ({ id: record.id, group, label: recordLabel(content, record.id) })));
}
export function changedGroups(before, after) {
  return allGroups(after).filter(({ id, group }) => canonical(editableValues(before[collections[group]].find(record => record.id === id), group)) !== canonical(editableValues(after[collections[group]].find(record => record.id === id), group)));
}
export function applyFields(content, original, draft, { mutate = false } = {}) {
  const next = mutate ? content : clone(content), collection = collections[draft.group];
  const record = next[collection]?.find(item => item.id === draft.id);
  const baseline = original[collection]?.find(item => item.id === draft.id);
  if (!record || !baseline) throw new Error('This editable group is not in this ballot.');
  const v = normalize(draft.values);
  if (canonical(Object.keys(v).sort()) !== canonical(Object.keys(editableValues(record, draft.group)).sort()) || Object.values(v).some(value => typeof value !== 'string')) throw new Error('The draft fields do not match this editor.');
  if (draft.group === 'contest') {
    record.officialTitleLines = v.officialTitleLines.split('\n'); record.officialTitle = record.officialTitleLines.join(' ');
    record.verificationStatus = canonical(record.officialTitleLines) === canonical(baseline.officialTitleLines) ? baseline.verificationStatus : 'demo-edited';
  } else if (draft.group === 'candidate') {
    record.officialNameLines = v.officialNameLines.split('\n'); record.officialName = record.officialNameLines.join(record.entryType === 'presidential-ticket' ? ' / ' : ' ');
    record.verificationStatus = canonical(record.officialNameLines) === canonical(baseline.officialNameLines) ? baseline.verificationStatus : 'demo-edited';
    record.website = (v.websiteUrl || null) === baseline.website.url ? clone(baseline.website) : { status: v.websiteUrl ? 'demo-edited' : 'not-added', url: v.websiteUrl || null, verifiedOn: null, label: v.websiteUrl ? 'Candidate website · Edited locally' : 'Candidate website not added', note: 'Local demo link. Check this source before use.' };
  } else if (draft.group === 'document') Object.assign(record, v);
  else if (draft.group === 'source') {
    Object.assign(record, v);
    const same = canonical(v) === canonical(editableValues(baseline, 'source'));
    record.verificationStatus = same ? baseline.verificationStatus : 'demo-edited';
    record.verifiedOn = same ? baseline.verifiedOn : null;
  } else if (record.kind === 'candidate-summary') {
    record.sentences = [v.sentence1, v.sentence2, v.sentence3]; record.overviewLine = v.overviewLine;
    record.detailParagraphs = [v.detail1, v.detail2, v.detail3, v.detail4, v.detail5];
  } else { record.purposeSentence = v.purposeSentence; record.paragraphs = [v.paragraph1, v.paragraph2]; }
  return next;
}
