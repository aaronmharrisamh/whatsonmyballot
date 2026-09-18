// Fixed paper coordinates; one RAF camera avoids competing CSS transform animations.
export function mountPaper(viewport,paper,saved,onChange,onView=()=>{},onSnap=()=>{}){
 let state={mode:'free',zoomView:'page',...saved},fit=1,focused=null,snapEnabled=false,disposed=false,frame=0,tween=null,wheelTimer=0;
 let vw=0,vh=0,pw=0,ph=0,moved=false,pinched=false,suppressUntil=0,start=null,lastCenter=null,lastDistance=0;
 let wheelTarget=null,wheelStamp=0;
 const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),scale=()=>fit*state.zoom;
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 function position(el){
  // Invert the rendered spread transform so nested sheet borders and fractional
  // grid-column widths remain exact when moving between Front and Back.
  const root=paper.getBoundingClientRect(),box=el.getBoundingClientRect();
  const renderedScale=root.width/Math.max(1,paper.offsetWidth)||1;
  return{left:(box.left-root.left)/renderedScale,top:(box.top-root.top)/renderedScale,width:box.width/renderedScale,height:box.height/renderedScale};
 }
 function limits(){
  const min=Math.max(.0001,Math.min(vw/Math.max(1,paper.offsetWidth),vh/Math.max(1,paper.offsetHeight))*.91/fit);
  const section=focused?.isConnected?focused:paper.querySelector('.b-ballot-section');
  return{min,max:Math.max(min,vw/Math.max(1,section?position(section).width:paper.offsetWidth)/fit)};
 }
 function bounds(s){
  const range=limits(),before=s.zoom;s.zoom=clamp(s.zoom,range.min,range.max);
  if(before>0&&before!==s.zoom){const ratio=s.zoom/before;s.x=vw/2-(vw/2-s.x)*ratio;s.y=vh/2-(vh/2-s.y)*ratio;}
  const sc=fit*s.zoom,w=paper.offsetWidth*sc,h=paper.offsetHeight*sc,px=Math.max(vw,w)*.5,py=Math.max(vh,h)*.5;
  s.x=clamp(s.x,Math.min(0,vw-w)-px,Math.max(0,vw-w)+px);
  s.y=clamp(s.y,Math.min(0,vh-h)-py,Math.max(0,vh-h)+py);
  return s;
 }
 function viewInfo(){
  if(!focused?.isConnected)return onView(null);
  const v=viewport.getBoundingClientRect(),b=focused.getBoundingClientRect();
  onView({id:focused.dataset.raceId,x:b.left-v.left,y:b.top-v.top,width:b.width,height:b.height,viewportWidth:vw,viewportHeight:vh,mode:state.mode});
 }
 function paint(){
  if(disposed)return;bounds(state);paper.style.transform='translate('+state.x+'px,'+state.y+'px) scale('+scale()+')';
  paper.style.setProperty('--paper-scale',String(scale()));
  Object.assign(viewport.dataset,{zoom:state.zoom.toFixed(4),panX:state.x.toFixed(2),panY:state.y.toFixed(2),scale:scale().toFixed(5),mode:state.mode,zoomView:state.zoomView,animating:String(Boolean(tween))});
  const range=limits();Object.assign(viewport.dataset,{minZoom:String(range.min),maxZoom:String(range.max)});
  onChange({...state,minZoom:range.min,maxZoom:range.max});viewInfo();
 }
 function tick(now){
  frame=0;if(disposed)return;
  if(tween){
   const t=Math.min(1,(now-tween.start)/tween.duration),ease=1-Math.pow(1-t,3),to=bounds(tween.target());
   for(const k of ['x','y','zoom'])state[k]=tween.from[k]+(to[k]-tween.from[k])*ease;
   if(t>=1)tween=null;
  }
  paint();if(tween)frame=requestAnimationFrame(tick);
 }
 function queue(){if(!frame&&!disposed)frame=requestAnimationFrame(tick);}
 function stop(){tween=null;cancelAnimationFrame(frame);frame=0;clearTimeout(wheelTimer);}
 function animate(target,mode='free',enabled=true,duration=650){
  stop();state.mode=mode;
  if(!enabled||reduced()){Object.assign(state,bounds(target()));paint();return;}
  tween={from:{...state},target,start:performance.now(),duration};viewport.dataset.animating='true';queue();
 }
 function captureAnchor(target,point=null){
  if(!target||!paper.contains(target))return null;
  const p=position(target),b=target.getBoundingClientRect(),v=viewport.getBoundingClientRect();
  const at=point||{x:b.left-v.left+b.width/2,y:b.top-v.top+Math.min(b.height/2,32)};
  return{node:target,offsetX:(at.x-state.x)/scale()-p.left,offsetY:(at.y-state.y)/scale()-p.top,x:at.x,y:at.y};
 }
 function anchorTarget(anchor,zoom=state.zoom,x=state.x){
  if(!anchor?.node.isConnected)return{x,y:state.y,zoom};
  const p=position(anchor.node),sc=fit*zoom;return{x,y:anchor.y-(p.top+anchor.offsetY)*sc,zoom};
 }
 function holdAnchor(anchor){
  if(!anchor)return;if(tween&&state.mode==='section'&&focused){focusElement(focused,true,1,anchor);return;}const zoom=state.zoom,x=state.x;
  animate(()=>anchorTarget(anchor,zoom,x),'free',true,460);
 }
 function fitTarget(element,ratio=1,anchor=null){
  const p=position(element),zoom=vw*ratio/p.width/fit,sc=fit*zoom;
  const x=(vw-p.width*sc)/2-p.left*sc;
  const column=element.closest('.paper-column'),first=column?.querySelector('.b-ballot-section');
  // A column arrival includes its Back control above the first race. Row actions
  // still keep their exact anchor, and interior races keep the familiar top fit.
  const top=first===element&&column.querySelector('.b-column-adjacent-back')?position(column).top:p.top;
  return anchor?anchorTarget(anchor,zoom,x):{zoom,x,y:12-top*sc};
 }
 function focusElement(element,enabled=true,ratio=state.sectionRatio||1,anchor=null){
  if(!element)return;focused=element;state.sectionRatio=ratio;state.zoomView='section';
  animate(()=>fitTarget(element,ratio,anchor),'section',enabled);
 }
 function panToElement(element,enabled=true,anchor=null){
  if(!element)return;focused=element;const zoom=state.zoom;
  animate(()=>{const p=position(element),sc=fit*zoom,x=(vw-p.width*sc)/2-p.left*sc;return anchor?anchorTarget(anchor,zoom,x):{x,y:18-p.top*sc,zoom};},'free',enabled);
 }
 function toggleZoom(element){
  if(state.zoomView==='page')focusElement(element,true,1);else extents();
 }
 function ensureComfortable(element,target,ratio=1,anchor=null){
  if(!element)return;focused=element;anchor||=captureAnchor(target||element);
  if(position(element).width*scale()>=vw*(ratio-.05)){holdAnchor(anchor);return;}
  animate(()=>fitTarget(element,ratio,anchor),'free',true);
 }
 function extents(enabled=true){
  state.zoomView='page';
  animate(()=>{const zoom=Math.min(vw/paper.offsetWidth,vh/paper.offsetHeight)*.91/fit;return{zoom,x:(vw-paper.offsetWidth*fit*zoom)/2,y:(vh-paper.offsetHeight*fit*zoom)/2};},'extents',enabled);
 }
 function zoomTo(value,point={x:vw/2,y:vh/2},enabled=true,duration=240){
  state.zoomView='custom';const old=scale(),range=limits(),zoom=clamp(value,range.min,range.max),ratio=fit*zoom/old;
  const next={zoom,x:point.x-(point.x-state.x)*ratio,y:point.y-(point.y-state.y)*ratio};
  animate(()=>({...next}),'free',enabled,duration);
 }
 function zoomBy(factor){zoomTo(state.zoom*factor);}
 function sectionAtCenter(includeDistant=false){
  const x=(vw/2-state.x)/scale(),y=(vh/2-state.y)/scale();
  let nearest=null,distance=Infinity;
  for(const el of paper.querySelectorAll('.b-ballot-section')){
   const p=position(el),dx=Math.max(p.left-x,0,x-p.left-p.width),dy=Math.max(p.top-y,0,y-p.top-p.height),d=Math.hypot(dx,dy);
   if(d<distance){distance=d;nearest=el;}
  }
  if(!nearest||!includeDistant&&distance*scale()>Math.min(vw,vh)*.22)return null;
  const rows=[...nearest.querySelectorAll('.b-ballot-text,.race-title,.b-section-band')].filter(el=>el.getClientRects().length);
  const anchorNode=rows.sort((a,b)=>Math.abs(position(a).top-y)-Math.abs(position(b).top-y))[0]||nearest;
  return{element:nearest,anchor:captureAnchor(anchorNode,{x:vw/2,y:vh/2})};
 }
 function focusNearestSection(){
  if(disposed||pointers.size)return null;
  // A deliberate Snap click always finds the nearest section, including from
  // the sheet gap or outside the paper. Fit its top; drag snapping keeps its row anchor.
  const hit=sectionAtCenter(true);if(!hit)return null;
  onSnap(hit.element.dataset.raceId);
  focused=hit.element;focusElement(focused,true,1);
  return focused.dataset.raceId;
 }
 function recoverColumnEnd(element){
  if(!element?.isConnected)return false;
  const column=element.closest('.paper-column')||element,p=position(column),bottom=state.y+(p.top+p.height)*scale();
  // Column navigation stays on the paper. Do not recover after every race:
  // readers can continue down the same column before reaching its Next button.
  if(bottom>=vh*.5)return false;
  const last=column.matches('.b-ballot-section')?column:[...column.querySelectorAll('.b-ballot-section')].at(-1);
  if(last&&last!==focused){onSnap(last.dataset.raceId);focused=last;}
  const zoom=state.zoom;
  animate(()=>{
   const box=position(column),sc=fit*zoom,height=box.height*sc;
   const control=viewport.parentElement?.querySelector('.b-all-button'),button=control?.getBoundingClientRect(),view=viewport.getBoundingClientRect();
   const safeBottom=button?.width&&button?.height?Math.min(vh-18,button.top-view.top-12):vh-18;
   // Keep the column's lower half-window and its complete Next button visible,
   // above the floating All control. Short columns stay fully in frame.
   const bottomLine=Math.min(safeBottom,Math.max(vh*.72,height+12));
   return{x:(vw-box.width*sc)/2-box.left*sc,y:bottomLine-(box.top+box.height)*sc,zoom};
  },'free',true,420);
  return true;
 }
 function snap(){
  if(!snapEnabled||disposed||pointers.size)return;
  const hit=sectionAtCenter();
  if(!hit){recoverColumnEnd(focused);return;}
  // Nearby races can take focus while reading down or across columns. Only
  // blank paper below an entire column triggers end recovery.
  onSnap(hit.element.dataset.raceId);
  focused=hit.element;
  if(recoverColumnEnd(focused))return;
  focusElement(focused,true,1,hit.anchor);
 }
 function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight,width=paper.offsetWidth;
  if(!w||!h||!width||w===vw&&h===vh&&width===pw)return;
  // The spread owns its fixed source width; the camera measures both sheets together.
  const oldFit=fit;vw=w;vh=h;pw=width;fit=Math.min(1,w/pw)*.94;
  stop();
  if(state.mode==='extents')extents(false);
  else if(state.mode==='section'&&focused)focusElement(focused,false,state.sectionRatio||1);
  else{if(oldFit){state.x*=fit/oldFit;state.y*=fit/oldFit;}paint();}
 }
 function local(e){const b=viewport.getBoundingClientRect();return{x:(e.clientX-b.left)*vw/b.width,y:(e.clientY-b.top)*vh/b.height};}
 function geometry(){const p=[...pointers.values()];return p.length>1?{center:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:{center:p[0],distance:0};}
 function down(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(!pointers.size){moved=false;pinched=false;suppressUntil=0;start=local(e);clearTimeout(wheelTimer);}
  pointers.set(e.pointerId,local(e));if(pointers.size>1)pinched=true;
  const g=geometry();lastCenter=g.center;lastDistance=g.distance;
 }
 function movePointer(e){
  if(!pointers.has(e.pointerId))return;
  const point=local(e);pointers.set(e.pointerId,point);const g=geometry();
  if(pointers.size>1||Math.hypot(point.x-start.x,point.y-start.y)>6){
   if(!moved)stop();moved=true;e.preventDefault();viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');
   state.mode='free';
   if(lastDistance&&g.distance){
    state.zoomView='custom';
    const old=scale();const range=limits();state.zoom=clamp(state.zoom*g.distance/lastDistance,range.min,range.max);const ratio=scale()/old;
    state.x=lastCenter.x-(lastCenter.x-state.x)*ratio;state.y=lastCenter.y-(lastCenter.y-state.y)*ratio;
   }
   if(lastCenter){state.x+=g.center.x-lastCenter.x;state.y+=g.center.y-lastCenter.y;}paint();
  }
  lastCenter=g.center;lastDistance=g.distance;
 }
 function up(e){
  if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  const g=geometry();lastCenter=g.center;lastDistance=g.distance;
  if(moved)suppressUntil=performance.now()+400;
  if(!pointers.size){viewport.classList.remove('dragging');if(moved&&!pinched&&e.type!=='pointercancel')snap();}
 }
 function click(e){if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}}
 function wheel(e){
  e.preventDefault();const factor=e.deltaMode===1?18:e.deltaMode===2?vh:1;
  if(!snapEnabled){
   const now=performance.now(),range=limits(),base=now-wheelStamp<220&&wheelTarget!==null?wheelTarget:state.zoom;
   wheelStamp=now;wheelTarget=clamp(base*Math.exp(clamp(-e.deltaY*factor*.0025,-.65,.65)),range.min,range.max);
   zoomTo(wheelTarget,local(e),true,200);return;
  }
  wheelTarget=null;stop();state.mode='free';state.x-=e.deltaX*factor;state.y-=e.deltaY*factor;paint();
  wheelTimer=setTimeout(snap,180);
 }
 function move(direction){
  stop();const step=Math.max(80,vw*.25),next={x:state.x,y:state.y,zoom:state.zoom};
  if(direction==='left')next.x+=step;if(direction==='right')next.x-=step;if(direction==='up')next.y+=step;if(direction==='down')next.y-=step;
  animate(()=>({...next}),'free',true,240);
 }
 function key(e){
  if(e.target!==viewport)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(e.key.slice(5).toLowerCase());}
  else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')extents();else zoomBy(e.key==='-'?.8:1.25);}
 }
 for(const [name,handler]of [['pointerdown',down],['pointermove',movePointer],['pointerup',up],['pointercancel',up]])viewport.addEventListener(name,handler);
 viewport.addEventListener('click',click,true);viewport.addEventListener('wheel',wheel,{passive:false});viewport.addEventListener('keydown',key);
 resize();ph=paper.offsetHeight;
 const observer=new ResizeObserver(()=>{if(!disposed)resize();});observer.observe(viewport);
 const paperObserver=new ResizeObserver(()=>{
  if(disposed)return;
  if(paper.offsetWidth!==pw){resize();ph=paper.offsetHeight;return;}
  const next=paper.offsetHeight;if(next===ph)return;ph=next;
  if(!tween&&state.mode==='extents')extents(false);else queue();
 });paperObserver.observe(paper);
 return{zoomTo,zoomBy,extents,reset:extents,move,panToElement,toggleZoom,focusElement,focusNearestSection,ensureComfortable,captureAnchor,holdAnchor,
  limits,layoutChanged(anchor=null){if(state.mode==='extents')extents(false);else if(anchor)holdAnchor(anchor);else queue();},
  reflow:queue,snapNow:snap,setSnap(value){snapEnabled=Boolean(value);wheelTarget=null;if(!snapEnabled&&state.mode==='section'){stop();state.mode='free';paint();}},
  selected(element){focused=element;queue();},
  destroy(){disposed=true;stop();observer.disconnect();paperObserver.disconnect();
   for(const [name,handler]of [['pointerdown',down],['pointermove',movePointer],['pointerup',up],['pointercancel',up]])viewport.removeEventListener(name,handler);
   viewport.removeEventListener('click',click,true);viewport.removeEventListener('wheel',wheel);viewport.removeEventListener('keydown',key);
  }
 };
}

