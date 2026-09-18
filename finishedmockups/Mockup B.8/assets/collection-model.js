// Call after collection-contract validation. No UI, storage, or historical IDs.
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const nonblank=value=>typeof value==='string'&&value.trim().length>0;
export function normalizeCollection(input){
 const value=freeze(structuredClone(input)),records=new Map(),owner=new Map();
 const add=(r,parent=null)=>{records.set(r.id,r);if(parent)owner.set(r.id,parent);};
 for(const key of ['elections','areaLevels','areas','authors','guides','sources'])value[key].forEach(r=>add(r));
 value.attachments.items.forEach(r=>add(r));
 value.ballots.forEach(b=>{add(b);b.pages.forEach(r=>add(r,b.id));b.groups.forEach(r=>add(r,b.id));b.contests.forEach(r=>{add(r,b.id);r.choices.forEach(c=>add(c,r.id));});});
 const list=(items)=>Object.freeze(items);
 const get=id=>records.get(id)||null;
 const sourceAvailable=id=>{const source=get(id);return Boolean(source&&(source.url||source.attachmentId));};
 const detailsAvailable=recordOrId=>{
  const record=typeof recordOrId==='string'?get(recordOrId):recordOrId,d=record?.details;
  return Boolean(record?.imageAttachmentId||d&&(nonblank(d.summary)||nonblank(d.markdown)||d.attachmentIds?.length||d.sourceIds?.some(sourceAvailable)));
 };
 const guideFor=(guideId,ballotId)=>{const guide=value.guides.find(g=>g.id===guideId);return guide&&guide.ballotId===ballotId?guide:null;};
 const note=(guide,opinion)=>nonblank(opinion?.text)?freeze({text:opinion.text,author:get(opinion.authorId||guide.authorId),sourceIds:opinion.sourceIds||[]}):null;
 const choiceGuide=(guideId,choiceId)=>{
  const ballotId=owner.get(owner.get(choiceId)),guide=guideFor(guideId,ballotId);
  const entry=guide?.recommendations.find(r=>r.choiceId===choiceId);
  const mark=entry?.mark||'none';
  return freeze({mark,recommended:mark==='this'||mark==='or',color:entry?.color||guide?.color||'blue',opinion:guide?note(guide,entry?.opinion):null});
 };
 const sectionOpinion=(guideId,contestId)=>{
  const guide=guideFor(guideId,owner.get(contestId));
  return guide?note(guide,guide.sectionOpinions.find(n=>n.contestId===contestId)?.opinion):null;
 };
 return Object.freeze({
  value,get,detailsAvailable,choiceGuide,sectionOpinion,
  ownerId:id=>owner.get(id)||null,
  guidesFor:ballotId=>list(value.guides.filter(g=>g.ballotId===ballotId)),
  areaPath:areaId=>{const path=[];let area=value.areas.find(a=>a.id===areaId);while(area){path.unshift(area);area=get(area.parentId);}return list(path);},
  childrenOf:parentId=>list(value.areas.filter(a=>a.parentId===parentId)),
  ballotsFor:areaId=>list((value.areas.find(a=>a.id===areaId)?.ballotIds||[]).map(get)),
  // Never skip unmarked contests; the UI can show "— No recommendations".
  recommendationsFor: (ballotId,guideId)=>list((value.ballots.find(b=>b.id===ballotId)?.contests||[]).map(contest=>{
   const choices=contest.choices.map(choice=>({choice,...choiceGuide(guideId,choice.id)})).filter(row=>row.recommended);
   return freeze({contest,choices,hasRecommendations:choices.length>0,opinion:sectionOpinion(guideId,contest.id)});
  })),
  // Includes every choice, independently of reader filters or personal marks.
  ballotProjection:(ballotId,guideId)=>list((value.ballots.find(b=>b.id===ballotId)?.contests||[]).map(contest=>freeze({
   contest,opinion:sectionOpinion(guideId,contest.id),
   choices:contest.choices.map(choice=>({choice,detailsAvailable:detailsAvailable(choice),...choiceGuide(guideId,choice.id)}))
  }))),
  layoutFor:ballotId=>{
   const ballot=value.ballots.find(b=>b.id===ballotId);if(!ballot)return list([]);
   return list(ballot.pages.map(page=>freeze({page,columns:Array.from({length:page.columns},(_,i)=>({
    number:i+1,contests:ballot.contests.filter(c=>c.pageId===page.id&&c.column===i+1)
   }))})));
  },
  // A pure helper. Personal marks never enter collection data or guide marks.
  canMark:(contestId,choiceIds)=>{
   const contest=get(contestId);return Boolean(contest?.choices&&Array.isArray(choiceIds)&&new Set(choiceIds).size===choiceIds.length&&choiceIds.length<=contest.maxSelections&&choiceIds.every(id=>owner.get(id)===contestId));
  }
 });
}
