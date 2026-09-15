// The transform moves paper only; dialogs, navigation, and hints remain fixed.
export function mountPaper(viewport,paper,saved,onChange,onView=()=>{}){
 let state={mode:'free',...saved},fit=0,disposed=false,moved=false,suppressUntil=0;
 let lastCenter=null,lastDistance=0,start=null,focused=null,vw=0,vh=0,pw=0,ph=0;
 let animationUntil=0,viewFrame=0;
 const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),scale=()=>fit*state.zoom;
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 function position(element){
  const transform=getComputedStyle(paper).transform,current=transform==='none'?1:new DOMMatrixReadOnly(transform).a;
  const box=element.getBoundingClientRect(),base=paper.getBoundingClientRect();
  return {left:(box.left-base.left)/current,top:(box.top-base.top)/current,width:box.width/current};
 }
 function reportView(){
  if(disposed)return;
  const v=viewport.getBoundingClientRect(),sections=[...paper.querySelectorAll('.b-ballot-section')];
  const boxes=sections.map(el=>({el,b:el.getBoundingClientRect()}));
  const whole=state.mode==='extents'||Math.max(0,...boxes.map(({b})=>b.width))<v.width*.6;
  let best=null,area=0;
  if(!whole)for(const item of boxes){
   const b=item.b,a=Math.max(0,Math.min(b.right,v.right)-Math.max(b.left,v.left))*Math.max(0,Math.min(b.bottom,v.bottom)-Math.max(b.top,v.top));
   if(a>area){area=a;best=item.el.dataset.raceId;}
  }
  onView(best);
  if(performance.now()<animationUntil)viewFrame=requestAnimationFrame(reportView);
 }
 function updateView(){cancelAnimationFrame(viewFrame);viewFrame=requestAnimationFrame(reportView);}
 function ensureComfortable(element,target,ratio=1){
  if(!element)return;focused=element;
  const before=position(element),current=new DOMMatrixReadOnly(getComputedStyle(paper).transform).a;
  if(before.width*current>=viewport.clientWidth*(ratio-.05))return;
  interrupt();
  const v=viewport.getBoundingClientRect(),b=(target||element).getBoundingClientRect();
  const point={x:(b.left+b.width/2-v.left)*viewport.clientWidth/v.width,y:(b.top+Math.min(b.height/2,40)-v.top)*viewport.clientHeight/v.height};
  const sourceY=(point.y-state.y)/scale();
  state.mode='free';state.zoom=viewport.clientWidth*ratio/before.width/fit;
  state.x=(viewport.clientWidth-before.width*scale())/2-before.left*scale();state.y=point.y-sourceY*scale();paint(true);
 }
 function constrain(){
  const w=paper.offsetWidth*scale(),h=paper.offsetHeight*scale();
  state.x=w<=viewport.clientWidth?(viewport.clientWidth-w)/2:clamp(state.x,viewport.clientWidth-w,0);
  const minimum=Math.min(viewport.clientHeight-h,focused?-position(focused).top*scale():0);
  state.y=h<=viewport.clientHeight?(viewport.clientHeight-h)/2:clamp(state.y,minimum,0);
 }
 function paint(animate=false){
  constrain();paper.style.transition=animate&&!reduced()?'transform 650ms cubic-bezier(.22,.7,.18,1)':'none';
  paper.style.transform='translate('+state.x+'px,'+state.y+'px) scale('+scale()+')';
  paper.style.setProperty('--paper-scale',scale());
  Object.assign(viewport.dataset,{zoom:state.zoom.toFixed(4),panX:state.x.toFixed(2),panY:state.y.toFixed(2),scale:scale().toFixed(5),mode:state.mode});
  animationUntil=animate&&!reduced()?performance.now()+680:0;
  onChange({...state});updateView();
 }
 function interrupt(){
  const transform=getComputedStyle(paper).transform;
  if(transform!=='none'){const m=new DOMMatrixReadOnly(transform);state.x=m.e;state.y=m.f;state.zoom=m.a/fit;}
  paper.style.transition='none';state.mode='free';animationUntil=0;
 }
 function extents(animate=true){
  state.mode='extents';
  state.zoom=Math.min(viewport.clientWidth/paper.offsetWidth,viewport.clientHeight/paper.offsetHeight)*.94/fit;
  state.x=(viewport.clientWidth-paper.offsetWidth*scale())/2;state.y=0;paint(animate);
 }
 function focusElement(element,animate=true,ratio=state.sectionRatio||1){
  if(!element)return;focused=element;
  const {left,top,width}=position(element);
  state.mode='section';state.sectionRatio=ratio;state.zoom=viewport.clientWidth*ratio/width/fit;
  state.x=(viewport.clientWidth-width*scale())/2-left*scale();state.y=-top*scale();paint(animate);
 }
 function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight;
  if(w===vw&&h===vh&&fit)return;
  const old=scale();vw=w;vh=h;
  // Wider desktop columns keep a fitted section readable without oversized type.
  paper.style.width=Math.max(1020,w*2.25+60)+'px';paper.dataset.wide=String(w>=700);
  fit=Math.min(1,w/paper.offsetWidth)*.94;
  if(state.mode==='section'&&focused)focusElement(focused,false);
  else if(state.mode==='extents')extents(false);
  else{if(old>0){state.x*=scale()/old;state.y*=scale()/old;}paint();}
 }
 function zoomTo(value,point={x:viewport.clientWidth/2,y:viewport.clientHeight/2},animate=true){
  const old=scale();state.mode='free';state.zoom=clamp(value,.01,16);const ratio=scale()/old;
  state.x=point.x-(point.x-state.x)*ratio;state.y=point.y-(point.y-state.y)*ratio;paint(animate);
 }
 function local(event){const b=viewport.getBoundingClientRect();return{x:(event.clientX-b.left)*viewport.clientWidth/b.width,y:(event.clientY-b.top)*viewport.clientHeight/b.height};}
 function geometry(){const p=[...pointers.values()];return p.length>1?{center:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:{center:p[0],distance:0};}
 function down(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(!pointers.size){interrupt();moved=false;suppressUntil=0;start=local(e);}
  pointers.set(e.pointerId,local(e));const g=geometry();lastCenter=g.center;lastDistance=g.distance;
 }
 function movePointer(e){
  if(!pointers.has(e.pointerId))return;const point=local(e);pointers.set(e.pointerId,point);const g=geometry();
  if(pointers.size>1||Math.hypot(point.x-start.x,point.y-start.y)>6)moved=true;
  if(moved){
   e.preventDefault();viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');
   if(lastDistance&&g.distance)zoomTo(state.zoom*g.distance/lastDistance,lastCenter,false);
   if(lastCenter){state.x+=g.center.x-lastCenter.x;state.y+=g.center.y-lastCenter.y;}paint();
  }
  lastCenter=g.center;lastDistance=g.distance;
 }
 function up(e){
  if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  const g=geometry();lastCenter=g.center;lastDistance=g.distance;
  if(moved)suppressUntil=performance.now()+400;
  if(!pointers.size)viewport.classList.remove('dragging');
 }
 function click(e){if(performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}}
 function wheel(e){
  e.preventDefault();interrupt();
  if(e.ctrlKey||e.metaKey)zoomTo(state.zoom*Math.exp(-e.deltaY*.008),local(e),false);
  else{const f=e.deltaMode===1?18:e.deltaMode===2?viewport.clientHeight:1;state.x-=e.deltaX*f;state.y-=e.deltaY*f;paint();}
 }
 function move(direction){
  interrupt();const step=Math.max(80,viewport.clientWidth*.25);
  if(direction==='left')state.x+=step;if(direction==='right')state.x-=step;if(direction==='up')state.y+=step;if(direction==='down')state.y-=step;paint(true);
 }
 function key(e){
  if(e.target!==viewport)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(e.key.slice(5).toLowerCase());}
  else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')extents();else{interrupt();zoomTo(state.zoom*(e.key==='-'?.8:1.25));}}
 }
 viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',movePointer);
 viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',up);
 viewport.addEventListener('click',click,true);viewport.addEventListener('wheel',wheel,{passive:false});viewport.addEventListener('keydown',key);
 resize();pw=paper.offsetWidth;ph=paper.offsetHeight;
 const observer=new ResizeObserver(()=>{if(!disposed)resize();});observer.observe(viewport);
 const paperObserver=new ResizeObserver(()=>{
  if(disposed||pw===paper.offsetWidth&&ph===paper.offsetHeight)return;pw=paper.offsetWidth;ph=paper.offsetHeight;
  if(state.mode==='extents')extents(false);else paint(performance.now()<animationUntil);
 });paperObserver.observe(paper);
 return {zoomTo,extents,reset:extents,move,focusElement,ensureComfortable,reflow:()=>paint(performance.now()<animationUntil),
  selected(element){focused=element;},
  destroy(){disposed=true;cancelAnimationFrame(viewFrame);observer.disconnect();paperObserver.disconnect();
   viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',movePointer);viewport.removeEventListener('pointerup',up);viewport.removeEventListener('pointercancel',up);
   viewport.removeEventListener('click',click,true);viewport.removeEventListener('wheel',wheel);viewport.removeEventListener('keydown',key);
  }};
}
