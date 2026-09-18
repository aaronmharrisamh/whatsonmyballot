import { APP_VERSION_LABEL } from '../../../version.js';
import { referenceUrl } from '../../../sharedrefs/registry.js';
import { escapeHtml as h, icon, designId, safeHttps } from '../../Mockup A/assets/shared.js';
import { createGuideModel } from '../../Mockup A/assets/model.js';
import { renderMarkdown } from '../../Mockup A/assets/content-renderer.js';
import { mountPaper } from './paper.js';
import { loadOriginal, envelope, validateEnvelope, parseImport, safeContentLink, MAX_IMPORT_BYTES } from '../../Mockup A/assets/content-contract.js';
import { createContentStore, ContentConflict } from '../../Mockup A/assets/content-store.js';
import { editableValues, fieldLabel, groupLabel, recordLabel, allGroups, changedGroups, applyFields, collections, canonical, normalize, clone } from '../../Mockup A/assets/content-fields.js';

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

const searchIcon = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const assetUrl = path => new URL('../../Mockup A/' + path, import.meta.url).href;
function viewSwitch() {
  return '<div class="b-viewbar"><div class="b-view-tabs" aria-label="Ballot reading view">' + button(icon('ballot')+'<span>Whole ballot</span>', 'whole-ballot', screen==='home'?'active':'', 'aria-pressed="'+(screen==='home')+'"') + button(icon('list')+'<span>One section</span>', 'read-section', screen==='race'?'active':'', 'aria-pressed="'+(screen==='race')+'"') + '</div>' + button(searchIcon+'<span>Find a race</span>','race-list','b-find','aria-label="Find a race"')+'</div>';
}
function homeView() {
  return '<div class="b-workspace"><div class="b-intro"><div><span class="b-kicker">YOUR VOICE. YOUR VOTE.</span><h1 tabindex="-1">Let’s vote.</h1></div><p>Akron Township · Precinct 1AF<br><span>November 5, 2024 · Historical sample</span></p></div>'+viewSwitch()+'<div class="b-desk"><aside class="b-rail"><div class="b-rail-title"><span class="b-stars" aria-hidden="true">★ ★ ★</span><h2>Your ballot.<br>Your own pace.</h2><p>Look around. Read more.<br>Mark your choices.</p></div><div class="b-progress"><strong data-guide-count>'+model.answered()+'</strong><span>of 27 races marked</span><div class="b-progress-track"><i style="width:'+model.answered()/27*100+'%"></i></div></div><dl class="b-legend"><div><dt><span class="b-oval-demo"></span>Make a choice</dt><dd>Mark the oval by a name.</dd></div><div><dt>'+icon('chevron')+'Quick details</dt><dd>Open a short explanation.</dd></div><div><dt>'+searchIcon+'Read more</dt><dd>Open a full profile.</dd></div></dl><a class="b-source-link" href="'+h(pdfPath())+'" target="_blank" rel="noopener noreferrer">'+icon('pdf')+'Original sample PDF</a><p class="b-small">Your personal guide does not cast a vote.</p></aside><section class="b-canvas" aria-label="Virtual ballot">'+paperView()+'</section></div></div>';
}
function paperView() {
 return '<div class="b-pagebar"><div class="b-pages" aria-label="Ballot page">'+[1,2].map(page=>button(page===1?'1 · Front':'2 · Back','paper-page',paperPage===page?'active':'','data-page="'+page+'" aria-pressed="'+(paperPage===page)+'"')).join('')+'</div>'+button(icon('fit')+'<span>Move</span>','paper-move-menu','b-move-open')+'</div><div class="paper-viewport" id="paper-viewport" tabindex="0" role="region" aria-label="Virtual ballot. Pinch or use zoom buttons. Arrow keys move the page."><div class="paper-document" id="paper-document"><header class="b-paper-heading"><span class="b-paper-eyebrow">PERSONAL BALLOT GUIDE · HISTORICAL SAMPLE</span><h2>General Election · November 5, 2024</h2><p>Akron Township · Precinct 1AF · Tuscola County, Michigan</p><span class="b-paper-page">PAGE '+paperPage+' OF 2</span></header><div class="paper-columns">'+[1,2,3].map(column=>'<div class="paper-column">'+content.contests.filter(race=>race.sourceRefs[0].viewerPage===paperPage&&race.sourceRefs[0].column===column).map(race=>ballotSection(race,true)).join('')+'</div>').join('')+'</div><footer class="b-paper-foot">Personal guide · Does not cast a vote · All names from the source sample are included.</footer></div></div><div class="b-zoom-strip"><div class="b-zoom-controls" aria-label="Ballot zoom controls">'+button('Fit','paper-zoom','','data-zoom="1" aria-label="Fit the ballot width"')+button(icon('minus'),'paper-out','','aria-label="Zoom out"')+button('2×','paper-zoom','','data-zoom="2" aria-label="Zoom to two times fit"')+button('3×','paper-zoom','','data-zoom="3" aria-label="Zoom to three times fit"')+button(icon('plus'),'paper-in','','aria-label="Zoom in"')+button(icon('reset'),'paper-reset','','aria-label="Reset ballot view"')+'</div><span id="paper-state" class="b-zoom-state" aria-live="polite">Fit width</span></div>';
}
function ballotSection(race, paper=false) {
 const text=explanation(race),open=expanded.has(race.id),prefix=paper?'paper':'section',isRace=race.guideBehavior==='individual-choices';
 const section=get('sections',race.sectionId);
 return '<section class="b-ballot-section '+(paper?'is-paper':'is-readable')+'" data-race-id="'+h(race.id)+'" id="'+prefix+'-'+h(race.id)+'" aria-labelledby="'+prefix+'-title-'+h(race.id)+'"><div class="b-section-band">'+h(section.officialTitle)+'</div><header class="b-race-heading"><div><h2 class="race-title" id="'+prefix+'-title-'+h(race.id)+'">'+race.officialTitleLines.map(h).join('<br>')+'</h2><p class="b-limit">'+h(race.officialSelectionInstruction)+'</p></div><div class="b-row-tools">'+button(icon('chevron'),'expand-race','b-icon-btn','data-id="'+h(race.id)+'" aria-label="Quick details for '+h(race.officialTitle)+'" aria-expanded="'+open+'" aria-controls="'+prefix+'-note-'+h(race.id)+'"')+button(searchIcon,'race-detail','b-icon-btn','data-id="'+h(race.id)+'" aria-label="More information about '+h(race.officialTitle)+'"')+'</div></header>'+editPill(race.id,'contest')+'<div class="b-inline b-office-note" id="'+prefix+'-note-'+h(race.id)+'" '+(open?'':'hidden')+'><span class="tag example">Example explanation</span>'+text.paragraphs.map(p=>'<p>'+h(p)+'</p>').join('')+editPill(text.id)+'</div>'+(isRace?'<fieldset class="b-choices" aria-labelledby="'+prefix+'-title-'+h(race.id)+'"><legend class="sr-only">Choices for '+h(race.officialTitle)+'</legend>'+race.candidateIds.map(id=>candidateCard(get('candidates',id),race,paper)).join('')+'</fieldset>':'<p class="b-reference-note">Source reference. Choose each race on its own.</p>'+race.optionIds.map(id=>'<div class="b-reference-row"><span class="b-oval-demo" aria-hidden="true"></span>'+h(get('options',id).officialLabel)+'</div>').join(''))+(isRace?(paper?race.writeIns.map(slot=>'<button class="b-paper-write" type="button" data-action="read-section" data-id="'+h(race.id)+'"><span class="b-oval-demo '+(model.record(race.id).writeIns[slot.id]?.trim()?'filled':'')+'" aria-hidden="true"></span><span>'+h(model.record(race.id).writeIns[slot.id]||'Write-in')+'</span>'+icon('edit')+'</button>').join(''):writeInFields(race))+'<div class="b-race-status" data-choice-status data-race-id="'+h(race.id)+'">'+h(selectionText(race))+'</div>':'')+'</section>';
}
function candidateCard(candidate,race,paper=false){
 const text=summary(candidate),open=expanded.has(candidate.id),chosen=model.record(race.id).candidateIds.includes(candidate.id),prefix=paper?'paper':'section';
 return '<div class="candidate-card b-candidate '+(chosen?'is-selected':'')+'" data-candidate-card="'+h(candidate.id)+'" data-race-id="'+h(race.id)+'"><div class="b-candidate-row"><label class="candidate-choice"><input type="'+(race.maxSelections===1?'radio':'checkbox')+'" name="'+prefix+'-'+h(race.id)+'" value="'+h(candidate.id)+'" data-choice="'+h(candidate.id)+'" data-race-id="'+h(race.id)+'" '+(chosen?'checked':'')+'><span><span class="candidate-name">'+candidate.officialNameLines.map(h).join('<br>')+'</span>'+(candidate.partyLabel||candidate.officialDesignation?'<span class="candidate-party">'+h(candidate.partyLabel||candidate.officialDesignation)+'</span>':'')+(candidate.verificationStatus==='demo-edited'?'<span class="candidate-party">Name edited locally</span>':'')+'<span class="selected-word">Selected</span></span></label><div class="b-row-tools">'+button(icon('chevron'),'expand','b-icon-btn candidate-info','data-id="'+h(candidate.id)+'" aria-label="Quick details for '+h(candidate.officialName)+'" aria-expanded="'+open+'" aria-controls="'+prefix+'-details-'+h(candidate.id)+'"')+button(searchIcon,'candidate-detail','b-icon-btn','data-id="'+h(candidate.id)+'" aria-label="More information about '+h(candidate.officialName)+'"')+'</div></div><div class="candidate-expanded b-inline" id="'+prefix+'-details-'+h(candidate.id)+'" '+(open?'':'hidden')+'><span class="tag example">'+h(text.statusLabel)+'</span><p>'+text.sentences.map(h).join(' ')+'</p>'+editPill(text.id)+sourceWebsite(candidate)+'</div></div>';
}
function writeInFields(race){
 return '<details class="write-in" '+(Object.values(model.record(race.id).writeIns).some(Boolean)?'open':'')+'><summary>Add a write-in</summary><div class="write-in-fields"><p class="small muted">A name counts toward the selection limit.</p>'+race.writeIns.map((slot,i)=>'<label for="'+h(slot.id)+'">Write-in '+(race.writeIns.length>1?i+1:'name')+'<input id="'+h(slot.id)+'" type="text" maxlength="120" data-write-in="'+h(slot.id)+'" data-race-id="'+h(race.id)+'" value="'+h(model.record(race.id).writeIns[slot.id]||'')+'" autocomplete="off"></label>').join('')+'</div></details>';
}
function raceView(){
 const race=currentRace();
 return '<div class="b-section-view"><div class="b-section-intro"><span class="b-kicker">A CLOSER LOOK</span><h1 tabindex="-1">One section at a time.</h1><p>Section '+(raceNumber()+1)+' of 27 · November 2024 sample</p></div>'+viewSwitch()+'<div class="b-readable-paper">'+ballotSection(race)+'</div><div class="selection-message" id="selection-feedback" role="status">'+h(selectionText(race))+'</div><div class="button-row">'+button('Clear this race','clear-race','quiet')+'</div></div>';
}
function helpView(){
 return '<div class="race-layout b-help"><span class="b-kicker">A LITTLE GUIDANCE</span><h1 tabindex="-1">Make the ballot your own.</h1><section class="help-card"><h2>See the whole ballot</h2><p>Pinch or use 2× and 3× to look closer. Drag to move around. Fit shows all three ballot columns. Zoom out for a page overview. Reset returns to the starting view.</p><p>On a computer, scroll to move. Hold Ctrl while scrolling to zoom the ballot. You can also focus the ballot and use arrow keys, plus, minus, and Home.</p></section><section class="help-card"><h2>Read one section</h2><p>Choose One section for large text and full-size buttons. Next and Back move through the races. Skip leaves a race undecided.</p></section><section class="help-card"><h2>Open more information</h2><p>The chevron opens a short explanation in the ballot. The magnifying glass opens a longer profile in a window.</p></section><section class="help-card"><h2>About this sample</h2><p>This is the complete November 5, 2024 Akron Township, Precinct 1AF sample. Profiles are labeled examples. Your guide does not cast a vote.</p>'+sourcePanel()+'</section><p class="small muted">'+h(statusLabel())+' App '+h(APP_VERSION_LABEL)+'</p>'+button('Clear personal choices','clear-all')+'</div>';
}
function render({focus=false,keepScroll=false}={}){
 const scroll=root.querySelector('.main-scroll')?.scrollTop||0;
 paperController?.destroy();paperController=null;
 const navActive=screen==='home'||screen==='race'?'ballot':screen;
 root.innerHTML='<div class="app-layout"><header class="app-header b-masthead"><a class="b-brand" href="#" data-action="whole-ballot"><img src="assets/flag-mark.svg" alt="" width="38" height="38"><span>What’s on my ballot?<small>MICHIGAN · DISTRICT 9</small></span></a>'+button(icon('help'),'help','b-help-button','aria-label="Open help"')+(admin?'<div class="admin-ribbon"><span>'+icon('edit')+'Edit buttons on</span><button class="admin-exit" data-action="leave-admin">Exit Admin</button></div>':'')+'</header><main id="main" class="main-scroll" tabindex="-1"><div class="main-inner">'+(screen==='home'?homeView():screen==='race'?raceView():screen==='review'?reviewView():screen==='admin'?adminView():helpView())+'</div></main>'+(screen==='race'?'<div class="flow-actions"><div class="flow-action-inner">'+button(icon('back')+'<span>Back</span>','back','back-btn')+button('Skip','skip','quiet skip-btn')+button((returnToReview||raceNumber()===model.races.length-1?'Review':'Next')+icon('next'),'next','primary next-btn')+'</div></div>':'<div class="b-no-flow"></div>')+'<nav class="bottom-nav" aria-label="Main navigation">'+[['ballot','ballot','Ballot'],['review','review','My guide'],['help','help','Help'],['admin','edit','Admin']].map(([action,glyph,label])=>'<button data-action="nav-'+action+'" '+(navActive===action?'aria-current="page"':'')+'>'+icon(glyph)+label+'</button>').join('')+'</nav></div>';
 document.body.dataset.design='B1';document.body.dataset.screen=screen;
 if(screen==='home'){
  paperController=mountPaper(document.querySelector('#paper-viewport'),document.querySelector('#paper-document'),paperState,state=>{paperState=state;updatePaperControls();});
  updatePaperControls();
 }
 if(keepScroll)root.querySelector('.main-scroll').scrollTop=scroll;
 if(focus)root.querySelector('h1')?.focus({preventScroll:true});
}
function syncChoices(message='',error=false){
 for(const input of root.querySelectorAll('[data-choice]')){
  input.checked=model.record(input.dataset.raceId).candidateIds.includes(input.dataset.choice);
  input.closest('.candidate-card').classList.toggle('is-selected',input.checked);
 }
 for(const input of root.querySelectorAll('[data-write-in]')){
  const value=model.record(input.dataset.raceId).writeIns[input.dataset.writeIn]||'';if(input.value!==value)input.value=value;
 }
 for(const el of root.querySelectorAll('[data-choice-status]'))el.textContent=selectionText(get('contests',el.dataset.raceId));
 const feedback=root.querySelector('#selection-feedback');
 if(feedback){feedback.classList.toggle('error',error);feedback.textContent=message||selectionText(currentRace());}
 root.querySelectorAll('[data-guide-count]').forEach(el=>el.textContent=model.answered());
 const progress=root.querySelector('.b-progress-track i');if(progress)progress.style.width=model.answered()/27*100+'%';
 let banner=root.querySelector('#b-choice-message');
 if(error&&!banner){banner=document.createElement('div');banner.id='b-choice-message';banner.className='b-choice-message';banner.setAttribute('role','alert');root.querySelector('.bottom-nav').before(banner);}
 if(banner){banner.hidden=!error;banner.textContent=message;}
 if(message)announce(message);
}
function showRaceList(){
 openDialog('Find a race','<p>Open a section in the ballot, or choose One section for large text.</p><div class="race-jump-list">'+model.races.map((raw,i)=>{const race=get('contests',raw.id);return button('<span class="jump-number">'+(i+1)+'</span><span class="jump-label">'+h(race.officialTitle)+'</span>'+icon('next'),'locate-race','','data-id="'+h(race.id)+'"');}).join('')+'</div>');
}
function locateRace(id){
 transition(()=>{
  const race=get('contests',id);model.visit(id);
  if(screen==='race'){render({focus:true});return;}
  const page=race.sourceRefs[0].viewerPage;
  if(screen!=='home'||page!==paperPage){screen='home';paperPage=page;paperState={zoom:1,x:0,y:0};render();}
  paperController.focusElement(root.querySelector('#paper-'+CSS.escape(id)));
  root.querySelector('#paper-'+CSS.escape(id)+' .b-icon-btn')?.focus({preventScroll:true});
 });
}
function expandInline(el,race=false){
 const id=el.dataset.id,prefix=screen==='home'?'paper':'section',wasOpen=expanded.has(id);
 if(wasOpen)expanded.delete(id);else expanded.add(id);
 el.setAttribute('aria-expanded',String(!wasOpen));
 const panel=document.getElementById(prefix+(race?'-note-':'-details-')+id);panel.hidden=wasOpen;
 paperController?.reflow();
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
  return `<div class="review-content">${steps(2)}<span class="tag">Your personal guide · 2024 sample</span><h1 tabindex="-1" style="margin-top:15px">Your choices, together.</h1><p class="muted">Akron Township · Precinct 1AF<br><span class="small">General election · November 5, 2024</span></p><div class="count-boxes"><div class="count-box"><strong>${answered}</strong><span>${answered === 1 ? 'race' : 'races'} with<br>choices</span></div><div class="count-box"><strong>${model.races.length - answered}</strong><span>${model.races.length - answered === 1 ? 'race' : 'races'} left<br>undecided</span></div></div><p class="small muted">You can leave any race undecided and return to it later.</p><div class="review-controls no-print">${button(`${icon('ballot')} Back to whole ballot`, 'toggle-review')}<a class="btn" href="${h(pdfPath())}" target="_blank" rel="noopener noreferrer">${icon('pdf')} Open official sample ballot (PDF) ${icon('source')}</a>${button(`${icon('print')} Print my guide`, 'print')}</div><label class="checkbox-label no-print"><input type="checkbox" id="show-explanations" ${showExplanations ? 'checked' : ''}>Show explanations</label>${reviewMode === 'paper' ? paperView() : ''}<div class="${reviewMode === 'paper' ? 'print-only' : ''}" id="review-rows">${rowReview()}</div><details class="review-ref no-print"><summary>Straight Party Ticket · Source reference</summary><p>This guide records each race on its own. No party choice fills other races.</p><p class="small">Vote for not more than 1 — as printed in the original section.</p><ul>${content.options.map((entry) => `<li>${h(entry.officialLabel)}</li>`).join('')}</ul>${sourcePanel(1)}</details><p class="print-attribution small muted" style="margin-top:24px">Personal guide · Does not cast a vote.<br>Source: Tuscola County, November 5, 2024 sample ballot, pages 1–2.${showExplanations ? '<br>Profile text is labeled example content.' : ''}</p></div>`;
}
function adminView() {
  const modified = changedGroups(original, content);
  return `<div class="race-layout"><span class="eyebrow">ADMIN DEMO</span><h1 tabindex="-1" style="margin-top:12px">Keep the information clear.</h1><p class="muted">Edit the text, then save it in this browser.</p><div class="notice"><strong>Local demo · No sign-in</strong><br>Saved edits are shared by A1–A5 and B1 in this browser. They are not published to other devices.</div><p class="small">App ${h(APP_VERSION_LABEL)} · Content revision ${revision} · Format 1.0.0</p>${adminMessage || contentStore.warning ? `<p class="notice" role="status">${h(adminMessage || contentStore.warning)}</p>` : ''}${button(`${icon('edit')} ${admin ? 'Edit buttons are on' : 'Turn on Edit buttons'}`, 'enable-admin', admin ? '' : 'primary')}${admin ? button('Leave Admin mode', 'leave-admin', 'quiet') : ''}<section class="help-card"><h2>Edit the information</h2><p>Open a race to use its Edit buttons. You can also choose a content group here.</p>${button('Open the current race', 'start', 'primary')}<label class="editor-field" for="edit-group-select">Content group<select id="edit-group-select">${Object.entries(collections).map(([group]) => `<optgroup label="${h(groupLabel(group))}">${allGroups(content).filter(item => item.group === group).map(item => `<option value="${item.group}:${h(item.id)}">${h(item.label)}</option>`).join('')}</optgroup>`).join('')}</select></label>${button('Edit selected group', 'edit-selected')}<p class="small muted">The original PDF stays unchanged. Personal choices are separate.</p></section><section class="help-card"><h2>Move content between browsers</h2><p>Export the saved text as JSON. To import, choose a file and check its changes first.</p>${button('Export saved content', 'export-content')}<label class="editor-field" for="content-file">Import content JSON (up to 5 MiB)<input type="file" id="content-file" accept=".json,application/json"></label><p class="small muted">Files contain text and source links. Personal choices are never included.</p></section><section class="help-card"><h2>Edited locally</h2><p>${modified.length ? `${modified.length} content group${modified.length === 1 ? '' : 's'} changed.` : 'No content changes yet.'}</p>${modified.map(item => `<div>${button(`${icon('edit')} ${h(item.label)}`, 'edit', 'quiet compact', `data-id="${h(item.id)}" data-group="${item.group}"`)}</div>`).join('')}${button(`${icon('reset')} Restore original content`, 'restore-content')}${contentStore.previous ? button('Review previous saved version', 'previous-content', 'quiet') : ''}</section></div>`;
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
function showCandidate(id) {
  const candidate = get('candidates', id), text = summary(candidate);
  openDialog(candidate.officialName, `<span class="tag example">${h(text.statusLabel)}</span><div class="portrait-line"><img src="${h(assetUrl(get('media', candidate.portraitMediaId).path))}" alt="Photo not added"><p>${h(candidate.partyLabel || 'No party label printed')}<br>Photo not added</p></div><div class="detail-copy">${text.detailParagraphs.map((paragraph) => `<p>${h(paragraph)}</p>`).join('')}</div>${editPill(text.id)}${editPill(candidate.id, 'candidate')}${candidate.verificationStatus === 'demo-edited' ? '<p class="small">Name edited locally. See the original PDF to check it.</p>' : ''}${sourceWebsite(candidate)}${sourcePanel(candidate.sourceRefs[0].viewerPage)}`, `${button(`Read profile example ${icon('next')}`, 'read-document', '', `data-id="${h(candidate.documentIds[0])}" data-candidate="${h(id)}"`)}`);
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
function updatePaperControls(){
 if(!paperController)return;
 root.querySelectorAll('[data-action=paper-zoom]').forEach(el=>el.setAttribute('aria-pressed',String(Math.abs(Number(el.dataset.zoom)-paperState.zoom)<.02)));
 const label=root.querySelector('#paper-state');if(label)label.textContent=paperState.zoom===1?'Fit width':paperState.zoom.toFixed(1)+'× · Drag to move';
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
  'paper-out': () => paperController?.zoomTo(Math.max(.25, paperState.zoom - .5)),
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
document.addEventListener('click', async (event) => { const el = event.target.closest('[data-action]'); if (!el || el.disabled || busy) return; event.preventDefault(); const fn = actions[el.dataset.action]; if (fn) { try { await fn(el); } catch (error) { announce(error.message); } } });
document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('[data-choice]')) { const result = model.choose(el.dataset.raceId, el.dataset.choice, el.checked); syncChoices(result.message || '', !result.ok); }
  if (el.id === 'content-file') { importFile(el.files[0]); el.value = ''; }
  if (el.id === 'show-explanations') { showExplanations = el.checked; render({ keepScroll: true }); root.querySelector('#show-explanations').focus({ preventScroll: true }); }
});
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-write-in]')) { const result = model.write(el.dataset.raceId, el.dataset.writeIn, el.value); syncChoices(result.message || '', !result.ok); }
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
  if (event.data.type === 'open-a') transition(() => post('open-a-ready'));
  if (event.data.type === 'print') actions.print();
});
async function init() {
  try {
    const responses = await Promise.all([fetch(assetUrl('data/ballot.seed.json')), fetch(assetUrl('data/variants.json'))]);
    if (responses.some((response) => !response.ok)) throw new Error('Missing ballot data');
    [seed, settings] = await Promise.all(responses.map((response) => response.json()));
    if (seed.format !== 'whatsonmyballot-content' || seed.schemaVersion !== '1.0.0' || settings.datasetId !== seed.datasetId) throw new Error('Unsupported ballot data');
    original = await loadOriginal(seed);
    let storage = null; try { storage = window.localStorage; } catch { /* Temporary choices remain usable. */ }
    contentStore = createContentStore({ seed, original, storage, basePath: new URL('../../Mockup A/', import.meta.url).pathname, locks: navigator.locks });
    const saved = contentStore.load(); content = saved.content; revision = saved.contentRevision;
    model = createGuideModel(seed, storage);
    const params = new URLSearchParams(location.search); variant = { ...settings.variants.find(entry => entry.id === 'A5'), id: 'B1', showSelectionExplanation: false };
    if (params.get('screen') === 'race') { screen = 'race'; const id = params.get('race'); model.visit(model.races.some((race) => race.id === id) ? id : model.state.currentRaceId); }
    if (params.get('screen') === 'review') screen = 'review';
    if (params.get('screen') === 'admin') screen = 'admin';
    render(); document.body.dataset.ready = 'true'; post('ready', { id: variant.id }); offerRecovery();
  } catch (error) { root.innerHTML = `<main class="loading"><h1>The sample could not load.</h1><p>Open this demo through a local web server or GitHub Pages, then try again.</p><a href="../../sharedrefs/ballots/2024-11-05-akron-1af.pdf">Open the saved sample ballot PDF</a></main>`; console.error(error); }
}
Object.assign(actions, {
 'whole-ballot': () => go('home'),
 'nav-ballot': () => go('home'),
 'read-section': el => { returnToReview = false; go('race', el?.dataset.id || model.state.currentRaceId); },
 'toggle-review': () => go('home'),
 expand: el => expandInline(el),
 'expand-race': el => expandInline(el, true),
 'locate-race': el => locateRace(el.dataset.id),
 'paper-move-menu': () => openDialog('Move around the ballot', '<p>Use these buttons or drag the ballot. The page stays within its edges.</p><div class="b-move-grid">' + [['left','Left'],['up','Up'],['down','Down'],['right','Right']].map(([direction,label]) => button(label,'paper-move','','data-direction="'+direction+'"')).join('') + '</div>'),
});
init();
