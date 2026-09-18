import { APP_VERSION_LABEL } from '../../../version.js';
import { referenceUrl } from '../../../sharedrefs/registry.js';
import { escapeHtml as h, icon, designId, safeHttps } from '../../Mockup A/assets/shared.js';
import { createGuideModel } from './guide.js';
import { applyDemoChoices } from './demo.js';
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
let ballotOrigin=null;
dialog.className = 'app-dialog';
let seed, original, content, settings, model, variant;
let screen = 'race', reviewMode = 'rows', paperPage = 1, showExplanations = false, admin = false, returnToReview = false;
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
const area = () => content.areas[0];
const pdfPath = () => referenceUrl(content.officialPdfs[0].path);
const statusLabel = () => model.storageAvailable ? 'Your choices stay in this browser.' : 'Your choices last for this visit. Browser saving is unavailable.';
const button = (label, action, cls = '', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const editPill = (id, group = 'editorial') => admin ? `<button type="button" class="edit-pill no-print" data-action="edit" data-id="${h(id)}" data-group="${group}" aria-label="Edit ${h(group === 'candidate' ? 'name & link' : groupLabel(group))}">${icon('edit')} ${group === 'candidate' ? 'Edit name &amp; link' : group === 'source' ? 'Edit source' : group === 'document' ? 'Edit document' : 'Edit'}</button>` : '';
function post(type, data = {}) { if (window.parent !== window) window.parent.postMessage({ channel: 'ballot-preview-v1', type, ...data }, location.origin); }
function steps(active) { return `<ol class="flow-steps" aria-label="Guide steps">${['Your area', 'Your choices', 'Your guide'].map((label, i) => `<li class="${i === active ? 'current' : ''}" ${i === active ? 'aria-current="step"' : ''}><span class="step-num">${i + 1}</span>${label}</li>`).join('')}</ol>`; }
function sourcePanel(page=null){
 return '<div class="source-panel"><strong>Original ballot layout reference</strong><p>Akron Township, Precinct 1AF · November 5, 2024'+(page?' · Page '+page:'')+'</p><p class="small">B.5 replaces the names with fictional entries. Its random guide marks are not on this PDF.</p><a href="'+h(pdfPath())+(page?'#page='+page:'')+'" target="_blank" rel="noopener noreferrer">'+icon('pdf')+' Open original sample PDF '+icon('source')+'</a></div>';
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
const noteLabels={synopsis:'Neutral synopsis (one sentence)',author:'Opinion author',opinion:'Opinion text',sourceUrl:'Source link (HTTPS; optional)'};
let selectedSectionId=null,focusPending=true,notesStore,noteRecovery=null;
const idleHint=createIdleHint();
const sectionIndex=()=>Math.max(0,content.contests.findIndex(r=>r.id===selectedSectionId));
const markCount=r=>model.count(r.id)+'/'+r.maxSelections+(model.count(r.id)>0&&model.count(r.id)<r.maxSelections?'*':'');
function notePill(id){return admin?button(icon('edit')+' Edit note','edit-note','edit-pill','data-id="'+h(id)+'"'):'';}
function noteTools(id,prefix,detailAction){
 const n=notesStore.get(id),open=opinionOpen(id);
 return '<div class="b-tools-slot"><div class="b-reveal-inner"><div class="b-row-tools">'+button(scaleIcon+'<span>Opinion</span><span class="b-opinion-chevron">'+icon('chevron')+'</span>','opinion','b-opinion-chip','data-id="'+h(id)+'" aria-label="Opinion on '+h(n.label)+'" aria-expanded="'+open+'" aria-controls="'+prefix+'-opinion-'+h(id)+'"')+button(searchIcon,detailAction,'b-icon-btn','data-id="'+h(id)+'" aria-label="More information about '+h(n.label)+'"')+'</div></div></div>';
}

function inlineText(id,prefix,text,cls=''){
 return '<div class="b-ballot-text '+cls+'">'+text+'</div>';
}

function markUrl(r,chosen,active=r.id===selectedSectionId,paper=false){
 return new URL('marks/'+(paper&&active?'lime':'slate')+'-'+(chosen?'filled':'empty')+'.svg',import.meta.url).href;
}

function markImage(r,id,chosen,kind,prefix='section'){
 return '<img class="b-choice-mark" data-mark="'+h(id)+'" data-mark-kind="'+kind+'" data-race-id="'+h(r.id)+'" src="'+markUrl(r,chosen,r.id===selectedSectionId,prefix==='paper')+'" width="48" height="32" alt="" aria-hidden="true">';
}
function choiceTick(r,id,chosen,prefix,label,kind='candidate'){
 return '<label class="b-tick"><input class="sr-only" type="checkbox" name="'+prefix+'-'+h(r.id)+'" data-'+(kind==='party'?'option':'choice')+'="'+h(id)+'" data-race-id="'+h(r.id)+'" '+(chosen?'checked':'')+' aria-label="Select '+h(label)+'">'+markImage(r,id,chosen,kind,prefix)+'</label>';
}

function synopsisPanel(id,prefix){return opinionPanel(id,prefix);}
function writeInRow(w,r,prefix){
 const name=model.record(r.id).writeIns[w.id]||'',a=annotationStore.get(w.id);
 return '<div class="b-write-row '+annotationClass(w.id)+'" data-write-row="'+h(w.id)+'" data-guide-row="'+h(w.id)+'" '+annotationStyle(a)+'><div class="b-candidate-row">'+button(markImage(r,w.id,Boolean(name.trim()),'write-in',prefix),'write-in','b-tick b-write-tick','data-id="'+h(w.id)+'" data-race-id="'+h(r.id)+'" aria-label="Edit write-in for '+h(r.officialTitle)+'"')+inlineText(w.id,prefix,'<span class="candidate-name" data-write-name="'+h(w.id)+'">'+h(name||'Write-in')+'</span>')+guideSymbol(w.id)+noteTools(w.id,prefix,'note-info')+'</div>'+opinionPanel(w.id,prefix)+annotationPill(w.id)+'</div>';
}

function showWriteIn(el){
 const r=get('contests',el.dataset.raceId),id=el.dataset.id;
 openDialog('Write-in / '+r.officialTitle,'<p>A name counts toward the choice limit for this race.</p><label class="editor-field">Write-in name<input type="text" maxlength="120" data-write-in="'+h(id)+'" data-race-id="'+h(r.id)+'" value="'+h(model.record(r.id).writeIns[id]||'')+'" autocomplete="off"></label><p class="small">Your guide saves this name as you type.</p><p id="write-status" role="status"></p>',button('Done','close-dialog'));
}
function paintFocus(){
 for(const n of choiceNodes('.b-ballot-section')){
  const selected=n.dataset.raceId===selectedSectionId,expanded=selected&&(!n.classList.contains('is-paper')||paperExpandedId===selectedSectionId);n.classList.toggle('is-focused',selected);n.classList.toggle('is-expanded',expanded);
  if(selected)n.setAttribute('aria-current','true');else n.removeAttribute('aria-current');
  for(const el of n.querySelectorAll('.b-tools-slot,.b-clear-chip,.b-annotation-edit'))el.inert=!expanded;
  for(const el of n.querySelectorAll('.b-opinion-slot'))el.inert=!expanded||el.dataset.open!=='true';
 }
 syncMarks();paperController?.selected(ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId)));
}

function syncMarks(){
 choiceNodes('[data-mark]').forEach(el=>{
  const r=get('contests',el.dataset.raceId),choice=model.record(r.id),id=el.dataset.mark;
  const chosen=el.dataset.markKind==='party'?(choice.optionIds||[]).includes(id):el.dataset.markKind==='write-in'?Boolean(choice.writeIns[id]?.trim()):choice.candidateIds.includes(id);
  el.src=markUrl(r,chosen,r.id===selectedSectionId,Boolean(el.closest('.is-paper')));
 });
}
function prepareInteraction(section,target){
 if(!ballotDialog.open||!section?.classList.contains('is-paper'))return;
 const anchor=paperController?.captureAnchor(target),changed=section.dataset.raceId!==selectedSectionId;
 if(changed||paperExpandedId!==selectedSectionId)selectSection(section.dataset.raceId,false);
 paperController?.ensureComfortable(section,target,tightSection?1:.75,anchor);
}

function selectSection(id,zoom=true){
 const r=get('contests',id);if(!r)return;selectedSectionId=id;paperExpandedId=id;model.visit(id);
 if(!ballotDialog.open){screen='race';render({focus:true});return;}
 const page=r.sourceRefs[0].viewerPage;
 if(page!==paperPage){paperPage=page;renderBallot({focusSection:zoom});}
 else{
  paintFocus(zoom);updatePaperControls();
  const section=ballotDialog.querySelector('#paper-'+CSS.escape(id));
  paperController?.selected(section);if(zoom)paperController?.focusElement(section,true,tightSection?1:.75);
 }
 updateDockMap();
 announce('Section '+(sectionIndex()+1)+' of '+content.contests.length+': '+r.officialTitle);
}

function stepSection(delta){const next=content.contests[sectionIndex()+delta];if(next)transition(()=>selectSection(next.id));}
function showOpinion(el){
 const id=el.dataset.id,anchor=paperController?.captureAnchor(el);
 opinionOverrides.set(id,!opinionOpen(id));syncOpinionPanels(id);
 if(anchor)paperController?.holdAnchor(anchor);else paperController?.reflow();
}

function showNoteInfo(id){const n=notesStore.get(id),r=get('contests',n.raceId);openDialog(n.label,'<span class="tag">Neutral synopsis</span><p>'+h(n.synopsis)+'</p><p>'+h(r.officialSelectionInstruction)+'</p>'+sourcePanel(r.sourceRefs[0].viewerPage)+notePill(id));}
function notesAdminPanel(){
 return '<section class="help-card"><h2>Synopses and opinions</h2><p>Keep the synopsis neutral and one sentence long. Add an author for each opinion.</p>'+(notesStore.warning?'<p class="notice">'+h(notesStore.warning)+'</p>':'')+'<label class="editor-field">Note<select id="note-select">'+notesStore.value.records.map(n=>'<option value="'+h(n.id)+'">'+h(n.kind+' / '+n.label)+'</option>').join('')+'</select></label>'+button(scaleIcon+' Edit selected note','edit-selected-note')+'<p class="small">Notes schema 1.0.0 · Revision '+notesStore.value.revision+' · '+notesStore.changed().length+' edited notes</p>'+button('Export notes JSON','export-notes')+'<label class="editor-field">Import notes JSON<input type="file" id="notes-file" accept=".json,application/json"></label>'+button('Restore original notes','restore-notes','quiet')+'</section>';
}
function adminView(){return originalAdminView().replace('<section class="help-card">',annotationsAdminPanel()+notesAdminPanel()+'<section class="help-card">');}
function showNoteEditor(id,offer=null){
 transition(()=>{
  admin=true;const saved=notesStore.values(id);
  editDraft={kind:'note',id,noteRevision:notesStore.value.revision,saved,values:offer?clone(offer.values):clone(saved)};
  openDialog('Edit synopsis and opinion','<p class="small muted">'+h(notesStore.get(id).label)+'</p><p class="notice">Save keeps this note in this browser. Restore original fills the draft.</p>'+Object.entries(editDraft.values).map(([k,v])=>'<label class="editor-field">'+h(noteLabels[k])+'<textarea data-edit-field="'+k+'" rows="'+(k==='opinion'?5:2)+'" maxlength="'+(k==='opinion'?4000:k==='sourceUrl'?2000:500)+'">'+h(v)+'</textarea></label>').join('')+'<p id="editor-status" role="status"></p><p id="recovery-status" class="small muted">An unsaved note has a local recovery copy.</p><div id="editor-error" role="alert"></div><div class="editor-preview" id="editor-preview"></div>',button('Restore original','edit-restore')+button('Cancel','close-dialog')+button('Save','edit-save','primary'));
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
 openDialog(title,'<p>'+changed.length+' notes will change. Personal choices stay as they are.</p>'+changed.map(n=>'<details><summary>'+h(n.label)+'</summary>'+Object.keys(noteLabels).map(k=>'<h3>'+h(noteLabels[k])+'</h3><p class="small">Saved: '+h(notesStore.get(n.id)[k]||'(empty)')+'</p><p>New: '+h(n[k]||'(empty)')+'</p>').join('')+'</details>').join('')+'<div id="editor-error" role="alert"></div>',button('Cancel','close-dialog')+button('Apply notes','edit-save','primary'));syncDirty();
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


const guideCheck='<svg class="b-guide-glyph" viewBox="0 0 48 32" role="img" aria-label="THIS — sample guide mark"><ellipse cx="24" cy="16" rx="21" ry="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 16 6 6 12-12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const guideOr='<svg class="b-guide-glyph" viewBox="0 0 48 32" role="img" aria-label="OR — another sample option"><ellipse cx="24" cy="16" rx="21" ry="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 10c-6 0-6 12 0 12s6-12 0-12Zm10 12V10h3c6 0 6 6 0 6h-3m3 0 5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const palettes={blue:['#eaf2fa','#28577b','#2068a0'],green:['#edf5ed','#2d5c37','#367844'],red:['#fbeeed','#853d39','#b83d38'],yellow:['#fff8dc','#6d570e','#947611'],orange:['#fff0e2','#874917','#b55d17'],gray:['#eff1f3','#485761','#5f6c77']};
let annotationStore,annotationRecovery=null,annotationExamples,showGuideMarks=true,tightSection=false,preferenceStorage=null,preferenceKey='',paperExpandedId=null;
const opinionOverrides=new Map();
const guideGlyph=mark=>mark==='this'?guideCheck:mark==='or'?guideOr:'';
const hasGuideMark=id=>{const a=annotationStore?.get(id);return Boolean(a&&a.mark!=='none');};
const opinionOpen=id=>opinionOverrides.has(id)?opinionOverrides.get(id):showGuideMarks&&hasGuideMark(id);
function annotationStyle(a){const c=palettes[a?.color]||palettes.gray;return 'style="--guide-tint:'+c[0]+';--guide-ink:'+c[1]+';--guide-color:'+c[2]+'"';}
function annotationClass(id){return showGuideMarks&&hasGuideMark(id)?'has-guide-mark':'';}
function guideSymbol(id){
 const a=annotationStore.get(id);
 return '<span class="b-guide-symbol" data-guide-symbol="'+h(id)+'" '+(showGuideMarks&&a?.mark!=='none'?'':'hidden')+'>'+guideGlyph(a?.mark)+'</span>';
}
function annotationPill(id){return admin?'<div class="b-annotation-edit">'+button(icon('edit')+' Edit guide mark','edit-annotation','edit-pill','data-id="'+h(id)+'"')+'</div>':'';}
function opinionNote(id){
 const race=get('contests',id),party=race?.kind==='straight-party'?model.record(id).optionIds?.[0]:null;
 return {note:notesStore.get(party||id),party};
}
function opinionBody(id){
 const {note:n,party}=opinionNote(id);
 return '<div class="b-opinion-heading">'+scaleIcon+'<span>Opinion'+(party?' · '+h(get('options',party).officialLabel):'')+'</span></div><p class="b-inline-author">'+h(n.author||'No author added')+'</p><div class="b-inline-copy">'+(n.opinion.trim()?n.opinion.split(/\n{2,}/).map(p=>'<p>'+h(p)+'</p>').join(''):'<p>No opinion added.</p>')+'</div>'+(n.sourceUrl?'<a href="'+h(n.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Opinion source '+icon('source')+'</a>':'')+notePill(n.id);
}
function opinionPanel(id,prefix){
 const open=opinionOpen(id);
 return '<div class="b-opinion-slot" data-opinion-slot="'+h(id)+'" data-open="'+open+'" '+(!open?'inert':'')+'><div class="b-reveal-inner"><aside class="b-inline-opinion" id="'+prefix+'-opinion-'+h(id)+'" data-opinion-panel="'+h(id)+'" '+annotationStyle(annotationStore.get(id))+' aria-label="Opinion on '+h(notesStore.get(id).label)+'">'+opinionBody(id)+'</aside></div></div>';
}
function syncOpinionPanels(id=null){
 choiceNodes('[data-opinion-slot]').forEach(slot=>{
  const key=slot.dataset.opinionSlot;if(id&&key!==id)return;
  const open=opinionOpen(key);slot.dataset.open=String(open);slot.inert=!open||(slot.closest('.is-paper')&&!slot.closest('.is-expanded'));
  slot.querySelector('[data-opinion-panel]').innerHTML=opinionBody(key);
 });
 choiceNodes('[data-action=opinion]').forEach(el=>{if(!id||el.dataset.id===id)el.setAttribute('aria-expanded',String(opinionOpen(el.dataset.id)));});
}

function changeGuideVisibility(visible){
 showGuideMarks=visible;opinionOverrides.clear();
 try{preferenceStorage?.setItem(preferenceKey,JSON.stringify({schemaVersion:'1.0.0',showGuideMarks}));}catch{}
 choiceNodes('[data-guide-row]').forEach(row=>row.classList.toggle('has-guide-mark',showGuideMarks&&hasGuideMark(row.dataset.guideRow)));
 choiceNodes('[data-guide-symbol]').forEach(el=>el.hidden=!showGuideMarks||!hasGuideMark(el.dataset.guideSymbol));
 syncOpinionPanels();paperController?.reflow();
 announce(showGuideMarks?'Guide marks and their opinions are shown.':'Guide marks are hidden. Opinion buttons remain available.');
}
function fictionalPreview(){
 return '<details class="b-example-preview"><summary>See THIS and OR with fictional names</summary><p class="small">Layout example only · Choose no more than 3. These names are not on the sample ballot.</p><div class="b-example-rows">'+annotationExamples.options.map(a=>'<div class="b-example-row" '+annotationStyle(a)+'><strong>'+h(a.label)+'</strong><span class="b-guide-symbol">'+guideGlyph(a.mark)+'</span><div class="b-inline-opinion"><div class="b-opinion-heading">'+scaleIcon+'<span>Opinion · '+h(a.author)+'</span></div><p>'+h(a.opinion)+'</p></div></div>').join('')+'</div></details>';
}
function annotationsAdminPanel(){
 return '<section class="help-card"><h2>Guide marks</h2><p>THIS is a main choice. OR is another option. Mark any number of options; these marks do not fill a reader’s circles.</p><p class="small">Every section has random sample guide marks. The names and opinions in B.5 are fictional placeholders.</p>'+fictionalPreview()+(annotationStore.warning?'<p class="notice" role="status">'+h(annotationStore.warning)+'</p>'+button('Export unreadable saved file','export-raw-annotations'):'')+'<label class="editor-field">Ballot option<select id="annotation-select">'+annotationStore.value.records.map(a=>'<option value="'+h(a.id)+'">'+h(a.kind+' / '+a.label)+'</option>').join('')+'</select></label>'+button(icon('edit')+' Edit guide mark','edit-selected-annotation')+'<p class="small">Guide marks schema 1.0.0 · Revision '+annotationStore.value.revision+'</p>'+button('Export guide marks JSON','export-annotations')+'<label class="editor-field">Import guide marks JSON<input type="file" id="annotations-file" accept=".json,application/json"></label>'+button('Restore original guide marks','restore-annotations','quiet')+'</section>';
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
 return '<div class="b-canvas-body"><div class="paper-viewport" id="paper-viewport" tabindex="0" role="region" aria-label="Fictional ballot viewer. Pinch to zoom. Arrow keys move the page."><div class="paper-document" id="paper-document" data-page="'+paperPage+'"><header class="b-paper-heading"><span class="b-paper-eyebrow">FICTIONAL BALLOT · LAYOUT EXAMPLE</span><h2>Sample General Election</h2><p>Sample Township · Precinct DEMO</p><p class="b-paper-demo-note">Random names and marks · Page '+paperPage+' of 2</p></header><div class="paper-columns">'+[1,2,3].map(c=>'<div class="paper-column" data-column="'+c+'">'+content.contests.filter(r=>r.sourceRefs[0].viewerPage===paperPage&&r.sourceRefs[0].column===c).map(r=>ballotSection(r,true)).join('')+'</div>').join('')+'</div><footer class="b-paper-foot">Fictional names and random marks · Layout sample only</footer></div><div id="paper-focus-frame" class="b-focus-frame" aria-hidden="true" hidden></div>'+button('<svg class="icon b-return-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg><span></span>','refocus-section','b-section-indicator','id="section-indicator" hidden')+'</div><div class="b-zoom-slider" role="group" aria-label="Ballot zoom controls">'+button('+','zoom-in','b-zoom-step','aria-label="Zoom in"')+'<input id="ballot-zoom" type="range" min="0" max="100" step=".1" value="50" aria-label="Ballot zoom">'+button('−','zoom-out','b-zoom-step','aria-label="Zoom out"')+'</div><div class="b-idle-hint" id="pinch-hint" aria-hidden="true">'+extentsIcon+'<span>Pinch &amp; Zoom</span></div></div><nav class="b-ballot-toolbar" aria-label="Ballot view and sections">'+button(extentsIcon+'<span>Zoom</span>','zoom-extents','','aria-label="Zoom out to the whole ballot page" title="Show the whole ballot page"')+'<label class="b-section-zoom btn"><input type="checkbox" id="section-zoom" '+(tightSection?'checked':'')+' aria-label="Snap to a section after dragging">'+sectionIcon+'<span>Snap</span></label>'+button(icon('back')+'<span>Prev</span>','section-prev','','aria-label="Previous ballot section" '+(i===0?'disabled':''))+button('<span>Next</span>'+icon('next'),'section-next','','aria-label="Next ballot section" '+(i===content.contests.length-1?'disabled':''))+'</nav><span class="sr-only" id="section-position">Section '+(i+1)+' of '+content.contests.length+'</span>';
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
 return '<section class="b-ballot-section '+(paper?'is-paper':'is-readable')+(race.id===selectedSectionId?' is-focused':'')+'" data-race-id="'+h(race.id)+'" id="'+prefix+'-'+h(race.id)+'" aria-labelledby="'+prefix+'-title-'+h(race.id)+'">'+sectionBand(race,paper)+'<header class="b-race-heading"><div><h2 class="race-title" id="'+prefix+'-title-'+h(race.id)+'">'+race.officialTitleLines.map(h).join('<br>')+'</h2><p class="b-limit">'+h(race.officialSelectionInstruction)+'</p></div>'+noteTools(race.id,prefix,'race-detail')+'</header>'+editPill(race.id,'contest')+opinionPanel(race.id,prefix)+(race.kind==='straight-party'?'<p class="b-reference-note">This guide keeps your party mark separate. It does not fill other races.</p>':'')+'<fieldset class="b-choices" aria-labelledby="'+prefix+'-title-'+h(race.id)+'"><legend class="sr-only">Choices for '+h(race.officialTitle)+'</legend>'+race.candidateIds.map(id=>candidateCard(get('candidates',id),race,paper)).join('')+race.optionIds.map(id=>partyCard(get('options',id),race,prefix)).join('')+'</fieldset>'+race.writeIns.map(w=>writeInRow(w,race,prefix)).join('')+'<div class="b-section-footer"><span class="b-race-status" data-choice-status data-race-id="'+h(race.id)+'">'+h(selectionText(race))+'</span>'+button('Clear Selection','clear-race','b-clear-chip','data-id="'+h(race.id)+'" aria-label="Clear choices in '+h(race.officialTitle)+'"')+'</div></section>';
}
function partyCard(o,r,prefix){
 const chosen=(model.record(r.id).optionIds||[]).includes(o.id),a=annotationStore.get(o.id);
 return '<div class="candidate-card b-candidate '+(chosen?'is-selected ':'')+annotationClass(o.id)+'" data-guide-row="'+h(o.id)+'" data-race-id="'+h(r.id)+'" '+annotationStyle(a)+'><div class="b-candidate-row">'+choiceTick(r,o.id,chosen,prefix,o.officialLabel,'party')+inlineText(o.id,prefix,'<span class="candidate-name">'+h(o.officialLabel)+'</span>')+guideSymbol(o.id)+noteTools(o.id,prefix,'note-info')+'</div>'+opinionPanel(o.id,prefix)+annotationPill(o.id)+'</div>';
}
function candidateCard(c,race,paper=false){
 const chosen=model.record(race.id).candidateIds.includes(c.id),prefix=paper?'paper':'section',a=annotationStore.get(c.id);
 return '<div class="candidate-card b-candidate '+(chosen?'is-selected ':'')+annotationClass(c.id)+'" data-guide-row="'+h(c.id)+'" data-candidate-card="'+h(c.id)+'" data-race-id="'+h(race.id)+'" '+annotationStyle(a)+'><div class="b-candidate-row">'+choiceTick(race,c.id,chosen,prefix,c.officialName)+inlineText(c.id,prefix,'<span class="candidate-name">'+c.officialNameLines.map(h).join('<br>')+'</span>'+(c.partyLabel||c.officialDesignation?'<span class="candidate-party">'+h(c.partyLabel||c.officialDesignation)+'</span>':''))+guideSymbol(c.id)+noteTools(c.id,prefix,'candidate-detail')+'</div>'+opinionPanel(c.id,prefix)+annotationPill(c.id)+'</div>';
}

function writeInFields(race){
 return '<details class="write-in" '+(Object.values(model.record(race.id).writeIns).some(Boolean)?'open':'')+'><summary>Add a write-in</summary><div class="write-in-fields"><p class="small muted">A name counts toward the selection limit.</p>'+race.writeIns.map((slot,i)=>'<label for="'+h(slot.id)+'">Write-in '+(race.writeIns.length>1?i+1:'name')+'<input id="'+h(slot.id)+'" type="text" maxlength="120" data-write-in="'+h(slot.id)+'" data-race-id="'+h(race.id)+'" value="'+h(model.record(race.id).writeIns[slot.id]||'')+'" autocomplete="off"></label>').join('')+'</div></details>';
}
function adjacentChip(delta){
 const next=content.contests[sectionIndex()+delta],forward=delta>0;
 if(!next)return forward?'<div class="b-adjacent b-adjacent-next">'+button('Next: Review choices '+icon('next'),'next','b-step-chip')+'</div>':'';
 const label=(forward?'Next: ':'Back: ')+headingText(next)+(forward?' ('+(sectionIndex()+delta+1)+'/'+content.contests.length+')':'');
 return '<div class="b-adjacent '+(forward?'b-adjacent-next':'b-adjacent-back')+'">'+button((forward?'':icon('back'))+'<span>'+h(label)+'</span>'+(forward?icon('next'):''),forward?'next':'back','b-step-chip','title="'+h(label)+'"')+'</div>';
}
function raceView(){
 const r=currentRace();
 return '<div class="b-section-view"><div class="b-section-intro"><div><h1 tabindex="-1">Voting Guide for <span>'+h(area().displayLabel)+'</span></h1><p class="b-demo-label">Fictional options · Random demo marks</p></div></div><div id="guide-progress">'+renderProgress(content.contests,selectedSectionId,id=>model.count(id))+'</div><div class="b-guide-options"><label class="b-guide-toggle"><input type="checkbox" id="show-guide-marks" '+(showGuideMarks?'checked':'')+'>Show opinion guide</label><span class="b-guide-key" aria-label="Guide symbols: check means THIS; OR means another option">'+guideGlyph('this')+'<span>THIS</span>'+guideGlyph('or')+'</span></div>'+adjacentChip(-1)+'<div class="b-readable-paper">'+ballotSection(r)+'</div>'+adjacentChip(1)+'<div class="selection-message" id="selection-feedback" role="status" hidden></div></div>';
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
 const progress=root.querySelector('#guide-progress');if(progress)progress.innerHTML=renderProgress(content.contests,selectedSectionId,id=>model.count(id));
}

function stopPaper(){
 idleHint.attach(null);paperController?.destroy();paperController=null;
}
function openBallot(){
 transition(()=>{
  if(ballotDialog.open)return;
  ballotOrigin={sectionId:selectedSectionId,scroll:root.querySelector('.main-scroll')?.scrollTop||0};
  paperPage=currentRace().sourceRefs[0].viewerPage;
  paperState={mode:'extents',zoom:1,x:0,y:0};paperExpandedId=null;
  ballotDialog.showModal();renderBallot({reset:true});updateDockMap();
  ballotDialog.querySelector('#ballot-tool-close').focus({preventScroll:true});
 });
}
function renderBallot({reset=false,focusSection=false}={}){
 const active=ballotDialog.contains(document.activeElement)?document.activeElement:null;
 const action=active?.dataset.action,id=active?.dataset.id;
 stopPaper();
 ballotDialog.innerHTML='<header class="b-tool-header"><div><h2 id="ballot-tool-title">Ballot Viewer <span>— Fictional sample · DEMO</span></h2></div>'+button(icon('close'),'close-ballot','b-tool-close','id="ballot-tool-close" aria-label="Close whole ballot"')+'</header><section class="b-canvas b-tool-canvas" aria-label="Interactive whole ballot">'+paperView()+'</section><div id="ballot-announcement" class="sr-only" role="status" aria-live="polite"></div>';
 paperController=mountPaper(ballotDialog.querySelector('#paper-viewport'),ballotDialog.querySelector('#paper-document'),paperState,state=>{paperState=state;updatePaperControls();},updateViewedSection,id=>selectSection(id,false));
 const selected=ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId));
 paperController.selected(selected);paperController.setSnap(tightSection);
 if(focusSection)paperController.focusElement(selected,true,tightSection?1:.75);else if(reset)paperController.extents(false);
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
 return '<div class="race-layout b-help"><h1 tabindex="-1">Explore the sample.</h1><section class="help-card"><h2>A full layout example</h2><p>B.5 uses fictional names, filled sample notes, and random red guide marks. Sample personal choices are also loaded on your first visit. They are separate from guide marks.</p><p>The original PDF supplies the layout reference. The fictional names and sample marks do not appear on that PDF.</p></section><section class="help-card"><h2>Read one section</h2><p>Use the small Back and Next chips or the larger bottom buttons. A filled oval is your choice. A faint check or OR oval belongs to the sample opinion guide.</p><p>Show opinion guide turns the guide highlights, symbols, and automatic notes on or off. You can still open any Opinion chip.</p><p>Progress follows the relative section sizes. A check means the section has at least one saved choice; it may still allow more.</p></section><section class="help-card"><h2>Use Ballot Viewer</h2><p>The map opens the ballot in a separate window. Inactive sections stay compact. Tap a section to expand its tools and notes.</p><p>Zoom shows the full page. Plus, minus, and the slider change magnification. Drag to move, or use pinch and zoom on a touch screen.</p><p>Snap starts off. Turn it on to center a section when a drag ends. It keeps the row near the middle at the same height. Pinch zoom remains free. Prev and Next use a closer fit with Snap on.</p><p>If you move away from the selected section, an edge label points toward it. Tap that label to return. X closes the viewer.</p><p>Arrow keys move the focused canvas. Home shows the page; plus and minus zoom. Escape closes the top window.</p></section><section class="help-card"><h2>Edit or reset</h2><p>Admin can edit this fictional dataset and its notes. Save, Cancel, Restore original, and draft recovery work locally. Earlier mockups keep their own saved data.</p>'+sourcePanel()+'</section><p class="small muted">'+h(statusLabel())+' App '+h(APP_VERSION_LABEL)+'</p>'+button('Clear sample personal choices','clear-all')+'</div>';
}

function render({focus=false,keepScroll=false}={}){
 const scroll=root.querySelector('.main-scroll')?.scrollTop||0;
 const navActive=screen==='race'?'ballot':screen;
 root.innerHTML='<div class="app-layout"><header class="app-header b-masthead"><a class="b-brand" href="#" data-action="nav-ballot"><img src="assets/flag-mark.svg" alt="" width="38" height="38"><span>What’s on my ballot?<small>FICTIONAL BALLOT · UI DEMO</small></span></a>'+button(icon('help'),'help','b-help-button','aria-label="Open help"')+(admin?'<div class="admin-ribbon"><span>'+icon('edit')+'Edit buttons on</span><button class="admin-exit" data-action="leave-admin">Exit Admin</button></div>':'')+'</header><main id="main" class="main-scroll" tabindex="-1"><div class="main-inner">'+(screen==='race'?raceView():screen==='review'?reviewView():screen==='admin'?adminView():helpView())+'</div></main>'+(screen==='race'?'<nav class="flow-actions" aria-label="Section navigation"><div class="flow-action-inner">'+dockMap()+button(icon('back')+'<span>Back</span>','back','back-btn',sectionIndex()===0&&!returnToReview?'disabled':'')+button((returnToReview||sectionIndex()===content.contests.length-1?'Review':'Next')+icon('next'),'next','primary next-btn')+'</div></nav>':'<div class="b-no-flow"></div>')+'<nav class="bottom-nav" aria-label="Main navigation">'+[['ballot','ballot','Ballot'],['review','review','My guide'],['help','help','Help'],['admin','edit','Admin']].map(([action,glyph,label])=>'<button data-action="nav-'+action+'" '+(navActive===action?'aria-current="page"':'')+'>'+icon(glyph)+label+'</button>').join('')+'</nav></div>';
 document.body.dataset.design='B.5';document.body.dataset.screen=screen;
 paintFocus();if(ballotDialog.open)renderBallot();
 if(keepScroll)root.querySelector('.main-scroll').scrollTop=scroll;
 if(focus&&!ballotDialog.open)root.querySelector('h1')?.focus({preventScroll:true});
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

function rowReview() {
  return content.sections.map((section) => `<section class="review-section" aria-labelledby="review-${h(section.id)}"><h2 id="review-${h(section.id)}">${h(section.officialTitle)}</h2>${section.contestIds.map((id) => {
    const race = get('contests', id), names = chosenNames(race);
    return `<div class="review-row"><div><h3>${h(race.officialTitle)}</h3>${names.length ? names.map((name) => `<p class="review-choice"><img class="icon" src="assets/marks/slate-filled.svg" alt="" aria-hidden="true" width="24" height="24"><span>${h(name)}</span></p>`).join('') : '<p class="review-undecided">Undecided</p>'}</div>${button('Change', 'change-race', 'compact', `data-id="${h(id)}" aria-label="Change ${h(race.officialTitle)}"`)}${showExplanations ? `<div class="review-explanation"><span class="tag example">Example content</span><p>${h(explanation(race).purposeSentence)}</p>${model.record(id).candidateIds.map((cid) => `<p><strong>${h(get('candidates', cid).officialName)}</strong><br>${summary(get('candidates', cid)).sentences.map(h).join(' ')}</p>`).join('')}</div>` : ''}</div>`;
  }).join('')}</section>`).join('');
}
function reviewView() {
  const answered = model.answered();
  return `<div class="review-content">${steps(2)}<span class="tag">Fictional sample · Personal marks</span><h1 tabindex="-1" style="margin-top:15px">Your choices, together.</h1><p class="muted">Sample Township · Precinct DEMO<br><span class="small">Fictional ballot interface demo</span></p><div class="count-boxes"><div class="count-box"><strong>${answered}</strong><span>${answered === 1 ? 'section' : 'sections'} with<br>choices</span></div><div class="count-box"><strong>${model.races.length - answered}</strong><span>${model.races.length - answered === 1 ? 'section' : 'sections'} left<br>undecided</span></div></div><p class="small muted">You can leave any race undecided and return to it later.</p><div class="review-controls no-print">${button(`${icon('ballot')} Back to sections`, 'toggle-review')}<a class="btn" href="${h(pdfPath())}" target="_blank" rel="noopener noreferrer">${icon('pdf')} Original ballot layout reference (PDF) ${icon('source')}</a>${button(`${icon('print')} Print my guide`, 'print')}</div><label class="checkbox-label no-print"><input type="checkbox" id="show-explanations" ${showExplanations ? 'checked' : ''}>Show explanations</label><div id="review-rows">${rowReview()}</div><p class="small muted">Your party mark is saved separately. It does not fill individual races.</p><p class="print-attribution small muted" style="margin-top:24px">Personal guide · Does not cast a vote.<br>Layout reference: Tuscola County, November 5, 2024 sample ballot, pages 1–2. Fictional names and sample marks are added for this demo.${showExplanations ? '<br>Profile text is labeled example content.' : ''}</p></div>`;
}
function originalAdminView() {
  const modified = changedGroups(original, content);
  return `<div class="race-layout"><span class="eyebrow">ADMIN DEMO</span><h1 tabindex="-1" style="margin-top:12px">Keep the information clear.</h1><p class="muted">Edit the text, then save it in this browser.</p><div class="notice"><strong>Local demo · No sign-in</strong><br>Edits to this fictional dataset stay in B.5 in this browser. They are not published to other devices.</div><p class="small">App ${h(APP_VERSION_LABEL)} · Content revision ${revision} · Format 1.0.0</p>${adminMessage || contentStore.warning ? `<p class="notice" role="status">${h(adminMessage || contentStore.warning)}</p>` : ''}${button(`${icon('edit')} ${admin ? 'Edit buttons are on' : 'Turn on Edit buttons'}`, 'enable-admin', admin ? '' : 'primary')}${admin ? button('Leave Admin mode', 'leave-admin', 'quiet') : ''}<section class="help-card"><h2>Edit the information</h2><p>Open a race to use its Edit buttons. You can also choose a content group here.</p>${button('Open the current race', 'start', 'primary')}<label class="editor-field" for="edit-group-select">Content group<select id="edit-group-select">${Object.entries(collections).map(([group]) => `<optgroup label="${h(groupLabel(group))}">${allGroups(content).filter(item => item.group === group).map(item => `<option value="${item.group}:${h(item.id)}">${h(item.label)}</option>`).join('')}</optgroup>`).join('')}</select></label>${button('Edit selected group', 'edit-selected')}<p class="small muted">The original PDF stays unchanged. Personal choices are separate.</p></section><section class="help-card"><h2>Move content between browsers</h2><p>Export the saved text as JSON. To import, choose a file and check its changes first.</p>${button('Export saved content', 'export-content')}<label class="editor-field" for="content-file">Import content JSON (up to 5 MiB)<input type="file" id="content-file" accept=".json,application/json"></label><p class="small muted">Files contain text and source links. Personal choices are never included.</p></section><section class="help-card"><h2>Edited locally</h2><p>${modified.length ? `${modified.length} content group${modified.length === 1 ? '' : 's'} changed.` : 'No content changes yet.'}</p>${modified.map(item => `<div>${button(`${icon('edit')} ${h(item.label)}`, 'edit', 'quiet compact', `data-id="${h(item.id)}" data-group="${item.group}"`)}</div>`).join('')}${button(`${icon('reset')} Restore original content`, 'restore-content')}${contentStore.previous ? button('Review previous saved version', 'previous-content', 'quiet') : ''}</section></div>`;
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
 transition(()=>{
  finishBallot(false);screen=next==='home'?'race':next;
  if(raceId){selectedSectionId=raceId;model.visit(raceId);}
  render({focus:true});
 });
}

function confirmAction(title, text, label, callback) {
  transition(() => { openDialog(title, `<p>${h(text)}</p>`, `${button('Cancel', 'close-dialog')}${button(label, 'confirm-action', 'primary')}`); pendingTransition = callback; });
}
function showCandidate(id) {
  const candidate = get('candidates', id), text = summary(candidate);
  openDialog(candidate.officialName, `<span class="tag example">${h(text.statusLabel)}</span><div class="portrait-line"><img src="${h(assetUrl(get('media', candidate.portraitMediaId).path))}" alt="Photo not added"><p>${h(candidate.partyLabel || 'No party label printed')}<br>Photo not added</p></div><div class="detail-copy">${text.detailParagraphs.map((paragraph) => `<p>${h(paragraph)}</p>`).join('')}</div>${editPill(text.id)}${editPill(candidate.id, 'candidate')}${candidate.verificationStatus === 'demo-edited' ? '<p class="small">Fictional sample name. The original PDF is a layout reference.</p>' : ''}${sourceWebsite(candidate)}${sourcePanel(candidate.sourceRefs[0].viewerPage)}`, `${button(`Read profile example ${icon('next')}`, 'read-document', '', `data-id="${h(candidate.documentIds[0])}" data-candidate="${h(id)}"`)}`);
}
function showDocument(id, candidateId) {
  const doc = get('documents', id);
  openDialog(doc.title, `<span class="tag example">${h(doc.statusLabel)} · Not a website archive</span>${editPill(id, 'document')}<article class="markdown">${renderMarkdown(doc.markdown, original)}</article><p class="small muted">${h(doc.note)}</p>`, candidateId ? button(`${icon('back')} Back to candidate`, 'candidate-detail', '', `data-id="${h(candidateId)}"`) : '');
}
function showRaceDetail(id) {
  const race = get('contests', id), text = explanation(race);
  if(race.kind==='straight-party'){openDialog(race.officialTitle,'<p><strong>'+h(race.officialSelectionInstruction)+'</strong></p><p>'+h(notesStore.get(id).synopsis)+'</p><p>Your party mark is saved separately from individual races.</p>'+sourcePanel(1)+notePill(id));return;}
  openDialog(race.officialTitle, `<p><strong>${h(race.officialSelectionInstruction)}</strong></p><span class="tag example">Example content</span>${text.paragraphs.map((paragraph) => `<p>${h(paragraph)}</p>`).join('')}${editPill(text.id)}${showExplanations && race.candidateIds.length ? race.candidateIds.map((cid) => `<h3>${h(get('candidates', cid).officialName)}</h3><p>${summary(get('candidates', cid)).sentences.map(h).join(' ')}</p>`).join('') : ''}${sourcePanel(race.sourceRefs[0].viewerPage)}`, race.kind !== 'straight-party' ? button('Change this race', 'change-race', 'primary', `data-id="${h(id)}"`) : '');
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
  dialog.querySelectorAll('[data-edit-field]').forEach(field => { editDraft.values[field.dataset.editField] = normalize(field.value); });
  const dirty = isDirty(), status = dialog.querySelector('#editor-status');
  status.textContent = dirty ? 'Unsaved changes' : 'No unsaved changes'; status.classList.toggle('dirty', dirty);
  dialog.querySelector('#editor-preview').innerHTML = editDraft.kind==='annotation'?annotationDraftPreview():Object.entries(editDraft.values).map(([key, text]) => key === 'markdown' ? `<article class="markdown">${renderMarkdown(text, original)}</article>` : `<p>${h(text)}</p>`).join('');
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
      await notesStore.commit(next,editDraft.noteRevision);editDraft.saved=clone(editDraft.values);editDraft.baseContent=notesStore.value;notesStore.clearRecovery(recoveryOwner);adminMessage='Notes saved in this browser.';syncDirty();announce(adminMessage);return true;
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
 ballotDialog.querySelector('[data-action=zoom-extents]')?.setAttribute('aria-pressed',String(paperState.mode==='extents'));
 const toggle=ballotDialog.querySelector('#section-zoom');if(toggle)toggle.checked=tightSection;
 const slider=ballotDialog.querySelector('#ballot-zoom');
 if(slider){
  const value=Math.max(0,Math.min(100,Math.log(Math.max(.02,paperState.zoom)/.02)/Math.log(800)*100));
  slider.value=String(value);slider.setAttribute('aria-valuetext',Math.round(paperState.zoom*100)+' percent zoom');
 }
}
function updateViewedSection(view){
 const frame=ballotDialog.querySelector('#paper-focus-frame'),indicator=ballotDialog.querySelector('#section-indicator');if(!frame||!indicator)return;
 if(!view){frame.hidden=true;indicator.hidden=true;return;}
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
  if(el.id==='show-guide-marks')changeGuideVisibility(el.checked);
  if(el.id==='section-zoom'){tightSection=el.checked;paperController?.setSnap(tightSection);if(tightSection){paperExpandedId=selectedSectionId;paintFocus();paperController?.focusElement(ballotDialog.querySelector('#paper-'+CSS.escape(selectedSectionId)),true,1);}}
  if (el.id === 'notes-file') {importNotes(el.files[0]);el.value='';}
  if (el.id === 'content-file') { importFile(el.files[0]); el.value = ''; }
  if (el.id === 'show-explanations') { showExplanations = el.checked; render({ keepScroll: true }); root.querySelector('#show-explanations').focus({ preventScroll: true }); }
});
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-write-in]')) { const result = model.write(el.dataset.raceId, el.dataset.writeIn, el.value); syncChoices(result.message || '', !result.ok); }
  if(el.id==='ballot-zoom')paperController?.zoomTo(.02*Math.pow(800,Number(el.value)/100),undefined,false);
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
      : 'Replace the personal marks with the bundled random sample choices?', action === 'fresh' ? 'Start fresh' : 'Load example', () => {
        if (action === 'fresh') { finishBallot(false);model.clearAll(); selectedSectionId=content.contests[0].id;paperPage=1;focusPending=true;screen = 'race'; } else { finishBallot(false);model.example(); screen = 'review'; reviewMode = 'rows'; }
        render({ focus: true });
      });
  }
  if (event.data.type === 'open-a') transition(() => post('open-a-ready'));
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
    const demoResponse=await fetch('data/demo-choices.seed.json');if(!demoResponse.ok)throw Error('Missing sample choices');const demoChoices=await demoResponse.json();applyDemoChoices(model,demoChoices,storage);model.example=()=>applyDemoChoices(model,demoChoices,storage,true);
    const notesResponse=await fetch('data/notes.seed.json');if(!notesResponse.ok)throw Error('Missing notes');
    notesStore=createNotesStore(await notesResponse.json(),storage,new URL('../../',import.meta.url).pathname);notesStore.load();
    const [annotationResponse,exampleResponse]=await Promise.all([fetch('data/annotations.seed.json'),fetch('data/annotation-examples.json')]);
    if(!annotationResponse.ok||!exampleResponse.ok)throw Error('Missing guide mark data');
    annotationStore=createAnnotationStore(await annotationResponse.json(),storage,new URL('../../',import.meta.url).pathname);annotationStore.load();
    annotationExamples=await exampleResponse.json();
    preferenceStorage=storage;preferenceKey=annotationStore.key+':reader-view';
    try{const saved=JSON.parse(storage?.getItem(preferenceKey));if(saved?.schemaVersion==='1.0.0'&&typeof saved.showGuideMarks==='boolean')showGuideMarks=saved.showGuideMarks;}catch{}
    selectedSectionId=content.contests[0].id;
    const params = new URLSearchParams(location.search); variant = { ...settings.variants.find(entry => entry.id === 'A5'), id: 'B.5', showSelectionExplanation: false };
    if (params.get('screen') === 'race') { screen = 'race'; const id = params.get('race'); model.visit(model.races.some((race) => race.id === id) ? id : model.state.currentRaceId); }
    if (params.get('screen') === 'review') screen = 'review';
    if (params.get('screen') === 'admin') screen = 'admin';
    if(params.get('screen')==='race')selectedSectionId=params.get('race')&&content.contests.some(r=>r.id===params.get('race'))?params.get('race'):model.state.currentRaceId;
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
 'edit-restore':()=>{if(!['note','annotation'].includes(editDraft.kind)){restoreBaseDraft();return;}const values=(editDraft.kind==='annotation'?annotationStore:notesStore).values(editDraft.id,true);dialog.querySelectorAll('[data-edit-field]').forEach(f=>f.value=values[f.dataset.editField]);updateDraft();},
 'reload-notes':()=>{notesStore.load();finishClose();renderAfterEdit();},
 'export-notes':()=>transition(()=>downloadNotes(notesStore.value)),
 'restore-notes':()=>transition(()=>previewNotes(notesStore.original,'Restore original notes?')),
 'export-draft':()=>{if(editDraft.kind==='annotation')downloadNotes({format:'whatsonmyballot-annotation-draft',schemaVersion:'1.0.0',id:editDraft.id,revision:editDraft.annotationRevision,values:editDraft.values},'guide-mark-draft');else if(editDraft.kind==='annotations-import')downloadNotes(editDraft.proposed,'guide-marks');else if(editDraft.kind==='note')downloadNotes({format:'whatsonmyballot-note-draft',schemaVersion:'1.0.0',id:editDraft.id,values:editDraft.values},'note-draft');else if(editDraft.kind==='notes-import')downloadNotes(editDraft.proposed);else exportBaseDraft();},
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
 const surface=dialog.open?dialog:ballotDialog.open?ballotDialog:null;if(!surface)return;
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
init();
