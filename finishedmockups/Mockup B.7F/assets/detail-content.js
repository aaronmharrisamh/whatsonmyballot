// B.7F: each detail control uses only content assigned to that exact item.
// Provenance, ballot instructions, portraits and neighbouring rows are not details.
const text = value => typeof value === 'string' ? value.trim() : '';
const prose = values => (Array.isArray(values) ? values : []).map(text).filter(Boolean);
const https = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};

export function detailContent(content, note, id) {
  const candidate = content?.candidates?.find(item => item.id === id);
  const contest = content?.contests?.find(item => item.id === id);
  const option = content?.options?.find(item => item.id === id);
  const writeIn = content?.contests?.flatMap(item => item.writeIns || []).find(item => item.id === id);
  const item = candidate || contest || option || writeIn;
  // B.7's straight-party panel is notes-only; keep its legacy editorial record
  // outside the detail UI rather than changing the inherited content schema.
  const editorial = contest?.kind !== 'straight-party' && item?.editorialId
    ? content?.editorialContent?.find(record => record.id === item.editorialId && record.ownerId === id)
    : null;
  const ownNote = item && note?.id === id ? note : null;
  const ballotSourceIds = new Set((content?.officialPdfs || []).map(pdf => pdf.sourceId));
  const ballotUrls = new Set((content?.sources || []).filter(source => ballotSourceIds.has(source.id)).map(source => https(source.url).split('#')[0]));
  const relevantUrl = value => { const url = https(value); return ballotUrls.has(url.split('#')[0]) ? '' : url; };
  const synopsis = text(ownNote?.synopsis), sourceUrl = relevantUrl(ownNote?.sourceUrl);
  const websiteUrl = candidate ? relevantUrl(candidate.website?.url) : '';
  const overview = text(editorial?.overviewLine || editorial?.purposeSentence);
  const summary = prose(editorial?.sentences);
  const paragraphs = prose(editorial?.detailParagraphs || editorial?.paragraphs);
  const assigned = new Set([...(item?.documentIds || []), ...(editorial?.documentIds || [])]);
  const documents = (content?.documents || []).filter(doc => assigned.has(doc.id) &&
    (text(doc.markdown) || (doc.markdown == null && /^content\/candidates\/[a-z0-9-]+\.md$/.test(doc.markdownPath))));
  const available = Boolean(synopsis || sourceUrl || websiteUrl || overview || summary.length || paragraphs.length || documents.length);
  return { available, synopsis, sourceUrl, websiteUrl, overview, summary, paragraphs, documents };
}
export const hasDetailContent = (content, note, id) => detailContent(content, note, id).available;
