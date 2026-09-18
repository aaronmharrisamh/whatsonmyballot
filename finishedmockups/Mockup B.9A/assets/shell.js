import { APP_VERSION_LABEL } from '../../../version.js';
import { installFileDrop } from './file-drop.js';
import { icon, escapeHtml as h } from '../../Mockup A/assets/shared.js';
const iframe=document.querySelector('#app-frame'),stage=document.querySelector('#stage'),space=document.querySelector('#frame-space'),device=document.querySelector('#device'),dialog=document.querySelector('#shell-dialog');
let mode='phone',lastFocus,importReady=false,pendingFile=null,pendingDropError='';
iframe.dataset.importReady='false';
document.querySelector('[data-app-version]').textContent=APP_VERSION_LABEL;
const send=(type,data={})=>iframe.contentWindow.postMessage({channel:'ballot-preview-v1',type,...data},location.origin);
function layout(){
 const small=matchMedia('(max-width:700px), (max-width:1000px) and (pointer:coarse)').matches,aw=stage.clientWidth-(small?0:48),ah=stage.clientHeight-(small?0:32);
 document.body.classList.toggle('desktop-mode',mode==='desktop');
 let width=mode==='desktop'?(small?1180:Math.max(768,Math.min(1280,aw))):390,height=mode==='desktop'?Math.max(600,ah):867;
 if(small&&mode==='phone'){width=aw;height=ah;}
 const scale=Math.min(1,aw/width,ah/height);
 space.style.width=width*scale+'px';space.style.height=height*scale+'px';device.style.width=width+'px';device.style.height=height+'px';device.style.transform='scale('+scale+')';
 document.querySelector('#frame-caption').textContent=mode==='phone'?'Phone view':'Desktop view';
 document.querySelector('#device-button').innerHTML=icon(mode==='phone'?'desktop':'phone')+'<span>'+(mode==='phone'?'Desktop':'Phone')+'</span>';
}
function open(title,body){lastFocus=document.activeElement;dialog.innerHTML='<header class="shell-dialog-header"><h2 id="shell-dialog-title" tabindex="-1">'+h(title)+'</h2><button class="shell-close" data-close aria-label="Close">'+icon('close')+'</button></header><div class="shell-dialog-content">'+body+'</div>';dialog.showModal();dialog.querySelector('h2').focus();}
function close(){dialog.close();lastFocus?.focus();}
function shellImportError(message){
 if(!dialog.open)return;
 let error=dialog.querySelector('#shell-import-error');
 if(!error){error=document.createElement('p');error.id='shell-import-error';error.className='shell-import-error';error.setAttribute('role','alert');dialog.querySelector('.shell-dialog-content').prepend(error);}
 error.textContent=message;
}
function forwardPendingDrop(){
 if(!importReady)return;
 if(pendingDropError){send('ballot-import-error',{error:pendingDropError});pendingDropError='';}
 if(pendingFile){const request=pendingFile;pendingFile=null;send('import-ballot-file',request);}
}
installFileDrop({
 onFile(file){
  pendingDropError='';dialog.querySelector('#shell-import-error')?.remove();
  pendingFile={file,requestId:'shell-'+crypto.randomUUID()};forwardPendingDrop();
 },
 onError(error){shellImportError(error.message);pendingDropError=error.message;forwardPendingDrop();}
});
iframe.addEventListener('load',()=>{importReady=false;iframe.dataset.importReady='false';send('ballot-import-handshake');});
function notes(){open('B.9A · Your guide. Less paper.','<h3>Suggestions leave the oval empty.</h3><p>An animated down arrow points to a recommended option. OR sits above optional choices. Your own choice adds a smaller filled oval with a clear gap. The arrow or OR remains visible.</p><p>Ballots with recommendations start with Only Recommended. A section without recommendations shows all its choices. Ballots with no recommendations start with Showing All. The switch is shared with Ballot Viewer, and hidden choices stay saved.</p><p>Faded opinion or magnifier buttons mean that item has no content for that control. A scale with an asterisk opens a nonrecommended choice’s opinion.</p><p>The wheel zooms with Snap off and scrolls with Snap on. Zoom stays between both-sheet fit and section width. Turning Snap on fits the section nearest the center. Section navigation fits the section you choose. All shows Front and Back together and turns Snap off. Dark Back and Next controls stay at source-column ends, with white zoom controls outside the paper. Wheel input and pinch gestures keep a stable zoom anchor. Snap returns the view from empty space above or below a column. Back to Start is hidden for this iteration.</p><p>My guide lists only the admin recommendations and their opinions. Practice choices never change it. A larger centered page label and dashboard icon stay beneath the app header. On a phone, the category row follows it and jumps instantly. Desktop keeps two columns. The generated recommendation PDF includes full opinions on Front and Back pages, with clearly labeled continuations when needed. Print my Guide uses compact readable type and two columns inside each category capsule. Output buttons are at the top and bottom.</p><p>Drop one ballot JSON file anywhere in the preview or app to load it. District, Menu, Admin, and local draft recovery remain available.</p><p><a href="../../sharedrefs/mockup-b.9a/README.md" target="_blank" rel="noopener noreferrer">B.9A review guide</a></p><p>'+h(APP_VERSION_LABEL)+' · Fictional UI demo</p>');}

document.querySelector('#header-notes').addEventListener('click',notes);
document.querySelector('#device-button').addEventListener('click',()=>{mode=mode==='phone'?'desktop':'phone';layout();});
document.querySelector('#compare-button').innerHTML=icon('grid')+'<span>All mockups</span>';
document.querySelector('#compare-button').addEventListener('click',()=>send('open-a'));
document.querySelector('#demo-button').innerHTML=icon('play')+'<span>Demo</span>';
document.querySelector('#demo-button').addEventListener('click',()=>open('Demo controls','<p>Try a scenario in this fictional demo.</p>'+[['fresh','Fresh Start'],['example','Example selections'],['clear','Clear personal choices'],['restore','Restore original content']].map(([action,label])=>'<button type="button" class="demo-row" data-scenario="'+action+'">'+label+icon('next')+'</button>').join('')+'<button type="button" class="demo-row" data-notes>Design notes '+icon('next')+'</button>'));
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
dialog.addEventListener('click',event=>{const el=event.target.closest('button');if(!el)return;if(el.hasAttribute('data-close'))close();if(el.hasAttribute('data-notes')){close();notes();}if(el.dataset.scenario){close();send('demo',{action:el.dataset.scenario});}});
window.addEventListener('message',event=>{
 if(event.source!==iframe.contentWindow||event.origin!==location.origin||event.data?.channel!=='ballot-preview-v1')return;
 const message=event.data;
 if(message.type==='open-a-ready')location.href='../index.html';
 if(message.type==='ballot-import-ready'){importReady=true;iframe.dataset.importReady='true';forwardPendingDrop();}
 if(message.type==='ballot-import-result'){
  if(message.ok===true){dialog.querySelector('#shell-import-error')?.remove();if(dialog.open)close();}
  else if(message.ok===false&&typeof message.error==='string')shellImportError(message.error);
 }
});
send('ballot-import-handshake');
new ResizeObserver(layout).observe(stage);window.visualViewport?.addEventListener('resize',layout);layout();
