import{paperView,filterView,ballotUI}from'./ballot-ui.js';
import{createIdleHint}from'./idle-hint.js';
import{h}from'./ui-utils.js';
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
export function cameraLimits(width,height,paperWidth,paperHeight,sectionWidth){
 const min=Math.max(.005,Math.min((width-28)/paperWidth,(height-28)/paperHeight));
 return{min,max:Math.max(min,Math.max(1,width-76)/Math.max(1,sectionWidth))};
}
export function zoomAt(state,scale,point){const ratio=scale/state.s;return{s:scale,x:point.x-(point.x-state.x)*ratio,y:point.y-(point.y-state.y)*ratio};}
const focusKey=el=>el?.matches('[data-only-recommendations]')?['data-only-recommendations','']:el?.matches('[data-choice]')?['data-choice',el.dataset.choice]:el?.matches('[data-target]')?['data-target',el.dataset.target,el.dataset.action]:el?.matches('[data-show-all]')?['data-show-all',el.dataset.showAll]:null;
export class BallotCamera{
 constructor(dialog,{onSelect,onMove}){
  this.dialog=dialog;this.canvas=dialog.querySelector('.viewer-canvas');this.paper=dialog.querySelector('.viewer-paper');this.frame=dialog.querySelector('.focus-frame');
  this.onSelect=onSelect;this.onMove=onMove;this.state={x:0,y:0,s:1};this.target=null;this.snap=false;this.points=new Map();this.abort=new AbortController();this.arrival='';this.suppressUntil=0;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.hint=createIdleHint();
  const listen=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:this.abort.signal});
  listen(this.canvas,'wheel',e=>this.wheel(e),{passive:false});
  listen(this.canvas,'pointerdown',e=>{this.keyboardMode=false;this.down(e);});listen(this.canvas,'pointermove',e=>this.drag(e));listen(this.canvas,'pointerup',e=>this.up(e));listen(this.canvas,'pointercancel',e=>this.up(e,true));
  listen(this.canvas,'click',e=>this.click(e),{capture:true});
  listen(dialog,'keydown',e=>{if(e.key==='Tab')this.keyboardMode=true;});
  listen(this.canvas,'focusin',e=>{if(!this.keyboardMode)return;const sec=e.target.closest('[data-section]');if(!sec)return;const r=e.target.getBoundingClientRect(),frame=this.canvas.getBoundingClientRect();if(this.selected!==sec.dataset.section||!this.snap)this.focus(sec.dataset.section,{top:true});else if(r.top<frame.top+8||r.bottom>frame.bottom-8)this.go({...this.state,y:this.state.y+frame.top+24-r.top});});
  listen(dialog,'click',e=>{const key=e.target.closest('[data-camera]')?.dataset.camera;if(!key)return;this.hint.activity();if(key==='all')this.all();if(key==='return')this.focus(this.selected,{top:true});if(key==='plus'||key==='minus')this.zoom(key==='plus'?1.25:.8);if(key==='next'||key==='previous')this.onMove(key==='next'?1:-1);});
  listen(dialog.querySelector('[data-snap]'),'change',e=>{this.snap=e.target.checked;if(this.snap)this.focus(this.selected,{top:true});else this.paint();});
  listen(dialog.querySelector('.zoom-capsule input'),'input',e=>{clearTimeout(this.settleTimer);this.measure();this.zoomTo(this.limits.min*Math.pow(this.limits.max/this.limits.min,Number(e.target.value)/100));});
  listen(this.canvas,'keydown',e=>{if(e.target!==this.canvas)return;const moves={ArrowUp:[0,80],ArrowDown:[0,-80],ArrowLeft:[80,0],ArrowRight:[-80,0]};if(moves[e.key]){e.preventDefault();const [x,y]=moves[e.key],base=this.target||this.state;this.go({...base,x:base.x+x,y:base.y+y});}if(e.key==='+'||e.key==='='){e.preventDefault();this.zoom(1.25);}if(e.key==='-'){e.preventDefault();this.zoom(.8);}});
  this.observer=new ResizeObserver(()=>{cancelAnimationFrame(this.resizeFrame);this.resizeFrame=requestAnimationFrame(()=>this.resize());});
  this.observer.observe(this.canvas);this.observer.observe(this.paper);
 }
 update(session,options,{initial=false}={}){
  const oldPage=this.pageId,oldSection=this.selected,wasFit=this.limits&&Math.abs(this.state.s-this.limits.min)<.001&&!this.snap;this.session=session;this.options=options;
  const sel=session.preferences.selection;this.ballot=session.model.get(sel.ballotId);this.selected=this.ballot.contests[options.index].id;this.pageId=session.model.get(this.selected).pageId;
  const anchor=this.pendingAnchor||this.captureAnchor(),active=focusKey(document.activeElement);this.pendingAnchor=null;
  const html=paperView(session,options),contentChanged=html!==this.lastHTML,inFlight=this.target?{...this.target}:null;
  if(contentChanged){this.lastHTML=html;this.stop();this.paper.innerHTML=html;}
  this.dialog.querySelector('.viewer-filter').innerHTML=filterView(session);
  this.dialog.querySelector('#viewer-title').textContent='Ballot Viewer — '+session.model.get(sel.areaId).label;
  this.dialog.querySelector('.viewer-count').textContent=(options.index+1)+'/'+this.ballot.contests.length;
  this.dialog.querySelector('[data-camera=previous]').disabled=options.index===0;
  this.dialog.querySelector('[data-camera=next]').disabled=options.index===this.ballot.contests.length-1;
  this.measure();
  if(initial){this.snap=false;this.all(false);this.hint.attach(this.dialog.querySelector('.pinch-hint'));}
  else if(wasFit){this.all(false);}
  else if(oldPage!==this.pageId){if(this.snap)this.focus(this.selected,{top:true});else this.all(false);}
  else if(inFlight&&!contentChanged){this.paint();}
  else{this.state.s=clamp(this.state.s,this.limits.min,this.limits.max);this.paper.style.transform='translate('+this.state.x+'px,'+this.state.y+'px) scale('+this.state.s+')';this.restoreAnchor(anchor);this.go(this.state,false);if(inFlight&&this.snap)this.focus(this.selected,{anchor});}
  if(active){const [key,id,action]=active;const next=[...this.paper.querySelectorAll('['+key+']')].find(el=>el.getAttribute(key)===id&&(!action||el.dataset.action===action));next?.focus({preventScroll:true});}
  if(oldSection!==this.selected)this.paint();
 }
 measure(){
  const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;
  this.pw=this.paper.offsetWidth;this.ph=this.paper.offsetHeight;
  this.limits=cameraLimits(this.w,this.h,this.pw,this.ph,this.section()?.offsetWidth||this.pw);
 }
 section(id=this.selected){return [...this.paper.querySelectorAll('[data-section]')].find(el=>el.dataset.section===id);}
 rect(el){const a=el.getBoundingClientRect(),p=this.paper.getBoundingClientRect(),s=this.state.s;return{x:(a.left-p.left)/s,y:(a.top-p.top)/s,w:a.width/s,h:a.height/s};}
 point(e){const r=this.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
 bounded(value){return{s:clamp(value.s,this.limits.min,this.limits.max),x:clamp(value.x,-this.pw*value.s-this.w*.5,this.w*.5),y:clamp(value.y,-this.ph*value.s-this.h*.5,this.h*.5)};}
 stop(){cancelAnimationFrame(this.frameId);this.frameId=null;this.target=null;}
 go(value,animate=true){
  this.stop();const to=this.bounded(value),from={...this.state};this.target=to;
  if(!animate||this.reduced.matches){this.state=to;this.target=null;this.paint();return;}
  const begin=performance.now(),duration=320;
  const step=now=>{const t=clamp((now-begin)/duration,0,1),ease=1-Math.pow(1-t,3);this.state={x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease,s:from.s+(to.s-from.s)*ease};this.paint();if(t<1)this.frameId=requestAnimationFrame(step);else{this.frameId=null;this.target=null;}};
  this.frameId=requestAnimationFrame(step);
 }
 paint(){
  const {x,y,s}=this.state;this.paper.style.transform='translate('+x+'px,'+y+'px) scale('+s+')';
  this.dialog.dataset.snap=String(this.snap);this.canvas.dataset.scale=s.toFixed(5);this.canvas.dataset.min=this.limits.min.toFixed(5);this.canvas.dataset.max=this.limits.max.toFixed(5);this.canvas.dataset.selectedSection=this.selected;
  this.dialog.querySelector('[data-snap]').checked=this.snap;
  const range=this.dialog.querySelector('.zoom-capsule input');range.value=this.limits.max===this.limits.min?0:100*Math.log(s/this.limits.min)/Math.log(this.limits.max/this.limits.min);range.setAttribute('aria-valuetext',Math.round(s*100)+' percent');
  for(const el of this.paper.querySelectorAll('[data-section]'))el.toggleAttribute('data-camera-active',this.snap&&el.dataset.section===this.selected);
  const sec=this.section();this.frame.hidden=!this.snap||!sec;
  if(sec&&this.snap){const r=this.rect(sec);Object.assign(this.frame.style,{left:(x+r.x*s)+'px',top:(y+r.y*s)+'px',width:r.w*s+'px',height:r.h*s+'px'});
   const key=this.pageId+'|'+this.selected;if(this.arrival!==key){this.arrival=key;this.frame.classList.remove('arriving');void this.frame.offsetWidth;this.frame.classList.add('arriving');}
   const top=y+r.y*s,bottom=top+r.h*s,indicator=this.dialog.querySelector('.section-return'),outside=bottom<24||top>this.h-24||x+(r.x+r.w)*s<20||x+r.x*s>this.w-20;
   indicator.hidden=!outside;indicator.textContent=(bottom<24?'↑ ':top>this.h-24?'↓ ':x+r.x*s>this.w-20?'→ ':'← ')+this.session.model.get(this.selected).titleLines[0];indicator.style.top=bottom<24?'156px':'';indicator.style.bottom=bottom<24?'':'132px';
  }else{this.arrival='';this.dialog.querySelector('.section-return').hidden=true;}
 }
 all(animate=true){clearTimeout(this.settleTimer);this.snap=false;this.measure();const s=this.limits.min;this.go({s,x:(this.w-this.pw*s)/2,y:(this.h-this.ph*s)/2},animate);}
 captureAnchor(point={x:this.w/2,y:this.h/2}){
  if(!this.session||!this.paper.firstElementChild)return null;
  const rows=[...this.paper.querySelectorAll('[data-choice-row],[data-section]>header')];let closest=null,dist=Infinity;
  for(const el of rows){const r=this.rect(el),cx=this.state.x+(r.x+r.w/2)*this.state.s,cy=this.state.y+(r.y+r.h/2)*this.state.s,d=Math.abs(point.y-cy)+Math.abs(point.x-cx)*2;if(d<dist){closest=el;dist=d;}}
  if(!closest)return null;const r=this.rect(closest),ratio=clamp(((point.y-this.state.y)/this.state.s-r.y)/r.h,0,1);
  return{choice:closest.dataset.choiceRow,section:closest.closest('[data-section]').dataset.section,ratio,y:this.state.y+(r.y+r.h*ratio)*this.state.s};
 }
 anchorElement(anchor){if(anchor?.control){const [key,id,action]=anchor.control;return [...this.paper.querySelectorAll('['+key+']')].find(el=>el.getAttribute(key)===id&&(!action||el.dataset.action===action));}return anchor?.choice?[...this.paper.querySelectorAll('[data-choice-row]')].find(el=>el.dataset.choiceRow===anchor.choice):this.section(anchor?.section)?.querySelector('header');}
 restoreAnchor(anchor){const el=this.anchorElement(anchor);if(el){const r=this.rect(el);this.state.y=anchor.y-(r.y+r.h*anchor.ratio)*this.state.s;}}
 focus(id,{top=false,anchor=null,comfortable=false}={}){
  const sec=this.section(id);if(!sec)return;
  const changed=this.selected!==id;this.selected=id;const wasSnap=this.snap;this.snap=true;this.measure();const r=this.rect(sec),s=this.limits.max;
  if(comfortable&&!changed&&wasSnap&&this.state.s>=s*.92){this.paint();return;}
  const source=anchor&&this.anchorElement(anchor),a=source?this.rect(source):null;
  const y=top?16-r.y*s:a?anchor.y-(a.y+a.h*anchor.ratio)*s:this.state.y;
  this.go({s,x:12-r.x*s,y});this.onSelect(id);
 }
 zoomTo(s,point={x:(this.w-60)/2,y:this.h/2},base=this.target||this.state){this.go(zoomAt(base,clamp(s,this.limits.min,this.limits.max),point));}
 zoom(factor){clearTimeout(this.settleTimer);this.measure();this.zoomTo((this.target||this.state).s*factor);}
 wheel(e){
  e.preventDefault();this.hint.activity();this.measure();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.h:1);
  if(this.snap){const base=this.target||this.state;this.go({...base,y:base.y-clamp(delta,-this.h,this.h)});clearTimeout(this.settleTimer);this.settleTimer=setTimeout(()=>this.settle(),450);}
  else this.zoomTo((this.target||this.state).s*Math.exp(-clamp(delta,-600,600)*.002),this.point(e));
 }
 down(e){
  if(e.button!==0&&e.pointerType!=='touch')return;
  this.hint.activity();this.pendingAnchor=null;clearTimeout(this.settleTimer);this.stop();const p=this.point(e);this.points.set(e.pointerId,p);
  if(this.points.size===1){this.start={p,state:{...this.state}};this.moved=false;this.pinched=false;}
  if(this.points.size===2){this.pinched=true;this.moved=true;this.resetPinch();for(const id of this.points.keys())this.canvas.setPointerCapture(id);}
 }
 resetPinch(){const [a,b]=[...this.points.values()];this.pinchStart={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},state:{...this.state}};}
 drag(e){
  if(!this.points.has(e.pointerId))return;const p=this.point(e);this.points.set(e.pointerId,p);this.hint.activity();
  if(this.points.size>=2){const [a,b]=[...this.points.values()],pinch=this.pinchStart,center={x:(a.x+b.x)/2,y:(a.y+b.y)/2},s=clamp(pinch.state.s*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,this.limits.min,this.limits.max),next=zoomAt(pinch.state,s,pinch.center);this.go({...next,x:next.x+center.x-pinch.center.x,y:next.y+center.y-pinch.center.y},false);}
  else{const dx=p.x-this.start.p.x,dy=p.y-this.start.p.y;if(Math.hypot(dx,dy)>6)this.moved=true;if(this.moved){this.canvas.setPointerCapture(e.pointerId);this.go({...this.start.state,x:this.start.state.x+dx,y:this.start.state.y+dy},false);}}
 }
 up(e,cancelled=false){
  if(!this.points.has(e.pointerId))return;this.points.delete(e.pointerId);
  if(this.points.size===1){this.start={p:[...this.points.values()][0],state:{...this.state}};}
  if(this.points.size===0){if(this.moved||this.pinched||cancelled)this.suppressUntil=performance.now()+450;if(this.snap&&this.moved&&!this.pinched&&!cancelled)this.settle();}
 }
 click(e){
  if(performance.now()<this.suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}
  const sec=e.target.closest('[data-section]');if(!sec||e.target.closest('button:disabled'))return;
  const control=e.target.closest('[data-target],[data-choice],[data-show-all]'),key=focusKey(control);let anchor=this.captureAnchor(e.detail?this.point(e):undefined);if(key){const r=this.rect(control);anchor={control:key,ratio:.5,y:this.state.y+(r.y+r.h*.5)*this.state.s};this.pendingAnchor=anchor;}this.focus(sec.dataset.section,{anchor,comfortable:true});
 }
 settle(){
  if(!this.snap||this.points.size)return;const point={x:(this.w-60)/2,y:this.h/2};
  const sec=[...this.paper.querySelectorAll('[data-section]')].find(el=>{const r=this.rect(el),x=this.state.x+r.x*this.state.s,y=this.state.y+r.y*this.state.s;return point.x>=x&&point.x<=x+r.w*this.state.s&&point.y>=y&&point.y<=y+r.h*this.state.s;})||this.section();
  if(sec)this.focus(sec.dataset.section,{anchor:this.captureAnchor(point)});
 }
 resize(){
  if(!this.dialog.open||!this.session)return;
  const signature=[this.canvas.clientWidth,this.canvas.clientHeight,this.paper.offsetWidth,this.paper.offsetHeight].join('|');if(signature===this.sizeKey)return;this.sizeKey=signature;
  const previous=this.limits,atFit=Math.abs(this.state.s-(previous?.min||0))<.001,atMax=Math.abs(this.state.s-(previous?.max||0))<.001,anchor=this.captureAnchor();this.measure();
  if(atFit&&!this.snap)this.all(false);else{this.state.s=atMax?this.limits.max:clamp(this.state.s,this.limits.min,this.limits.max);this.paper.style.transform='translate('+this.state.x+'px,'+this.state.y+'px) scale('+this.state.s+')';this.restoreAnchor(anchor);if(atMax&&this.snap){const r=this.rect(this.section());this.state.x=12-r.x*this.state.s;}this.go(this.state,false);}
 }
 destroy(){this.stop();cancelAnimationFrame(this.resizeFrame);clearTimeout(this.settleTimer);this.observer.disconnect();this.hint.destroy();this.abort.abort();}
}
