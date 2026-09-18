import { projectCheatsheet } from './cheatsheet.js';
import { mountGuideNav } from './guide-nav.js';
import { hasDetailContent, detailContent } from './detail-content.js';
import { APP_VERSION_LABEL } from '../../../version.js';
import { referenceUrl } from '../../../sharedrefs/registry.js';
import { escapeHtml as h, icon, designId, safeHttps } from '../../Mockup A/assets/shared.js';
import { createGuideModel } from './guide.js';
import { applyDemoChoices } from './demo.js';
import { createAreaCatalog } from './areas.js';
import { renderMinimap } from './minimap.js';
import { renderProgress } from './progress.js';
import { createAnnotationStore, COLORS } from './annotations.js';
import { renderMarkdown } from '../../Mockup A/assets/content-renderer.js';
import { mountPaper } from './paper.js';
import { createIdleHint } from './idle-hint.js';
import { createNotesStore } from './notes.js';
import { loadOriginal, envelope, validateEnvelope, parseImport, safeContentLink, MAX_IMPORT_BYTES } from '../../Mockup A/assets/content-contract.js';
import { createContentStore, ContentConflict } from '../../Mockup A/assets/content-store.js';
import { editableValues, fieldLabel, groupLabel, recordLabel, allGroups, changedGroups, applyFields, collections, canonical, normalize, clone } from '../../Mockup A/assets/content-fields.js';

const root = document.querySelector('#app');
const dialog = document.querySelector('#detail-dialog');
const ballotDialog=document.querySelector('#ballot-dialog');
const ballotScope=()=>ballotDialog.open?ballotDialog:root;
const choiceNodes=selector=>document.querySelectorAll('#app '+selector+', #ballot-dialog '+selector);
let ballotOrigin=null,guideNavigation=null;
dialog.className = 'app-dialog';
let seed, original, content, settings, model, variant;
let screen = 'race', reviewMode = 'rows', paperPage = 1, admin = false, returnToReview = false;
let lastFocus = null, editDraft = null, pendingTransition = null, paperController = null;
let paperState = { zoom: 1, x: 0, y: 0, mode: 'extents' };
const expanded = new Set();
let contentStore, revision = 0, busy = false, recoveryTimer, unloadActive = false, adminMessage = '';
const recoveryOwner = crypto.randomUUID();
let recoveryOffer = null;
const announce=message=>{for(const el of document.querySelectorAll('#announcement,#ballot-announcement'))el.textContent='';setTimeout(()=>{for(const el of document.querySelectorAll('#announcement,#ballot-announcement'))el.textContent=message;},20);};
const get = (collection, id) => content[collection].find((record) => record.id === id);
const currentRace = () => get('contests', selectedSectionId || model.state.currentRaceId);
const raceNumber = () => model.races.findIndex((race) => race.id === model.state.currentRaceId);
const summary = (candidate) => get('editorialContent', candidate.editorialId);
const explanation = (contest) => get('editorialContent', contest.editorialId);
const area = () => ({...content.areas[0],displayLabel:areaCatalog.path(activeAreaId).slice(-2).map(n=>n.label).join(' — ')});
const pdfPath = () => referenceUrl(content.officialPdfs[0].path);
const statusLabel = () => model.storageAvailable ? 'Your choices stay in this browser.' : 'Your choices last for this visit. Browser saving is unavailable.';
const button = (label, action, cls = '', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const editPill = (id, group = 'editorial') => admin ? `<button type="button" class="edit-pill no-print" data-action="edit" data-id="${h(id)}" data-group="${group}" aria-label="Edit ${h(group === 'candidate' ? 'name & link' : groupLabel(group))}">${icon('edit')} ${group === 'candidate' ? 'Edit name &amp; link' : group === 'source' ? 'Edit source' : group === 'document' ? 'Edit document' : 'Edit'}</button>` : '';
function post(type, data = {}) { if (window.parent !== window) window.parent.postMessage({ channel: 'ballot-preview-v1', type, ...data }, location.origin); }
function steps(active) { return `<ol class="flow-steps" aria-label="Guide steps">${['Your area', 'Your choices', 'Your guide'].map((label, i) => `<li class="${i === active ? 'current' : ''}" ${i === active ? 'aria-current="step"' : ''}><span class="step-num">${i + 1}</span>${label}</li>`).join('')}</ol>`; }
function sourcePanel(page=null){
 return '<div class="source-panel"><strong>Original ballot layout reference</strong><p>Akron Township, Precinct 1AF · November 5, 2024'+(page?' · Page '+page:'')+'</p><p class="small">B.7E replaces the names with fictional entries. Its random guide marks are not on this PDF.</p><a href="'+h(pdfPath())+(page?'#page='+page:'')+'" target="_blank" rel="noopener noreferrer">'+icon('pdf')+' Open original sample PDF '+icon('source')+'</a></div>';
}

function detailBody(d,candidateId=''){
 const paragraphs=d.paragraphs.length?d.paragraphs:d.summary;
 return (d.synopsis?'<p>'+h(d.synopsis)+'</p>':'')+(d.overview?'<p>'+h(d.overview)+'</p>':'')+
 '<div class="detail-copy">'+paragraphs.map(p=>'<p>'+h(p)+'</p>').join('')+'</div>'+
 (d.sourceUrl?'<p><a href="'+h(d.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Source '+icon('source')+'</a></p>':'')+
 (d.websiteUrl?'<p><a class="btn compact" href="'+h(d.websiteUrl)+'" target="_blank" rel="noopener noreferrer">Candidate website '+icon('source')+'</a></p>':'')+
 d.documents.map(doc=>button(h(doc.title||'Read profile')+' '+icon('next'),'read-document','compact','data-id="'+h(doc.id)+'" '+(candidateId?'data-candidate="'+h(candidateId)+'"':''))).join('');
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
    ...(choice.optionIds||[]).map(id=>get('options',id)?.officialLabel).filter(Boolean),
    ...Object.values(choice.writeIns).filter((name) => name.trim()).map((name) => `Write-in: ${name.trim()}`)];
}


const scaleIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v17m-5 1h10M4 7h16M5 7l-4 8h8L5 7zm14 0-4 8h8l-4-8z"/><path d="M1 15a4 4 0 0 0 8 0m6 0a4 4 0 0 0 8 0"/></svg>';
const extentsIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></svg>';
const sectionIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="7" y="4" width="10" height="16" rx="1"/><path d="m2 8 3 4-3 4m20-8-3 4 3 4M10 8h4m-4 4h4m-4 4h4"/></svg>';
const noteLabels={synopsis:'Neutral synopsis (one sentence; optional)',author:'Opinion author',opinion:'Opinion text',sourceUrl:'Source link (HTTPS; optional)',headerHighlighted:'Highlight this header opinion',headerColor:'Header opinion color'};
let selectedSectionId=null,focusPending=true,notesStore,noteRecovery=null;
const idleHint=createIdleHint();
const sectionIndex=()=>Math.max(0,content.contests.findIndex(r=>r.id===selectedSectionId));
const markCount=r=>model.count(r.id)+'/'+r.maxSelections+(model.count(r.id)>0&&model.count(r.id)<r.maxSelections?'*':'');
function notePill(id){return admin?button(icon('edit')+' Edit note','edit-note','edit-pill','data-id="'+h(id)+'"'):'';}
function noteTools(id,prefix,detailAction){
 const n=notesStore.get(id),open=opinionOpen(id),available=hasOpinion(id),details=hasDetails(id),exception=isExceptionOpinion(id);
 return '<div class="b-tools-slot"><div class="b-reveal-inner"><div class="b-row-tools">'+button(exception?exceptionScaleIcon:scaleIcon,'opinion','b-opinion-chip'+(headerOpinionHighlighted(id)?' b-header-opinion-highlight':'')+(!available?' is-empty':''),(headerOpinionHighlighted(id)?annotationStyle({color:n.headerColor})+' ':'')+'data-id="'+h(id)+'" aria-label="'+(available?'Opinion on ':'No opinion added for ')+h(n.label)+'" aria-expanded="'+open+'" aria-controls="'+prefix+'-opinion-'+h(id)+'" '+(!available?'disabled title="No opinion added"':''))+button(searchIcon,detailAction,'b-icon-btn'+(!details?' is-empty':''),'data-detail-control data-id="'+h(id)+'" aria-label="'+(details?'More information about ':'No details added for ')+h(n.label)+'" '+(!details?'disabled title="No details added"':''))+'</div></div></div>';
}

function inlineText(id,prefix,text,cls=''){
 return '<div class="b-ballot-text '+cls+'">'+text+'</div>';
}

function markUrl(r,chosen,id=''){const tone=chosen&&showGuideMarks&&hasGuideMark(id)?annotationStore.get(id).color:'slate';return new URL('marks/'+tone+'-'+(chosen?'filled':'empty')+'.svg',import.meta.url).href;}

function markImage(r,id,chosen,kind,prefix='section'){
 return '<span class="b-oval-stack" data-oval="'+h(id)+'" data-personal="'+chosen+'"><img class="b-choice-mark" data-mark="'+h(id)+'" data-mark-kind="'+kind+'" data-race-id="'+h(r.id)+'" src="'+markUrl(r,chosen,id)+'" width="48" height="32" alt="" aria-hidden="true">'+guideSymbol(id,chosen)+'</span>';
}
function choiceTick(r,id,chosen,prefix,label,kind='candidate'){
 return '<label class="b-tick"><input class="sr-only" type="checkbox" name="'+prefix+'-'+h(r.id)+'" data-'+(kind==='party'?'option':'choice')+'="'+h(id)+'" data-race-id="'+h(r.id)+'" '+(chosen?'checked':'')+' aria-label="Select '+h(label)+h(hasGuideMark(id)?annotationStore.get(id).mark==='this'?'. Guide recommendation.':'. Optional guide choice.':'')+'">'+markImage(r,id,chosen,kind,prefix)+'</label>';
}

function synopsisPanel(id,prefix){return opinionPanel(id,prefix);}
function writeInRow(w,r,prefix){
 const name=model.record(r.id).writeIns[w.id]||'',a=annotationStore.get(w.id);
 return '<div class="b-write-row '+annotationClass(w.id)+'" data-write-row="'+h(w.id)+'" data-guide-row="'+h(w.id)+'" '+annotationStyle(a)+'><div class="b-candidate-row">'+button(markImage(r,w.id,Boolean(name.trim()),'write-in',prefix),'write-in','b-tick b-write-tick','data-id="'+h(w.id)+'" data-race-id="'+h(r.id)+'" aria-label="Edit write-in for '+h(r.officialTitle)+'"')+inlineText(w.id,prefix,'<span class="candidate-name" data-write-name="'+h(w.id)+'">'+h(name||'Write-in')+'</span>')+noteTools(w.id,prefix,'note-info')+'</div>'+opinionPanel(w.id,prefix)+annotationPill(w.id)+'</div>';
}

function showWriteIn(el){
 const r=get('contests',el.dataset.raceId),id=el.dataset.id;
 openDialog('Write-in / '+r.officialTitle,'<p>A name counts toward the choice limit for this race.</p><label class="editor-field">Write-in name<input type="text" maxlength="120" data-write-in="'+h(id)+'" data-race-id="'+h(r.id)+'" value="'+h(model.record(r.id).writeIns[id]||'')+'" autocomplete="off"></label><p class="small">Your guide saves this name as you type.</p><p id="write-status" role="status"></p>',button('Done','close-dialog'));
}
function paintFocus(){
 for(const n of choiceNodes('.b-ballot-section')){
  const selected=n.dataset.raceId===selectedSectionId;n.classList.toggle('is-focused',selected&&(!n.classList.contains('is-paper')||tightSection));n.classList.add('is-expanded');
  if(selected&&(!n.classList.contains('is-paper')||tightSection))n.setAttribute('aria-current','true');else n.removeAttribute('aria-current');
  for(const el of n.querySelectorAll('.b-tools-slot,.b-clear-chip,.b-annotation-edit'))el.inert=false;
  for(const el of n.querySelectorAll('.b-opinion-slot'))el.inert=el.dataset.open!=='true';
 }
 ballotDialog.dataset.snap=String(tightSection);
 syncRecommendationFilter();syncMarks();paperController?.selected(ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId)));
}

function syncMarks(){
 choiceNodes('[data-mark]').forEach(el=>{
  const r=get('contests',el.dataset.raceId),choice=model.record(r.id),id=el.dataset.mark;
  const chosen=el.dataset.markKind==='party'?(choice.optionIds||[]).includes(id):el.dataset.markKind==='write-in'?Boolean(choice.writeIns[id]?.trim()):choice.candidateIds.includes(id);
  el.src=markUrl(r,chosen,id);const stack=el.closest('.b-oval-stack');if(stack){stack.dataset.personal=String(chosen);const hint=stack.querySelector('[data-guide-symbol]');if(hint)hint.hidden=!showGuideMarks||!hasGuideMark(id);}
 });
}
function prepareInteraction(section,target){
 if(!ballotDialog.open||!section?.classList.contains('is-paper'))return;
 const action=target.closest('button,input,label,a'),anchor=action?paperController?.captureAnchor(action):null;
 const viewport=ballotDialog.querySelector('#paper-viewport'),comfortable=section.getBoundingClientRect().width>=viewport.getBoundingClientRect().width*.95;
 if(section.dataset.raceId!==selectedSectionId)selectSection(section.dataset.raceId,false);
 setSnapMode(true,{focus:!action||!comfortable,anchor:action?anchor:null});
}

function selectSection(id,pan=true){
 const r=get('contests',id);if(!r)return;selectedSectionId=id;model.visit(id);
 if(!ballotDialog.open){screen='race';render({focus:true});return;}
 if(pan)tightSection=true;
 paperPage=r.sourceRefs[0].viewerPage;
 paintFocus();updatePaperControls();paperController?.setSnap(tightSection);
 const section=ballotDialog.querySelector('#paper-'+CSS.escape(id));if(pan)paperController?.focusElement(section,true,1);
 updateDockMap();announce('Section '+(sectionIndex()+1)+' of '+content.contests.length+': '+r.officialTitle);
}

function stepSection(delta){const next=content.contests[sectionIndex()+delta];if(next)transition(()=>selectSection(next.id));}
function showOpinion(el){
 const id=el.dataset.id;if(!hasOpinion(id))return;const anchor=paperController?.captureAnchor(el);
 opinionOverrides.set(id,!opinionOpen(id));syncOpinionPanels(id);
 if(anchor)paperController?.holdAnchor(anchor);else paperController?.reflow();
}

function showNoteInfo(id){
 const n=notesStore.get(id),d=detailContent(content,n,id);if(!d.available)return;
 const r=get('contests',n.raceId);
 openDialog(n.label,detailBody(d)+notePill(id)+sourcePanel(r.sourceRefs[0].viewerPage));
}
function notesAdminPanel(){
 return '<section class="help-card"><h2>Synopses and opinions</h2><p>Keep the synopsis neutral and one sentence long. Add an author for each opinion.</p>'+(notesStore.warning?'<p class="notice">'+h(notesStore.warning)+'</p>':'')+'<label class="editor-field">Note<select id="note-select">'+notesStore.value.records.map(n=>'<option value="'+h(n.id)+'">'+h(n.kind+' / '+n.label)+'</option>').join('')+'</select></label>'+button(scaleIcon+' Edit selected note','edit-selected-note')+'<p class="small">Notes schema '+h(notesStore.value.schemaVersion)+' · Revision '+notesStore.value.revision+' · '+notesStore.changed().length+' edited notes</p>'+button('Export notes JSON','export-notes')+'<label class="editor-field">Import notes JSON<input type="file" id="notes-file" accept=".json,application/json"></label>'+button('Restore original notes','restore-notes','quiet')+'</section>';
}
function adminView(){
 if(!hasActiveBallot())return '<div class="race-layout b-empty-admin"><span class="eyebrow">ADMIN DEMO</span><h1 tabindex="-1">Ballot information</h1><p>'+h(areaCatalog.label(activeAreaId))+'</p><div class="notice">No ballot information is available for this area.</div><section class="help-card"><h2>Create a ballot</h2><p>Ballot creation is planned. It is not part of this demo.</p>'+button(icon('edit')+' Create ballot','create-ballot','primary')+'</section>'+button('Choose another area','nav-district')+'</div>';
 return originalAdminView().replace('<section class="help-card">',annotationsAdminPanel()+notesAdminPanel()+'<section class="help-card">');
}
function noteEditorFields(values){
 return Object.entries(values).map(([k,v])=>{
  if(k==='headerHighlighted')return '<label class="b-header-highlight-field"><input type="checkbox" data-edit-field="headerHighlighted" '+(v?'checked':'')+'> Highlight this header opinion</label><p class="small muted">Open this opinion by default and color its notice and button. This does not recommend a ballot choice.</p>';
  if(k==='headerColor')return '<label class="editor-field">Header opinion color<select data-edit-field="headerColor">'+COLORS.map(c=>'<option value="'+c+'" '+(v===c?'selected':'')+'>'+c[0].toUpperCase()+c.slice(1)+'</option>').join('')+'</select></label>';
  return '<label class="editor-field">'+h(noteLabels[k])+'<textarea data-edit-field="'+k+'" rows="'+(k==='opinion'?5:2)+'" maxlength="'+(k==='opinion'?4000:k==='sourceUrl'?2000:500)+'">'+h(v)+'</textarea></label>';
 }).join('');
}
function noteDraftPreview(){
 const n={...notesStore.get(editDraft.id),...editDraft.values},highlighted=n.kind==='section'&&n.headerHighlighted&&n.opinion.trim();
 return '<p class="small">'+(n.kind==='section'?(highlighted?'Header opinion opens by default.':'Header opinion opens when requested.'):'Choice opinion preview.')+'</p><aside class="b-inline-opinion'+(highlighted?' is-guide-opinion':'')+'" '+annotationStyle({color:n.headerColor||'gray'})+'><div class="b-opinion-heading">'+scaleIcon+'<span>Opinion</span></div><p class="b-inline-author">'+h(n.author)+'</p><p>'+h(n.opinion||'No opinion added.')+'</p></aside>';
}
function showNoteEditor(id,offer=null){
 transition(()=>{
  admin=true;const saved=notesStore.values(id);
  editDraft={kind:'note',id,noteRevision:notesStore.value.revision,saved,values:offer?clone(offer.values):clone(saved)};
  openDialog('Edit synopsis and opinion','<p class="small muted">'+h(notesStore.get(id).label)+'</p><p class="notice">Save keeps this note in this browser. Restore original fills the draft.</p>'+noteEditorFields(editDraft.values)+'<p id="editor-status" role="status"></p><p id="recovery-status" class="small muted">An unsaved note has a local recovery copy.</p><div id="editor-error" role="alert"></div><div class="editor-preview" id="editor-preview"></div>',button('Restore original','edit-restore')+button('Cancel','close-dialog')+button('Save','edit-save','primary'));
  updateDraft();
 });
}
function downloadNotes(value,label='notes'){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download=seed.datasetId+'-'+label+'-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function previewNotes(proposed,title='Review imported notes'){
 notesStore.validate(proposed);editDraft={kind:'notes-import',proposed:clone(proposed),baseContent:notesStore.value,noteRevision:notesStore.value.revision};
 const changed=proposed.records.filter(n=>canonical(n)!==canonical(notesStore.get(n.id)));
 openDialog(title,'<p>'+changed.length+' notes will change. Personal choices stay as they are.</p>'+changed.map(n=>'<details><summary>'+h(n.label)+'</summary>'+Object.keys(notesStore.values(n.id)).map(k=>'<h3>'+h(noteLabels[k])+'</h3><p class="small">Saved: '+h(typeof notesStore.get(n.id)[k]==='boolean'?(notesStore.get(n.id)[k]?'Yes':'No'):notesStore.get(n.id)[k]||'(empty)')+'</p><p>New: '+h(typeof n[k]==='boolean'?(n[k]?'Yes':'No'):n[k]||'(empty)')+'</p>').join('')+'</details>').join('')+'<div id="editor-error" role="alert"></div>',button('Cancel','close-dialog')+button('Apply notes','edit-save','primary'));syncDirty();
}
async function importNotes(file){
 if(!file)return;
 try{if(file.size>1024*1024)throw Error('Use a notes file smaller than 1 MiB.');const value=JSON.parse(await file.text());notesStore.validate(value);transition(()=>previewNotes(value));}
 catch(error){openDialog('Notes were not imported','<p role="alert">'+h(error.message)+'</p>',button('Close','close-dialog'));}
}
function offerNoteRecovery(){
 noteRecovery=notesStore.recoveries()[0];if(!noteRecovery){offerAnnotationRecovery();return;}
 openDialog('An unsaved note is available','<p>'+h(noteRecovery.matching?'Recover this note to keep editing, or discard its recovery copy.':'Saved notes have changed; export this older draft before discarding it.')+'</p>',button('Discard recovery copy','discard-note-recovery')+button('Later','close-dialog')+(noteRecovery.matching?button('Recover note','recover-note','primary'):button('Export old note','export-old-note')));
}


const guideCheck="<svg class=\"b-guide-glyph\" viewBox=\"0 0 76 78\" role=\"img\" aria-label=\"Recommended — choose this\"><ellipse cx=\"38\" cy=\"44\" rx=\"18\" ry=\"10\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"b-guide-outline\"/><path class=\"b-guide-arrow\" d=\"M33 4h10v13h8L38 30 25 17h8Z\" fill=\"currentColor\"/><text class=\"b-guide-caption\" x=\"38\" y=\"69\" text-anchor=\"middle\" font-size=\"7.6\" font-weight=\"750\" fill=\"currentColor\">(RECOMMENDED)</text></svg>";
const guideOr="<svg class=\"b-guide-glyph\" viewBox=\"0 0 76 78\" role=\"img\" aria-label=\"OR — optional\"><ellipse cx=\"38\" cy=\"44\" rx=\"18\" ry=\"10\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" class=\"b-guide-outline\"/><text class=\"b-guide-or-label\" x=\"38\" y=\"23\" text-anchor=\"middle\" font-size=\"19\" font-weight=\"900\" fill=\"currentColor\">OR</text><text class=\"b-guide-caption\" x=\"38\" y=\"69\" text-anchor=\"middle\" font-size=\"7.6\" font-weight=\"750\" fill=\"currentColor\">(OPTIONAL)</text></svg>";
const palettes={blue:['#eaf2fa','#28577b','#2068a0'],green:['#edf5ed','#2d5c37','#367844'],red:['#fbeeed','#853d39','#b83d38'],yellow:['#fff8dc','#6d570e','#947611'],orange:['#fff0e2','#874917','#b55d17'],gray:['#eff1f3','#485761','#5f6c77']};
let annotationStore,annotationRecovery=null,annotationExamples,showGuideMarks=true,tightSection=false,preferenceStorage=null,preferenceKey='',paperExpandedId=null;
const opinionOverrides=new Map();

const ballotUI={showBackToStart:false};
const hasDetails=id=>hasDetailContent(content,notesStore.get(id),id);
function setSnapMode(value,{focus=true,anchor=null}={}){
 tightSection=Boolean(value);paperController?.setSnap(tightSection);paintFocus();updatePaperControls();
 if(tightSection&&focus){
  const section=ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId))||ballotDialog.querySelector('.b-ballot-section');
  paperController?.focusElement(section,true,1,anchor);
 }else paperController?.reflow();
}
function showWholePage(){
 setSnapMode(false,{focus:false});paperController?.extents();
}


const exceptionScaleIcon='<svg class="icon b-exception-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5v15m-5 1h10M3 8h13M4 8l-3 7h6L4 8zm11 0-3 7h6l-3-7zM1 15a3 3 0 0 0 6 0m5 0a3 3 0 0 0 6 0"/><path class="b-opinion-asterisk" d="M20 1v6m-2.6-4.5 5.2 3m-5.2 0 5.2-3"/></svg>';
let onlyRecommendations=true;
const hasOpinion=id=>Boolean(opinionNote(id).note?.opinion?.trim());
const isExceptionOpinion=id=>{const {note,party}=opinionNote(id);return hasOpinion(id)&&note.kind!=='section'&&!hasGuideMark(party||id);};
const sectionChoiceIds=r=>[...r.candidateIds,...r.optionIds,...r.writeIns.map(w=>w.id)];
function recommendationsToggle(prefix){
 return '<label class="b-guide-toggle"><input type="checkbox" role="switch" id="'+prefix+'-only-recommendations" data-only-recommendations '+(onlyRecommendations?'checked':'')+'><span class="b-switch-track" aria-hidden="true"></span><span data-filter-label>'+(onlyRecommendations?'Only Recommended':'Showing All')+'</span></label>';
}
function sectionFilterControls(r,prefix){
 const marked=sectionChoiceIds(r).some(hasGuideMark);
 return '<p class="b-no-recommendations" data-no-recommendations="'+h(r.id)+'" '+(marked?'hidden':'')+'>There are no recommendations for this section. Use your best judgement!</p>';
}
function syncRecommendationFilter(){
 choiceNodes('[data-only-recommendations]').forEach(el=>{el.checked=onlyRecommendations;el.closest('label').querySelector('[data-filter-label]').textContent=onlyRecommendations?'Only Recommended':'Showing All';});
 choiceNodes('.b-ballot-section').forEach(section=>{
  const r=get('contests',section.dataset.raceId);
  section.querySelectorAll('[data-guide-row]').forEach(row=>row.hidden=onlyRecommendations&&!hasGuideMark(row.dataset.guideRow));
  const empty=section.querySelector('[data-no-recommendations]');if(empty)empty.hidden=sectionChoiceIds(r).some(hasGuideMark);
 });
}
function saveReaderPreferences(){
 try{preferenceStorage?.setItem(preferenceKey,JSON.stringify({schemaVersion:'1.0.0',showGuideMarks,onlyRecommendations}));}catch{}
}
function changeRecommendations(value){
 const target=ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId)),anchor=paperController?.captureAnchor(target);
 onlyRecommendations=Boolean(value);saveReaderPreferences();syncRecommendationFilter();
 paperController?.layoutChanged(anchor);
 announce(onlyRecommendations?'Only recommended and optional choices are shown.':'All choices are shown.');
}

const guideGlyph=mark=>mark==='this'?guideCheck:mark==='or'?guideOr:'';
const hasGuideMark=id=>{const a=annotationStore?.get(id);return Boolean(a&&a.mark!=='none');};
const headerOpinionHighlighted=id=>{const n=notesStore.get(id);return Boolean(showGuideMarks&&n.kind==='section'&&n.headerHighlighted&&hasOpinion(id));};
const opinionHighlighted=id=>headerOpinionHighlighted(id)||showGuideMarks&&hasGuideMark(id);
const opinionPalette=id=>{const n=notesStore.get(id);return n.kind==='section'?{color:n.headerColor}:annotationStore.get(id);};
const opinionOpen=id=>hasOpinion(id)&&(opinionOverrides.has(id)?opinionOverrides.get(id):opinionHighlighted(id));
function annotationStyle(a){const c=palettes[a?.color]||palettes.gray;return 'style="--guide-tint:'+c[0]+';--guide-ink:'+c[1]+';--guide-color:'+c[2]+'"';}
function annotationClass(id){return showGuideMarks&&hasGuideMark(id)?'has-guide-mark':'';}
function guideSymbol(id,chosen=false){
 const a=annotationStore.get(id);
 return '<span class="b-guide-symbol" data-guide-symbol="'+h(id)+'" aria-hidden="true" '+(showGuideMarks&&a?.mark!=='none'?'':'hidden')+'>'+guideGlyph(a?.mark)+'</span>';
}
function annotationPill(id){return admin?'<div class="b-annotation-edit">'+button(icon('edit')+' Edit guide mark','edit-annotation','edit-pill','data-id="'+h(id)+'"')+'</div>':'';}
function opinionNote(id){
 return {note:notesStore.get(id),party:null};
}
function opinionBody(id){
 const {note:n,party}=opinionNote(id),a=annotationStore.get(party||id),marked=showGuideMarks&&a&&a.mark!=='none';
 const label=marked?(a.mark==='this'?' — Choose This':' — Optional'):n.kind==='section'?'':' — Not recommended';
 return '<div class="b-opinion-heading">'+(isExceptionOpinion(id)?exceptionScaleIcon:scaleIcon)+'<span>Opinion'+label+'</span></div><p class="b-inline-author">'+h(n.author||'No author added')+'</p><div class="b-inline-copy">'+(n.opinion.trim()?n.opinion.split(/\n{2,}/).map(p=>'<p>'+h(p)+'</p>').join(''):'<p>No opinion added.</p>')+'</div>'+(n.sourceUrl?'<a href="'+h(n.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Opinion source '+icon('source')+'</a>':'')+notePill(n.id);
}
function opinionPanel(id,prefix){
 const open=opinionOpen(id),marked=opinionHighlighted(id);
 return '<div class="b-opinion-slot" data-opinion-slot="'+h(id)+'" data-open="'+open+'" '+(!open?'inert':'')+'><div class="b-reveal-inner"><aside class="b-inline-opinion'+(marked?' is-guide-opinion':'')+'" id="'+prefix+'-opinion-'+h(id)+'" data-opinion-panel="'+h(id)+'" '+annotationStyle(opinionPalette(id))+' aria-label="Opinion on '+h(notesStore.get(id).label)+'">'+opinionBody(id)+'</aside></div></div>';
}
function syncOpinionPanels(id=null){
 choiceNodes('[data-opinion-slot]').forEach(slot=>{
  const key=slot.dataset.opinionSlot;if(id&&key!==id)return;
  const open=opinionOpen(key);slot.dataset.open=String(open);slot.inert=!open;
  const panel=slot.querySelector('[data-opinion-panel]');panel.classList.toggle('is-guide-opinion',opinionHighlighted(key));panel.innerHTML=opinionBody(key);
 });
 choiceNodes('[data-action=opinion]').forEach(el=>{
  const key=el.dataset.id;if(id&&key!==id)return;
  const available=hasOpinion(key);el.disabled=!available;el.classList.toggle('is-empty',!available);el.classList.toggle('b-header-opinion-highlight',headerOpinionHighlighted(key));
  el.innerHTML=isExceptionOpinion(key)?exceptionScaleIcon:scaleIcon;
  el.setAttribute('aria-expanded',String(opinionOpen(key)));
  el.setAttribute('aria-label',(available?'Opinion on ':'No opinion added for ')+notesStore.get(key).label);
 });
}

function changeGuideVisibility(visible){
 showGuideMarks=visible;opinionOverrides.clear();
 saveReaderPreferences();
 choiceNodes('[data-guide-row]').forEach(row=>row.classList.toggle('has-guide-mark',showGuideMarks&&hasGuideMark(row.dataset.guideRow)));
 syncRecommendationFilter();syncMarks();syncOpinionPanels();paperController?.reflow();
 announce(showGuideMarks?'The opinion guide is shown.':'The opinion guide is hidden. You can still open opinions.');
}
function fictionalPreview(){
 return '<details class="b-example-preview"><summary>See THIS and OR with fictional names</summary><p class="small">Layout example only · Choose no more than 3. These names are not on the sample ballot.</p><div class="b-example-rows">'+annotationExamples.options.map(a=>'<div class="b-example-row" '+annotationStyle(a)+'><strong>'+h(a.label)+'</strong><span class="b-guide-symbol">'+guideGlyph(a.mark)+'</span><div class="b-inline-opinion"><div class="b-opinion-heading">'+scaleIcon+'<span>Opinion · '+h(a.author)+'</span></div><p>'+h(a.opinion)+'</p></div></div>').join('')+'</div></details>';
}
function annotationsAdminPanel(){
 return '<section class="help-card"><h2>Guide marks</h2><p>THIS is a main choice. OR is another option. Mark any number of options; these marks do not fill a reader’s circles.</p><p class="small">Most sections have sample guide marks. The final section has none. The names and opinions in B.7E are fictional placeholders.</p>'+fictionalPreview()+(annotationStore.warning?'<p class="notice" role="status">'+h(annotationStore.warning)+'</p>'+button('Export unreadable saved file','export-raw-annotations'):'')+'<label class="editor-field">Ballot option<select id="annotation-select">'+annotationStore.value.records.map(a=>'<option value="'+h(a.id)+'">'+h(a.kind+' / '+a.label)+'</option>').join('')+'</select></label>'+button(icon('edit')+' Edit guide mark','edit-selected-annotation')+'<p class="small">Guide marks schema 1.0.0 · Revision '+annotationStore.value.revision+'</p>'+button('Export guide marks JSON','export-annotations')+'<label class="editor-field">Import guide marks JSON<input type="file" id="annotations-file" accept=".json,application/json"></label>'+button('Restore original guide marks','restore-annotations','quiet')+'</section>';
}
function showAnnotationEditor(id,offer=null){
 transition(()=>{
  admin=true;const saved=annotationStore.values(id);
  editDraft={kind:'annotation',id,annotationRevision:annotationStore.value.revision,saved,values:offer?clone(offer.values):clone(saved)};
  const a=annotationStore.get(id);
  openDialog('Edit guide mark','<p>'+h(a.label)+'</p><p class="small">Save keeps this mark in this browser. Restore original fills the draft; Save keeps it.</p><label class="editor-field">Guide mark<select data-edit-field="mark">'+[['none','None'],['this','THIS — main choice'],['or','OR — another option']].map(([v,label])=>'<option value="'+v+'" '+(editDraft.values.mark===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label class="editor-field">Highlight color<select data-edit-field="color">'+COLORS.map(c=>'<option value="'+c+'" '+(editDraft.values.color===c?'selected':'')+'>'+c[0].toUpperCase()+c.slice(1)+'</option>').join('')+'</select></label><p id="editor-status" role="status"></p><p id="recovery-status" class="small muted">An unsaved mark has a local recovery copy.</p><div id="editor-error" role="alert"></div><div id="editor-preview"></div>',button('Restore original','edit-restore')+button('Cancel','close-dialog')+button('Save','edit-save','primary'));
  updateDraft();
 });
}
function annotationDraftPreview(){
 const a={...annotationStore.get(editDraft.id),...editDraft.values};
 return '<div class="b-example-row" '+annotationStyle(a)+'><strong>'+h(a.label)+'</strong><span class="b-guide-symbol">'+guideGlyph(a.mark)+'</span><p class="small">'+(a.mark==='none'?'No guide symbol or row highlight.':'Guide mark: '+a.mark.toUpperCase()+' · '+a.color)+'</p></div>';
}
function previewAnnotations(proposed,title='Review imported guide marks',replaceUnreadable=false){
 annotationStore.validate(proposed);
 editDraft={kind:'annotations-import',proposed:clone(proposed),baseContent:annotationStore.value,annotationRevision:annotationStore.value.revision,replaceUnreadable};
 const changed=proposed.records.filter(a=>canonical(a)!==canonical(annotationStore.get(a.id)));
 openDialog(title,'<p>'+changed.length+' guide marks will change.</p>'+(replaceUnreadable?'<p class="notice">This replaces the unreadable saved file. Export it from Admin first if you need a copy.</p>':'')+changed.map(a=>'<div class="b-import-mark"><strong>'+h(a.label)+'</strong><p>'+h(annotationStore.get(a.id).mark.toUpperCase())+' → '+h(a.mark.toUpperCase())+' · '+h(a.color)+'</p></div>').join('')+'<div id="editor-error" role="alert"></div>',button('Cancel','close-dialog')+button('Apply guide marks','edit-save','primary'));
 syncDirty();
}
async function importAnnotations(file){
 if(!file)return;
 try{if(file.size>1024*1024)throw Error('Use a guide marks file smaller than 1 MiB.');const value=JSON.parse(await file.text());annotationStore.validate(value);transition(()=>previewAnnotations(value));}
 catch(error){openDialog('Guide marks were not imported','<p role="alert">'+h(error.message)+'</p>');}
}
function offerAnnotationRecovery(){
 annotationRecovery=annotationStore.recoveries()[0];if(!annotationRecovery)return;
 openDialog('An unsaved guide mark is available','<p>'+h(annotationRecovery.matching?'Recover this mark to keep editing, or discard its recovery copy.':'Saved marks have changed. Export this older draft before discarding it.')+'</p>',button('Discard recovery copy','discard-annotation-recovery')+button('Later','close-dialog')+(annotationRecovery.matching?button('Recover guide mark','recover-annotation','primary'):button('Export old guide mark','export-old-annotation')));
}

const searchIcon = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
const assetUrl = path => new URL('../../Mockup A/' + path, import.meta.url).href;
function viewSwitch() {
  return '<div class="b-viewbar"><div class="b-view-tabs" aria-label="Ballot reading view">' + button(icon('ballot')+'<span>Whole ballot</span>', 'whole-ballot', screen==='home'?'active':'', 'aria-pressed="'+(screen==='home')+'"') + button(icon('list')+'<span>One section</span>', 'read-section', screen==='race'?'active':'', 'aria-pressed="'+(screen==='race')+'"') + '</div>' + button(searchIcon+'<span>Find a race</span>','race-list','b-find','aria-label="Find a race"')+'</div>';
}
function homeView() {
  return '<div class="b-workspace"><div class="b-intro"><div><span class="b-kicker">YOUR VOICE. YOUR VOTE.</span><h1 tabindex="-1">Let’s vote.</h1></div><p>Sample Township · Precinct DEMO<br><span>Fictional ballot interface demo</span></p></div>'+viewSwitch()+'<div class="b-desk"><aside class="b-rail"><div class="b-rail-title"><span class="b-stars" aria-hidden="true">★ ★ ★</span><h2>Your place.<br>Clear at a glance.</h2><p>Previous and Next find each section. Pinch or drag to look around.</p></div><div class="b-progress"><strong data-guide-count>'+model.answered()+'</strong><span>of 28 sections marked</span><div class="b-progress-track"><i style="width:'+model.answered()/28*100+'%"></i></div></div><dl class="b-legend"><div><dt><span class="b-oval-demo"></span>Make a choice</dt><dd>Mark the oval by a name.</dd></div><div><dt>'+icon('chevron')+'Quick details</dt><dd>Read one neutral sentence.</dd></div><div><dt>'+searchIcon+'Read more</dt><dd>Open more information.</dd></div><div><dt>'+scaleIcon+'Opinion</dt><dd>Read a named author’s view.</dd></div></dl><a class="b-source-link" href="'+h(pdfPath())+'" target="_blank" rel="noopener noreferrer">'+icon('pdf')+'Original sample PDF</a><p class="b-small">Your personal guide does not cast a vote.</p></aside><section class="b-canvas" aria-label="Virtual ballot">'+paperView()+'</section></div></div>';
}
function paperView(){
 const i=sectionIndex();
 return '<div class="b-canvas-body"><div class="paper-viewport" id="paper-viewport" tabindex="0" role="region" aria-label="Fictional ballot viewer. Pinch to zoom. Arrow keys move the page."><div class="b-paper-spread" id="paper-document">'+[1,2].map(page=>'<div class="b-paper-side" data-page="'+page+'"><h2 class="b-paper-side-label">'+(page===1?'Front':'Back')+'</h2><article class="b-ballot-sheet" aria-label="'+(page===1?'Front':'Back')+' of fictional ballot"><header class="b-paper-heading"><h2>Sample General Election</h2><p>Sample Township · Precinct DEMO</p><p class="b-paper-demo-note">Fictional sample · '+(page===1?'Front':'Back')+'</p></header><div class="paper-columns">'+[1,2,3].map(c=>'<div class="paper-column" data-column="'+c+'">'+content.contests.filter(r=>r.sourceRefs[0].viewerPage===page&&r.sourceRefs[0].column===c).map(r=>ballotSection(r,true)).join('')+'</div>').join('')+'</div><footer class="b-paper-foot">Fictional names and random marks · Layout sample only</footer></article></div>').join('')+'</div><div id="paper-focus-frame" class="b-focus-frame" aria-hidden="true" hidden></div>'+button('<svg class="icon b-return-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg><span></span>','refocus-section','b-section-indicator','id="section-indicator" hidden')+'</div><div class="b-zoom-slider" role="group" aria-label="Ballot zoom controls">'+button('+','zoom-in','b-zoom-step','aria-label="Zoom in"')+'<input id="ballot-zoom" type="range" min="0" max="100" step=".1" value="50" aria-label="Ballot zoom">'+button('−','zoom-out','b-zoom-step','aria-label="Zoom out"')+'</div>'+button(extentsIcon,'view-all','b-all-button','aria-label="All — show Front and Back" title="All"')+'<div class="b-idle-hint" id="pinch-hint" aria-hidden="true">'+extentsIcon+'<span>Pinch &amp; Zoom</span></div></div><nav class="b-ballot-toolbar" aria-label="Ballot view and sections">'+'<label class="b-section-zoom btn"><input type="checkbox" id="section-zoom" '+(tightSection?'checked':'')+' aria-label="Snap to the section nearest the center">'+sectionIcon+'<span>Snap</span></label>'+button(icon('back')+'<span>Prev</span>','section-prev','','aria-label="Previous ballot section" '+(i===0?'disabled':''))+button('<span>Next</span>'+icon('next'),'section-next','','aria-label="Next ballot section" '+(i===content.contests.length-1?'disabled':''))+'</nav><span class="sr-only" id="section-position">Section '+(i+1)+' of '+content.contests.length+'</span>';
}
function sectionBand(race,paper){
 const section=get('sections',race.sectionId);
 if(!paper)return '<div class="b-section-band">'+h(section.officialTitle)+'</div>';
 const ref=race.sourceRefs[0],column=content.contests.filter(r=>r.sourceRefs[0].viewerPage===ref.viewerPage&&r.sourceRefs[0].column===ref.column),index=column.findIndex(r=>r.id===race.id),previous=column[index-1],previousSection=previous?get('sections',previous.sectionId):null;
 if(previous?.sectionId===race.sectionId)return '';
 const category=(section.partisanship==='nonpartisan'&&previousSection?.partisanship==='partisan')?'Nonpartisan Section':ref.viewerPage===2&&index===0&&ref.column===1?'Partisan Section':null;
 return (category?'<div class="b-section-band b-category-band">'+category+'</div>':'')+'<div class="b-section-band">'+h(section.officialTitle)+'</div>';
}

function ballotSection(race,paper=false){
 const prefix=paper?'paper':'section',section=get('sections',race.sectionId);
 return '<section class="b-ballot-section '+(paper?'is-paper':'is-readable')+(race.id===selectedSectionId?' is-focused':'')+'" data-race-id="'+h(race.id)+'" id="'+prefix+'-'+h(race.id)+'" aria-labelledby="'+prefix+'-title-'+h(race.id)+'">'+sectionBand(race,paper)+'<header class="b-race-heading"><div><h2 class="race-title" id="'+prefix+'-title-'+h(race.id)+'">'+race.officialTitleLines.map(h).join('<br>')+'</h2><p class="b-limit">'+h(race.officialSelectionInstruction)+'</p></div>'+noteTools(race.id,prefix,'race-detail')+opinionPanel(race.id,prefix)+'</header>'+editPill(race.id,'contest')+(race.kind==='straight-party'?'<p class="b-reference-note">This guide keeps your party mark separate. It does not fill other races.</p>':'')+'<fieldset class="b-choices" aria-labelledby="'+prefix+'-title-'+h(race.id)+'"><legend class="sr-only">Choices for '+h(race.officialTitle)+'</legend>'+race.candidateIds.map(id=>candidateCard(get('candidates',id),race,paper)).join('')+race.optionIds.map(id=>partyCard(get('options',id),race,prefix)).join('')+'</fieldset>'+race.writeIns.map(w=>writeInRow(w,race,prefix)).join('')+sectionFilterControls(race,prefix)+'<div class="b-section-footer"><span class="b-race-status" data-choice-status data-race-id="'+h(race.id)+'">'+h(selectionText(race))+'</span>'+button('Clear Selection','clear-race','b-clear-chip','data-id="'+h(race.id)+'" aria-label="Clear choices in '+h(race.officialTitle)+'"')+'</div></section>';
}
function partyCard(o,r,prefix){
 const chosen=(model.record(r.id).optionIds||[]).includes(o.id),a=annotationStore.get(o.id);
 return '<div class="candidate-card b-candidate '+(chosen?'is-selected ':'')+annotationClass(o.id)+'" data-guide-row="'+h(o.id)+'" data-race-id="'+h(r.id)+'" '+annotationStyle(a)+'><div class="b-candidate-row">'+choiceTick(r,o.id,chosen,prefix,o.officialLabel,'party')+inlineText(o.id,prefix,'<span class="candidate-name">'+h(o.officialLabel)+'</span>')+noteTools(o.id,prefix,'note-info')+'</div>'+opinionPanel(o.id,prefix)+annotationPill(o.id)+'</div>';
}
function candidateCard(c,race,paper=false){
 const chosen=model.record(race.id).candidateIds.includes(c.id),prefix=paper?'paper':'section',a=annotationStore.get(c.id);
 return '<div class="candidate-card b-candidate '+(chosen?'is-selected ':'')+annotationClass(c.id)+'" data-guide-row="'+h(c.id)+'" data-candidate-card="'+h(c.id)+'" data-race-id="'+h(race.id)+'" '+annotationStyle(a)+'><div class="b-candidate-row">'+choiceTick(race,c.id,chosen,prefix,c.officialName)+inlineText(c.id,prefix,'<span class="candidate-name">'+c.officialNameLines.map(h).join('<br>')+'</span>'+(c.partyLabel||c.officialDesignation?'<span class="candidate-party">'+h(c.partyLabel||c.officialDesignation)+'</span>':''))+noteTools(c.id,prefix,'candidate-detail')+'</div>'+opinionPanel(c.id,prefix)+annotationPill(c.id)+'</div>';
}

function writeInFields(race){
 return '<details class="write-in" '+(Object.values(model.record(race.id).writeIns).some(Boolean)?'open':'')+'><summary>Add a write-in</summary><div class="write-in-fields"><p class="small muted">A name counts toward the selection limit.</p>'+race.writeIns.map((slot,i)=>'<label for="'+h(slot.id)+'">Write-in '+(race.writeIns.length>1?i+1:'name')+'<input id="'+h(slot.id)+'" type="text" maxlength="120" data-write-in="'+h(slot.id)+'" data-race-id="'+h(race.id)+'" value="'+h(model.record(race.id).writeIns[slot.id]||'')+'" autocomplete="off"></label>').join('')+'</div></details>';
}
function adjacentChip(delta){
 const next=content.contests[sectionIndex()+delta],forward=delta>0;
 if(!next)return forward?'<div class="b-adjacent b-adjacent-next">'+button('Next: Review choices '+icon('next'),'next','b-step-chip')+'</div>':'';
 const label=(forward?'Next: ':'Back: ')+headingText(next)+' ('+(sectionIndex()+delta+1)+'/'+content.contests.length+')';
 return '<div class="b-adjacent '+(forward?'b-adjacent-next':'b-adjacent-back')+'">'+button((forward?'':icon('back'))+'<span>'+h(label)+'</span>'+(forward?icon('next'):''),forward?'next':'back','b-step-chip','title="'+h(label)+'"')+'</div>';
}
function raceView(){
 const r=currentRace();
 return '<div class="b-section-view"><div class="b-section-intro"><div><h1 tabindex="-1">Voting Guide for <span>'+h(area().displayLabel)+'</span></h1><p class="b-demo-label">Fictional options · Sample opinion guide</p></div></div><div id="guide-progress">'+renderProgress(content.contests,selectedSectionId,id=>model.count(id),activeBallot.pages)+'</div><div class="b-guide-options">'+recommendationsToggle('readable')+'</div>'+/* Upper Back chip hidden in B.7E; candidate for complete removal later: adjacentChip(-1). */'<div class="b-readable-paper">'+ballotSection(r)+'</div>'+adjacentChip(1)+'<div class="b-adjacent b-back-start" '+(ballotUI.showBackToStart?'':'hidden')+'>'+button(icon('back')+'<span>Back to Start</span>','back-to-start','b-step-chip')+'</div><div class="selection-message" id="selection-feedback" role="status" hidden></div></div>';
}

function dockMap(){
 return button(renderMinimap(content.contests,selectedSectionId)+'<span>Ballot Viewer</span>','open-ballot','b-minimap b-dock-map','aria-label="Open Ballot Viewer. Section '+(sectionIndex()+1)+' of '+content.contests.length+'" aria-haspopup="dialog" aria-expanded="'+ballotDialog.open+'" aria-controls="ballot-dialog"');
}
function updateDockMap(){
 const map=root.querySelector('.b-dock-map');
 if(map){map.innerHTML=renderMinimap(content.contests,selectedSectionId)+'<span>Ballot Viewer</span>';map.setAttribute('aria-label','Open Ballot Viewer. Section '+(sectionIndex()+1)+' of '+content.contests.length);map.setAttribute('aria-expanded',String(ballotDialog.open));}
 syncProgress();
}
function syncProgress(){
 const progress=root.querySelector('#guide-progress');if(progress)progress.innerHTML=renderProgress(content.contests,selectedSectionId,id=>model.count(id),activeBallot.pages);
}

function stopPaper(){
 idleHint.attach(null);paperController?.destroy();paperController=null;
}
function openBallot(){
 transition(()=>{
  if(ballotDialog.open||!hasActiveBallot())return;
  closeMenu(false);
  ballotOrigin={sectionId:selectedSectionId,scroll:root.querySelector('.main-scroll')?.scrollTop||0};
  paperPage=currentRace().sourceRefs[0].viewerPage;
  tightSection=false;paperState={mode:'extents',zoom:1,x:0,y:0};paperExpandedId=null;
  ballotDialog.showModal();renderBallot({reset:true});updateDockMap();
  ballotDialog.querySelector('#ballot-tool-close').focus({preventScroll:true});
 });
}
function renderBallot({reset=false,focusSection=false}={}){
 const active=ballotDialog.contains(document.activeElement)?document.activeElement:null;
 const action=active?.dataset.action,id=active?.dataset.id;
 stopPaper();
 ballotDialog.innerHTML='<header class="b-tool-header"><div><h2 id="ballot-tool-title">Ballot Viewer <span>— Fictional sample · DEMO</span></h2></div>'+button(icon('close'),'close-ballot','b-tool-close','id="ballot-tool-close" aria-label="Close whole ballot"')+'</header><div class="b-viewer-filter">'+recommendationsToggle('viewer')+'</div><section class="b-canvas b-tool-canvas" aria-label="Interactive whole ballot">'+paperView()+'</section><div id="ballot-announcement" class="sr-only" role="status" aria-live="polite"></div>';
 syncRecommendationFilter();
 paperController=mountPaper(ballotDialog.querySelector('#paper-viewport'),ballotDialog.querySelector('#paper-document'),paperState,state=>{paperState=state;updatePaperControls();},updateViewedSection,id=>selectSection(id,false));
 const selected=ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId));
 paperController.selected(selected);paperController.setSnap(tightSection);
 if(focusSection)paperController.focusElement(selected,true,1);else if(reset)paperController.extents(false);
 paintFocus(focusSection);updatePaperControls();
 idleHint.attach(ballotDialog.querySelector('#pinch-hint'));if(dialog.open)idleHint.pause();else idleHint.resume();
 if(action&&!dialog.open){const selector='[data-action="'+CSS.escape(action)+'"]'+(id?'[data-id="'+CSS.escape(id)+'"]':'');const target=ballotDialog.querySelector(selector);(target&&!target.disabled?target:ballotDialog.querySelector('#ballot-tool-close'))?.focus({preventScroll:true});}
}
function finishBallot(returnToSection=true){
 if(!ballotDialog.open)return;
 const same=ballotOrigin?.sectionId===selectedSectionId,scroll=ballotOrigin?.scroll||0;
 stopPaper();ballotDialog.close();ballotDialog.innerHTML='';ballotOrigin=null;
 if(returnToSection){
  screen='race';render();
  if(same)root.querySelector('.main-scroll').scrollTop=scroll;
  root.querySelector('.b-dock-map')?.focus({preventScroll:true});
  announce('Section '+(sectionIndex()+1)+' of '+content.contests.length+': '+currentRace().officialTitle);
 }
}

function helpView(){
 return '<div class="race-layout b-help"><h1 tabindex="-1">Explore the example.</h1><section class="help-card"><h2>Read the opinion guide</h2><p>A down arrow and RECOMMENDED label suggest a main choice. OR and OPTIONAL show another option. These hints leave the oval empty. An outlined oval with a smaller filled oval means you made a choice. The recommendation arrow or OR stays visible and stops moving.</p><p>Only Recommended starts on. Turning it off changes the label to Showing All. Turn it off to see every choice. Hidden choices remain saved.</p><p>A scale with an asterisk opens an opinion about a choice the guide does not recommend. A faded, dashed button means no opinion was added.</p></section><section class="help-card"><h2>My Guide and practice choices</h2><p>My Guide shows the admin recommendations and their opinions. Your marks in Ballot are for practice and do not change this cheatsheet. On phones, use the section chips to jump through the guide.</p></section><section class="help-card"><h2>Explore the ballot</h2><p>View opens Ballot Viewer. Its recommendation switch also controls the readable view. All shows Front and Back together and turns Snap off. Turning Snap on finds the section nearest the center and fits it to the viewer width. The wheel, pinch, slider, plus, and minus adjust zoom within those limits.</p><p>Next, Prev, and section taps turn Snap on and fit the section. With Snap on, the wheel scrolls and a released drag recenters on a section. Turning Snap off keeps your current view. Each new opening starts zoomed out with Snap off. Tap the backdrop or X to close the viewer.</p></section><section class="help-card"><h2>Choose an area or edit the demo</h2><p>District lets you select an area. Use this area activates it. Areas without data keep Menu and Admin available. Create ballot is a placeholder.</p><p>Menu contains Demo, Admin, and Help. Fresh Start clears personal choices and returns to the first section with Only Recommended on. Saved text and guide marks stay in this browser.</p></section>'+(hasActiveBallot()?sourcePanel():'')+'<p class="small muted">App '+h(APP_VERSION_LABEL)+'</p></div>';
}

function render({focus=false,keepScroll=false}={}){
 guideNavigation?.destroy();guideNavigation=null;
 const scroll=root.querySelector('.main-scroll')?.scrollTop||0,available=hasActiveBallot();
 if(!available&&!['district','admin','help'].includes(screen))screen='district';
 const navActive=screen==='race'?'ballot':screen;
 root.innerHTML='<div class="app-layout"><header class="app-header b-masthead"><a class="b-brand" href="#" data-action="nav-district"><img src="assets/flag-mark.svg" alt="" width="38" height="38"><span>What’s on my ballot?<small>FICTIONAL BALLOT · UI DEMO</small></span></a>'+button(menuIcon,'open-menu','b-help-button','id="app-menu-button" aria-label="Open menu" aria-haspopup="dialog" aria-controls="menu-dialog" aria-expanded="'+menuDialog.open+'"')+(admin&&available?'<div class="admin-ribbon"><span>'+icon('edit')+'Edit buttons on</span><button class="admin-exit" data-action="leave-admin">Exit Admin</button></div>':'')+'</header><main id="main" class="main-scroll" tabindex="-1"><div class="main-inner">'+(screen==='district'?districtView():screen==='race'?raceView():screen==='review'?reviewView():screen==='admin'?adminView():helpView())+'</div></main>'+(screen==='race'?'<nav class="flow-actions" aria-label="Section navigation"><div class="flow-action-inner">'+dockMap()+button(icon('back')+'<span>Back</span>','back','back-btn',sectionIndex()===0&&!returnToReview?'disabled':'')+button((returnToReview||sectionIndex()===content.contests.length-1?'Review':'Next')+icon('next'),'next','primary next-btn')+'</div></nav>':'<div class="b-no-flow"></div>')+'<nav class="bottom-nav" aria-label="Main navigation">'+[['district',districtIcon,'District'],['ballot',icon('ballot'),'Ballot'],['review',icon('review'),'My guide'],['view',tallBallotIcon,'View']].map(([action,glyph,label])=>'<button data-action="nav-'+action+'" '+(navActive===action?'aria-current="page"':'')+' '+(!available&&action!=='district'?'disabled':'')+'>'+glyph+label+'</button>').join('')+'</nav></div>';
 document.body.dataset.design='B.7E';document.body.dataset.screen=screen;document.body.dataset.areaAvailable=String(available);
 paintFocus();if(ballotDialog.open)renderBallot();
 if(keepScroll)root.querySelector('.main-scroll').scrollTop=scroll;
 if(focus&&!ballotDialog.open)root.querySelector('h1')?.focus({preventScroll:true});
 if(screen==='review')guideNavigation=mountGuideNav(root.querySelector('.main-scroll'),root.querySelector('.b-guide-review'));
}

function syncChoices(message='',error=false){
 for(const input of choiceNodes('[data-choice]')){
  input.checked=model.record(input.dataset.raceId).candidateIds.includes(input.dataset.choice);
  input.closest('.candidate-card').classList.toggle('is-selected',input.checked);
 }
 for(const input of choiceNodes('[data-option]')){
  input.checked=(model.record(input.dataset.raceId).optionIds||[]).includes(input.dataset.option);
  input.closest('.candidate-card').classList.toggle('is-selected',input.checked);
 }
 for(const input of document.querySelectorAll('[data-write-in]')){
  const value=model.record(input.dataset.raceId).writeIns[input.dataset.writeIn]||'';if(input.value!==value)input.value=value;
 }
 for(const el of choiceNodes('[data-choice-status]'))el.textContent=selectionText(get('contests',el.dataset.raceId));
 const feedback=root.querySelector('#selection-feedback');
 if(feedback){feedback.classList.toggle('error',error);feedback.textContent=message;feedback.hidden=!message;}
 syncMarks();syncProgress();syncOpinionPanels('contest-straight-party');
 let banner=ballotScope().querySelector('#b-choice-message');
 if(error&&!banner){
  banner=document.createElement('div');banner.id='b-choice-message';banner.className='b-choice-message';banner.setAttribute('role','alert');
  (ballotDialog.open?ballotDialog.querySelector('.b-ballot-toolbar'):root.querySelector('.bottom-nav')).before(banner);
 }
 if(banner){banner.hidden=!error;banner.textContent=message;}
 choiceNodes('[data-write-name]').forEach(el=>{const n=notesStore.get(el.dataset.writeName),name=model.record(n.raceId).writeIns[n.id]||'';el.textContent=name||'Write-in';});
 const ws=dialog.querySelector('#write-status');if(ws)ws.textContent=message;
 if(message)announce(message);
}

function showRaceList(){openDialog('Find a section','<div class="race-jump-list">'+content.contests.map((r,i)=>button('<span class="jump-number">'+(i+1)+'</span><span class="jump-label">'+h(r.officialTitle)+'</span>'+icon('next'),'locate-race','','data-id="'+h(r.id)+'"')).join('')+'</div>');}
function locateRace(id){transition(()=>selectSection(id,true));}
function expandInline(el){showOpinion(el);}

function selectionText(r){const n=model.count(r.id),partial=n>0&&n<r.maxSelections;return n+'/'+r.maxSelections+' choices marked'+(partial?' · You can choose fewer.':'');}

const cheatsheetArrow='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8v10h5L12 22 3 12h5Z" fill="currentColor"/></svg>';
function cheatsheetChoice(choice){
 const source=safeHttps(choice.sourceUrl);
 return '<div class="b-cheatsheet-choice" data-guide-choice="'+h(choice.id)+'" data-guide-mark="'+choice.mark+'" '+annotationStyle(choice)+'><div class="b-cheatsheet-kind">'+(choice.mark==='this'?cheatsheetArrow:'<span class="b-cheatsheet-or" aria-hidden="true">OR</span>')+'<span>'+(choice.mark==='this'?'Recommended':'Optional')+'</span></div><strong class="b-cheatsheet-name">'+h(choice.label)+'</strong>'+(choice.opinion.trim()?'<aside class="b-cheatsheet-opinion" aria-label="Opinion on '+h(choice.label)+'"><div class="b-cheatsheet-author">'+scaleIcon+'<span>Opinion'+(choice.author?' · '+h(choice.author):'')+'</span></div>'+choice.opinion.trim().split(/\n{2,}/).map(p=>'<p>'+h(p)+'</p>').join('')+(source?'<a href="'+h(source)+'" target="_blank" rel="noopener noreferrer">Opinion source '+icon('source')+'</a>':'')+'</aside>':'')+'</div>';
}
function reviewSection(section,category){
 const redundant=section.title.toLowerCase().replace(/[\s-]/g,'')===(category+'section').replace(/-/g,'');
 const headingId='review-'+section.id;
 return '<section class="review-section" '+(!redundant?'aria-labelledby="'+h(headingId)+'"':'aria-label="'+h(section.title)+'"')+'>'+(!redundant?'<h3 class="b-review-subheading" id="'+h(headingId)+'">'+h(section.title)+'</h3>':'')+section.contests.map(race=>{
  const tag=redundant?'h3':'h4';
  return '<div class="review-row" data-review-race="'+h(race.id)+'"><'+tag+' class="b-review-race-title">'+h(race.title)+'</'+tag+'>'+race.choices.map(cheatsheetChoice).join('')+'</div>';
 }).join('')+'</section>';
}
function rowReview(groups){
 const capsule=group=>'<section class="b-review-capsule" id="cheat-group-'+h(group.category)+'" data-review-category="'+h(group.category)+'" aria-labelledby="review-group-'+h(group.category)+'"><h2 tabindex="-1" id="review-group-'+h(group.category)+'">'+h(group.label)+'</h2>'+group.sections.map(section=>reviewSection(section,group.category)).join('')+'</section>';
 const primary=groups.filter(group=>['partisan','nonpartisan'].includes(group.category));
 return (primary.length?'<div class="b-review-columns'+(primary.length===2?' has-two-columns':'')+'">'+primary.map(capsule).join('')+'</div>':'')+groups.filter(group=>!primary.includes(group)).map(capsule).join('');
}
function reviewView(){
 const groups=projectCheatsheet(content,annotationStore.value.records,notesStore.value.records);
 const navigation=groups.length?'<nav class="b-guide-jumps no-print" aria-label="Cheatsheet sections">'+groups.map(group=>'<button type="button" data-guide-jump="'+h(group.category)+'" aria-controls="cheat-group-'+h(group.category)+'"><span>'+h(group.label)+'</span></button>').join('')+'</nav>':'';
 return '<div class="review-content b-guide-review"><h1 class="sr-only" tabindex="-1">My guide</h1>'+navigation+'<div class="review-controls no-print"><a class="btn" href="'+h(pdfPath())+'" target="_blank" rel="noopener noreferrer">'+icon('pdf')+' Original ballot layout reference (PDF) '+icon('source')+'</a>'+button(icon('print')+' Print my guide','print')+'</div><div id="review-rows">'+(groups.length?rowReview(groups):'<p class="b-cheatsheet-empty" role="status">No recommendations have been added yet.</p>')+'</div></div>';
}
function originalAdminView() {
  const modified = changedGroups(original, content);
  return `<div class="race-layout"><span class="eyebrow">ADMIN DEMO</span><h1 tabindex="-1" style="margin-top:12px">Keep the information clear.</h1><p class="muted">Edit the text, then save it in this browser.</p><div class="notice"><strong>Local demo · No sign-in</strong><br>Edits to this fictional dataset stay in B.7E in this browser. They are not published to other devices.</div><p class="small">App ${h(APP_VERSION_LABEL)} · Content revision ${revision} · Format 1.0.0</p>${adminMessage || contentStore.warning ? `<p class="notice" role="status">${h(adminMessage || contentStore.warning)}</p>` : ''}${button(`${icon('edit')} ${admin ? 'Edit buttons are on' : 'Turn on Edit buttons'}`, 'enable-admin', admin ? '' : 'primary')}${admin ? button('Leave Admin mode', 'leave-admin', 'quiet') : ''}<section class="help-card"><h2>Edit the information</h2><p>Open a race to use its Edit buttons. You can also choose a content group here.</p>${button('Open the current race', 'start', 'primary')}<label class="editor-field" for="edit-group-select">Content group<select id="edit-group-select">${Object.entries(collections).map(([group]) => `<optgroup label="${h(groupLabel(group))}">${allGroups(content).filter(item => item.group === group).map(item => `<option value="${item.group}:${h(item.id)}">${h(item.label)}</option>`).join('')}</optgroup>`).join('')}</select></label>${button('Edit selected group', 'edit-selected')}<p class="small muted">The original PDF stays unchanged. Personal choices are separate.</p></section><section class="help-card"><h2>Move content between browsers</h2><p>Export the saved text as JSON. To import, choose a file and check its changes first.</p>${button('Export saved content', 'export-content')}<label class="editor-field" for="content-file">Import content JSON (up to 5 MiB)<input type="file" id="content-file" accept=".json,application/json"></label><p class="small muted">Files contain text and source links. Personal choices are never included.</p></section><section class="help-card"><h2>Edited locally</h2><p>${modified.length ? `${modified.length} content group${modified.length === 1 ? '' : 's'} changed.` : 'No content changes yet.'}</p>${modified.map(item => `<div>${button(`${icon('edit')} ${h(item.label)}`, 'edit', 'quiet compact', `data-id="${h(item.id)}" data-group="${item.group}"`)}</div>`).join('')}${button(`${icon('reset')} Restore original content`, 'restore-content')}${contentStore.previous ? button('Review previous saved version', 'previous-content', 'quiet') : ''}</section></div>`;
}

function openDialog(title, body, footer = '', { replace = false } = {}) {
  idleHint.pause();
  if (!dialog.open) lastFocus = document.activeElement;
  dialog.innerHTML = `<header class="dialog-header"><h2 id="dialog-title" tabindex="-1">${h(title)}</h2><button type="button" class="dialog-close" data-action="close-dialog" aria-label="Close">${icon('close')}</button></header><div class="dialog-content">${body}</div>${footer ? `<footer class="dialog-footer">${footer}</footer>` : ''}`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('#dialog-title').focus();
}
function finishClose(){
 clearTimeout(recoveryTimer);contentStore?.clearRecovery(recoveryOwner);
 editDraft=null;pendingTransition=null;syncDirty();notesStore?.clearRecovery(recoveryOwner);annotationStore?.clearRecovery(recoveryOwner);
 dialog.close();dialog.innerHTML='';idleHint.resume();post('editor-state',{dirty:false});
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
 else (ballotDialog.open?ballotDialog.querySelector('#ballot-tool-close'):root.querySelector('h1'))?.focus({preventScroll:true});
}

function renderAfterEdit(){
 const action=lastFocus?.dataset.action,id=lastFocus?.dataset.id,group=lastFocus?.dataset.group;
 render({keepScroll:true});
 const selector=action?'[data-action="'+CSS.escape(action)+'"]'+(id?'[data-id="'+CSS.escape(id)+'"]':'')+(group?'[data-group="'+CSS.escape(group)+'"]':''):null;
 const target=(selector&&ballotScope().querySelector(selector))||(ballotDialog.open?ballotDialog.querySelector('#ballot-tool-close'):root.querySelector('h1'));
 target?.focus({preventScroll:true});
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
function go(next,raceId=null){
 transition(()=>{closeMenu(false);finishBallot(false);screen=next==='home'?'race':next;
  if(!hasActiveBallot()&&!['district','admin','help'].includes(screen))screen='district';
  if(screen==='district')draftAreaId=activeAreaId;
  if(raceId){selectedSectionId=raceId;model.visit(raceId);}render({focus:true});
 });
}

function confirmAction(title, text, label, callback) {
  transition(() => { openDialog(title, `<p>${h(text)}</p>`, `${button('Cancel', 'close-dialog')}${button(label, 'confirm-action', 'primary')}`); pendingTransition = callback; });
}
function showCandidate(id){
 const candidate=get('candidates',id),text=summary(candidate),d=detailContent(content,notesStore.get(id),id);if(!d.available)return;
 openDialog(candidate.officialName,'<span class="tag example">'+h(text.statusLabel)+'</span><div class="portrait-line"><img src="'+h(assetUrl(get('media',candidate.portraitMediaId).path))+'" alt="Photo not added"><p>'+h(candidate.partyLabel||'No party label printed')+'<br>Photo not added</p></div>'+detailBody(d,id)+editPill(text.id)+editPill(candidate.id,'candidate')+notePill(id)+sourcePanel(candidate.sourceRefs[0].viewerPage));
}
function showDocument(id, candidateId) {
  const doc = get('documents', id);
  openDialog(doc.title, `<span class="tag example">${h(doc.statusLabel)} · Not a website archive</span>${editPill(id, 'document')}<article class="markdown">${renderMarkdown(doc.markdown, original)}</article><p class="small muted">${h(doc.note)}</p>`, candidateId ? button(`${icon('back')} Back to candidate`, 'candidate-detail', '', `data-id="${h(candidateId)}"`) : '');
}
function showRaceDetail(id){
 const race=get('contests',id),d=detailContent(content,notesStore.get(id),id);if(!d.available)return;
 openDialog(race.officialTitle,'<p><strong>'+h(race.officialSelectionInstruction)+'</strong></p>'+detailBody(d)+editPill(race.editorialId)+notePill(id)+sourcePanel(race.sourceRefs[0].viewerPage));
}
function editLabel(id) { return recordLabel(content, id); }
function isDirty() {
  return Boolean(editDraft && (['import','notes-import','annotations-import'].includes(editDraft.kind)
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
  if (!isDirty()) { contentStore?.clearRecovery(recoveryOwner);notesStore?.clearRecovery(recoveryOwner);annotationStore?.clearRecovery(recoveryOwner);return; }
  if(editDraft.kind==='note'){if(!notesStore.saveRecovery(editDraft,recoveryOwner)){const n=dialog.querySelector('#recovery-status');if(n)n.textContent='Draft recovery is unavailable. Export the draft before leaving.';}return;}
  if(editDraft.kind==='annotation'){if(!annotationStore.saveRecovery(editDraft,recoveryOwner)){const n=dialog.querySelector('#recovery-status');if(n)n.textContent='Draft recovery is unavailable. Export your draft before leaving.';}return;}
  if(['notes-import','annotations-import'].includes(editDraft.kind))return;
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
  if (!editDraft || !['edit','note','annotation'].includes(editDraft.kind) || busy) return;
  dialog.querySelectorAll('[data-edit-field]').forEach(field => { editDraft.values[field.dataset.editField] = field.type==='checkbox'?field.checked:normalize(field.value); });
  const dirty = isDirty(), status = dialog.querySelector('#editor-status');
  status.textContent = dirty ? 'Unsaved changes' : 'No unsaved changes'; status.classList.toggle('dirty', dirty);
  dialog.querySelector('#editor-preview').innerHTML = editDraft.kind==='annotation'?annotationDraftPreview():editDraft.kind==='note'?noteDraftPreview():Object.entries(editDraft.values).map(([key, text]) => key === 'markdown' ? `<article class="markdown">${renderMarkdown(text, original)}</article>` : `<p>${h(text)}</p>`).join('');
  syncDirty(); scheduleRecovery();
}
function editorError(error) {
  const target = dialog.querySelector('#editor-error') || dialog.querySelector('.dialog-content');
  if(editDraft?.kind==='annotation'||editDraft?.kind==='annotations-import'){target.innerHTML='<section class="edit-warning"><h3>Guide marks were not saved.</h3><p>'+h(error.message)+'</p><div class="button-row">'+button('Retry save','edit-save')+button('Export draft','export-draft')+button('Reload saved marks (discard draft)','reload-annotations')+'</div></section>';return;}
  if(editDraft?.kind==='note'||editDraft?.kind==='notes-import'){target.innerHTML='<section class="edit-warning"><h3>Notes were not saved.</h3><p>'+h(error.message)+'</p><div class="button-row">'+button('Retry save','edit-save')+button('Export draft','export-draft')+button('Reload saved notes (discard draft)','reload-notes')+'</div></section>';return;}
  const conflict = error instanceof ContentConflict || contentStore.changedExternally();
  const message = conflict ? 'Saved content changed in another tab. Your draft is still here.' : error.message;
  target.innerHTML = `<section class="edit-warning"><h3 tabindex="-1">Changes were not saved.</h3><p>${h(message)}</p><div class="button-row">${conflict ? button('Reload saved version', 'reload-content') : button('Retry save', 'edit-save', 'primary')}${button('Export draft for recovery', 'export-draft')}</div><p class="small">Reload saved version discards this draft. Export it first if you need a copy.</p></section>`;
  target.querySelector('h3').focus(); announce('Changes were not saved.');
}
async function saveDraft() {
  if (!editDraft || busy) return false;
  busy = true;
  dialog.querySelectorAll('textarea,input,select').forEach(el => { el.disabled = true; });
  try {
    if(['annotation','annotations-import'].includes(editDraft.kind)){
      const next=editDraft.kind==='annotation'?annotationStore.proposed(editDraft.id,editDraft.values):editDraft.proposed;
      await annotationStore.commit(next,editDraft.annotationRevision,{replaceUnreadable:editDraft.replaceUnreadable===true});
      editDraft.saved=clone(editDraft.values);editDraft.baseContent=annotationStore.value;annotationStore.clearRecovery(recoveryOwner);
      if(editDraft.id)opinionOverrides.delete(editDraft.id);else opinionOverrides.clear();
      adminMessage='Guide marks saved in this browser.';syncDirty();announce(adminMessage);return true;
    }
    if(['note','notes-import'].includes(editDraft.kind)){
      const next=editDraft.kind==='note'?notesStore.proposed(editDraft.id,editDraft.values):editDraft.proposed;
      await notesStore.commit(next,editDraft.noteRevision);editDraft.saved=clone(editDraft.values);editDraft.baseContent=notesStore.value;notesStore.clearRecovery(recoveryOwner);if(editDraft.id)opinionOverrides.delete(editDraft.id);else opinionOverrides.clear();adminMessage='Notes saved in this browser.';syncDirty();announce(adminMessage);return true;
    }
    const next = draftContent(); validateEnvelope(envelope(seed, next, revision), seed, original);
    const saved = await contentStore.commit(next, editDraft.revision, { replaceUnreadable: editDraft.replaceUnreadable === true });
    content = saved.content; revision = saved.contentRevision; adminMessage = `Saved in this browser. Content revision ${revision}.`;
    editDraft.saved = clone(editDraft.values); editDraft.baseContent = clone(content);
    syncDirty(); contentStore.clearRecovery(recoveryOwner); announce('Saved in this browser.');
    return true;
  } catch (error) { editorError(error); persistRecovery(); return false; }
  finally { busy = false; dialog.querySelectorAll('textarea,input,select').forEach(el => { el.disabled = false; }); }
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
  if (!recoveryOffer) {offerNoteRecovery();return;}
  openDialog('An unsaved draft is available', `<p>${recoveryOffer.matching ? 'This draft matches the saved content. Recover it to keep editing, or discard the recovery copy.' : 'The saved content has changed since this draft was made. You can export the old draft for review, or discard its recovery copy.'}</p><p>Recovering a draft does not save it.</p><div id="editor-error" role="alert"></div>`, `${button('Discard recovery copy', 'discard-recovery')}${button('Later', 'close-dialog')}${recoveryOffer.matching ? button('Recover draft', 'recover-draft', 'primary') : button('Export old draft', 'export-old-draft')}`);
}

function advance(){if(returnToReview||sectionIndex()===content.contests.length-1){returnToReview=false;go('review');}else stepSection(1);}
function updatePaperControls(){
 const i=sectionIndex(),count=ballotDialog.querySelector('#section-position');
 if(count)count.textContent='Section '+(i+1)+' of '+content.contests.length;
 const prev=ballotDialog.querySelector('[data-action=section-prev]'),next=ballotDialog.querySelector('[data-action=section-next]');
 if(prev)prev.disabled=i===0;if(next)next.disabled=i===content.contests.length-1;

 const toggle=ballotDialog.querySelector('#section-zoom');if(toggle)toggle.checked=tightSection;
 const slider=ballotDialog.querySelector('#ballot-zoom');
 if(slider){
  const min=paperState.minZoom||1,max=paperState.maxZoom||min;
  const value=max>min?Math.max(0,Math.min(100,Math.log(paperState.zoom/min)/Math.log(max/min)*100)):0;
  slider.value=String(value);slider.setAttribute('aria-valuetext',Math.round(paperState.zoom*100)+' percent zoom');
 }
}
function updateViewedSection(view){
 const frame=ballotDialog.querySelector('#paper-focus-frame'),indicator=ballotDialog.querySelector('#section-indicator');if(!frame||!indicator)return;
 if(!view||!tightSection){frame.hidden=true;indicator.hidden=true;delete frame.dataset.section;return;}
 frame.hidden=false;
 if(frame.dataset.section!==view.id){frame.dataset.section=view.id;frame.classList.remove('is-arriving');void frame.offsetWidth;frame.classList.add('is-arriving');}
 Object.assign(frame.style,{left:view.x+'px',top:view.y+'px',width:view.width+'px',height:view.height+'px'});
 const iw=Math.max(0,Math.min(view.x+view.width,view.viewportWidth)-Math.max(0,view.x)),ih=Math.max(0,Math.min(view.y+view.height,view.viewportHeight)-Math.max(0,view.y));
 const enough=iw*ih>Math.min(view.width*view.height,view.viewportWidth*view.viewportHeight)*.22;
 indicator.hidden=enough||view.mode==='extents';
 if(indicator.hidden)return;
 const cx=view.viewportWidth/2,cy=view.viewportHeight/2;
 const dx=view.x>cx?view.x-cx:view.x+view.width<cx?view.x+view.width-cx:0,dy=view.y>cy?view.y-cy:view.y+view.height<cy?view.y+view.height-cy:0;
 if(!dx&&!dy){indicator.hidden=true;return;}
 const halfW=Math.min(100,(view.viewportWidth-16)/2),halfH=24,rx=Math.max(0,view.viewportWidth/2-halfW-8),ry=Math.max(0,view.viewportHeight/2-halfH-8);
 const t=Math.min(dx?rx/Math.abs(dx):Infinity,dy?ry/Math.abs(dy):Infinity);
 const x=view.viewportWidth/2+dx*t,y=view.viewportHeight/2+dy*t;
 Object.assign(indicator.style,{left:x+'px',top:y+'px'});
 indicator.querySelector('.b-return-arrow').style.transform='rotate('+Math.atan2(dy,dx)*180/Math.PI+'deg)';
 const label=headingText(get('contests',view.id));indicator.querySelector('span').textContent=label;indicator.setAttribute('aria-label','Return to selected section: '+label);
 indicator.dataset.direction=Math.abs(dx)/(rx||1)>Math.abs(dy)/(ry||1)?dx<0?'left':'right':dy<0?'top':'bottom';
}

const actions = {
  'zoom-in':()=>paperController?.zoomBy(1.25),'zoom-out':()=>paperController?.zoomBy(.8),
  'refocus-section':()=>{paperExpandedId=selectedSectionId;paintFocus();paperController?.focusElement(ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId)),true,tightSection?1:.75);},
  start: () => { returnToReview = false; go('race', model.state.currentRaceId); },
  'nav-ballot': () => { returnToReview = false; go(model.state.started ? 'race' : 'home'); },
  'nav-review': () => go('review'), 'nav-help': () => go('help'), help: () => go('help'), 'nav-admin': () => go('admin'),
  next: advance,
  back: () => { if (returnToReview) { returnToReview = false; go('review'); } else if (raceNumber() === 0) go('home'); else go('race', model.races[raceNumber() - 1].id); },
  skip: () => { const id = currentRace().id; const skip = () => { model.clearRace(id, true); advance(); }; if (model.count(id)) confirmAction('Skip this race?', 'Skipping clears the choices in this race. You can return to it later.', 'Clear and skip', skip); else skip(); },
  'clear-race': el => { model.clearRace(el?.dataset.id||currentRace().id);syncChoices();announce('Section choices cleared.'); },
  'clear-all': () => confirmAction('Clear personal choices?', 'This clears your choices for this sample ballot. Ballot text and Admin edits stay as they are.', 'Clear choices', () => { finishBallot(false);model.clearAll(); selectedSectionId=content.contests[0].id;paperPage=1;focusPending=true;screen = 'race'; render({ focus: true }); }),
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
  'leave-admin': () => transition(() => { admin = false; if (screen === 'admin') screen = 'race'; render({ focus: true }); }),
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
document.addEventListener('click', async (event) => { const section=event.target.closest('.b-ballot-section');if(ballotDialog.open&&section?.classList.contains('is-paper')&&!busy){const target=event.target.closest('button,label')||event.target;prepareInteraction(section,target);}
 const el = event.target.closest('[data-action]'); if (!el || el.disabled || busy) return; event.preventDefault(); const fn = actions[el.dataset.action]; if (fn) { try { await fn(el); } catch (error) { announce(error.message); } } });
document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('[data-choice]')) { const result = model.choose(el.dataset.raceId, el.dataset.choice, el.checked); syncChoices(result.message || '', !result.ok); }
  if(el.matches('[data-option]')){const result=model.chooseOption(el.dataset.raceId,el.dataset.option,el.checked);syncChoices(result.message||'',!result.ok);}
  if(el.matches('[data-edit-field]'))updateDraft();
  if(el.id==='annotations-file'){importAnnotations(el.files[0]);el.value='';}
  if(el.matches('[data-only-recommendations]'))changeRecommendations(el.checked);
  if(el.id==='section-zoom'){setSnapMode(el.checked,{focus:false});if(el.checked)paperController?.focusNearestSection();}
  if (el.id === 'notes-file') {importNotes(el.files[0]);el.value='';}
  if (el.id === 'content-file') { importFile(el.files[0]); el.value = ''; }
});
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-write-in]')) { const result = model.write(el.dataset.raceId, el.dataset.writeIn, el.value); syncChoices(result.message || '', !result.ok); }
  if(el.id==='ballot-zoom'){const {min,max}=paperController.limits();paperController.zoomTo(min*Math.pow(max/min,Number(el.value)/100),undefined,false);}
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
window.addEventListener('message',event=>{if(event.source!==window.parent||event.origin!==location.origin||event.data?.channel!=='ballot-preview-v1'||!model)return;if(event.data.type==='demo'&&['fresh','example','clear','restore'].includes(event.data.action))runDemo(event.data.action);if(event.data.type==='open-a')transition(()=>post('open-a-ready'));if(event.data.type==='print'&&hasActiveBallot())actions.print();});
async function init() {
 try{
  try{areaStorage=window.localStorage;}catch{}
  const catalogUrl=new URL('data/areas.json',location.href),catalogResponse=await fetch(catalogUrl);if(!catalogResponse.ok)throw Error('Missing area catalog.');
  areaCatalog=createAreaCatalog(await catalogResponse.json());areaKey='whatsonmyballot:'+new URL('../',import.meta.url).pathname+':area-selection:v1';
  const params=new URLSearchParams(location.search),requested=params.get('area');
  activeAreaId=requested&&areaCatalog.node(requested)&&!areaCatalog.children(requested).length?requested:areaCatalog.restore(areaStorage,areaKey);
  draftAreaId=activeAreaId;activeBallot=areaCatalog.ballot(activeAreaId)||areaCatalog.ballot(areaCatalog.value.defaultAreaId);bundleBase=new URL(activeBallot.basePath,catalogUrl);
  const read=async name=>{const r=await fetch(new URL(name,bundleBase));if(!r.ok)throw Error('Missing '+name);return r.json();};
  [seed,settings]=await Promise.all([read('ballot.seed.json'),read('variants.json')]);
  if(seed.format!=='whatsonmyballot-content'||seed.schemaVersion!=='1.0.0'||settings.datasetId!==seed.datasetId||activeBallot.datasetId!==seed.datasetId)throw Error('Unsupported ballot data.');
  original=await loadOriginal(seed);
  contentStore=createContentStore({seed,original,storage:areaStorage,basePath:new URL('../',import.meta.url).pathname,locks:navigator.locks});
  const saved=contentStore.load();content=saved.content;revision=saved.contentRevision;model=createGuideModel(seed,areaStorage);
  // Fresh visits have no personal choices. Only an explicit Demo action loads them.
  const [demoChoices,notes,annotations,examples]=await Promise.all([read('demo-choices.seed.json'),read('notes.seed.json'),read('annotations.seed.json'),read('annotation-examples.json')]);
  model.example=()=>applyDemoChoices(model,demoChoices,areaStorage,true);
  notesStore=createNotesStore(notes,areaStorage,new URL('../../',import.meta.url).pathname);notesStore.load();
  annotationStore=createAnnotationStore(annotations,areaStorage,new URL('../../',import.meta.url).pathname);annotationStore.load();annotationExamples=examples;
  preferenceStorage=areaStorage;preferenceKey=annotationStore.key+':reader-view';
  try{const s=JSON.parse(areaStorage?.getItem(preferenceKey));if(s?.schemaVersion==='1.0.0'){if(typeof s.showGuideMarks==='boolean')showGuideMarks=s.showGuideMarks;if(typeof s.onlyRecommendations==='boolean')onlyRecommendations=s.onlyRecommendations;}}catch{}
  selectedSectionId=content.contests[0].id;variant={...settings.variants.find(e=>e.id==='A5'),id:'B.7E',showSelectionExplanation:false};
  if(['race','review','admin','district'].includes(params.get('screen')))screen=params.get('screen');
  if(params.get('screen')==='race'){const id=params.get('race');selectedSectionId=content.contests.some(r=>r.id===id)?id:model.state.currentRaceId;model.visit(selectedSectionId);}
  if(params.get('demo')==='fresh'){model.clearAll();onlyRecommendations=true;showGuideMarks=true;saveReaderPreferences();selectedSectionId=content.contests[0].id;screen='race';const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(null,'',url);}
  if(!hasActiveBallot()&&screen!=='admin')screen='district';
  render();document.body.dataset.ready='true';post('ready',{id:variant.id});if(hasActiveBallot())offerRecovery();
 }catch(error){root.innerHTML='<main class="loading"><h1>The sample could not load.</h1><p>Open this demo through a local web server or GitHub Pages, then try again.</p></main>';console.error(error);}
}
Object.assign(actions, {
 'back-to-start':()=>{returnToReview=false;go('race',content.contests[0].id);},
 'whole-ballot': () => go('home'),
 'nav-ballot': () => go('home'),
 'read-section': el => { returnToReview = false; go('race', el?.dataset.id || model.state.currentRaceId); },
 'toggle-review': () => go('home'),
 expand: el => expandInline(el),
 'expand-race': el => expandInline(el, true),
 'locate-race': el => locateRace(el.dataset.id),
 'paper-move-menu': () => openDialog('Move around the ballot', '<p>Use these buttons or drag the ballot. The page stays within its edges.</p><div class="b-move-grid">' + [['left','Left'],['up','Up'],['down','Down'],['right','Right']].map(([direction,label]) => button(label,'paper-move','','data-direction="'+direction+'"')).join('') + '</div>'),
});
const restoreBaseDraft=actions['edit-restore'],exportBaseDraft=actions['export-draft'];
Object.assign(actions,{
 'read-section':el=>{returnToReview=false;go('race',el?.dataset.id||selectedSectionId);},
 'section-prev':()=>stepSection(-1),'section-next':()=>stepSection(1),
 back:()=>{if(returnToReview){returnToReview=false;go('review');}else if(sectionIndex()===0)go('home');else stepSection(-1);},
 skip:()=>{const id=currentRace().id,skip=()=>{model.clearRace(id,true);advance();};if(model.count(id))confirmAction('Skip this race?','This clears the choices in this race.','Clear and skip',skip);else skip();},
 'zoom-extents':()=>{paperExpandedId=null;paintFocus();paperController?.extents();},
 'zoom-section':()=>{paintFocus(true);paperController?.focusElement(ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId)));},
 'expand-note':el=>expandInline(el),
 opinion:el=>showOpinion(el),'note-info':el=>showNoteInfo(el.dataset.id),
 'write-in':showWriteIn,'edit-note':el=>showNoteEditor(el.dataset.id),
 'edit-selected-note':()=>showNoteEditor(root.querySelector('#note-select').value),
 'edit-restore':()=>{if(!['note','annotation'].includes(editDraft.kind)){restoreBaseDraft();return;}const values=(editDraft.kind==='annotation'?annotationStore:notesStore).values(editDraft.id,true);dialog.querySelectorAll('[data-edit-field]').forEach(f=>{if(f.type==='checkbox')f.checked=values[f.dataset.editField];else f.value=values[f.dataset.editField];});updateDraft();},
 'reload-notes':()=>{notesStore.load();finishClose();renderAfterEdit();},
 'export-notes':()=>transition(()=>downloadNotes(notesStore.value)),
 'restore-notes':()=>transition(()=>previewNotes(notesStore.original,'Restore original notes?')),
 'export-draft':()=>{if(editDraft.kind==='annotation')downloadNotes({format:'whatsonmyballot-annotation-draft',schemaVersion:'1.0.0',id:editDraft.id,revision:editDraft.annotationRevision,values:editDraft.values},'guide-mark-draft');else if(editDraft.kind==='annotations-import')downloadNotes(editDraft.proposed,'guide-marks');else if(editDraft.kind==='note')downloadNotes({format:'whatsonmyballot-note-draft',schemaVersion:notesStore.value.schemaVersion,id:editDraft.id,values:editDraft.values},'note-draft');else if(editDraft.kind==='notes-import')downloadNotes(editDraft.proposed);else exportBaseDraft();},
 'recover-note':()=>{const offer=noteRecovery;notesStore.clearRecovery(offer.owner);noteRecovery=null;showNoteEditor(offer.id,offer);},
 'discard-note-recovery':()=>{notesStore.clearRecovery(noteRecovery.owner);noteRecovery=null;finishClose();},
 'export-old-note':()=>downloadNotes(noteRecovery,'note-draft')
});
window.addEventListener('storage',event=>{
 if(!notesStore||event.key!==notesStore.key&&event.key!==null)return;
 if(editDraft?.kind==='note'||editDraft?.kind==='notes-import'){
  const target=dialog.querySelector('#editor-error');if(target)target.textContent='Notes changed in another tab. Export your draft before reloading.';return;
 }
 notesStore.load();render({keepScroll:true});
});

Object.assign(actions,{
 start:()=>{returnToReview=false;go('race',selectedSectionId);},
 'open-ballot':openBallot,
 'close-ballot':()=>transition(()=>finishBallot()),
 'whole-ballot':openBallot,
 'nav-ballot':()=>{returnToReview=false;go('race');},
 'toggle-review':()=>go('race'),
 back:()=>{if(returnToReview){returnToReview=false;go('review');}else if(sectionIndex()>0)stepSection(-1);}
});
ballotDialog.addEventListener('cancel',event=>{event.preventDefault();transition(()=>finishBallot());});

function trapDialogTab(event){
 if(event.key!=='Tab')return;
 const surface=menuDialog.open?menuDialog:dialog.open?dialog:ballotDialog.open?ballotDialog:null;if(!surface)return;
 const items=[...surface.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(el=>!el.closest('[inert]')&&el.tabIndex>=0&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
 if(!items.length){event.preventDefault();return;}
 const first=items[0],last=items.at(-1),active=document.activeElement;
 if(event.shiftKey&&(active===first||!surface.contains(active))){event.preventDefault();last.focus({preventScroll:true});}
 else if(!event.shiftKey&&(active===last||!surface.contains(active))){event.preventDefault();first.focus({preventScroll:true});}
}
document.addEventListener('keydown',trapDialogTab);

Object.assign(actions,{
 'edit-annotation':el=>showAnnotationEditor(el.dataset.id),
 'edit-selected-annotation':()=>showAnnotationEditor(root.querySelector('#annotation-select').value),
 'export-annotations':()=>transition(()=>downloadNotes(annotationStore.value,'guide-marks')),
 'restore-annotations':()=>transition(()=>previewAnnotations(annotationStore.original,'Restore original guide marks?',annotationStore.unreadable)),
 'reload-annotations':()=>{annotationStore.load();finishClose();renderAfterEdit();},
 'export-raw-annotations':()=>{const url=URL.createObjectURL(new Blob([annotationStore.raw||''],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='unreadable-guide-marks.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
 'recover-annotation':()=>{const offer=annotationRecovery;annotationStore.clearRecovery(offer.owner);annotationRecovery=null;showAnnotationEditor(offer.id,offer);},
 'discard-annotation-recovery':()=>{annotationStore.clearRecovery(annotationRecovery.owner);annotationRecovery=null;finishClose();},
 'export-old-annotation':()=>downloadNotes(annotationRecovery,'guide-mark-draft')
});
window.addEventListener('storage',event=>{
 if(!annotationStore||event.key!==annotationStore.key&&event.key!==null)return;
 if(editDraft?.kind==='annotation'||editDraft?.kind==='annotations-import'){editorError(Error('Guide marks changed in another tab. Your draft is still here.'));return;}
 annotationStore.load();render({keepScroll:true});
});
const menuDialog=document.querySelector('#menu-dialog');
const menuIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
const districtIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/></svg>';
const tallBallotIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="1.5"/><path d="M9 6h6m-6 4h3m-3 4h3m-3 4h3"/><ellipse cx="15" cy="10" rx="1.5" ry="1"/><ellipse cx="15" cy="14" rx="1.5" ry="1"/><ellipse cx="15" cy="18" rx="1.5" ry="1"/></svg>';
let areaCatalog,activeAreaId,draftAreaId,activeBallot,areaStorage=null,areaKey='',bundleBase,areaSaveWarning='',menuReturn=null;
const hasActiveBallot=()=>Boolean(areaCatalog?.ballot(activeAreaId));
function districtFields(){
 const path=areaCatalog.path(draftAreaId);
 return path.map(n=>{
  const level=areaCatalog.value.levels.find(l=>l.id===n.level),options=areaCatalog.children(n.parentId);
  if(options.length===1)return '<div class="b-area-known"><span>'+h(level.label)+'</span><strong>'+h(n.label)+'</strong></div>';
  const status=node=>areaCatalog.available(node.id)?tallBallotIcon+'<span class="sr-only">Ballot available. </span>':'<span class="b-area-empty-icon" aria-hidden="true"></span>';
  return '<div class="b-area-field"><span id="area-label-'+h(n.level)+'">'+h(level.label)+'</span><details class="b-area-picker" data-area-picker="'+h(n.level)+'"><summary aria-labelledby="area-label-'+h(n.level)+' area-value-'+h(n.level)+'"><span class="b-area-value" id="area-value-'+h(n.level)+'">'+status(n)+h(n.label)+'</span>'+icon('chevron')+'</summary><div class="b-area-options" role="listbox" aria-label="'+h(level.label)+'">'+options.map(o=>'<button type="button" role="option" aria-selected="'+(o.id===n.id)+'" data-action="pick-area" data-id="'+h(o.id)+'" data-level="'+h(n.level)+'" class="'+(areaCatalog.available(o.id)?'has-ballot':'no-ballot')+'">'+status(o)+'<span>'+h(o.label)+'</span>'+(areaCatalog.available(o.id)?'':'<small>No ballot data</small>')+'</button>').join('')+'</div></details></div>';
 }).join('')+'<div class="b-area-preview" role="status">'+(areaCatalog.ballot(draftAreaId)?tallBallotIcon+'<span>'+h(areaCatalog.ballot(draftAreaId).label)+' is ready.</span>':'<span>No ballot information for this area.</span>')+'</div>'+button('Use this area '+icon('next'),'use-area','primary b-use-area');
}
function districtView(){
 return '<div class="race-layout b-district"><span class="eyebrow">YOUR AREA</span><h1 tabindex="-1">Find your ballot.</h1><p>Choose your area, then press Use this area.</p><div class="b-current-area"><strong>Current area</strong><p>'+h(areaCatalog.label(activeAreaId))+'</p></div>'+(!hasActiveBallot()?'<div class="notice" role="status"><strong>No ballot information is available.</strong><p>Choose another area. Menu and Admin are still available.</p></div>':'')+(areaSaveWarning?'<p class="notice">'+h(areaSaveWarning)+'</p>':'')+'<section class="b-area-card" aria-label="Choose an area"><p class="b-area-key">'+tallBallotIcon+' Ballot information available</p><div id="area-fields">'+districtFields()+'</div></section><p class="small muted">These locations are fictional examples.</p></div>';
}
function pickArea(el){
 draftAreaId=areaCatalog.leaf(el.dataset.id).id;root.querySelector('#area-fields').innerHTML=districtFields();
 const next=root.querySelector('[data-area-picker="'+CSS.escape(el.dataset.level)+'"] summary')||root.querySelector('[data-action=use-area]');next?.focus({preventScroll:true});
}
function useArea(){
 transition(()=>{
  const chosen=draftAreaId,next=areaCatalog.ballot(chosen);areaSaveWarning=areaCatalog.save(areaStorage,areaKey,chosen)?'':'This area is selected for this visit. Browser saving is unavailable.';
  activeAreaId=chosen;
  const currentUrl=new URL(location.href);currentUrl.searchParams.set('area',chosen);currentUrl.searchParams.delete('screen');currentUrl.searchParams.delete('race');history.replaceState(null,'',currentUrl);
  if(next&&next.id!==activeBallot.id){const url=new URL(location.href);url.search='';url.searchParams.set('area',chosen);location.assign(url.href);return;}
  closeMenu(false);finishBallot(false);screen=next?'race':'district';render({focus:true});
 });
}
function openMenu(){
 transition(()=>{menuReturn=document.activeElement;
  menuDialog.innerHTML='<header><h2 id="menu-title">Menu</h2>'+button(icon('close'),'close-menu','b-menu-close','aria-label="Close menu"')+'</header><nav aria-label="App menu"><details class="b-demo-flyout"><summary>'+icon('play')+'<span>Demo</span>'+icon('chevron')+'</summary><div>'+[['fresh','Fresh Start'],['example','Example selections'],['clear','Clear personal choices'],['restore','Restore original content']].map(([action,label])=>button(label,'demo-'+action,'b-menu-item',!hasActiveBallot()&&action!=='fresh'?'disabled':'')).join('')+'</div></details>'+button(icon('edit')+' Admin','nav-admin','b-menu-item')+button(icon('help')+' Help','nav-help','b-menu-item')+'</nav><p class="small muted">Fictional demo · '+h(APP_VERSION_LABEL)+'</p>';
  menuDialog.showModal();root.querySelector('#app-menu-button')?.setAttribute('aria-expanded','true');menuDialog.querySelector('[data-action=close-menu]').focus({preventScroll:true});
 });
}
function closeMenu(restore=true){
 if(!menuDialog.open)return;menuDialog.close();root.querySelector('#app-menu-button')?.setAttribute('aria-expanded','false');if(restore&&menuReturn?.isConnected)menuReturn.focus({preventScroll:true});
}
function runDemo(action){
 closeMenu(false);
 if(!hasActiveBallot()){
  if(action!=='fresh')return;
  confirmAction('Fresh Start?','Open our example ballot with no personal choices?','Start fresh',()=>{areaCatalog.save(areaStorage,areaKey,areaCatalog.value.defaultAreaId);const url=new URL(location.href);url.search='';url.searchParams.set('area',areaCatalog.value.defaultAreaId);url.searchParams.set('demo','fresh');location.assign(url.href);});return;
 }
 if(action==='restore'){actions['restore-content']();return;}if(action==='clear'){actions['clear-all']();return;}
 confirmAction(action==='fresh'?'Fresh Start?':'Load example choices?',action==='fresh'?'Clear personal choices and return to the first section? The sample opinion guide and saved text stay as they are.':'Replace personal choices with the bundled sample choices?',action==='fresh'?'Start fresh':'Load example',()=>{
  finishBallot(false);if(action==='fresh'){model.clearAll();onlyRecommendations=true;showGuideMarks=true;saveReaderPreferences();selectedSectionId=content.contests[0].id;paperPage=1;screen='race';}else{model.example();screen='review';}render({focus:true});
 });
}
function bindBackdrop(surface,close){
 let outsideDown=false;
 const outside=e=>{const b=surface.getBoundingClientRect();return e.target===surface&&(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom);};
 surface.addEventListener('pointerdown',e=>{outsideDown=outside(e);});
 surface.addEventListener('click',e=>{if(outsideDown&&outside(e)){e.preventDefault();close();}outsideDown=false;});
}
bindBackdrop(ballotDialog,()=>transition(()=>finishBallot()));
bindBackdrop(menuDialog,()=>closeMenu());
menuDialog.addEventListener('cancel',e=>{e.preventDefault();closeMenu();});
document.addEventListener('keydown',e=>{
 const picker=e.target.closest('.b-area-picker');if(!picker)return;
 const options=[...picker.querySelectorAll('[role=option]')],index=options.indexOf(e.target);
 if(e.key==='Escape'&&picker.open){e.preventDefault();picker.open=false;picker.querySelector('summary').focus();}
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();picker.open=true;const target=e.key==='Home'?0:e.key==='End'?options.length-1:e.key==='ArrowDown'?(index+1)%options.length:(index<1?options.length-1:index-1);options[target]?.focus();}
});
document.addEventListener('click',e=>{for(const picker of root.querySelectorAll('.b-area-picker[open]'))if(!picker.contains(e.target))picker.open=false;});
Object.assign(actions,{
 'open-menu':openMenu,'close-menu':()=>closeMenu(),'nav-district':()=>go('district'),'nav-view':()=>{if(hasActiveBallot())openBallot();},
 'pick-area':pickArea,'use-area':useArea,
 'create-ballot':()=>openDialog('Create ballot','<p>This feature is planned. No ballot is created in B.7E.</p><p>Choose an area with ballot data to try the existing local editor.</p>',button('Close','close-dialog')),
 'demo-fresh':()=>runDemo('fresh'),'demo-example':()=>runDemo('example'),'demo-clear':()=>runDemo('clear'),'demo-restore':()=>runDemo('restore'),
 'refocus-section':()=>setSnapMode(true),
 'view-all':showWholePage,
 'zoom-extents':showWholePage,
 'zoom-section':()=>paperController?.focusElement(ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId)),true,1)
});

init();
