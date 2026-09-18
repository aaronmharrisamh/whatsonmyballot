import{APP_VERSION_LABEL}from'../../../version.js';
import{guideHint,personalOval}from'./ballot-ui.js';
const colors={red:'#943943',blue:'#265987',green:'#26613e',yellow:'#796009',orange:'#8a491a',gray:'#535d68'};
const tints={red:'#fff0f1',blue:'#edf4fe',green:'#ecf6ee',yellow:'#fff9dc',orange:'#fff3e6',gray:'#f0f2f4'};
export function textChunks(value,max=550){
 const chars=Array.from(String(value||'')),chunks=[];let start=0;
 while(start<chars.length){let end=Math.min(start+max,chars.length);if(end<chars.length){let space=end;while(space>start+max/2&&!/\s/.test(chars[space]))space--;if(space>start+max/2)end=space+1;}chunks.push(chars.slice(start,end).join(''));start=end;}return chunks.length?chunks:[''];
}
const text=(value,{size=12,bold=false,color='#203a50',width=510,...rest}={})=>({text:String(value),fontSize:size,bold,color,fallbackWidth:width,...rest});
function markNode(mark,color){
 const svg=(value,w,height)=>({svg:value.replace('<svg ','<svg width="'+w+'" height="'+height+'" ').replaceAll('currentColor',color),width:w,height});
 const items=[];
 if(mark!=='none'){if(mark==='this')items.push(svg(guideHint('this'),23,17));else items.push(text('OR',{size:14,bold:true,color,width:48,alignment:'center'}));}
 items.push(svg(personalOval(false),40,22));
 if(mark!=='none')items.push(text(mark==='this'?'RECOMMENDED':'OPTIONAL',{size:6.5,bold:true,color,width:50,alignment:'center'}));
 return{stack:items,alignment:'center',margin:[0,3,0,3]};
}
const spanning=(node,fillColor)=>[{stack:Array.isArray(node)?node:[node],colSpan:2,...(fillColor?{fillColor}:{}),margin:[4,3,4,3]},{}];
function noteRows(note,heading,color='#315575',tint='#f1f5f8'){
 if(!note)return[];
 return textChunks(note.text).map((part,i)=>spanning([text(heading+(i?' — continued':''),{size:10,bold:true,color}),text(part,{size:11,color,margin:[0,3,0,3]}),...(i===textChunks(note.text).length-1?[text(note.author.name,{size:9,color})]:[])],tint));
}
export function ballotPdfContent(snapshot){
 const header=[
 text(snapshot.election.title,{size:13,bold:true}),text('Ballot with Recommendations',{size:24,bold:true,margin:[0,7,0,10]}),
 ...textChunks(snapshot.areaPath.map(a=>a.label).join(' · ')).map(value=>text(value,{size:13,bold:true,margin:[0,0,0,5]})),
 ...textChunks(snapshot.ballot.title).map(value=>text(value,{size:12,margin:[0,0,0,5]})),
 ...snapshot.ballot.districtLabels.flatMap(value=>textChunks(value).map(value=>text(value,{size:10,margin:[0,0,0,3]}))),
 ...textChunks((snapshot.guide?.title||'No opinion guide')+(snapshot.author?' — '+snapshot.author.name+(snapshot.author.organization?' · '+snapshot.author.organization:''):'')).map(value=>text(value,{size:11,margin:[0,2,0,4]})),
 text('Election '+snapshot.election.date+' · Revision '+snapshot.revision+(snapshot.guide?.updatedAt?' · Guide updated '+snapshot.guide.updatedAt.slice(0,10):''),{size:10,margin:[0,2,0,8]}),
 text('Generated ballot reference · Guide marks are recommendations. All voting ovals are empty.',{size:10,color:'#506575',margin:[0,0,0,18]})
 ];
 const groups=new Map(snapshot.groups.map(g=>[g.id,g])),content=[...header];
 let priorPage=null;
 snapshot.contests.forEach((row,index)=>{
  const r=row.contest,page=row.sourcePage,group=groups.get(r.groupId),source='Source '+(page.label||'page '+(snapshot.ballot.pages.findIndex(p=>p.id===page.id)+1))+' · Column '+r.column;
  const body=[spanning([text(group.title,{size:10,bold:true,color:'#385065'}),text(r.titleLines[0],{size:14,bold:true,margin:[0,4,0,4]}),text(source,{size:9,color:'#506575'})],'#e8edf1')];
  r.titleLines.slice(1).forEach(line=>body.push(spanning(text(line,{size:13,bold:true}))));
  textChunks(r.instruction).forEach(value=>body.push(spanning(text(value,{size:11}))));
  for(const value of [r.term,r.district].filter(Boolean))body.push(spanning(text(value,{size:11})));
  if(r.question)textChunks(r.question).forEach(value=>body.push(spanning(text(value,{size:12}))));
  body.push(...noteRows(row.opinion,'Section opinion'));
  if(!row.hasRecommendations)body.push(spanning(text('— No recommendations',{size:11,color:'#536778'})));
  for(const entry of row.choices){
   const {choice:c,mark,recommended,opinion}=entry,color=colors[entry.color]||colors.blue,tint=recommended?tints[entry.color]||tints.blue:null;
   const label=[...c.labelLines,...(c.members||[]).map(m=>m.role+': '+m.name),...[c.party,c.designation].filter(Boolean)].join('\n'),parts=textChunks(label,650);
   parts.forEach((part,i)=>body.push([
    i?text('Same choice\ncontinued',{size:8,width:50,color:'#536778'}):markNode(mark,mark==='none'?'#334853':color),
    {stack:[text(part,{size:12,bold:i===0,width:444})],margin:[4,7,4,7],...(tint?{fillColor:tint}:{})}
   ]));
   if(recommended&&opinion)body.push(...noteRows(opinion,'Opinion — '+(mark==='this'?'Choose This':'Optional'),color,tint));
  }
  const textLength=r.titleLines.join('').length+r.instruction.length+(r.term?.length||0)+(r.district?.length||0)+(row.opinion?.text.length||0)+row.choices.reduce((n,e)=>n+e.choice.labelLines.join('').length+JSON.stringify(e.choice.members||[]).length+(e.opinion?.text.length||0),0),short=row.choices.length<=3&&!r.question&&textLength<550;
  content.push({id:r.id,table:{headerRows:1,keepWithHeaderRows:1,dontBreakRows:true,widths:[54,'*'],body},layout:{hLineWidth:i=>i===0?1:.5,vLineWidth:()=>.6,hLineColor:()=> '#a9b8c3',vLineColor:()=> '#a9b8c3',paddingLeft:()=>4,paddingRight:()=>4,paddingTop:()=>3,paddingBottom:()=>3},margin:[0,0,0,14],...(short?{unbreakable:true}:{}),...(priorPage&&priorPage!==page.id?{pageBreak:'before'}:{})});
  priorPage=page.id;
 });
 return content;
}
export function ballotPdfDefinition(snapshot,content=ballotPdfContent(snapshot)){
 return {pageSize:'LETTER',pageMargins:[36,48,36,42],defaultStyle:{font:'Roboto',fontSize:12,lineHeight:1.2,color:'#203a50'},info:{title:'Ballot with Recommendations — '+snapshot.ballot.title,author:snapshot.author?.name||'No guide author',subject:snapshot.election.title+' · '+snapshot.area.label+' · Revision '+snapshot.revision,creator:'What’s on My Ballot? '+APP_VERSION_LABEL},
 header:page=>({text:(page>1?'Generated ballot reference — continued':'Generated ballot reference')+' · Election '+snapshot.election.date,margin:[36,19,36,0],fontSize:9,color:'#526777'}),
 footer:(page,total)=>({columns:[{text:'Guide recommendations · Revision '+snapshot.revision,alignment:'left'},{text:'Page '+page+' of '+total,alignment:'right'}],margin:[36,14,36,0],fontSize:9,color:'#526777'}),
 content
 };
}
