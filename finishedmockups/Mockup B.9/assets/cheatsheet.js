// My Guide projects author data only. Visitor choices and reader preferences are
// deliberately absent from this API, including private practice write-ins.
export function projectCheatsheet(content, annotationRecords, noteRecords){
 const annotations=new Map(annotationRecords.map(record=>[record.id,record]));
 const notes=new Map(noteRecords.map(record=>[record.id,record]));
 const candidates=new Map(content.candidates.map(record=>[record.id,record]));
 const options=new Map(content.options.map(record=>[record.id,record]));
 const races=new Map(content.contests.map(record=>[record.id,record]));
 const labels={partisan:'Partisan',nonpartisan:'Non-Partisan',proposals:'Proposals'},groups=new Map();
 for(const section of content.sections){
  const contests=[];
  for(const id of section.contestIds){
   const race=races.get(id);if(!race)continue;
   const entries=[
    ...race.candidateIds.map(id=>({id,kind:'candidate',label:candidates.get(id)?.officialName})),
    ...race.optionIds.map(id=>({id,kind:'party',label:options.get(id)?.officialLabel})),
    ...race.writeIns.map(slot=>({id:slot.id,kind:'write-in',label:slot.officialLabel||slot.displayLabel||'Write-in'}))
   ];
   if(race.optionOrder?.length){const order=new Map(race.optionOrder.map((entry,index)=>[entry.id,index]));entries.sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity));}
   const choices=entries.flatMap(entry=>{
    const mark=annotations.get(entry.id);
    if(!entry.label||!mark||mark.raceId!==id||!['this','or'].includes(mark.mark))return[];
    const note=notes.get(entry.id),own=note?.raceId===id?note:null;
    return[{...entry,mark:mark.mark,color:mark.color,opinion:own?.opinion||'',author:own?.author||'',sourceUrl:own?.sourceUrl||'',sourceLinks:own?.sourceLinks||[]}];
   });
   if(choices.length)contests.push({id,title:race.officialTitle,choices});
  }
  if(!contests.length)continue;
  const known=Object.hasOwn(labels,section.partisanship),category=known?section.partisanship:(section.groupId||section.id),key=category;
  if(!groups.has(key))groups.set(key,{category,layoutCategory:section.partisanship,label:known?labels[category]:(section.groupLabel||section.officialTitle),sections:[]});
  groups.get(key).sections.push({id:section.id,title:section.officialTitle,contests});
 }
 const result=[...groups.values()],primary=group=>['partisan','nonpartisan'].includes(group.layoutCategory||group.category);
 return [...result.filter(primary),...result.filter(group=>!primary(group))];
}
