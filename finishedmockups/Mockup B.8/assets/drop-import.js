export function installFileDrop({onFiles,onVisibility=()=>{},host=document}){
 const overlay=document.createElement('dialog');overlay.className='file-drop-overlay';overlay.setAttribute('aria-label','Import JSON ballot data');
 overlay.innerHTML='<div class="file-drop-card"><strong>Drop one JSON collection</strong><p>All ballots belong in one file.</p><button type="button">Cancel file drop</button></div>';document.body.append(overlay);
 let depth=0,visible=false,lastFocus;
 const isFile=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
 function clear(){depth=0;if(overlay.open)overlay.close();if(visible){visible=false;onVisibility(false);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}}
 function show(){if(visible)return;visible=true;lastFocus=document.activeElement;overlay.showModal();onVisibility(true);}
 host.addEventListener('dragenter',e=>{if(!isFile(e))return;e.preventDefault();depth++;show();},true);
 host.addEventListener('dragover',e=>{if(!isFile(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';show();},true);
 host.addEventListener('dragleave',e=>{if(!visible)return;if(e.relatedTarget&&host.contains?.(e.relatedTarget))return;depth=Math.max(0,depth-1);if(!depth||!e.relatedTarget)clear();},true);
 host.addEventListener('drop',e=>{if(!isFile(e)&&!e.dataTransfer?.files?.length)return;e.preventDefault();e.stopPropagation();const files=Array.from(e.dataTransfer.files);clear();onFiles(files);},true);
 overlay.addEventListener('cancel',e=>{e.preventDefault();clear();});overlay.querySelector('button').addEventListener('click',clear);
 window.addEventListener('blur',clear);window.addEventListener('pagehide',clear);
 return{clear,show};
}
