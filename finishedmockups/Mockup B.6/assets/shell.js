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
function notes(){open('B.6 · Your area. Your ballot.','<h3>Start with no personal choices.</h3><p>The fictional example area opens automatically. The sample opinion guide remains filled. Faint check and OR hints share the left-hand voting oval; your own mark becomes a solid oval.</p><p>Show opinion guide is a switch. Choose This and Optional labels remain in the inline guide notes. Buttons use each highlighted row’s color.</p><p>District shows only dropdowns that need a choice. Use this area activates the selection. Areas without data keep Menu and Admin available; Create ballot is a placeholder.</p><p>Ballot Viewer opens zoomed out with white paper and all guide opinions visible. Next, Prev, and Snap preserve zoom. Zoom alternates between the page and the selected section. The floating pill, pinch, and wider pan area offer free movement.</p><p>The hamburger holds Demo, Admin, and Help. The bottom bar holds District, Ballot, My guide, and View.</p><p><a href="../../sharedrefs/mockup-b.6/README.md" target="_blank" rel="noopener noreferrer">B.6 review guide</a></p><p>'+h(APP_VERSION_LABEL)+' · Fictional UI demo</p>');}

document.querySelector('#header-notes').addEventListener('click',notes);
document.querySelector('#device-button').addEventListener('click',()=>{mode=mode==='phone'?'desktop':'phone';layout();});
document.querySelector('#compare-button').innerHTML=icon('grid')+'<span>All mockups</span>';
document.querySelector('#compare-button').addEventListener('click',()=>send('open-a'));
document.querySelector('#demo-button').innerHTML=icon('play')+'<span>Demo</span>';
document.querySelector('#demo-button').addEventListener('click',()=>open('Demo controls','<p>Try a scenario in this fictional demo.</p>'+[['fresh','Fresh Start'],['example','Example selections'],['clear','Clear personal choices'],['restore','Restore original content']].map(([action,label])=>'<button type="button" class="demo-row" data-scenario="'+action+'">'+label+icon('next')+'</button>').join('')+'<button type="button" class="demo-row" data-notes>Design notes '+icon('next')+'</button>'));
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
dialog.addEventListener('click',event=>{const el=event.target.closest('button');if(!el)return;if(el.hasAttribute('data-close'))close();if(el.hasAttribute('data-notes')){close();notes();}if(el.dataset.scenario){close();send('demo',{action:el.dataset.scenario});}});
window.addEventListener('message',event=>{if(event.source===iframe.contentWindow&&event.origin===location.origin&&event.data?.channel==='ballot-preview-v1'&&event.data.type==='open-a-ready')location.href='../index.html';});
new ResizeObserver(layout).observe(stage);window.visualViewport?.addEventListener('resize',layout);layout();
