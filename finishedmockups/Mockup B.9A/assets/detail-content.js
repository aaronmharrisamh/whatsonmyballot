// B.9A: each detail control uses only content assigned to that exact item.
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
  const editorial = item?.editorialId
    ? content?.editorialContent?.find(record => record.id === item.editorialId && record.ownerId === id)
    : null;
  const ownNote = item && note?.id === id ? note : null;
  const ballotSourceIds = new Set((content?.officialPdfs || []).map(pdf => pdf.sourceId));
  const ballotUrls = new Set((content?.sources || []).filter(source => ballotSourceIds.has(source.id)).map(source => https(source.url).split('#')[0]));
  const relevantUrl = value => { const url = https(value); return ballotUrls.has(url.split('#')[0]) ? '' : url; };
  const synopsis = text(ownNote?.synopsis), sourceUrl = relevantUrl(ownNote?.sourceUrl);
  const websiteUrl = item ? relevantUrl(item.website?.url) : '';
  const overview = text(editorial?.overviewLine || editorial?.purposeSentence);
  const summary = prose(editorial?.sentences);
  const paragraphs = prose(editorial?.detailParagraphs || editorial?.paragraphs);
  const assigned = new Set([...(item?.documentIds || []), ...(editorial?.documentIds || [])]);
  const documents = (content?.documents || []).filter(doc => assigned.has(doc.id) &&
    text(doc.markdown));
  const ownSources = (editorial?.sourceIds || []).some(id => content?.sources?.some(source => source.id === id));
  const photo = item?.photoAttachmentId || content?.media?.find(media => media.id === item?.portraitMediaId && media.classification !== 'generic-placeholder');
  const available = Boolean(photo || ownSources || synopsis || sourceUrl || websiteUrl || overview || summary.length || paragraphs.length || documents.length);
  return { available, synopsis, sourceUrl, websiteUrl, overview, summary, paragraphs, documents };
}
export const hasDetailContent = (content, note, id) => detailContent(content, note, id).available;
