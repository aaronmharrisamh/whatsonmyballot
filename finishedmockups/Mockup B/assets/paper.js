
// B1 canvas: the controls and reading dialogs remain outside this transform.
export function mountPaper(viewport,paper,saved,onChange){
 let state={...saved},fit=0,disposed=false,moved=false,suppressUntil=0,lastCenter=null,lastDistance=0,start=null;
 const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),scale=()=>fit*state.zoom;
 function constrain(){
  const w=paper.offsetWidth*scale(),h=paper.offsetHeight*scale();
  state.x=w<=viewport.clientWidth?(viewport.clientWidth-w)/2:clamp(state.x,viewport.clientWidth-w,0);
  state.y=h<=viewport.clientHeight?(viewport.clientHeight-h)/2:clamp(state.y,viewport.clientHeight-h,0);
 }
 function paint(animate=false){
  constrain();paper.style.transition=animate&&!matchMedia('(prefers-reduced-motion:reduce)').matches?'transform 150ms ease-out':'none';
  paper.style.transform='translate('+state.x+'px,'+state.y+'px) scale('+scale()+')';
  Object.assign(viewport.dataset,{zoom:state.zoom.toFixed(3),panX:state.x.toFixed(2),panY:state.y.toFixed(2),scale:scale().toFixed(4)});
  onChange({...state});
 }
 function resize(){
  const old=scale();fit=Math.min(1,viewport.clientWidth/paper.offsetWidth)*.94;
  if(old>0){state.x*=scale()/old;state.y*=scale()/old;}paint();
 }
 function zoomTo(value,point={x:viewport.clientWidth/2,y:viewport.clientHeight/2},animate=true){
  const old=scale();state.zoom=clamp(value,.25,6);const ratio=scale()/old;
  state.x=point.x-(point.x-state.x)*ratio;state.y=point.y-(point.y-state.y)*ratio;paint(animate);
 }
 function local(event){const box=viewport.getBoundingClientRect();return{x:(event.clientX-box.left)*viewport.clientWidth/box.width,y:(event.clientY-box.top)*viewport.clientHeight/box.height};}
 function geometry(){const p=[...pointers.values()];return p.length>1?{center:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:{center:p[0],distance:0};}
 function down(event){if(event.pointerType==='mouse'&&event.button!==0)return;pointers.set(event.pointerId,local(event));if(pointers.size===1){moved=false;suppressUntil=0;start=local(event);}const g=geometry();lastCenter=g.center;lastDistance=g.distance;}
 function movePointer(event){
  if(!pointers.has(event.pointerId))return;
  const point=local(event);pointers.set(event.pointerId,point);const g=geometry();
  if(pointers.size>1||Math.hypot(point.x-start.x,point.y-start.y)>6)moved=true;
  if(moved){
   event.preventDefault();viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');
   if(lastDistance&&g.distance)zoomTo(state.zoom*g.distance/lastDistance,lastCenter,false);
   if(lastCenter){state.x+=g.center.x-lastCenter.x;state.y+=g.center.y-lastCenter.y;}paint();
  }
  lastCenter=g.center;lastDistance=g.distance;
 }
 function up(event){
  if(!pointers.has(event.pointerId))return;
  pointers.delete(event.pointerId);if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  const g=geometry();lastCenter=g.center;lastDistance=g.distance;
  if(moved)suppressUntil=performance.now()+400;
  if(!pointers.size)viewport.classList.remove('dragging');
 }
 function click(event){if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}}
 function wheel(event){
  event.preventDefault();
  if(event.ctrlKey||event.metaKey)zoomTo(state.zoom*Math.exp(-event.deltaY*.008),local(event),false);
  else{const factor=event.deltaMode===1?18:event.deltaMode===2?viewport.clientHeight:1;state.x-=event.deltaX*factor;state.y-=event.deltaY*factor;paint();}
 }
 function move(direction){const step=Math.max(80,viewport.clientWidth*.25);if(direction==='left')state.x+=step;if(direction==='right')state.x-=step;if(direction==='up')state.y+=step;if(direction==='down')state.y-=step;paint(true);}
 function reset(){state={zoom:1,x:0,y:0};resize();}
 function key(event){
  if(event.target!==viewport)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();move(event.key.slice(5).toLowerCase());}
  else if(['+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')reset();else zoomTo(state.zoom+(event.key==='-'?-.5:.5));}
 }
 viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',movePointer);
 viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',up);
 viewport.addEventListener('click',click,true);viewport.addEventListener('wheel',wheel,{passive:false});viewport.addEventListener('keydown',key);
 const observer=new ResizeObserver(()=>{if(!disposed)resize();});observer.observe(viewport);
 const paperObserver=new ResizeObserver(()=>{if(!disposed)paint();});paperObserver.observe(paper);
 resize();
 return {zoomTo,reset,move,reflow:()=>paint(),focusElement(element){
  if(!element)return;
  let left=0,top=0,node=element;while(node&&node!==paper){left+=node.offsetLeft;top+=node.offsetTop;node=node.offsetParent;}
  state.zoom=clamp(Math.min(viewport.clientWidth/(element.offsetWidth+35),viewport.clientHeight/(Math.min(element.offsetHeight,700)+40))/fit,1,6);
  state.x=(viewport.clientWidth-element.offsetWidth*scale())/2-left*scale();state.y=18-top*scale();paint(true);
 },destroy(){
  disposed=true;observer.disconnect();paperObserver.disconnect();
  viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',movePointer);
  viewport.removeEventListener('pointerup',up);viewport.removeEventListener('pointercancel',up);viewport.removeEventListener('click',click,true);
  viewport.removeEventListener('wheel',wheel);viewport.removeEventListener('keydown',key);
 }};
}
