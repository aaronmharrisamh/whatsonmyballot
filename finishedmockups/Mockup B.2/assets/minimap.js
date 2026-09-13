// A reusable schematic: source page/column order plus content-based section heights.
// Pass measured section sizes to match their proportions in another ballot viewer.
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ballotLayout(contests, measurements=new Map()){
 const pages=[...new Set(contests.map(r=>r.sourceRefs[0].viewerPage))].sort((a,b)=>a-b);
 const pageWidth=66,gap=8,columns=Math.max(1,...contests.map(r=>r.sourceRefs[0].column));
 const columnWidth=(pageWidth-7-(columns-1))/columns,width=Math.max(1,pages.length)*(pageWidth+gap)-gap+4;
 const blocks=[];
 pages.forEach((page,pi)=>{
  for(let column=1;column<=columns;column++){
   let y=12;
   for(const race of contests.filter(r=>r.sourceRefs[0].viewerPage===page&&r.sourceRefs[0].column===column)){
    const measured=measurements.get(race.id);
    const height=measured?measured.height/measured.width*columnWidth:
      5+Math.ceil(race.officialTitle.length/28)*2+(race.candidateIds.length+race.optionIds.length+race.writeIns.length)*3;
    blocks.push({id:race.id,page,column,x:pi*(pageWidth+gap)+4+(column-1)*(columnWidth+1),y,width:columnWidth,height});
    y+=height+2;
   }
  }
 });
 const height=Math.max(40,...blocks.map(r=>r.y+r.height+6));
 return {width,height,pageWidth,pages,blocks};
}
export function renderMinimap(contests, selectedId, measurements){
 const map=ballotLayout(contests,measurements),selected=contests.find(r=>r.id===selectedId);
 return '<svg class="b-minimap-svg" viewBox="0 0 '+map.width+' '+map.height+'" role="img" aria-label="Ballot map. Selected: '+escape(selected?.officialTitle||'No section')+'">'+
 map.pages.map((p,i)=>'<rect x="'+(i*74+1)+'" y="1" width="64" height="'+(map.height-2)+'" rx="2" fill="#fffefb" stroke="#a4b1b8"/><text x="'+(i*74+33)+'" y="8" text-anchor="middle" font-family="Arial,sans-serif" font-size="5" fill="#41586a">'+p+'</text>').join('')+
 map.blocks.map(b=>'<rect data-map-section="'+escape(b.id)+'" x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" rx=".6" fill="'+(b.id===selectedId?'#bcf36b':'#d5dde1')+'" stroke="'+(b.id===selectedId?'#45681d':'#bcc8ce')+'" stroke-width="'+(b.id===selectedId?1.2:.35)+'"'+(b.id===selectedId?' data-selected="true"':'')+'/>').join('')+'</svg>';
}
