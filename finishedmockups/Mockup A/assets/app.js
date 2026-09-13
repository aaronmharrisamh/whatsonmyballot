import { APP_VERSION_LABEL } from '../../../version.js';
import { referenceUrl } from '../../../sharedrefs/registry.js';
import { escapeHtml as h, icon, designId, safeHttps } from './shared.js';
import { createGuideModel } from './model.js';
import { renderMarkdown } from './content-renderer.js';
import { mountPaper } from './paper.js';
import { loadOriginal, envelope, validateEnvelope, parseImport, safeContentLink, MAX_IMPORT_BYTES } from './content-contract.js';
import { createContentStore, ContentConflict } from './content-store.js';
import { editableValues, fieldLabel, groupLabel, recordLabel, allGroups, changedGroups, applyFields, collections, canonical, normalize, clone } from './content-fields.js';

const root = document.querySelector('#app');
const dialog = document.querySelector('#detail-dialog');
dialog.className = 'app-dialog';
let seed, original, content, settings, model, variant;
let screen = 'home', reviewMode = 'rows', paperPage = 1, showExplanations = false, admin = false, returnToReview = false;
let lastFocus = null, editDraft = null, pendingTransition = null, paperController = null;
let paperState = { zoom: 1, x: 0, y: 0 };
const expanded = new Set();
let contentStore, revision = 0, busy = false, recoveryTimer, unloadActive = false, adminMessage = '';
const recoveryOwner = crypto.randomUUID();
let recoveryOffer = null;
const announce = (message) => { document.querySelector('#announcement').textContent = ''; setTimeout(() => { document.querySelector('#announcement').textContent = message; }, 20); };
const get = (collection, id) => content[collection].find((record) => record.id === id);
const currentRace = () => get('contests', model.state.currentRaceId);
const raceNumber = () => model.races.findIndex((race) => race.id === model.state.currentRaceId);
const summary = (candidate) => get('editorialContent', candidate.editorialId);
const explanation = (contest) => get('editorialContent', contest.editorialId);
const area = () => content.areas[0];
const pdfPath = () => referenceUrl(content.officialPdfs[0].path);
const statusLabel = () => model.storageAvailable ? 'Your choices stay in this browser.' : 'Your choices last for this visit. Browser saving is unavailable.';
const button = (label, action, cls = '', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const editPill = (id, group = 'editorial') => admin ? `<button type="button" class="edit-pill no-print" data-action="edit" data-id="${h(id)}" data-group="${group}" aria-label="Edit ${h(group === 'candidate' ? 'name & link' : groupLabel(group))}">${icon('edit')} ${group === 'candidate' ? 'Edit name &amp; link' : group === 'source' ? 'Edit source' : group === 'document' ? 'Edit document' : 'Edit'}</button>` : '';
function post(type, data = {}) { if (window.parent !== window) window.parent.postMessage({ channel: 'ballot-preview-v1', type, ...data }, location.origin); }
function steps(active) { return `<ol class="flow-steps" aria-label="Guide steps">${['Your area', 'Your choices', 'Your guide'].map((label, i) => `<li class="${i === active ? 'current' : ''}" ${i === active ? 'aria-current="step"' : ''}><span class="step-num">${i + 1}</span>${label}</li>`).join('')}</ol>`; }
function sourcePanel(page = null) {
  const source = content.sources[0], link = safeContentLink(source.url, original);
  return `<div class="source-panel"><strong>Official sample ballot</strong><p>November 5, 2024 · Tuscola County${page ? ` · Page ${page}` : ''}</p><a href="${h(pdfPath())}${page ? `#page=${page}` : ''}" target="_blank" rel="noopener noreferrer">${icon('pdf')} Open sample ballot (PDF) ${icon('source')}</a><p class="small">${h(source.publisher)} · ${h(source.title)}${source.verificationStatus === 'demo-edited' ? ' · Source details edited locally' : ''}</p>${link ? `<a href="${h(safeHttps(link) || referenceUrl(link))}" target="_blank" rel="noopener noreferrer">Source link ${icon('source')}</a>` : ''}${editPill(source.id, 'source')}</div>`;
}
function sourceWebsite(candidate) {
  const website = candidate.website;
  const url = safeHttps(website.url);
  return url ? `<a class="btn compact" href="${h(url)}" target="_blank" rel="noopener noreferrer">Candidate website ${icon('source')}</a>${website.status === 'demo-edited' ? '<p class="small muted">Link edited locally. Check this source before use.</p>' : ''}` : '<p class="small muted">Candidate website not added.</p>';
}
function headingText(race) { return race.officialTitleLines.filter((line) => ![race.officialTerm, race.officialDistrict, race.officialPosition].includes(line)).join(' '); }
function chosenNames(race) {
  const choice = model.record(race.id);
  return [...choice.candidateIds.map((id) => get('candidates', id)?.officialName).filter(Boolean),
    ...Object.values(choice.writeIns).filter((name) => name.trim()).map((name) => `Write-in: ${name.trim()}`)];
}
function homeView() {
  return `${steps(0)}<div class="welcome-grid"><div class="welcome-copy"><span class="tag">Historical demo · 2024</span><h1 class="welcome-title" tabindex="-1">Your ballot.<br><span>At your pace.</span></h1><p class="muted">See each race. Read what you need.<br>Build a guide with your own choices.</p><div class="welcome-art" aria-hidden="true"><svg viewBox="0 0 240 160" fill="none"><circle cx="123" cy="82" r="70" fill="#ebe3dd"/><g transform="rotate(-9 115 80)"><rect x="65" y="13" width="110" height="140" rx="7" fill="white" stroke="#bab2aa"/><path d="M85 38h66" stroke="#242424" stroke-width="5"/><rect x="85" y="59" width="13" height="13" rx="3" fill="#b42318"/><path d="m88 65 3 3 5-6" stroke="white" stroke-width="2"/><path d="M109 65h40M109 88h34M109 111h40" stroke="#aca7a2" stroke-width="4"/><rect x="85" y="82" width="13" height="13" rx="3" stroke="#9b9690"/><rect x="85" y="105" width="13" height="13" rx="3" stroke="#9b9690"/></g><circle cx="183" cy="126" r="23" fill="#b42318"/><path d="m173 126 7 7 13-16" stroke="white" stroke-width="3"/></svg></div></div><div><section class="area-card" aria-labelledby="area-heading"><h2 id="area-heading">Start with your area</h2><label class="field-label" for="area-select">Sample area</label><select id="area-select"><option value="${h(area().id)}">Akron Township · 1AF</option></select><div class="area-date">${icon('pin')}<div><strong>Precinct 1AF · Tuscola County</strong><span>General election · November 5, 2024</span><span>27 races · All printed candidates</span></div></div>${button(`${model.state.started ? 'Continue my guide' : 'Start my guide'} ${icon('next')}`, 'start', 'primary wide')}<p class="privacy-note">${icon('lock')}<span>${h(statusLabel())}<br>No account is needed.</span></p>${model.state.started ? button('Clear personal choices', 'clear-all', 'quiet wide compact') : ''}</section><p class="welcome-foot">This is a past sample ballot. Your guide does not cast a vote.</p></div></div>`;
}
function candidateCard(candidate, race) {
  const text = summary(candidate);
  const isExpanded = expanded.has(candidate.id) || variant.candidateSummaryMode === 'three-sentences';
  const chosen = model.record(race.id).candidateIds.includes(candidate.id);
  const type = race.maxSelections === 1 ? 'radio' : 'checkbox';
  return `<div class="candidate-card ${chosen ? 'is-selected' : ''}" data-candidate-card="${h(candidate.id)}"><div class="candidate-main"><label class="candidate-choice"><input type="${type}" name="${h(race.id)}" value="${h(candidate.id)}" data-choice="${h(candidate.id)}" ${chosen ? 'checked' : ''}><span><span class="candidate-name">${candidate.officialNameLines.map(h).join('<br>')}</span>${candidate.partyLabel ? `<span class="candidate-party">${h(candidate.partyLabel)}</span>` : candidate.officialDesignation ? `<span class="candidate-party">${h(candidate.officialDesignation)}</span>` : ''}${candidate.verificationStatus === 'demo-edited' ? '<span class="candidate-party">Name edited locally</span>' : ''}<span class="selected-word">Selected</span></span></label><button type="button" class="candidate-info" data-action="expand" data-id="${h(candidate.id)}" aria-label="Details for ${h(candidate.officialName)}" aria-expanded="${isExpanded}" aria-controls="details-${h(candidate.id)}">${icon('chevron')}<span>Details</span></button></div>${variant.candidateSummaryMode === 'overview-line' && !isExpanded ? `<p class="candidate-overview">${h(text.overviewLine)}</p>` : ''}<div id="details-${h(candidate.id)}" class="candidate-expanded" ${isExpanded ? '' : 'hidden'}><span class="tag example">${h(text.statusLabel)}</span>${editPill(text.id)}<p>${text.sentences.map(h).join(' ')}</p>${sourceWebsite(candidate)}<div class="candidate-detail-actions">${button(`Read more ${icon('next')}`, 'candidate-detail', 'compact', `data-id="${h(candidate.id)}"`)}</div>${variant.showSourceMetadata ? '<p class="source-metadata">Source: Tuscola County sample ballot · 2024<br>Profile: example only</p>' : ''}</div></div>`;
}
function raceView() {
  const race = currentRace(), index = raceNumber(), text = explanation(race);
  return `<div class="race-layout"><div class="race-toolbar"><span class="race-position">Race ${index + 1} of ${model.races.length}</span>${button(`${icon('list')} All races`, 'race-list', 'quiet compact')}</div><div class="progress-track" aria-hidden="true"><span style="width:${((index + 1) / model.races.length) * 100}%"></span></div><div class="race-section">${h(get('sections', race.sectionId).officialTitle)} · 2024 sample</div><h1 class="race-title" id="race-title" tabindex="-1">${h(headingText(race))}</h1>${[race.officialDistrict, race.officialPosition, race.officialTerm].filter(Boolean).map((line) => `<p class="official-meta">${h(line)}</p>`).join('')}${editPill(race.id, 'contest')}<p class="race-instruction" id="race-limit">${h(race.officialSelectionInstruction)}</p>${variant.showPurpose ? `<p class="purpose">${h(text.purposeSentence)}</p>` : ''}${variant.showOfficeExplanation ? `<div class="office-explanation"><span class="tag example">Example content</span>${text.paragraphs.map((paragraph) => `<p>${h(paragraph)}</p>`).join('')}${editPill(text.id)}</div>` : ''}<fieldset class="race-set" aria-labelledby="race-title" aria-describedby="race-limit"><legend class="sr-only">Candidates for ${h(headingText(race))}</legend><div class="candidate-list">${race.candidateIds.map((id) => candidateCard(get('candidates', id), race)).join('')}</div></fieldset><details class="write-in" ${Object.values(model.record(race.id).writeIns).some((name) => name.length) ? 'open' : ''}><summary>Add a write-in${race.writeInSlots > 1 ? ` (${race.writeInSlots} spaces)` : ''}</summary><div class="write-in-fields"><p class="small muted">A name counts toward this race's limit. An empty space does not.</p>${race.writeIns.map((slot, i) => `<label for="${h(slot.id)}">Write-in ${race.writeIns.length > 1 ? i + 1 : 'name'}<input type="text" id="${h(slot.id)}" data-write-in="${h(slot.id)}" maxlength="120" autocomplete="off" value="${h(model.record(race.id).writeIns[slot.id] || '')}"></label>`).join('')}</div></details><div class="selection-message" id="selection-feedback" role="status">${icon('check')}<span>${selectionText(race)}</span></div>${variant.showNextStepCue ? '<p class="next-cue">Choose what you need, then press Next. You can also skip.</p>' : ''}<div class="button-row">${button('Clear this race', 'clear-race', 'quiet compact')}${button('About this race', 'race-detail', 'quiet compact', `data-id="${h(race.id)}"`)}</div></div>`;
}
function selectionText(race) {
  const count = model.count(race.id);
  if (race.maxSelections > 1) return `Selected ${count} of ${race.maxSelections}${variant.showSelectionExplanation && count < race.maxSelections ? ' · You can choose fewer' : ''}`;
  return count ? 'One choice recorded in your guide' : 'No choice yet';
}
function rowReview() {
  return content.sections.filter((section) => section.id !== 'section-straight-party').map((section) => `<section class="review-section" aria-labelledby="review-${h(section.id)}"><h2 id="review-${h(section.id)}">${h(section.officialTitle)}</h2>${section.contestIds.map((id) => {
    const race = get('contests', id), names = chosenNames(race);
    return `<div class="review-row"><div><h3>${h(race.officialTitle)}</h3>${names.length ? names.map((name) => `<p class="review-choice">${icon('check')}<span>${h(name)}</span></p>`).join('') : '<p class="review-undecided">Undecided</p>'}</div>${button('Change', 'change-race', 'compact', `data-id="${h(id)}" aria-label="Change ${h(race.officialTitle)}"`)}${showExplanations ? `<div class="review-explanation"><span class="tag example">Example content</span><p>${h(explanation(race).purposeSentence)}</p>${model.record(id).candidateIds.map((cid) => `<p><strong>${h(get('candidates', cid).officialName)}</strong><br>${summary(get('candidates', cid)).sentences.map(h).join(' ')}</p>`).join('')}</div>` : ''}</div>`;
  }).join('')}</section>`).join('');
}
function reviewView() {
  const answered = model.answered();
  return `<div class="review-content">${steps(2)}<span class="tag">Your personal guide · 2024 sample</span><h1 tabindex="-1" style="margin-top:15px">Your choices, together.</h1><p class="muted">Akron Township · Precinct 1AF<br><span class="small">General election · November 5, 2024</span></p><div class="count-boxes"><div class="count-box"><strong>${answered}</strong><span>${answered === 1 ? 'race' : 'races'} with<br>choices</span></div><div class="count-box"><strong>${model.races.length - answered}</strong><span>${model.races.length - answered === 1 ? 'race' : 'races'} left<br>undecided</span></div></div><p class="small muted">You can leave any race undecided and return to it later.</p><div class="review-controls no-print">${button(`${icon(reviewMode === 'rows' ? 'ballot' : 'list')} ${reviewMode === 'rows' ? 'Show ballot view' : 'Show readable rows'}`, 'toggle-review')}<a class="btn" href="${h(pdfPath())}" target="_blank" rel="noopener noreferrer">${icon('pdf')} Open official sample ballot (PDF) ${icon('source')}</a>${button(`${icon('print')} Print my guide`, 'print')}</div><label class="checkbox-label no-print"><input type="checkbox" id="show-explanations" ${showExplanations ? 'checked' : ''}>Show explanations</label>${reviewMode === 'paper' ? paperView() : ''}<div class="${reviewMode === 'paper' ? 'print-only' : ''}" id="review-rows">${rowReview()}</div><details class="review-ref no-print"><summary>Straight Party Ticket · Source reference</summary><p>This guide records each race on its own. No party choice fills other races.</p><p class="small">Vote for not more than 1 — as printed in the original section.</p><ul>${content.options.map((entry) => `<li>${h(entry.officialLabel)}</li>`).join('')}</ul>${sourcePanel(1)}</details><p class="print-attribution small muted" style="margin-top:24px">Personal guide · Does not cast a vote.<br>Source: Tuscola County, November 5, 2024 sample ballot, pages 1–2.${showExplanations ? '<br>Profile text is labeled example content.' : ''}</p></div>`;
}
function paperView() {
  return `<p class="notice">This is your guide in a paper layout. Use the PDF button to see the official sample.</p><div class="paper-pages" aria-label="Choose a ballot page"><span>Ballot page</span>${[1,2].map((page) => button(page === 1 ? 'Front' : 'Back', 'paper-page', '', `data-page="${page}" aria-pressed="${paperPage === page}"`)).join('')}</div><div class="paper-tools" aria-label="Ballot zoom controls">${[1,2,3].map((z) => button(z === 1 ? 'Fit' : `${z}×`, 'paper-zoom', '', `data-zoom="${z}" aria-pressed="${paperState.zoom === z}"`)).join('')}${button(`${icon('minus')}<span class="sr-only">Zoom out</span>`, 'paper-out')}${button(`${icon('plus')}<span class="sr-only">Zoom in</span>`, 'paper-in')}${button(`${icon('reset')} Reset view`, 'paper-reset')}${button('Find a race', 'race-list')}</div><div class="paper-viewport" id="paper-viewport" aria-label="Paper guide. Use the zoom and move buttons to view the whole guide."><div class="paper-document" id="paper-document"><div class="paper-heading"><h2>MY PERSONAL GUIDE</h2><p>General Election · November 5, 2024<br>Akron Township · Precinct 1AF · Tuscola County, Michigan</p></div>${[paperPage].map((page) => `${page === 2 ? '<h2 class="paper-break">Back of guide</h2>' : ''}<div class="paper-columns">${[1,2,3].map((column) => `<div class="paper-column">${content.contests.filter((contest) => contest.sourceRefs[0].viewerPage === page && contest.sourceRefs[0].column === column).map(paperContest).join('')}</div>`).join('')}</div>`).join('')}<p class="small" style="margin-top:18px">Personal guide. Does not cast a vote. Source: Tuscola County sample ballot.</p></div></div><div class="paper-move" aria-label="Move paper guide"><span>Move</span>${button('←', 'paper-move', '', 'data-direction="left" aria-label="Move left"')}${button('↑', 'paper-move', '', 'data-direction="up" aria-label="Move up"')}${button('↓', 'paper-move', '', 'data-direction="down" aria-label="Move down"')}${button('→', 'paper-move', '', 'data-direction="right" aria-label="Move right"')}</div><p class="paper-state" id="paper-state" aria-live="polite">Fit view</p>`;
}
function paperContest(race) {
  const selected = model.record(race.id);
  return `<section class="paper-contest"><div class="paper-section-title">${h(get('sections', race.sectionId).officialTitle)}</div><h3>${race.officialTitleLines.map(h).join('<br>')}</h3><p class="paper-limit">${h(race.officialSelectionInstruction)}</p>${race.optionIds.map((id) => `<div class="paper-candidate"><span>${h(get('options', id).officialLabel)}</span><span class="paper-oval" aria-hidden="true"></span></div>`).join('')}${race.candidateIds.map((id) => { const candidate = get('candidates', id), chosen = selected.candidateIds.includes(id); return `<div class="paper-candidate ${chosen ? 'chosen' : ''}"><span>${candidate.officialNameLines.map(h).join('<br>')}${candidate.partyLabel || candidate.officialDesignation ? `<small>${h(candidate.partyLabel || candidate.officialDesignation)}</small>` : ''}${chosen ? '<small>Selected</small>' : ''}</span><span class="paper-oval" aria-hidden="true"></span></div>`; }).join('')}${race.writeIns.map((entry) => `<div class="paper-candidate ${selected.writeIns[entry.id]?.trim() ? 'chosen' : ''}"><span>${h(selected.writeIns[entry.id]?.trim() || 'Write-in')}${selected.writeIns[entry.id]?.trim() ? '<small>Selected</small>' : ''}</span><span class="paper-oval" aria-hidden="true"></span></div>`).join('')}<button type="button" class="paper-detail" data-action="race-detail" data-id="${h(race.id)}">${icon('chevron')} Race details${race.kind !== 'straight-party' ? ' & choices' : ''}</button></section>`;
}
function helpView() {
  return `<div class="race-layout"><span class="eyebrow">A HAND WHEN YOU NEED IT</span><h1 tabindex="-1" style="margin-top:12px">Take it one race at a time.</h1><section class="help-card"><h2>Make your guide</h2><p>Choose a name, then press Next. Open Details to read more. Selecting a name does not move you to the next race.</p><p>You can choose fewer than the limit. Skip leaves a race undecided.</p></section><section class="help-card"><h2>Review when you are ready</h2><p>Review brings your choices together. Change takes you back to any race. You can open the original sample PDF or print your guide.</p></section><section class="help-card"><h2>About this example</h2><p>This is a 2024 Akron Township sample. Lake Orion is the preferred example for a later version, after its exact ballot is checked.</p><p>The candidate profiles are labeled examples. This guide has no voting recommendations.</p>${sourcePanel()}</section><section class="help-card"><h2>Your choices</h2><p>${h(statusLabel())} Clearing personal choices does not change the ballot text.</p>${button('Clear personal choices', 'clear-all')}</section><p class="small muted" data-app-version>App ${h(APP_VERSION_LABEL)}</p></div>`;
}
function adminView() {
  const modified = changedGroups(original, content);
  return `<div class="race-layout"><span class="eyebrow">ADMIN DEMO</span><h1 tabindex="-1" style="margin-top:12px">Keep the information clear.</h1><p class="muted">Edit the text, then save it in this browser.</p><div class="notice"><strong>Local demo · No sign-in</strong><br>Saved edits are shared by A1–A5 in this browser. They are not published to other devices.</div><p class="small">App ${h(APP_VERSION_LABEL)} · Content revision ${revision} · Format 1.0.0</p>${adminMessage || contentStore.warning ? `<p class="notice" role="status">${h(adminMessage || contentStore.warning)}</p>` : ''}${button(`${icon('edit')} ${admin ? 'Edit buttons are on' : 'Turn on Edit buttons'}`, 'enable-admin', admin ? '' : 'primary')}${admin ? button('Leave Admin mode', 'leave-admin', 'quiet') : ''}<section class="help-card"><h2>Edit the information</h2><p>Open a race to use its Edit buttons. You can also choose a content group here.</p>${button('Open the current race', 'start', 'primary')}<label class="editor-field" for="edit-group-select">Content group<select id="edit-group-select">${Object.entries(collections).map(([group]) => `<optgroup label="${h(groupLabel(group))}">${allGroups(content).filter(item => item.group === group).map(item => `<option value="${item.group}:${h(item.id)}">${h(item.label)}</option>`).join('')}</optgroup>`).join('')}</select></label>${button('Edit selected group', 'edit-selected')}<p class="small muted">The original PDF stays unchanged. Personal choices are separate.</p></section><section class="help-card"><h2>Move content between browsers</h2><p>Export the saved text as JSON. To import, choose a file and check its changes first.</p>${button('Export saved content', 'export-content')}<label class="editor-field" for="content-file">Import content JSON (up to 5 MiB)<input type="file" id="content-file" accept=".json,application/json"></label><p class="small muted">Files contain text and source links. Personal choices are never included.</p></section><section class="help-card"><h2>Edited locally</h2><p>${modified.length ? `${modified.length} content group${modified.length === 1 ? '' : 's'} changed.` : 'No content changes yet.'}</p>${modified.map(item => `<div>${button(`${icon('edit')} ${h(item.label)}`, 'edit', 'quiet compact', `data-id="${h(item.id)}" data-group="${item.group}"`)}</div>`).join('')}${button(`${icon('reset')} Restore original content`, 'restore-content')}${contentStore.previous ? button('Review previous saved version', 'previous-content', 'quiet') : ''}</section></div>`;
}

function render({ focus = false, keepScroll = false } = {}) {
  const scroll = root.querySelector('.main-scroll')?.scrollTop || 0;
  paperController?.destroy(); paperController = null;
  const navActive = screen === 'home' || screen === 'race' ? 'ballot' : screen;
  root.innerHTML = `<div class="app-layout"><header class="app-header"><div class="brand"><img src="assets/ballot-mark.svg" alt=""><div><span class="brand-title">What's on My Ballot?</span><span class="brand-kicker">MICHIGAN · DISTRICT 9</span></div><button type="button" class="header-help" data-action="help" aria-label="Open help">${icon('help')}</button></div>${admin ? `<div class="admin-ribbon"><span>${icon('edit')} Admin demo · Edit buttons on</span><button type="button" class="admin-exit" data-action="leave-admin">Exit</button></div>` : ''}</header><main id="main" class="main-scroll" tabindex="-1"><div class="main-inner">${screen === 'home' ? homeView() : screen === 'race' ? raceView() : screen === 'review' ? reviewView() : screen === 'admin' ? adminView() : helpView()}</div></main>${screen === 'race' ? `<div class="flow-actions"><div class="flow-action-inner">${button(`${icon('back')}<span class="sr-only">Back</span>`, 'back', 'back-btn')}${button('Skip', 'skip', 'quiet skip-btn')}${button(`${returnToReview || raceNumber() === model.races.length - 1 ? 'Review my guide' : 'Next'} ${icon('next')}`, 'next', 'primary next-btn')}</div></div>` : '<div></div>'}<nav class="bottom-nav" aria-label="Main navigation">${[['ballot','ballot','Ballot'],['review','review','Review'],['help','help','Help'],['admin','edit','Admin']].map(([action, glyph, label]) => `<button type="button" data-action="nav-${action}" ${navActive === action ? 'aria-current="page"' : ''}>${icon(glyph)}${label}</button>`).join('')}</nav></div>`;
  document.body.dataset.design = variant.id;
  document.body.dataset.screen = screen;
  if (screen === 'race' && variant.showSelectionExplanation) {
    const status = document.createElement('p'); status.id = 'quick-choice-status'; status.className = 'quick-choice-status';
    status.innerHTML = `${icon(model.count(currentRace().id) ? 'check' : 'ballot')}<span>${h(selectionText(currentRace()))}</span>`;
    root.querySelector('.race-set').before(status);
  }
  if (screen === 'race' && currentRace().verificationStatus === 'demo-edited') {
    const label = document.createElement('p'); label.className = 'small';
    label.innerHTML = '<span class="tag example">Title edited locally</span>';
    root.querySelector('.race-title').after(label);
  }
  if (screen === 'review' && reviewMode === 'paper') {
    paperController = mountPaper(document.querySelector('#paper-viewport'), document.querySelector('#paper-document'), paperState,
      (state) => { paperState = state; updatePaperControls(); });
    updatePaperControls();
  }
  if (keepScroll) root.querySelector('.main-scroll').scrollTop = scroll;
  if (focus) root.querySelector('h1')?.focus({ preventScroll: true });
}
function syncChoices(message = '', error = false) {
  const race = currentRace();
  root.querySelectorAll('[data-choice]').forEach((input) => {
    input.checked = model.record(race.id).candidateIds.includes(input.dataset.choice);
    input.closest('.candidate-card').classList.toggle('is-selected', input.checked);
  });
  root.querySelectorAll('[data-write-in]').forEach((input) => { const value = model.record(race.id).writeIns[input.dataset.writeIn] || ''; if (input.value !== value) input.value = value; });
  const feedback = root.querySelector('#selection-feedback');
  feedback.classList.toggle('error', error);
  feedback.innerHTML = `${icon(error ? 'help' : 'check')}<span>${h(message || selectionText(race))}</span>`;
  const quickStatus = root.querySelector('#quick-choice-status');
  if (quickStatus) quickStatus.innerHTML = `${icon(model.count(race.id) ? 'check' : 'ballot')}<span>${h(selectionText(race))}</span>`;
  let actionStatus = root.querySelector('#action-status');
  if (!actionStatus) {
    actionStatus = document.createElement('p'); actionStatus.id = 'action-status'; actionStatus.className = 'action-status';
    root.querySelector('.flow-actions').prepend(actionStatus);
  }
  actionStatus.hidden = !error;
  actionStatus.textContent = error ? message : '';
}
function openDialog(title, body, footer = '', { replace = false } = {}) {
  if (!dialog.open) lastFocus = document.activeElement;
  dialog.innerHTML = `<header class="dialog-header"><h2 id="dialog-title" tabindex="-1">${h(title)}</h2><button type="button" class="dialog-close" data-action="close-dialog" aria-label="Close">${icon('close')}</button></header><div class="dialog-content">${body}</div>${footer ? `<footer class="dialog-footer">${footer}</footer>` : ''}`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('#dialog-title').focus();
}
function finishClose() {
  clearTimeout(recoveryTimer); contentStore?.clearRecovery(recoveryOwner);
  editDraft = null; pendingTransition = null; syncDirty();
  dialog.close(); dialog.innerHTML = '';
  post('editor-state', { dirty: false });
  if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  else root.querySelector('h1')?.focus({ preventScroll: true });
}
function renderAfterEdit() {
  const action = lastFocus?.dataset.action, id = lastFocus?.dataset.id, group = lastFocus?.dataset.group;
  render({ keepScroll: true });
  const selector = action ? `[data-action="${CSS.escape(action)}"]${id ? `[data-id="${CSS.escape(id)}"]` : ''}${group ? `[data-group="${CSS.escape(group)}"]` : ''}` : null;
  const target = (selector && root.querySelector(selector)) || root.querySelector('h1');
  target?.focus({ preventScroll: true });
}
function transition(action) {
  if (busy) return;
  if (editDraft && isDirty()) {
    pendingTransition = action;
    if (!dialog.querySelector('#draft-guard')) {
      const panel = document.createElement('section'); panel.className = 'edit-warning'; panel.id = 'draft-guard';
      panel.innerHTML = `<h3 tabindex="-1">Keep your changes?</h3><p>The draft has not been saved.</p><div class="button-row">${button(editDraft.kind === 'import' ? 'Apply changes' : 'Save changes', 'guard-save', 'primary')}${button('Discard changes', 'guard-discard')}${button('Keep editing', 'guard-keep', 'quiet')}</div>`;
      dialog.querySelector('.dialog-content').append(panel); panel.scrollIntoView({ block: 'nearest' }); panel.querySelector('h3').focus();
    }
    return;
  }
  if (dialog.open) finishClose();
  action();
}
function go(next, raceId = null) { transition(() => { screen = next; if (raceId) model.visit(raceId); render({ focus: true }); }); }
function confirmAction(title, text, label, callback) {
  transition(() => { openDialog(title, `<p>${h(text)}</p>`, `${button('Cancel', 'close-dialog')}${button(label, 'confirm-action', 'primary')}`); pendingTransition = callback; });
}
function showRaceList() {
  if (screen === 'review' && reviewMode === 'paper') {
    openDialog('Find a race', `<p class="small muted">Open the same race details with a full-size button.</p><div class="race-jump-list">${content.contests.map((race) => button(`<span class="jump-label">${h(race.officialTitle)}</span>${icon('chevron')}`, 'race-detail', '', `data-id="${h(race.id)}"`)).join('')}</div>`);
    return;
  }
  openDialog('All 27 races', `<p class="small muted">Go to a race at any time. A check means you have a choice there.</p><div class="race-jump-list">${model.races.map((raw, i) => { const race = get('contests', raw.id); return button(`<span class="jump-number">${i + 1}</span><span class="jump-label">${h(race.officialTitle)}</span>${model.count(race.id) ? icon('check') : icon('next')}`, 'jump-race', '', `data-id="${h(race.id)}"`); }).join('')}</div>`);
}
function showCandidate(id) {
  const candidate = get('candidates', id), text = summary(candidate);
  openDialog(candidate.officialName, `<span class="tag example">${h(text.statusLabel)}</span><div class="portrait-line"><img src="${h(get('media', candidate.portraitMediaId).path)}" alt="Photo not added"><p>${h(candidate.partyLabel || 'No party label printed')}<br>Photo not added</p></div><div class="detail-copy">${text.detailParagraphs.map((paragraph) => `<p>${h(paragraph)}</p>`).join('')}</div>${editPill(text.id)}${editPill(candidate.id, 'candidate')}${candidate.verificationStatus === 'demo-edited' ? '<p class="small">Name edited locally. See the original PDF to check it.</p>' : ''}${sourceWebsite(candidate)}${sourcePanel(candidate.sourceRefs[0].viewerPage)}`, `${button(`Read profile example ${icon('next')}`, 'read-document', '', `data-id="${h(candidate.documentIds[0])}" data-candidate="${h(id)}"`)}`);
}
function showDocument(id, candidateId) {
  const doc = get('documents', id);
  openDialog(doc.title, `<span class="tag example">${h(doc.statusLabel)} · Not a website archive</span>${editPill(id, 'document')}<article class="markdown">${renderMarkdown(doc.markdown, original)}</article><p class="small muted">${h(doc.note)}</p>`, candidateId ? button(`${icon('back')} Back to candidate`, 'candidate-detail', '', `data-id="${h(candidateId)}"`) : '');
}
function showRaceDetail(id) {
  const race = get('contests', id), text = explanation(race);
  openDialog(race.officialTitle, `<p><strong>${h(race.officialSelectionInstruction)}</strong></p><span class="tag example">Example content</span>${text.paragraphs.map((paragraph) => `<p>${h(paragraph)}</p>`).join('')}${editPill(text.id)}${showExplanations && race.candidateIds.length ? race.candidateIds.map((cid) => `<h3>${h(get('candidates', cid).officialName)}</h3><p>${summary(get('candidates', cid)).sentences.map(h).join(' ')}</p>`).join('') : ''}${sourcePanel(race.sourceRefs[0].viewerPage)}`, race.kind !== 'straight-party' ? button('Change this race', 'change-race', 'primary', `data-id="${h(id)}"`) : '');
}
function editLabel(id) { return recordLabel(content, id); }
function isDirty() {
  return Boolean(editDraft && (editDraft.kind === 'import'
    ? canonical(editDraft.proposed) !== canonical(editDraft.baseContent)
    : canonical(normalize(editDraft.values)) !== canonical(normalize(editDraft.saved))));
}
function beforeLeave(event) { persistRecovery(); event.preventDefault(); event.returnValue = ''; }
function syncDirty() {
  const dirty = isDirty();
  if (dirty !== unloadActive) {
    window[dirty ? 'addEventListener' : 'removeEventListener']('beforeunload', beforeLeave);
    unloadActive = dirty;
  }
  post('editor-state', { dirty });
}
function persistRecovery() {
  clearTimeout(recoveryTimer);
  if (!isDirty()) { contentStore?.clearRecovery(recoveryOwner); return; }
  if (!contentStore.saveRecovery(editDraft, recoveryOwner)) {
    const note = dialog.querySelector('#recovery-status');
    if (note) note.textContent = 'Draft recovery is unavailable. Keep this window open until you save or export.';
  }
}
function scheduleRecovery() { clearTimeout(recoveryTimer); recoveryTimer = setTimeout(persistRecovery, 400); }
function draftContent(draft = editDraft) { return draft.kind === 'import' ? clone(draft.proposed) : applyFields(draft.baseContent, original, draft); }
function showEditor(id, group = 'editorial') {
  transition(() => {
    admin = true;
    const collection = collections[group], record = get(collection, id);
    const saved = editableValues(record, group);
    editDraft = { kind: 'edit', id, group, collection, revision, baseContent: clone(content), saved, values: clone(saved) };
    renderEditor();
  });
}
function renderEditor() {
  const draft = editDraft;
  openDialog('Edit ' + groupLabel(draft.group), `<p class="small muted">${h(editLabel(draft.id))}</p><p class="notice">Save keeps the text in this browser. Restore original fills the draft; press Save to keep it.</p><div class="editor-form">${Object.entries(draft.values).map(([key, value]) => `<label class="editor-field">${h(fieldLabel(key))}<textarea data-edit-field="${key}" rows="${key === 'markdown' ? 12 : 3}" maxlength="${key === 'markdown' ? 200000 : 4000}" spellcheck="true">${h(value)}</textarea></label>`).join('')}<p class="editor-status" id="editor-status" role="status"></p><p class="small muted" id="recovery-status">Unsaved drafts have a separate recovery copy when browser storage is available.</p><div id="editor-error" role="alert"></div><div class="editor-preview"><strong>Text preview</strong><div id="editor-preview"></div></div></div>`, `${button('Restore original', 'edit-restore', 'compact')}${button('Cancel', 'close-dialog', 'compact')}${button('Save', 'edit-save', 'primary compact')}`);
  updateDraft();
}
function updateDraft() {
  if (!editDraft || editDraft.kind !== 'edit' || busy) return;
  dialog.querySelectorAll('[data-edit-field]').forEach(field => { editDraft.values[field.dataset.editField] = normalize(field.value); });
  const dirty = isDirty(), status = dialog.querySelector('#editor-status');
  status.textContent = dirty ? 'Unsaved changes' : 'No unsaved changes'; status.classList.toggle('dirty', dirty);
  dialog.querySelector('#editor-preview').innerHTML = Object.entries(editDraft.values).map(([key, text]) => key === 'markdown' ? `<article class="markdown">${renderMarkdown(text, original)}</article>` : `<p>${h(text)}</p>`).join('');
  syncDirty(); scheduleRecovery();
}
function editorError(error) {
  const target = dialog.querySelector('#editor-error') || dialog.querySelector('.dialog-content');
  const conflict = error instanceof ContentConflict || contentStore.changedExternally();
  const message = conflict ? 'Saved content changed in another tab. Your draft is still here.' : error.message;
  target.innerHTML = `<section class="edit-warning"><h3 tabindex="-1">Changes were not saved.</h3><p>${h(message)}</p><div class="button-row">${conflict ? button('Reload saved version', 'reload-content') : button('Retry save', 'edit-save', 'primary')}${button('Export draft for recovery', 'export-draft')}</div><p class="small">Reload saved version discards this draft. Export it first if you need a copy.</p></section>`;
  target.querySelector('h3').focus(); announce('Changes were not saved.');
}
async function saveDraft() {
  if (!editDraft || busy) return false;
  busy = true;
  dialog.querySelectorAll('textarea,input').forEach(el => { el.disabled = true; });
  try {
    const next = draftContent(); validateEnvelope(envelope(seed, next, revision), seed, original);
    const saved = await contentStore.commit(next, editDraft.revision, { replaceUnreadable: editDraft.replaceUnreadable === true });
    content = saved.content; revision = saved.contentRevision; adminMessage = `Saved in this browser. Content revision ${revision}.`;
    editDraft.saved = clone(editDraft.values); editDraft.baseContent = clone(content);
    syncDirty(); contentStore.clearRecovery(recoveryOwner); announce('Saved in this browser.');
    return true;
  } catch (error) { editorError(error); persistRecovery(); return false; }
  finally { busy = false; dialog.querySelectorAll('textarea,input').forEach(el => { el.disabled = false; }); }
}
function downloadContent(body, label = 'content') {
  const value = envelope(seed, body, revision); validateEnvelope(value, seed, original);
  const file = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(file), link = document.createElement('a');
  link.href = url; link.download = `${seed.datasetId}-schema-1.0.0-${new Date().toISOString().slice(0, 10)}-${label}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(label === 'draft-recovery' ? 'Draft recovery file exported. The draft is not saved.' : 'Saved content exported.');
}
function showImportPreview(proposed, title = 'Review imported content', label = 'Apply import', provenance = '', replaceUnreadable = false) {
  const changes = changedGroups(content, proposed);
  editDraft = { kind: 'import', proposed: clone(proposed), baseContent: clone(content), revision, title, label, provenance, replaceUnreadable };
  openDialog(title, `<p class="notice">${h(provenance || 'Review these content changes before you apply them.')} Your personal choices stay as they are.</p><p>${changes.length} content group${changes.length === 1 ? '' : 's'} will change.</p><div class="import-changes">${changes.length ? changes.map(({id, group, label: name}) => {
    const before = editableValues(get(collections[group], id), group), after = editableValues(proposed[collections[group]].find(item => item.id === id), group);
    return `<details><summary>${h(name)} · ${h(groupLabel(group))}</summary>${Object.keys(after).filter(key => before[key] !== after[key]).map(key => `<h3>${h(fieldLabel(key))}</h3><p class="small muted">Saved text</p><pre>${h(before[key])}</pre><p class="small muted">Proposed text</p>${key === 'markdown' ? `<article class="markdown">${renderMarkdown(after[key], original)}</article>` : `<pre>${h(after[key])}</pre>`}`).join('')}</details>`;
  }).join('') : '<p>This content matches the saved version.</p>'}</div><p id="recovery-status" class="small muted">Nothing is saved until you apply it. The prior saved version will remain available.</p><div id="editor-error" role="alert"></div>`, `${button('Cancel', 'close-dialog')}${button(h(label), 'edit-save', 'primary')}`);
  syncDirty(); scheduleRecovery();
}
async function importFile(file) {
  if (!file || busy) return;
  busy = true;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error('This file is too large. The limit is 5 MiB.');
    const value = parseImport(await file.text(), seed, original);
    busy = false;
    transition(() => showImportPreview(value.content, 'Review imported content', 'Apply import', `File revision ${value.contentRevision}. Applying it creates a new local revision.`));
  } catch (error) {
    openDialog('The file was not imported', `<p role="alert">${h(error.message)}</p><p>Your saved content and personal choices are unchanged.</p>`, button('Close', 'close-dialog'));
  } finally { busy = false; }
}
function offerRecovery() {
  recoveryOffer = contentStore.recoveries()[0] || null;
  if (!recoveryOffer) return;
  openDialog('An unsaved draft is available', `<p>${recoveryOffer.matching ? 'This draft matches the saved content. Recover it to keep editing, or discard the recovery copy.' : 'The saved content has changed since this draft was made. You can export the old draft for review, or discard its recovery copy.'}</p><p>Recovering a draft does not save it.</p><div id="editor-error" role="alert"></div>`, `${button('Discard recovery copy', 'discard-recovery')}${button('Later', 'close-dialog')}${recoveryOffer.matching ? button('Recover draft', 'recover-draft', 'primary') : button('Export old draft', 'export-old-draft')}`);
}

function advance() { if (returnToReview || raceNumber() === model.races.length - 1) { returnToReview = false; go('review'); } else go('race', model.races[raceNumber() + 1].id); }
function updatePaperControls() {
  if (!paperController) return;
  document.querySelectorAll('[data-action=paper-zoom]').forEach((el) => el.setAttribute('aria-pressed', String(Math.abs(Number(el.dataset.zoom) - paperState.zoom) < .02)));
  const label = document.querySelector('#paper-state'); if (label) label.textContent = paperState.zoom === 1 ? 'Fit view · Whole page' : `${paperState.zoom.toFixed(1)}× fitted size · Drag or use Move buttons`;
}
const actions = {
  start: () => { returnToReview = false; go('race', model.state.currentRaceId); },
  'nav-ballot': () => { returnToReview = false; go(model.state.started ? 'race' : 'home'); },
  'nav-review': () => go('review'), 'nav-help': () => go('help'), help: () => go('help'), 'nav-admin': () => go('admin'),
  next: advance,
  back: () => { if (returnToReview) { returnToReview = false; go('review'); } else if (raceNumber() === 0) go('home'); else go('race', model.races[raceNumber() - 1].id); },
  skip: () => { const id = currentRace().id; const skip = () => { model.clearRace(id, true); advance(); }; if (model.count(id)) confirmAction('Skip this race?', 'Skipping clears the choices in this race. You can return to it later.', 'Clear and skip', skip); else skip(); },
  'clear-race': () => { model.clearRace(currentRace().id); syncChoices('This race is now undecided.'); },
  'clear-all': () => confirmAction('Clear personal choices?', 'This clears your choices for this sample ballot. Ballot text and Admin edits stay as they are.', 'Clear choices', () => { model.clearAll(); screen = 'home'; render({ focus: true }); }),
  'race-list': showRaceList,
  'jump-race': (el) => { returnToReview = screen === 'review'; go('race', el.dataset.id); },
  'change-race': (el) => { returnToReview = true; go('race', el.dataset.id); },
  expand: (el) => { const id = el.dataset.id; if (variant.candidateSummaryMode === 'three-sentences') { showCandidate(id); return; } if (expanded.has(id)) expanded.delete(id); else expanded.add(id); const card = el.closest('.candidate-card'); const candidate = get('candidates', id); card.outerHTML = candidateCard(candidate, currentRace()); root.querySelector(`[data-candidate-card="${id}"] .candidate-info`).focus({ preventScroll: true }); },
  'candidate-detail': (el) => showCandidate(el.dataset.id), 'race-detail': (el) => showRaceDetail(el.dataset.id),
  'read-document': (el) => showDocument(el.dataset.id, el.dataset.candidate),
  'close-dialog': () => transition(() => {}),
  'confirm-action': async () => { const callback = pendingTransition; pendingTransition = null; finishClose(); await callback?.(); },
  'toggle-review': () => { reviewMode = reviewMode === 'rows' ? 'paper' : 'rows'; render({ keepScroll: true }); root.querySelector('[data-action=toggle-review]')?.focus({ preventScroll: true }); },
  print: () => transition(() => { if (screen !== 'review') { screen = 'review'; render(); } window.print(); }),
  'paper-zoom': (el) => paperController?.zoomTo(Number(el.dataset.zoom)),
  'paper-in': () => paperController?.zoomTo(Math.min(6, paperState.zoom + .5)),
  'paper-out': () => paperController?.zoomTo(Math.max(1, paperState.zoom - .5)),
  'paper-reset': () => paperController?.reset(), 'paper-move': (el) => paperController?.move(el.dataset.direction),
  'paper-page': (el) => { paperPage = Number(el.dataset.page) === 2 ? 2 : 1; paperState = { zoom: 1, x: 0, y: 0 }; render({ keepScroll: true }); root.querySelector(`[data-action=paper-page][data-page="${paperPage}"]`).focus({ preventScroll: true }); },
  'enable-admin': () => { admin = true; render({ keepScroll: true }); announce('Edit buttons are on.'); },
  'leave-admin': () => transition(() => { admin = false; if (screen === 'admin') screen = 'home'; render({ focus: true }); }),
  edit: (el) => showEditor(el.dataset.id, el.dataset.group),
  'edit-save': async () => { if (await saveDraft()) { finishClose(); renderAfterEdit(); } },
  'edit-restore': () => { const baseline = original[editDraft.collection].find((item) => item.id === editDraft.id); const values = editableValues(baseline, editDraft.group); dialog.querySelectorAll('[data-edit-field]').forEach((field) => { field.value = values[field.dataset.editField]; }); updateDraft(); },
  'guard-save': async () => { if (await saveDraft()) { const callback = pendingTransition; finishClose(); renderAfterEdit(); callback?.(); } },
  'guard-discard': () => { const callback = pendingTransition; finishClose(); callback?.(); },
  'guard-keep': () => { dialog.querySelector('#draft-guard')?.remove(); pendingTransition = null; (dialog.querySelector('[data-edit-field]') || dialog.querySelector('#dialog-title'))?.focus(); },
  'restore-content': () => transition(() => showImportPreview(original, 'Restore original content?', 'Restore content', contentStore.hasUnreadable ? 'The unreadable saved record will be replaced by the bundled original. This cannot recover text from the unreadable record.' : '', contentStore.hasUnreadable)),
  'previous-content': () => transition(() => showImportPreview(contentStore.previous.content, 'Review previous saved version', 'Restore previous version')),
  'edit-selected': () => { const [group, id] = root.querySelector('#edit-group-select').value.split(':'); showEditor(id, group); },
  'export-content': () => transition(() => downloadContent(content)),
  'export-draft': () => { try { downloadContent(draftContent(), 'draft-recovery'); } catch (error) { editorError(error); } },
  'reload-content': () => {
    const saved = contentStore.load(); content = saved.content; revision = saved.contentRevision;
    adminMessage = contentStore.warning || 'Loaded the saved version.'; finishClose(); renderAfterEdit();
  },
  'recover-draft': () => {
    const offer = contentStore.recoveries().find(item => item.key === recoveryOffer?.key);
    if (!offer?.matching || contentStore.changedExternally()) { offerRecovery(); return; }
    const draft = clone(offer.draft);
    admin = true;
    if (draft.kind === 'import') showImportPreview(draft.proposed, draft.title, draft.label, draft.provenance);
    else {
      draft.baseContent = clone(content); draft.saved = editableValues(get(collections[draft.group], draft.id), draft.group);
      editDraft = draft; renderEditor();
    }
    contentStore.clearRecovery(offer.owner); recoveryOffer = null; persistRecovery();
  },
  'discard-recovery': () => { if (recoveryOffer) contentStore.clearRecovery(recoveryOffer.owner); recoveryOffer = null; finishClose(); },
  'export-old-draft': () => { try { downloadContent(draftContent(recoveryOffer.draft), 'draft-recovery'); } catch (error) { dialog.querySelector('#editor-error').textContent = error.message; } },
};
document.addEventListener('click', async (event) => { const el = event.target.closest('[data-action]'); if (!el || el.disabled || busy) return; const fn = actions[el.dataset.action]; if (fn) { try { await fn(el); } catch (error) { announce(error.message); } } });
document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('[data-choice]')) { const result = model.choose(currentRace().id, el.dataset.choice, el.checked); syncChoices(result.message || '', !result.ok); }
  if (el.id === 'content-file') { importFile(el.files[0]); el.value = ''; }
  if (el.id === 'show-explanations') { showExplanations = el.checked; render({ keepScroll: true }); root.querySelector('#show-explanations').focus({ preventScroll: true }); }
});
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-write-in]')) { const result = model.write(currentRace().id, el.dataset.writeIn, el.value); syncChoices(result.message || '', !result.ok); }
  if (el.matches('[data-edit-field]')) updateDraft();
});
dialog.addEventListener('cancel', (event) => { event.preventDefault(); transition(() => {}); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistRecovery(); });
window.addEventListener('storage', event => {
  if (!contentStore || (event.key !== contentStore.key && event.key !== null)) return;
  if (!contentStore.changedExternally()) return;
  if (editDraft) { editorError(new ContentConflict('Saved content changed.')); return; }
  const saved = contentStore.load(); content = saved.content; revision = saved.contentRevision;
  adminMessage = contentStore.warning || 'Content was updated in another tab.';
  render({ keepScroll: true }); announce(adminMessage);
});
window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.origin !== location.origin || event.data?.channel !== 'ballot-preview-v1' || !model) return;
  if (event.data.type === 'design' && /^A[1-5]$/.test(event.data.id)) transition(() => {
    variant = settings.variants.find((entry) => entry.id === event.data.id); render({ keepScroll: true });
    const url = new URL(location.href); url.searchParams.set('design', variant.id.toLowerCase()); history.replaceState(null, '', url); post('design-applied', { id: variant.id });
  });
  if (event.data.type === 'demo' && ['fresh','example','clear','restore'].includes(event.data.action)) {
    const action = event.data.action;
    if (action === 'restore') actions['restore-content']();
    else if (action === 'clear') actions['clear-all']();
    else confirmAction(action === 'fresh' ? 'Start a fresh guide?' : 'Load example choices?', action === 'fresh'
      ? 'Clear personal choices and return to the first screen? Ballot text stays as it is.'
      : 'Replace personal choices with one labeled demo write-in? No real candidate is recommended.', action === 'fresh' ? 'Start fresh' : 'Load example', () => {
        if (action === 'fresh') { model.clearAll(); screen = 'home'; } else { model.example(); screen = 'review'; reviewMode = 'rows'; }
        render({ focus: true });
      });
  }
  if (event.data.type === 'print') actions.print();
});
async function init() {
  try {
    const responses = await Promise.all([fetch('data/ballot.seed.json'), fetch('data/variants.json')]);
    if (responses.some((response) => !response.ok)) throw new Error('Missing ballot data');
    [seed, settings] = await Promise.all(responses.map((response) => response.json()));
    if (seed.format !== 'whatsonmyballot-content' || seed.schemaVersion !== '1.0.0' || settings.datasetId !== seed.datasetId) throw new Error('Unsupported ballot data');
    original = await loadOriginal(seed);
    let storage = null; try { storage = window.localStorage; } catch { /* Temporary choices remain usable. */ }
    contentStore = createContentStore({ seed, original, storage, basePath: new URL('../', import.meta.url).pathname, locks: navigator.locks });
    const saved = contentStore.load(); content = saved.content; revision = saved.contentRevision;
    model = createGuideModel(seed, storage);
    const params = new URLSearchParams(location.search); variant = settings.variants.find((entry) => entry.id === designId(params.get('design')));
    if (params.get('screen') === 'race') { screen = 'race'; const id = params.get('race'); model.visit(model.races.some((race) => race.id === id) ? id : model.state.currentRaceId); }
    if (params.get('screen') === 'review') screen = 'review';
    render(); document.body.dataset.ready = 'true'; post('ready', { id: variant.id }); offerRecovery();
  } catch (error) { root.innerHTML = `<main class="loading"><h1>The sample could not load.</h1><p>Open this demo through a local web server or GitHub Pages, then try again.</p><a href="../../sharedrefs/ballots/2024-11-05-akron-1af.pdf">Open the saved sample ballot PDF</a></main>`; console.error(error); }
}
init();
