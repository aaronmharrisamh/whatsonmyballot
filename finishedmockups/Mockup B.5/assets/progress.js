import{ballotLayout}from'./minimap.js';
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Stable source-based proportions; expanding a note must not change progress weights.
export function sectionWeights(contests){
 const map=new Map(ballotLayout(contests).blocks.map(b=>[b.id,b.height]));
 return contests.map(r=>({id:r.id,weight:map.get(r.id)||1}));
}
export function renderProgress(contests,selectedId,count){
 const weights=sectionWeights(contests),index=Math.max(0,contests.findIndex(r=>r.id===selectedId));
 const marked=contests.filter(r=>count(r.id)>0).length;
 return '<div class="b-progress-line" role="group" aria-label="Ballot progress. Section '+(index+1)+' of '+contests.length+'. '+marked+' sections have saved choices."><div class="b-progress-segments" aria-hidden="true">'+weights.map((w,i)=>{
  const done=count(w.id)>0,current=w.id===selectedId;
  return '<span class="b-progress-piece'+(done?' is-done':'')+(current?' is-current':'')+'" data-progress-section="'+escape(w.id)+'" data-done="'+done+'" style="flex-grow:'+w.weight+'" title="'+escape(contests[i].officialTitle)+(done?' — has saved choices':'')+'">'+(done?'<svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'')+'</span>';
 }).join('')+'</div><strong aria-hidden="true">'+(index+1)+'/'+contests.length+'</strong></div>';
}
