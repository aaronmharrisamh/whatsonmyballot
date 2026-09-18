import { ballotLayout } from './minimap.js';
import { resolveBallotLayout } from './layout.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sectionWeights(content){
 const layout=resolveBallotLayout(content),weights=new Map(ballotLayout(content).blocks.map(block=>[block.id,block.height]));
 return layout.contests.map(race=>({id:race.id,weight:weights.get(race.id)||1}));
}
export function renderProgress(content,selectedId,count,legacyPages=[]){
 const layout=resolveBallotLayout(content),contests=layout.contests,weights=new Map(sectionWeights(content).map(row=>[row.id,row.weight]));
 const index=contests.findIndex(race=>race.id===selectedId),marked=contests.filter(race=>count(race.id)>0).length;
 const piece=race=>{
  const done=count(race.id)>0,current=race.id===selectedId;
  return '<span class="b-progress-piece'+(done?' is-done':'')+(current?' is-current':'')+'" data-progress-section="'+escape(race.id)+'" data-done="'+done+'" style="flex-grow:'+weights.get(race.id)+'" title="'+escape(race.officialTitle)+(done?' — has saved choices':'')+'">'+(done?'<svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'')+'</span>';
 };
 const groups=layout.pages.filter(page=>page.contests.length).map(page=>{
  const weight=page.contests.reduce((sum,race)=>sum+weights.get(race.id),0),label=legacyPages.find(entry=>entry.page===page.viewerPage)?.label||page.label;
  return '<div class="b-progress-page" data-progress-page="'+escape(page.id)+'" style="flex-grow:'+weight+'"><span class="b-progress-side">'+escape(label)+'</span><div class="b-progress-segments" aria-hidden="true">'+page.contests.map(piece).join('')+'</div></div>';
 }).join('');
 return '<div class="b-progress-line" role="group" aria-label="Ballot progress. Section '+(index+1)+' of '+contests.length+'. '+marked+' sections have saved choices."><div class="b-progress-pages">'+groups+'</div><strong aria-hidden="true">'+(index+1)+'/'+contests.length+'</strong></div>';
}
