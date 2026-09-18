// Pure bridge from the portable B.9 ballot to the established H editor/view model.
// Canonical IDs remain unchanged. Only browser storage uses the import generation.
const copy = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const placeholderUrl = new URL('../../Mockup A/assets/portrait-placeholder.svg', import.meta.url).href;
let resourceResolver = null;
export function setAttachmentResolver(resources) { resourceResolver = resources || null; }
export function resolveContentUrl(value) {
  if (typeof value !== 'string') return '';
  if (value === placeholderUrl) return value;
  if (value.startsWith('attachment:')) return resourceResolver?.url(value.slice(11)) || '';
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? value : ''; } catch { return ''; }
}
const sourceUrl = source => source?.url || (source?.attachmentId ? 'attachment:' + source.attachmentId : '');
const itemById = (ballot, id) => ballot.contests.find(item => item.id === id) || ballot.contests.flatMap(item => item.options).find(item => item.id === id);
function sourcesFor(ballot, ids, content = null) {
  const sources = new Map((ballot.sources || []).map(source => [source.id, source]));
  return (ids || []).flatMap(id => {
    const source = sources.get(id); if (!source) return [];
    const edited = content?.sources.find(item => item.id === id);
    const references = [...new Set([edited?.url || sourceUrl(source), source.attachmentId ? 'attachment:' + source.attachmentId : ''].filter(Boolean))];
    return references.map((reference, index) => ({id, title: (edited?.title || source.title) + (index ? ' (embedded file)' : ''), url: resolveContentUrl(reference), reference}));
  });
}
export function getBallotSources(ballot, content = null) { return sourcesFor(ballot, (ballot.sources || []).map(source => source.id), content); }
export function getDetailSources(ballot, id, content = null) { return sourcesFor(ballot, itemById(ballot, id)?.details?.sourceIds, content); }
export function getNoteSources(ballot, id, note = null, content = null) {
  let ids = [...(itemById(ballot, id)?.opinion?.sourceIds || [])];
  const first = ids.map(id => ballot.sources?.find(source => source.id === id)).find(source => source?.url);
  const changed = note && note.sourceUrl !== (first?.url || '');
  if (changed && first) ids = ids.filter(id => id !== first.id);
  const links = sourcesFor(ballot, ids, content);
  if (changed && first?.attachmentId) { const reference = 'attachment:' + first.attachmentId; if (!links.some(link => link.reference === reference)) links.unshift({id:first.id,title:content?.sources.find(item=>item.id===first.id)?.title || first.title,reference,url:resolveContentUrl(reference)}); }
  if (changed && note.sourceUrl && !links.some(link => link.reference === note.sourceUrl)) links.unshift({ id: '', title: 'Opinion source', reference: note.sourceUrl, url: resolveContentUrl(note.sourceUrl) });
  return links;
}
export function adaptBallot(ballot, generation) {
  const datasetId = 'b9-workspace-' + String(generation).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  const used = new Set([ballot.id, ...ballot.groups.map(x => x.id), ...ballot.pages.flatMap(x => [x.id, ...x.columns.map(y => y.id)]), ...ballot.contests.flatMap(x => [x.id, ...x.options.map(y => y.id)]), ...(ballot.sources || []).map(x => x.id), ...(ballot.authors || []).map(x => x.id), ...(ballot.attachments || []).map(x => x.id)]);
  let serial = 0;
  const synthetic = label => { let id; do { id = 'b9-meta-' + label + '-' + (++serial); } while (used.has(id)); used.add(id); return id; };
  const electionId = synthetic('election'), areaId = synthetic('area'), styleId = synthetic('style');
  const content = { elections: [], areas: [], ballotStyles: [], sections: [], contests: [], candidates: [], options: [], editorialContent: [], documents: [], sources: [], media: [], officialPdfs: [], attachments: (ballot.attachments || []).map(item => ({id:item.id,path:'attachment:'+item.id,mimeType:item.mimeType})) };
  const authors = new Map((ballot.authors || []).map(author => [author.id, author]));
  const sources = new Map((ballot.sources || []).map(source => [source.id, source]));
  const pageMapping = ballot.pages.map((page, index) => ({ viewerPage: index + 1, originalViewerPage: index + 1, pageId: page.id, label: page.label, columns: copy(page.columns), contestIds: page.columns.flatMap(column => column.contestIds) }));
  const contestById = new Map(ballot.contests.map(contest => [contest.id,contest]));
  const orderedContests = pageMapping.flatMap(page => page.contestIds).map(id => contestById.get(id));
  const positions = new Map();
  pageMapping.forEach(page => page.columns.forEach((column, index) => column.contestIds.forEach(id => positions.set(id, { viewerPage: page.viewerPage, column: index + 1 }))));
  content.elections.push({ id: electionId, date: ballot.election.date, type: ballot.election.type, officialTitle: ballot.election.title, displayLabel: ballot.election.title, historicalDemo: ballot.election.isDemo, isDemo: ballot.election.isDemo, sourceIds: [] });
  content.areas.push({ id: areaId, ...copy(ballot.area), village: null, ballotDivision: null, congressionalDistrict: ballot.area.districts.map(item => item.label + ': ' + item.value).join(', '), displayLabel: [ballot.area.municipality, ballot.area.precinct].filter(Boolean).join(' - '), isFallback: false, preferredReplacement: null, sourceIds: [] });
  content.sources = (ballot.sources || []).map(source => ({ id: source.id, publisher: source.publisher || '', title: source.title, url: sourceUrl(source), documentType: 'ballot-source', publishedOn: null, documentDate: null, dateMeaning: '', retrievedOn: null, verificationStatus: 'author-provided', verifiedOn: null, sha256: '', viewerPages: [] }));
  const placeholder = synthetic('placeholder');
  content.media.push({ id: placeholder, path: new URL('../../Mockup A/assets/portrait-placeholder.svg', import.meta.url).href, type: 'image/svg+xml', alt: 'Photo not added', classification: 'generic-placeholder', sourceIds: [], sha256: '' });
  const notes = { format: 'whatsonmyballot-notes', schemaVersion: '1.1.0', datasetId, revision: 0, records: [] };
  const annotations = { format: 'whatsonmyballot-guide-annotations', schemaVersion: '1.0.0', datasetId, revision: 0, records: [] };
  const addDetails = (item, target) => {
    const detail = item.details || {}, editorialId = synthetic('details'), documentId = synthetic('markdown');
    target.editorialId = editorialId; target.documentIds = [documentId];
    content.editorialContent.push({ id: editorialId, ownerId: item.id, kind: 'ballot-details', classification: ballot.election.isDemo ? 'pseudo' : 'author-provided', statusLabel: ballot.election.isDemo ? 'Example content' : 'Ballot information', overviewLine: '', sentences: [], detailParagraphs: copy(detail.paragraphs || []), sourceIds: copy(detail.sourceIds || []), documentIds: [documentId] });
    content.documents.push({ id: documentId, ownerId: item.id, title: (item.title || item.label) + ' - details', classification: 'author-provided', statusLabel: 'Ballot information', markdownPath: '', markdown: detail.markdown || '', sourceIds: copy(detail.sourceIds || []), preparedOn: null, capturedOn: null, note: '' });
  };
  const addNote = (item, raceId, kind) => {
    const opinion = item.opinion;
    const firstSource = (opinion?.sourceIds || []).map(id => sources.get(id)).find(source => source?.url);
    const record = { id: item.id, kind, raceId, label: item.title || item.label, synopsis: item.details?.summary || '', author: authors.get(opinion?.authorId)?.name || authors.get(opinion?.authorId)?.label || '', opinion: opinion?.text || '', sourceUrl: firstSource?.url || '' };
    if (kind === 'section') Object.assign(record, { headerHighlighted: opinion?.highlighted || false, headerColor: opinion?.color || 'blue' });
    notes.records.push(record);
    if (kind !== 'section') annotations.records.push({ id: item.id, kind, raceId, label: item.label, mark: item.recommendation?.mark || 'none', color: item.recommendation?.color || 'red' });
  };
  content.sections = ballot.groups.map((group, index) => ({ id: group.id, officialTitle: group.title, groupId: group.id, groupLabel: group.title, partisanship: group.category, order: index, contestIds: orderedContests.filter(contest => contest.groupId === group.id).map(contest => contest.id) }));
  orderedContests.forEach((contest, index) => {
    const reference = positions.get(contest.id) || { viewerPage: 1, column: 1 };
    const race = { id: contest.id, sectionId: contest.groupId, order: index, kind: contest.kind, officialTitle: contest.title, officialTitleLines: [...contest.title.split('\n'), ...(contest.subtitle ? [contest.subtitle] : [])], officialTerm: contest.subtitle || null, officialDistrict: null, officialPosition: null, maxSelections: contest.maxSelections, officialSelectionInstruction: contest.instructions, candidateIds: [], optionIds: [], optionOrder: contest.options.map(option => ({id:option.id,kind:option.kind})), writeIns: [], writeInSlots: 0, guideBehavior: 'individual-choices', sourceRefs: [copy(reference)], verificationStatus: 'author-provided' };
    addDetails(contest, race); addNote(contest, contest.id, 'section'); content.contests.push(race);
    contest.options.forEach(option => {
      const isCandidate = option.kind === 'candidate', isWriteIn = option.kind === 'write-in';
      let item;
      if (isCandidate) {
        let mediaId = placeholder;
        if (option.photoAttachmentId) { mediaId = synthetic('photo'); const attachment = (ballot.attachments || []).find(a => a.id === option.photoAttachmentId); content.media.push({ id: mediaId, path: 'attachment:' + option.photoAttachmentId, type: attachment?.mimeType || 'image/*', alt: option.label, classification: 'author-provided', sourceIds: [], sha256: attachment?.sha256 || '' }); }
        item = { id: option.id, contestId: contest.id, officialName: option.label, officialNameLines: option.label.split('\n'), entryType: 'candidate', partyLabel: option.party || '', officialDesignation: null, website: { status: option.website ? 'author-provided' : 'not-added', url: option.website || null, verifiedOn: null, label: option.website ? 'Candidate website' : 'Candidate website not added', note: '' }, portraitMediaId: mediaId, sourceRefs: [copy(reference)], verificationStatus: 'author-provided' };
        content.candidates.push(item); race.candidateIds.push(item.id);
      } else {
        item = { id: option.id, contestId: contest.id, kind: option.kind, officialLabel: option.label, partyLabel: option.party || '', website: {url: option.website || null}, photoAttachmentId: option.photoAttachmentId || null, sourceRefs: [copy(reference)] };
        content.options.push(item);
        if (isWriteIn) race.writeIns.push(item); else race.optionIds.push(item.id);
      }
      addDetails(option, item); addNote(option, contest.id, isCandidate ? 'candidate' : isWriteIn ? 'write-in' : 'party');
    });
    race.writeInSlots = race.writeIns.length;
  });
  for (const attachment of ballot.attachments || []) if (attachment.mimeType === 'application/pdf') content.officialPdfs.push({ id: synthetic('pdf'), sourceId: (ballot.sources || []).find(source => source.attachmentId === attachment.id)?.id || null, electionId, areaId, ballotStyleId: styleId, path: 'attachment:' + attachment.id, originalRepositoryPath: '', excerptRepositoryPath: '', sha256: attachment.sha256 || '', originalSha256: attachment.sha256 || '', pageCount: pageMapping.length, viewerPages: pageMapping.map(page => page.viewerPage), originalViewerPages: pageMapping.map(page => page.viewerPage), extractionNote: '' });
  content.ballotStyles.push({ id: styleId, canonicalBallotId: ballot.id, title: ballot.title, electionId, areaId, officialPdfId: content.officialPdfs[0]?.id || null, sectionIds: content.sections.map(section => section.id), contestIds: content.contests.map(contest => contest.id), officialPageLabels: [ballot.title, ballot.election.title, ballot.election.date], sourceIds: [], pageMapping, proposalCount: ballot.contests.filter(contest => ['proposal', 'yes-no'].includes(contest.kind)).length, proposalNote: '' });
  const seed = { format: 'whatsonmyballot-content', schemaVersion: '1.0.0', datasetId, baseDatasetVersion: '1.0.0', contentRevision: 0, canonicalBallot: ballot, content: copy(content) };
  const settings = { format: 'whatsonmyballot-design-settings', schemaVersion: '1.0.0', defaultVariantId: 'A5', datasetId, ballotStyleId: styleId, shared: { reviewMode: 'rows', minimumBodyFontPx: 18, minimumTargetPx: 48, adminAvailable: true }, variants: [{ id: 'A5', label: 'Ballot', showPurpose: true, showNextStepCue: true, candidateSummaryMode: 'collapsed', showSelectionExplanation: false, showOfficeExplanation: false, showSourceMetadata: false }] };
  const levels = [['state', 'State', ballot.area.state], ...ballot.area.districts.map((district, index) => ['district-' + index, district.label, district.value]), ['county', 'County', ballot.area.county], ['municipality', 'City or township', ballot.area.municipality], ['precinct', 'Precinct', ballot.area.precinct]].filter(([, , label]) => label.trim());
  const catalog = { format: 'whatsonmyballot-area-catalog', schemaVersion: '1.0.0', catalogId: 'b9-active-ballot', revision: 0, defaultAreaId: 'b9-area-' + (levels.length - 1), levels: levels.map(([id, label]) => ({ id, label })), locations: levels.map(([level, , label], index) => ({ id: 'b9-area-' + index, level, parentId: index ? 'b9-area-' + (index - 1) : null, label, ballotId: index === levels.length - 1 ? 'b9-active' : null })), ballots: [{ id: 'b9-active', datasetId, label: ballot.title, basePath: './', pages: pageMapping.map(page => ({ page: page.viewerPage, label: page.label })) }] };
  return { seed, original: copy(content), notes, annotations, settings, catalog };
}

// Author exports start with the full input, including comments and compressed
// attachments, then apply only changes saved through the B.9 author editors.
export function exportBallot(ballot, { content, notes, annotations, baseline = null }) {
  const out = copy(ballot), adapted = adaptBallot(ballot, 'export-baseline'), original = baseline || adapted.original;
  const noteRecords = notes?.records || notes || [], markRecords = annotations?.records || annotations || [];
  const noteMap = new Map(noteRecords.map(note => [note.id, note])), originalNotes = new Map(adapted.notes.records.map(note => [note.id, note]));
  const markMap = new Map(markRecords.map(mark => [mark.id, mark]));
  const byId = (group, id, from = content) => from[group].find(item => item.id === id);
  const used = new Set([out.id, ...out.groups.map(x => x.id), ...out.pages.flatMap(x => [x.id, ...x.columns.map(y => y.id)]), ...out.contests.flatMap(x => [x.id, ...x.options.map(y => y.id)]), ...(out.sources || []).map(x => x.id), ...(out.authors || []).map(x => x.id), ...(out.attachments || []).map(x => x.id)]);
  let serial = 0;
  const newId = prefix => { let id; do { id = 'b9-' + prefix + '-' + (++serial); } while (used.has(id)); used.add(id); return id; };
  const addUrl = (url, title) => { out.sources ||= []; const existing = out.sources.find(source => url.startsWith('attachment:') ? source.attachmentId === url.slice(11) && !source.url : source.url === url); if (existing) return existing.id; const source = { id: newId('source'), title, ...(url.startsWith('attachment:') ? {attachmentId: url.slice(11)} : {url}) }; out.sources.push(source); return source.id; };
  function applyItem(item, legacy, base, isContest) {
    const detail = byId('editorialContent', legacy.editorialId), beforeDetail = byId('editorialContent', base.editorialId, original);
    const document = byId('documents', legacy.documentIds[0]), beforeDocument = byId('documents', base.documentIds[0], original);
    if (detail.overviewLine !== beforeDetail.overviewLine) { item.details ||= {}; item.details.summary = detail.overviewLine; }
    if (!same(detail.detailParagraphs, beforeDetail.detailParagraphs)) { item.details ||= {}; item.details.paragraphs = copy(detail.detailParagraphs); }
    if (document.markdown !== beforeDocument.markdown) { item.details ||= {}; item.details.markdown = document.markdown; }
    const note = noteMap.get(item.id), previous = originalNotes.get(item.id);
    if (note) {
      if (note.synopsis !== previous.synopsis) { item.details ||= {}; item.details.summary = note.synopsis; }
      if (['author', 'opinion', 'sourceUrl', ...(isContest ? ['headerHighlighted', 'headerColor'] : [])].some(key => note[key] !== previous[key])) {
        if (!note.opinion && !note.author && !note.sourceUrl) { delete item.opinion; } else {
        item.opinion ||= { authorId: '', text: '' };
        if (note.author !== previous.author || !item.opinion.authorId) {
          out.authors ||= [];
          let author = out.authors.find(author => author.name === note.author);
          if (!author) { author = { id: newId('author'), name: note.author.trim() || 'Ballot editor' }; out.authors.push(author); }
          item.opinion.authorId = author.id;
        }
        item.opinion.text = note.opinion;
        if (isContest) { item.opinion.highlighted = note.headerHighlighted; item.opinion.color = note.headerColor; }
        if (note.sourceUrl !== previous.sourceUrl) {
          const oldFirst = (item.opinion.sourceIds || []).find(id => (ballot.sources || []).find(source => source.id === id)?.url === previous.sourceUrl);
          const ids = (item.opinion.sourceIds || []).filter(id => id !== oldFirst);
          const oldSource = out.sources?.find(source => source.id === oldFirst);
          if (oldSource?.attachmentId) ids.unshift(addUrl('attachment:' + oldSource.attachmentId, oldSource.title));
          if (note.sourceUrl) ids.unshift(addUrl(note.sourceUrl, 'Opinion source'));
          item.opinion.sourceIds = [...new Set(ids)];
        }
        }
      }
    }
    if (!isContest) {
      const mark = markMap.get(item.id), beforeMark = adapted.annotations.records.find(record => record.id === item.id);
      if (mark && (mark.mark !== beforeMark.mark || mark.color !== beforeMark.color)) item.recommendation = { ...(item.recommendation || {}), mark: mark.mark, color: mark.color };
    }
  }
  for (const contest of out.contests) {
    const legacy = byId('contests', contest.id), base = byId('contests', contest.id, original);
    if (legacy.officialTitle !== base.officialTitle) contest.title = legacy.officialTitle;
    applyItem(contest, legacy, base, true);
    for (const option of contest.options) {
      const group = option.kind === 'candidate' ? 'candidates' : 'options', current = byId(group, option.id), before = byId(group, option.id, original);
      const labelKey = option.kind === 'candidate' ? 'officialName' : 'officialLabel';
      if (current[labelKey] !== before[labelKey]) option.label = current[labelKey];
      if (current.website.url !== before.website.url) { if (current.website.url) option.website = current.website.url; else delete option.website; }
      applyItem(option, current, before, false);
    }
  }
  for (const source of out.sources || []) {
    const legacy = byId('sources', source.id), before = byId('sources', source.id, original);
    if (!legacy || !before) continue;
    for (const key of ['title']) if (legacy[key] !== before[key]) source[key] = legacy[key];
    if (legacy.url !== before.url) {
      if (legacy.url.startsWith('attachment:')) { delete source.url; source.attachmentId = legacy.url.slice(11); } else source.url = legacy.url;
    }
  }
  if (!same(out, ballot)) out.revision = ballot.revision + 1;
  return out;
}
