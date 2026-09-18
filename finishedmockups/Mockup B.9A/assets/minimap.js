import { resolveBallotLayout } from './layout.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ballotLayout(content, measurements=new Map()){
 const layout=resolveBallotLayout(content),columnWidth=19,gap=8,blocks=[],pages=[];
 let x=2;
 for(const page of layout.pages){
  const pageWidth=8+Math.max(1,page.columns.length)*columnWidth+Math.max(0,page.columns.length-1);
  pages.push({...page,x,width:pageWidth});
  for(const [columnIndex,column] of page.columns.entries()){
   let y=12;
   for(const race of column.contests){
    const measured=measurements.get(race.id),count=(race.candidateIds?.length||0)+(race.optionIds?.length||0)+(race.writeIns?.length||0);
    const height=measured?.width>0?Math.max(3,measured.height/measured.width*columnWidth):5+Math.ceil(String(race.officialTitle||'').length/28)*2+count*3;
    blocks.push({id:race.id,page:page.viewerPage,column:column.column,x:x+4+columnIndex*(columnWidth+1),y,width:columnWidth,height});y+=height+2;
   }
  }
  x+=pageWidth+gap;
 }
 return {width:Math.max(1,x-gap+2),height:Math.max(40,...blocks.map(block=>block.y+block.height+6)),pages,blocks};
}
export function renderMinimap(content,selectedId,measurements){
 const map=ballotLayout(content,measurements),races=Array.isArray(content)?content:content.contests||[],selected=races.find(race=>race.id===selectedId);
 return '<svg class="b-minimap-svg" viewBox="0 0 '+map.width+' '+map.height+'" role="img" aria-label="Ballot map. Selected: '+escape(selected?.officialTitle||'No section')+'">'+
 map.pages.map(page=>'<g data-map-page="'+escape(page.id)+'"><title>'+escape(page.label)+'</title><rect x="'+page.x+'" y="1" width="'+page.width+'" height="'+(map.height-2)+'" rx="2" fill="#fffefb" stroke="#a4b1b8"/><text x="'+(page.x+page.width/2)+'" y="8" text-anchor="middle" font-family="Arial,sans-serif" font-size="5" fill="#41586a">'+escape(page.label.length>18?page.label.slice(0,17)+'…':page.label)+'</text></g>').join('')+
 map.blocks.map(block=>'<rect data-map-section="'+escape(block.id)+'" x="'+block.x+'" y="'+block.y+'" width="'+block.width+'" height="'+block.height+'" rx=".6" fill="'+(block.id===selectedId?'#bcf36b':'#d5dde1')+'" stroke="'+(block.id===selectedId?'#45681d':'#bcc8ce')+'" stroke-width="'+(block.id===selectedId?1.2:.35)+'"'+(block.id===selectedId?' data-selected="true"':'')+'/>').join('')+'</svg>';
}
