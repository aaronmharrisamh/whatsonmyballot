// Fixed paper coordinates; one RAF camera avoids competing CSS transform animations.
export function mountPaper(viewport,paper,saved,onChange,onView=()=>{},onSnap=()=>{}){
 let state={mode:'free',zoomView:'page',...saved},fit=1,focused=null,snapEnabled=false,disposed=false,frame=0,tween=null,wheelTimer=0;
 let vw=0,vh=0,ph=0,moved=false,pinched=false,suppressUntil=0,start=null,lastCenter=null,lastDistance=0;
 const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),scale=()=>fit*state.zoom;
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 function position(el){
  let left=0,top=0,node=el;
  while(node&&node!==paper){left+=node.offsetLeft;top+=node.offsetTop;node=node.offsetParent;}
  return{left,top,width:el.offsetWidth,height:el.offsetHeight};
 }
 function bounds(s){
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
  Object.assign(viewport.dataset,{zoom:state.zoom.toFixed(4),panX:state.x.toFixed(2),panY:state.y.toFixed(2),scale:scale().toFixed(5),mode:state.mode,zoomView:state.zoomView,animating:String(Boolean(tween))});
  onChange({...state});viewInfo();
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
  if(!anchor)return;const zoom=state.zoom,x=state.x;
  animate(()=>anchorTarget(anchor,zoom,x),'free',true,460);
 }
 function fitTarget(element,ratio=1,anchor=null){
  const p=position(element),zoom=vw*ratio/p.width/fit,sc=fit*zoom;
  const x=(vw-p.width*sc)/2-p.left*sc;
  return anchor?anchorTarget(anchor,zoom,x):{zoom,x,y:12-p.top*sc};
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
 function zoomTo(value,point={x:vw/2,y:vh/2},enabled=true){
  state.zoomView='custom';const old=scale(),zoom=clamp(value,.02,16),ratio=fit*zoom/old;
  const next={zoom,x:point.x-(point.x-state.x)*ratio,y:point.y-(point.y-state.y)*ratio};
  animate(()=>({...next}),'free',enabled);
 }
 function zoomBy(factor){zoomTo(state.zoom*factor);}
 function sectionAtCenter(){
  const x=(vw/2-state.x)/scale(),y=(vh/2-state.y)/scale();
  let nearest=null,distance=Infinity;
  for(const el of paper.querySelectorAll('.b-ballot-section')){
   const p=position(el),dx=Math.max(p.left-x,0,x-p.left-p.width),dy=Math.max(p.top-y,0,y-p.top-p.height),d=Math.hypot(dx,dy);
   if(d<distance){distance=d;nearest=el;}
  }
  if(!nearest||distance*scale()>Math.min(vw,vh)*.22)return null;
  const rows=[...nearest.querySelectorAll('.b-ballot-text,.race-title,.b-section-band')];
  const anchorNode=rows.sort((a,b)=>Math.abs(position(a).top-y)-Math.abs(position(b).top-y))[0]||nearest;
  return{element:nearest,anchor:captureAnchor(anchorNode,{x:vw/2,y:vh/2})};
 }
 function snap(){
  if(!snapEnabled||disposed||pointers.size)return;
  const hit=sectionAtCenter();if(!hit)return;
  // Capture the row before controls expand, keeping that part at the same height.
  onSnap(hit.element.dataset.raceId);
  focused=hit.element;panToElement(focused,true,hit.anchor);
 }
 function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight;if(w===vw&&h===vh)return;
  const oldFit=fit;vw=w;vh=h;paper.style.width='1020px';paper.dataset.wide='false';fit=Math.min(1,w/1020)*.94;
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
    const old=scale();state.zoom=clamp(state.zoom*g.distance/lastDistance,.02,16);const ratio=scale()/old;
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
  e.preventDefault();stop();state.mode='free';
  if(e.ctrlKey||e.metaKey){zoomTo(state.zoom*Math.exp(-e.deltaY*.008),local(e),false);return;}
  const factor=e.deltaMode===1?18:e.deltaMode===2?vh:1;state.x-=e.deltaX*factor;state.y-=e.deltaY*factor;paint();
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
 const paperObserver=new ResizeObserver(()=>{if(disposed)return;const next=paper.offsetHeight;if(next===ph)return;ph=next;if(!tween&&state.mode==='extents')extents(false);else queue();});paperObserver.observe(paper);
 return{zoomTo,zoomBy,extents,reset:extents,move,panToElement,toggleZoom,focusElement,ensureComfortable,captureAnchor,holdAnchor,
  reflow:queue,snapNow:snap,setSnap(value){snapEnabled=Boolean(value);},
  selected(element){focused=element;queue();},
  destroy(){disposed=true;stop();observer.disconnect();paperObserver.disconnect();
   for(const [name,handler]of [['pointerdown',down],['pointermove',movePointer],['pointerup',up],['pointercancel',up]])viewport.removeEventListener(name,handler);
   viewport.removeEventListener('click',click,true);viewport.removeEventListener('wheel',wheel);viewport.removeEventListener('keydown',key);
  }
 };
}

