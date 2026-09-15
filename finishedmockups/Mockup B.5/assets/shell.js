import { APP_VERSION_LABEL } from '../../../version.js';
import { icon, escapeHtml as h } from '../../Mockup A/assets/shared.js';
const iframe=document.querySelector('#app-frame'),stage=document.querySelector('#stage'),space=document.querySelector('#frame-space'),device=document.querySelector('#device'),dialog=document.querySelector('#shell-dialog');
let mode='phone',lastFocus;
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
function notes(){open('B.5 · A populated demo','<h3>See the guide in use.</h3><p>Phone view and one readable section are the defaults. This fictional ballot has sample opinions, random red guide marks, and separate personal choices. A filled oval is your choice. Faint oval checks and OR symbols are sample guide marks.</p><p>Show opinion guide controls the highlights, symbols, and automatic opinions. Back and Next chips show the nearby sections.</p><p>Ballot Viewer opens floating portrait paper over a fixed plus pattern. Its zoom capsule has working plus and minus buttons. Zoom shows the compact page; only the active section expands.</p><p>Snap starts off. Prev and Next fit 75% of the viewing width, or full width with Snap on. Drag and release to recenter a section while keeping the nearby row in place. Pinch stays free. An edge arrow returns to the selected section.</p><p>Admin edits save locally. Demo controls can reload the sample choices. Earlier mockup saves remain separate.</p><p><a href="../../sharedrefs/mockup-b.5/README.md" target="_blank" rel="noopener noreferrer">B.5 review guide</a></p><p>'+h(APP_VERSION_LABEL)+' · Fictional UI demo; historical PDF layout reference</p>');}

document.querySelector('#header-notes').addEventListener('click',notes);
document.querySelector('#device-button').addEventListener('click',()=>{mode=mode==='phone'?'desktop':'phone';layout();});
document.querySelector('#compare-button').innerHTML=icon('grid')+'<span>All mockups</span>';
document.querySelector('#compare-button').addEventListener('click',()=>send('open-a'));
document.querySelector('#demo-button').innerHTML=icon('play')+'<span>Demo</span>';
document.querySelector('#demo-button').addEventListener('click',()=>open('Demo controls','<p>Try a scenario in this fictional demo.</p>'+[['fresh','Start fresh'],['example','Example selections'],['clear','Clear personal choices'],['restore','Restore original content']].map(([action,label])=>'<button type="button" class="demo-row" data-scenario="'+action+'">'+label+icon('next')+'</button>').join('')+'<button type="button" class="demo-row" data-notes>Design notes '+icon('next')+'</button>'));
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
dialog.addEventListener('click',event=>{const el=event.target.closest('button');if(!el)return;if(el.hasAttribute('data-close'))close();if(el.hasAttribute('data-notes')){close();notes();}if(el.dataset.scenario){close();send('demo',{action:el.dataset.scenario});}});
window.addEventListener('message',event=>{if(event.source===iframe.contentWindow&&event.origin===location.origin&&event.data?.channel==='ballot-preview-v1'&&event.data.type==='open-a-ready')location.href='../index.html';});
new ResizeObserver(layout).observe(stage);window.visualViewport?.addEventListener('resize',layout);layout();
