import{APP_VERSION}from'../../../version.js';
// Author-output projection. This API deliberately takes no visitor or view state.
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function projectGuide(model,selection){
 const ballot=model.get(selection?.ballotId);if(!ballot?.contests)throw Error('Choose an area with a ballot before making a guide.');
 const area=model.get(selection.areaId);if(!area?.ballotIds?.includes(ballot.id))throw Error('This ballot is not assigned to the selected area.');
 const guide=model.guidesFor(ballot.id).find(g=>g.id===selection.guideId)||null,author=guide?model.get(guide.authorId):null;
 const contests=model.ballotProjection(ballot.id,guide?.id).map(row=>{
  const choices=row.choices.map(entry=>({choice:entry.choice,mark:entry.mark,color:entry.color,recommended:entry.recommended,opinion:entry.opinion,information:entry.detailsAvailable}));
  return{contest:row.contest,opinion:row.opinion,information:model.detailsAvailable(row.contest),choices,recommendations:[...choices.filter(c=>c.mark==='this'),...choices.filter(c=>c.mark==='or')],hasRecommendations:choices.some(c=>c.recommended),sourcePage:model.get(row.contest.pageId)};
 });
 const categories=['partisan','nonpartisan','proposals'],groups=categories.flatMap(category=>ballot.groups.filter(g=>g.category===category).map(group=>({...group,contests:contests.filter(row=>row.contest.groupId===group.id)}))).filter(g=>g.contests.length);
 return freeze(structuredClone({collectionId:model.value.collectionId,revision:model.value.revision,schemaVersion:model.value.schemaVersion,area,areaPath:model.areaPath(area.id),ballot:{id:ballot.id,title:ballot.title,subtitle:ballot.subtitle||'',districtLabels:ballot.districtLabels||[],pages:ballot.pages},election:model.get(ballot.electionId),guide,author,groups,contests}));
}
export function outputFilename(snapshot,date=new Date(),version=APP_VERSION){
 const slug=text=>String(text).normalize('NFKC').replace(/[^\p{L}\p{N}.-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,65)||'guide';
 return [slug(snapshot.area.label),slug(snapshot.ballot.id),slug(snapshot.guide?.id||'no-guide'),snapshot.election.date,date.toISOString().slice(0,10),'r'+snapshot.revision,'v'+version].join('_')+'.pdf';
}
