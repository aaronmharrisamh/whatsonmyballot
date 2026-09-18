// Source layout is shared by the viewer, minimap, progress, and printed outputs.
// Explicit empty columns retain their width; navigation can skip their empty lists.
export function resolveBallotLayout(input){
 const content=Array.isArray(input)?{contests:input}:input||{},races=content.contests||[];
 const raceById=new Map(races.map(race=>[race.id,race]));
 let mapping=content.ballotStyles?.[0]?.pageMapping;
 if(!mapping?.length){
  const numbers=[...new Set(races.map(race=>race.sourceRefs?.[0]?.viewerPage||1))].sort((a,b)=>a-b);
  mapping=numbers.map(viewerPage=>({viewerPage,contestIds:races.filter(race=>(race.sourceRefs?.[0]?.viewerPage||1)===viewerPage).map(race=>race.id)}));
 }
 const columns=[],pages=[],seen=new Set();
 for(const [pageIndex,entry] of mapping.entries()){
  const viewerPage=entry.viewerPage??pageIndex+1,id=String(entry.pageId||entry.id||'page-'+viewerPage);
  const label=String(entry.label||entry.title||(mapping.length===2?(pageIndex?'Back':'Front'):'Page '+(pageIndex+1)));
  let entries=entry.columns;
  if(!entries?.length){
   const ids=entry.contestIds||races.filter(race=>race.sourceRefs?.some(ref=>ref.viewerPage===viewerPage)).map(race=>race.id);
   const byColumn=new Map();
   for(const raceId of ids){
    const race=raceById.get(raceId);if(!race)throw Error('Unknown ballot section in page layout: '+raceId);
    const source=race.sourceRefs?.find(ref=>ref.viewerPage===viewerPage),column=source?.column||1;
    if(!byColumn.has(column))byColumn.set(column,[]);
    byColumn.get(column).push(raceId);
   }
   entries=[...byColumn].sort((a,b)=>a[0]-b[0]).map(([column,contestIds])=>({id:id+'-column-'+column,column,contestIds}));
  }
  const pageColumns=[];
  for(const [columnIndex,entryColumn] of entries.entries()){
   const contests=(entryColumn.contestIds||[]).map(raceId=>{
    const race=raceById.get(raceId);if(!race)throw Error('Unknown ballot section in page layout: '+raceId);
    if(seen.has(raceId))throw Error('A ballot section appears more than once in page layout: '+raceId);
    seen.add(raceId);return race;
   });
   const column={id:String(entryColumn.id||id+'-column-'+(columnIndex+1)),column:entryColumn.column??columnIndex+1,index:columns.length,pageId:id,viewerPage,contestIds:contests.map(race=>race.id),contests};
   columns.push(column);pageColumns.push(column);
  }
  pages.push({id,label,viewerPage,columns:pageColumns,contests:pageColumns.flatMap(column=>column.contests),width:96+308*Math.max(1,pageColumns.length)});
 }
 if(races.some(race=>!seen.has(race.id)))throw Error('Some ballot sections are missing from the page layout.');
 return {pages,columns,contests:columns.flatMap(column=>column.contests)};
}
