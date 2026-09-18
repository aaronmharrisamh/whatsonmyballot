import{createOutputController}from'./output-controller.js';
import{guideUI,guideTargetState}from'./guide-view.js';
import{ballotUI,targetState}from'./ballot-ui.js';
import{BallotCamera}from'./ballot-camera.js';
import{CollectionSession,DEMO_URL,BLUEPRINT_URL,serialized}from'./collection-session.js';
import{ImportCoordinator}from'./import-coordinator.js';
import{collectionOperation}from'./collection-client.js';
import{installFileDrop}from'./drop-import.js';
import{editorData,editorFields,collectFields,applyEditor,attachmentUses,findRecord}from'./editor-adapters.js';
import{districtView,adminView,ballotView,guideView,viewerView,defaultForArea,leafFor}from'./views.js';
import{h,icon,markdown,download,makeId,megabytes,ownValue,personalMarks}from'./ui-utils.js';
import{formatErrorReport,MEDIA_TYPES}from'./collection-errors.js';
import{sameToken,openCollectionStore,tokenOf}from'./collection-store.js';
import{APP_VERSION_LABEL}from'../../../version.js';
const app=document.querySelector('#app'),editor=document.querySelector('#editor-dialog'),notice=document.querySelector('#notice-dialog'),transition=document.querySelector('#transition-dialog'),progress=document.querySelector('#import-dialog'),viewer=document.querySelector('#ballot-dialog'),detail=document.querySelector('#detail-dialog'),menu=document.querySelector('#menu-dialog');
let session,imports,screen='ballot',district,adminBallot,adminGuide,adminContest,adminMode=false,showAll=false,draft=null,recoveryQueue=Promise.resolve(),uploadController=null,decision=null,noticeAction=null,lastError='',operationBusy=false,startupSnapshot=null,startupStore=null,pendingFiles=null;
let camera=null;
const outputs=createOutputController({getSession:()=>session,onError:showMessage});
viewer.addEventListener('close',()=>{camera?.destroy();camera=null;document.body.classList.remove('viewer-open');});
let tabId;try{tabId=sessionStorage.getItem('b8-editor-tab')||crypto.randomUUID();sessionStorage.setItem('b8-editor-tab',tabId);}catch{tabId=crypto.randomUUID();}
const send=(type,data={})=>{if(parent!==window)parent.postMessage({channel:'ballot-preview-v1',type,...data},location.origin);};
const actionButton=(action,label,extra='',style='quiet')=>'<button type="button" class="'+style+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
function open(dialog){if(!dialog.open){dialog._returnFocus=document.activeElement;dialog.showModal();}dialog.querySelector('h2,button,input')?.focus({preventScroll:true});}
function close(dialog){if(dialog.open)dialog.close();const old=dialog._returnFocus;const target=old?.isConnected?old:old?.dataset.action?[...app.querySelectorAll('[data-action]')].find(el=>el.dataset.action===old.dataset.action&&el.className===old.className&&el.dataset.target===old.dataset.target):null;target?.focus({preventScroll:true});}
function announce(text){document.querySelector('#announcement').textContent=text;}
function showMessage(title,text,{confirm,run}={}){
 noticeAction=run||null;notice.innerHTML='<header class="dialog-header"><h2 tabindex="-1" id="notice-title">'+h(title)+'</h2>'+actionButton('close-notice',icon('close'),'aria-label="Close message"','icon-button')+'</header><div class="dialog-body"><p class="prewrap">'+h(text)+'</p>'+(confirm?actionButton('confirm-notice',h(confirm),'','primary'):'')+'</div>';open(notice);
}
function showError(error){lastError=formatErrorReport(error);noticeAction=null;notice.innerHTML='<header class="dialog-header"><h2 id="notice-title" tabindex="-1">Could not complete this action</h2>'+actionButton('close-notice',icon('close'),'aria-label="Close error"','icon-button')+'</header><div class="dialog-body"><pre class="error-report">'+h(lastError)+'</pre>'+actionButton('copy-error','Copy error report')+'</div>';open(notice);}
async function run(fn){try{return await fn();}catch(e){showError(e);return false;}}
function activeBallot(){return session.model.get(session.preferences.selection?.ballotId);}
function index(){const b=activeBallot();return b?Math.max(0,Math.min(b.contests.length-1,ownValue(session.preferences.sections,b.id,0))):0;}
function render(){
 if(!session)return;ballotUI.sync(session);const focus=document.activeElement,focusTarget=focus?.dataset.target,focusChoice=focus?.dataset.choice,focusAction=focus?.dataset.action,focusFilter=focus?.hasAttribute('data-only-recommendations'),focusReveal=focus?.dataset.showAll;const b=activeBallot(),available=Boolean(b),v=session.value;
 if(!district)district=structuredClone(session.preferences.district||v.defaultSelection);
 if(!v.ballots.some(b=>b.id===adminBallot))adminBallot=b?.id||v.ballots[0].id;
 const guides=session.model.guidesFor(adminBallot);if(!guides.some(g=>g.id===adminGuide))adminGuide=guides[0]?.id||null;
 const ab=session.model.get(adminBallot);if(!ab.contests.some(c=>c.id===adminContest))adminContest=ab.contests[0].id;
 const content=screen==='district'?districtView(session,district):screen==='admin'?adminView(session,{ballotId:adminBallot,guideId:adminGuide,contestId:adminContest,adminMode}):screen==='guide'?guideView(session):ballotView(session,{index:index(),showAll,adminMode});
 app.innerHTML='<header class="app-header"><a href="../index.html" data-action="all-mockups" class="brand"><img src="../Mockup%20B/assets/flag-mark.svg" width="30" height="30" alt="">Voting Guide</a>'+actionButton('menu',icon('menu'),'aria-label="Open menu"','icon-button')+'</header>'+
 (!session.store.durable?'<aside class="status-banner">Session only: browser storage is unavailable. Export your edits before closing this tab.</aside>':'')+
 (session.stale?'<aside class="status-banner">Another tab changed this collection. '+actionButton('reload-saved','Load latest saved data')+'</aside>':'')+
 (session.recoveries.length&&!draft?'<aside class="status-banner">A local editor draft is available. '+actionButton('recover','Review draft')+'</aside>':'')+
 '<main id="main" tabindex="-1" data-screen="'+screen+'">'+content+'</main><nav class="bottom-nav" aria-label="Main navigation">'+[['district','District','district'],['ballot','Ballot','ballot'],['guide','My guide','guide'],['view','View','ballot']].map(([act,label,ico])=>actionButton(act,icon(ico)+'<span>'+label+'</span>',(!available&&['ballot','guide','view'].includes(act)?'disabled ':'')+(screen===act?'aria-current="page"':''),'nav-item')).join('')+'</nav>';
 document.body.dataset.area=session.preferences.selection?.areaId||'';document.body.dataset.ballot=session.preferences.selection?.ballotId||'';document.body.dataset.guide=session.preferences.selection?.guideId||'';document.body.dataset.screen=screen;document.body.dataset.ready='true';document.body.dataset.collection=v.collectionId;document.body.dataset.generation=session.token.generation;document.body.dataset.revision=v.revision;
 outputs.refresh();send('ready');if(viewer.open){if(b)camera?.update(session,{index:index(),adminMode});else close(viewer);}
 if(!viewer.open){const nodes=[...app.querySelectorAll('button,input')];const replacement=nodes.find(el=>focusTarget?el.dataset.target===focusTarget&&el.dataset.action===focusAction:focusChoice?el.dataset.choice===focusChoice:focusFilter?el.hasAttribute('data-only-recommendations'):focusReveal?el.dataset.showAll===focusReveal:false);replacement?.focus({preventScroll:true});}
}
async function navigate(next){if(!await guard('leave this edit'))return;screen=next;showAll=false;ballotUI.navigate();close(menu);close(detail);if(next!=='view')close(viewer);render();document.querySelector('#main')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
async function selectSection(id){const b=activeBallot();if(!b)return;const next=b.contests.findIndex(r=>r.id===id);if(next<0||next===index())return;ballotUI.navigate();await session.setPreferences({...session.preferences,sections:{...session.preferences.sections,[b.id]:next}});}
async function move(delta){const b=activeBallot();if(!b)return;const i=Math.max(0,Math.min(b.contests.length-1,index()+delta));showAll=false;ballotUI.navigate();if(camera)camera.snap=true;await session.setPreferences({...session.preferences,sections:{...session.preferences.sections,[b.id]:i}});if(camera)camera.focus(b.contests[i].id,{top:true});else window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
async function exportSaved(){const blob=await session.export();download(blob,session.value.collectionId+'-schema-'+session.value.schemaVersion+'-'+new Date().toISOString().slice(0,10)+'.json');announce('Saved collection exported. Personal choices are not included.');}
function isDirty(){return Boolean(draft&&JSON.stringify(draft.data)!==JSON.stringify(draft.base));}
function draftStatus(text){const node=editor.querySelector('#draft-status');if(node)node.textContent=text||(isDirty()?'Unsaved changes':'No unsaved changes');send('dirty',{dirty:isDirty()});}
function persistDraft(){
 if(!draft)return;const copy=structuredClone(draft),expected=structuredClone(draft.token);
 recoveryQueue=recoveryQueue.then(()=>isDirtySnapshot(copy)?session.store.draft(copy,expected):session.store.removeDraft(copy.id,expected)).catch(e=>draftStatus('Recovery could not save: '+e.message));
}
const isDirtySnapshot=d=>JSON.stringify(d.data)!==JSON.stringify(d.base);
function renderEditor(){
 const title={details:'Ballot information',choice:'Recommendation and opinion',section:'Section opinion',guide:'Guide profile','create-guide':'Create guide',source:'Source information',attachment:'Informational file'}[draft.kind];
 const stale=!sameToken(draft.token,session.token)||session.stale;
 editor.innerHTML='<form id="edit-form"><header class="dialog-header"><h2 id="editor-title" tabindex="-1">'+title+'</h2>'+actionButton('cancel-edit',icon('close'),'aria-label="Close editor"','icon-button')+'</header><div class="dialog-body">'+(stale?'<p class="notice">This draft is from an earlier revision or import. Export it for recovery, then load the latest collection.</p>':'')+editorFields(session.value,draft)+'<p id="draft-status" role="status"></p></div><footer class="dialog-actions"><button type="submit" class="primary"'+(stale?' disabled':'')+'>Save</button>'+actionButton('cancel-edit','Cancel')+actionButton('restore-field','Restore original')+actionButton('export-draft','Export draft')+'</footer></form>';open(editor);draftStatus();
}
async function beginEditor(kind,target,guideId){
 if(!await guard('open another edit'))return;
 close(menu);close(detail);if((kind==='choice'||kind==='section')&&!guideId){showMessage('Create a guide first','Choose Admin, then Create guide for this ballot.');return;}
 const data=editorData(session.value,kind,target,guideId);let original=editorData(session.baseline,kind,target,guideId);
 if(kind==='attachment'&&!findRecord(session.baseline,target))original={item:null};
 if(['details','guide','source'].includes(kind)&&!findRecord(session.baseline,target))original=null;
 draft={id:tabId,kind,target,guideId,token:structuredClone(session.token),generation:session.token.generation,collectionId:session.value.collectionId,revision:session.value.revision,data,base:structuredClone(data),original,newGuideId:makeId('guide'),newAuthorId:makeId('author'),updatedAt:new Date().toISOString()};
 renderEditor();
}
async function discardEditor(){
 uploadController?.abort();await recoveryQueue;
 if(draft){try{await session.store.removeDraft(draft.id,session.token);}catch(error){if(error.name!=='ConflictError')throw error;}session.recoveries=session.recoveries.filter(d=>d.id!==draft.id);}
 draft=null;close(editor);send('dirty',{dirty:false});render();
}
async function saveEditor(){
 if(!draft)return true;if(uploadController)throw Error('Wait for file processing or cancel it before saving.');
 if(!editor.querySelector('form').reportValidity())return false;
 draft.data=collectFields(editor.querySelector('form'),draft);await recoveryQueue;
 if(!isDirty()&&draft.kind!=='create-guide'){await discardEditor();return true;}
 const savedDraft=structuredClone(draft),value=applyEditor(session.value,savedDraft);
 await session.save(value,savedDraft.token,{draftId:savedDraft.id});
 draft=null;close(editor);send('dirty',{dirty:false});
 if(savedDraft.kind==='create-guide'){adminGuide=savedDraft.newGuideId;const prefs=structuredClone(session.preferences);
  if(prefs.selection?.ballotId===savedDraft.target&&!prefs.selection.guideId)prefs.selection.guideId=adminGuide;
  if(prefs.district.ballotId===savedDraft.target&&!prefs.district.guideId)prefs.district.guideId=adminGuide;
  await session.setPreferences(prefs);district=structuredClone(prefs.district);
 }
 render();announce(session.store.durable?'Changes saved.':'Changes saved for this tab only.');return true;
}
async function guard(reason){
 if(!draft)return true;if(!isDirty()){await discardEditor();return true;}
 if(decision)return false;
 transition.innerHTML='<header class="dialog-header"><h2 id="transition-title" tabindex="-1">Keep your changes?</h2></header><div class="dialog-body"><p>You have unsaved changes. Save them, discard them, or keep editing.</p><p class="small">'+h(reason==='import'?'Import replaces the whole collection. Saving this edit does not merge it into the new file. Export the saved collection to keep a copy.':'Choose how to handle this edit before you '+reason+'.')+'</p><div class="stack">'+actionButton('guard-save','Save and continue','','primary')+actionButton('guard-discard','Discard and continue')+actionButton('guard-stay','Keep editing')+actionButton('guard-export','Export saved collection')+'</div></div>';open(transition);
 return new Promise(resolve=>decision=resolve);
}
function finishGuard(value){const resolve=decision;decision=null;close(transition);resolve?.(value);}
async function restoreDemo(){const response=await fetch(DEMO_URL);if(!response.ok)throw Error('The bundled demo could not load.');await imports.import([new File([await response.blob()],'demo.collection.json')]);}
async function restoreCollection(){
 if(!await guard('restore the imported original'))return;const value=structuredClone(session.baseline);await session.save(value,session.token);render();announce('Author content restored to the imported original. Personal choices are unchanged.');
}
async function showInfo(id){
 const r=session.model.get(id);if(!r||!session.model.detailsAvailable(id))return;const d=r.details||{};
 const sources=(d.sourceIds||[]).map(id=>session.model.get(id));
 const files=[...(d.attachmentIds||[])];if(r.imageAttachmentId)files.unshift(r.imageAttachmentId);
 detail.innerHTML='<header class="dialog-header"><h2 id="detail-title" tabindex="-1">'+h((r.titleLines||r.labelLines).join(' '))+'</h2>'+actionButton('close-detail',icon('close'),'aria-label="Close information"','icon-button')+'</header><div class="dialog-body">'+(d.summary?'<p>'+h(d.summary)+'</p>':'')+markdown(d.markdown)+sources.map(s=>'<p>'+h(s.title)+(s.url?' · <a href="'+h(s.url)+'" target="_blank" rel="noopener noreferrer">Open source</a>':'')+(s.attachmentId?actionButton('resource','Open source file','data-id="'+h(s.attachmentId)+'"'):'')+'</p>').join('')+files.map(id=>{const a=session.model.get(id);return a.mediaType.startsWith('image/')?'<figure><img class="resource-image" src="'+h(session.resources.url(id))+'" alt="'+h(a.fileName)+'"><figcaption>'+h(a.fileName)+'</figcaption></figure>':actionButton('resource',h(a.fileName),'data-id="'+h(id)+'"');}).join('')+'</div>';open(detail);
}
async function resource(id){
 const item=session.model.get(id);if(!item)return;
 if(item.mediaType.startsWith('text/')){
  const text=await session.resources.blob(id).text();detail.innerHTML='<header class="dialog-header"><h2 id="detail-title">'+h(item.fileName)+'</h2>'+actionButton('close-detail',icon('close'),'aria-label="Close file"','icon-button')+'</header><div class="dialog-body">'+(item.mediaType==='text/markdown'?markdown(text):'<pre class="prewrap">'+h(text)+'</pre>')+'</div>';open(detail);
 }else{window.open(session.resources.url(id),'_blank','noopener,noreferrer');}
}
function menuView(){
 menu.innerHTML='<header class="dialog-header"><h2 id="menu-title" tabindex="-1">Menu</h2>'+actionButton('close-menu',icon('close'),'aria-label="Close menu"','icon-button')+'</header><div class="dialog-body stack">'+actionButton('admin','Admin — edit guide')+actionButton('export','Export JSON ballot data')+actionButton('import','Import JSON ballot data')+actionButton('fresh','Fresh Start')+actionButton('restore-demo','Restore bundled demo')+actionButton('help','Help')+'<p class="small">B.8 · '+h(APP_VERSION_LABEL)+'<br>Local collection workspace</p></div>';open(menu);
}
async function upload(file){
 if(!draft||draft.kind!=='attachment'||!file)return;uploadController?.abort();const controller=new AbortController();uploadController=controller;
 const ext=file.name.split('.').pop().toLowerCase(),types={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',md:'text/markdown',txt:'text/plain'},mediaType=types[ext]||file.type;
 const status=editor.querySelector('#attachment-status'),cancel=editor.querySelector('[data-action=cancel-upload]');status.textContent='Checking and compressing '+file.name+'…';cancel.hidden=false;
 try{
  const item=await collectionOperation('encode',file,{id:draft.data.item?.id||makeId('attachment'),fileName:file.name,mediaType,signal:controller.signal});
  if(controller!==uploadController)return;draft.data.item=item;persistDraft();draftStatus();status.textContent=item.fileName+' · '+megabytes(item.rawBytes)+' expanded · '+megabytes(item.gzipBytes)+' gzip';
 }catch(e){if(e.name==='AbortError')status.textContent='File processing cancelled. The previous file is unchanged.';else{status.textContent='File not added. The previous file is unchanged.';showError(e);}}
 finally{if(controller===uploadController){uploadController=null;cancel.hidden=true;}}
}
async function onAction(action,el){
 if(action==='cancel-output'){outputs.cancel();return;}
 if(action==='ballot-pdf'){await outputs.pdf();return;}
 if(action==='print-guide'){outputs.print();return;}
 if(action==='recover-export'){download(serialized(startupSnapshot.collection.working),'b8-saved-collection-recovery.json');return;}
 if(action==='close-notice'){close(notice);return;}if(action==='copy-error'){try{await navigator.clipboard.writeText(lastError);announce('Error report copied.');}catch{showMessage('Copy the error report',lastError);}return;}
 if(action==='confirm-notice'){const fn=noticeAction;close(notice);await fn?.();return;}
 if(action==='guard-stay'){finishGuard(false);return;}
 if(action==='guard-export'){await exportSaved();return;}
 if(action==='guard-save'){if(await saveEditor())finishGuard(true);return;}
 if(action==='guard-discard'){await discardEditor();finishGuard(true);return;}
 if(action==='cancel-import'){imports.cancel();return;}
 if(action==='cancel-upload'){uploadController?.abort();return;}
 if(action==='cancel-edit'){if(await guard('close the editor'))await discardEditor();return;}
 if(action==='restore-field'){if(!draft.original){showMessage('No imported original','This record was created after the import. Cancel returns to its saved value. Restore imported original in Admin returns the whole collection to its imported state.');return;}draft.data=structuredClone(draft.original);renderEditor();persistDraft();return;}
 if(action==='export-draft'){download(new Blob([JSON.stringify({format:'whatsonmyballot-editor-draft',...draft},null,2)],{type:'application/json'}),'b8-editor-draft.json');return;}
 if(action==='import'){document.querySelector('#import-file').click();return;}
 if(imports?.busy||operationBusy)return;
 if(action==='edit'){await beginEditor(el.dataset.kind,el.dataset.target,el.dataset.guide);return;}
 if(action==='create-guide'){await beginEditor('create-guide',el.dataset.ballot);return;}
 if(action==='export'){if(await guard('export the collection'))await exportSaved();return;}
 if(action==='recover'){
  const recovery=[...session.recoveries].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))[0];if(!recovery)return;draft=structuredClone(recovery);renderEditor();return;
 }
 if(action==='reload-saved'){if(await guard('load the latest saved data')){await session.reload();district=structuredClone(session.preferences.district);showAll=false;render();}return;}
 if(action==='remove-attachment'){
  const uses=attachmentUses(session.value,el.dataset.id);if(uses.length)throw Error('This file is still used. Remove these assignments before deleting it:\n'+uses.join('\n'));
  showMessage('Remove this file?','The file is not assigned to any information, source, image, or author.',{confirm:'Remove file',run:async()=>{const next=structuredClone(session.value);next.attachments.items=next.attachments.items.filter(a=>a.id!==el.dataset.id);await session.save(next,session.token);}});return;
 }
 if(action==='restore-collection'){showMessage('Restore the imported original?','This replaces saved author edits with the original imported collection. Personal choices remain separate.',{confirm:'Restore original',run:restoreCollection});return;}
 if(action==='restore-demo'){showMessage('Restore the bundled demo?','This replaces the working collection and clears personal choices. Export first if you want to keep it.',{confirm:'Restore demo',run:restoreDemo});return;}
 if(action==='fresh'){if(await guard('start fresh')){ballotUI.opinions.clear();ballotUI.navigate();await session.clearChoices();await session.setPreferences({...session.preferences,onlyRecommendations:true,sections:{}});showAll=false;close(menu);screen=activeBallot()?'ballot':'district';render();}return;}
 if(action==='menu'){menuView();return;}if(action==='close-menu'){close(menu);return;}
 if(action==='help'){close(menu);showMessage('Using this guide','Choose District to select an area and guide. Mark your own choices on the Ballot. My guide shows the author’s recommendations. Admin edits save in this browser. Export a JSON collection to share it.');return;}
 if(action==='resource'){await resource(el.dataset.id);return;}
 if(action==='info'){await showInfo(el.dataset.target);return;}
 if(action==='close-detail'){close(detail);return;}
 if(action==='opinion'){const isGuide=screen==='guide'&&!viewer.open,state=isGuide?guideTargetState(session,el.dataset.target):targetState(session,el.dataset.target);if(state.opinion){(isGuide?guideUI:ballotUI).opinions.set(el.dataset.target,!state.open);render();}return;}
 if(action==='view'){if(!activeBallot()||!await guard('open the ballot viewer'))return;viewer.innerHTML=viewerView(session);open(viewer);document.body.classList.add('viewer-open');camera?.destroy();camera=new BallotCamera(viewer,{onSelect:id=>run(()=>selectSection(id)),onMove:delta=>run(()=>move(delta))});camera.update(session,{index:index(),adminMode},{initial:true});return;}
 if(action==='close-view'){close(viewer);return;}
 if(action==='back-to-start'){await move(-index());return;}
 if(action==='next'||action==='previous'){await move(action==='next'?1:-1);return;}
 if(action==='clear-section'){const b=activeBallot();const choices=structuredClone(ownValue(session.choices,b.id,{}));delete choices[el.dataset.contest];await session.setChoices(b.id,choices);render();return;}
 if(action==='use-area'){
  const next=defaultForArea(session.model,district.areaId,district.ballotId,district.guideId);
  await session.setPreferences({...session.preferences,selection:next,district:next});district=next;screen=next.ballotId?'ballot':'district';showAll=false;render();window.scrollTo(0,0);return;
 }
 if(action==='all-mockups'){if(await guard('leave the mockup')){if(parent===window)location.href='../index.html';else send('open-a-ready');}return;}
 if(['district','ballot','guide','admin'].includes(action)){if(action==='admin')adminMode=true;await navigate(action);}
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled)return;e.preventDefault();run(()=>onAction(el.dataset.action,el));});
document.addEventListener('keydown',e=>{if(e.target.matches('.admin-drop-zone')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();document.querySelector('#import-file').click();}});
document.addEventListener('change',e=>run(async()=>{
 const el=e.target;
 if(el.id==='import-file'){const files=Array.from(el.files);el.value='';if(files.length)await imports.import(files);return;}
 if(el.id==='attachment-file'){await upload(el.files[0]);return;}
 if(editor.contains(el))return;
 if(el.hasAttribute('data-area-level')){district=defaultForArea(session.model,leafFor(session.model,el.value));render();}
 if(el.hasAttribute('data-district-ballot')){district=defaultForArea(session.model,district.areaId,el.value);render();}
 if(el.hasAttribute('data-district-guide'))district.guideId=el.value;
 if(el.hasAttribute('data-admin-ballot')){adminBallot=el.value;adminGuide=null;adminContest=null;render();}
 if(el.hasAttribute('data-admin-guide')){adminGuide=el.value;render();}
 if(el.hasAttribute('data-admin-contest')){adminContest=el.value;render();}
 if(el.hasAttribute('data-admin-mode'))adminMode=el.checked;
 if(el.hasAttribute('data-only-recommendations')){ballotUI.navigate();await session.setPreferences({...session.preferences,onlyRecommendations:el.checked});showAll=false;render();}
 if(el.hasAttribute('data-show-all')){if(el.checked)ballotUI.reveals.add(el.dataset.showAll);else ballotUI.reveals.delete(el.dataset.showAll);render();}
 if(el.hasAttribute('data-choice')){
  const b=activeBallot(),contestId=session.model.ownerId(el.dataset.choice),saved=structuredClone(ownValue(session.choices,b.id,{})),marks=new Set(ownValue(saved,contestId,[]));
  if(el.checked)marks.add(el.dataset.choice);else marks.delete(el.dataset.choice);
  if(!session.model.canMark(contestId,[...marks])){el.checked=false;showMessage('Choice limit reached','Clear a choice in this section before adding another.');return;}
  saved[contestId]=[...marks];try{await session.setChoices(b.id,saved);}catch(error){render();throw error;}render();
 }
}));
editor.addEventListener('input',()=>{if(draft){draft.data=collectFields(editor.querySelector('form'),draft);draft.updatedAt=new Date().toISOString();draftStatus();persistDraft();}});
editor.addEventListener('change',e=>{if(draft&&e.target.id!=='attachment-file'){draft.data=collectFields(editor.querySelector('form'),draft);draftStatus();persistDraft();}});
editor.addEventListener('submit',e=>{e.preventDefault();if(operationBusy)return;operationBusy=true;run(saveEditor).finally(()=>operationBusy=false);});
for(const dialog of [editor,transition,progress])dialog.addEventListener('cancel',e=>{e.preventDefault();if(dialog===editor)run(()=>onAction('cancel-edit',dialog));if(dialog===transition)finishGuard(false);if(dialog===progress)imports?.cancel();});
for(const dialog of [menu,detail,viewer,notice]){dialog.addEventListener('cancel',e=>{e.preventDefault();close(dialog);});let backdrop=false;dialog.addEventListener('pointerdown',e=>backdrop=e.target===dialog);dialog.addEventListener('click',e=>{if(e.target===dialog&&backdrop)close(dialog);backdrop=false;});}
window.addEventListener('beforeunload',e=>{if(isDirty()){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>{imports?.cancel();uploadController?.abort();session?.dispose();startupStore?.close();});
installFileDrop({onFiles:files=>{if(imports)run(()=>imports.import(files));else pendingFiles=files;}});
window.addEventListener('message',event=>{
 if(event.source!==parent||event.origin!==location.origin||event.data?.channel!=='ballot-preview-v1')return;
 const data=event.data;if(data.type==='import-files'&&Array.isArray(data.files)){if(imports)run(()=>imports.import(data.files));else pendingFiles=data.files;}
 if(data.type==='open-a')run(()=>onAction('all-mockups',{}));
 if(data.type==='demo')run(()=>onAction(data.action==='fresh'?'fresh':data.action==='admin'?'admin':'restore-demo',{}));
});
try{
 session=await CollectionSession.open();district=structuredClone(session.preferences.district);screen=session.preferences.selection?.ballotId?'ballot':'district';
 session.addEventListener('change',render);session.addEventListener('external',()=>{render();if(draft)draftStatus('Another tab changed the saved data. Export this draft before loading the latest.');});
 imports=new ImportCoordinator({session,beforeImport:()=>guard('import'),
  onState:(stage,text)=>{
   if(stage==='Idle'){close(progress);app.inert=false;return;}
   if(stage==='Cancelled'){announce(text);return;}
   progress.innerHTML='<header class="dialog-header"><h2 id="import-title" tabindex="-1">'+h(stage)+'</h2></header><div class="dialog-body"><p role="status">'+h(text)+'</p><progress aria-label="Import in progress"></progress>'+actionButton('cancel-import','Cancel import')+'</div>';app.inert=true;open(progress);
  },
  onSuccess:()=>{draft=null;adminMode=false;district=structuredClone(session.preferences.district);adminBallot=null;adminGuide=null;adminContest=null;screen='district';showAll=false;for(const d of [editor,viewer,detail,menu,transition])close(d);render();announce('Collection imported. Choose Use this area to begin.');},
  onError:showError
 });render();if(pendingFiles){const files=pendingFiles;pendingFiles=null;run(()=>imports.import(files));}
}catch(error){
 try{startupStore=await openCollectionStore();startupSnapshot=await startupStore.read();
 const recoverySession={token:tokenOf(startupSnapshot?.active),replace:async(loaded,expected,options)=>{await startupStore.replace(loaded.model.value,loaded.stats,expected,options);loaded.resources.dispose();}};
 imports=new ImportCoordinator({session:recoverySession,beforeImport:async()=>true,onState:(stage,text)=>{if(stage==='Idle'){close(progress);return;}progress.innerHTML='<div class="dialog-body"><h2 id="import-title">'+h(stage)+'</h2><p>'+h(text||'')+'</p>'+actionButton('cancel-import','Cancel import')+'</div>';open(progress);},onSuccess:()=>location.reload(),onError:showError});
 app.innerHTML='<main><h1>Could not open the saved collection</h1><pre class="error-report">'+h(formatErrorReport(error))+'</pre><p>Your saved data has not been replaced. Download it for repair, import another JSON, or restore the bundled demo.</p><div class="stack">'+(startupSnapshot?actionButton('recover-export','Download saved collection for repair'):'')+actionButton('import','Import JSON ballot data')+actionButton('restore-demo','Restore bundled demo')+'</div></main>';
 }catch(storageError){app.innerHTML='<main><h1>Could not open this collection</h1><p>'+h(error.message)+'</p><p>'+h(storageError.message)+'</p><p>Your saved data has not been replaced. Reload to try again.</p></main>';}
 document.body.dataset.ready='error';send('ready');if(imports&&pendingFiles){const files=pendingFiles;pendingFiles=null;run(()=>imports.import(files));}
}
