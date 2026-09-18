import { projectCheatsheet } from './cheatsheet.js';
import { guideChoiceSymbol } from './guide-symbols.js';

// Outputs accept author records only. They never read localStorage, visitor choices,
// reader filters, open opinion panels, or the Ballot Viewer camera.
const palette = {
 blue:{ink:'#244f74',tint:'#edf3fa'},green:{ink:'#29563b',tint:'#edf5ee'},
 red:{ink:'#943943',tint:'#fbefef'},yellow:{ink:'#665015',tint:'#fff8dc'},
 orange:{ink:'#8b491f',tint:'#fff2e7'},gray:{ink:'#4b5862',tint:'#f0f2f4'}
};
const colors = key => Object.hasOwn(palette,key) ? palette[key] : palette.gray;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const records = value => Array.isArray(value) ? value : value?.records || value?.value?.records || [];
const text = value => String(value ?? '').replace(/\r\n?/g,'\n');
function snapshot(options){
 const source=structuredClone({content:options.content,annotations:records(options.annotations),notes:records(options.notes),areaLabel:options.areaLabel});
 if(!source.content?.contests || !source.content?.ballotStyles?.length)throw Error('Ballot information is not available for this area.');
 source.areaLabel=text(source.areaLabel || source.content.areas[0]?.displayLabel || 'Voting guide');
 source.groups=projectCheatsheet(source.content,source.annotations,source.notes);
 return source;
}
const libraryUrl = name => new URL('./vendor/pdf/'+name,import.meta.url).href;
let libraryPromise;
function script(url){
 return new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src=url;el.async=true;
  const timer=setTimeout(()=>fail(),20000);
  const fail=()=>{clearTimeout(timer);el.remove();reject(Error('The PDF tools did not load. Please try again.'));};
  el.onload=()=>{clearTimeout(timer);resolve();};el.onerror=fail;document.head.append(el);
 });
}
async function library(){
 if(!libraryPromise)libraryPromise=(async()=>{
  await script(libraryUrl('pdfmake.min.js'));
  await script(libraryUrl('vfs_fonts.js'));
  const response=await fetch(libraryUrl('glyphs.json'));if(!response.ok)throw Error('The PDF font did not load. Please try again.');
  const glyphs=await response.json();
  if(!window.pdfMake?.createPdf)throw Error('The PDF tools did not load. Please try again.');
  return {engine:window.pdfMake,ranges:glyphs.ranges};
 })().catch(error=>{libraryPromise=null;throw error;});
 return libraryPromise;
}
function checkText(strings,ranges){
 for(const value of strings)for(const ch of String(value)){
  const cp=ch.codePointAt(0);
  if(/\s/u.test(ch)||ranges.some(([a,b])=>cp>=a&&cp<=b))continue;
  const error=Error('Some text needs a different font. Use Print my Guide to print it with your browser fonts.');
  error.code='PDF_UNSUPPORTED_TEXT';throw error;
 }
}
function contextualTitle(title,category){
 const jurisdiction=/^(County|Township)$/i.test(category.trim())?category.trim():'';
 return jurisdiction&&!new RegExp('\\b'+jurisdiction+'\\b','i').test(title)?jurisdiction+' — '+title:title;
}
function paperSides(state){
 const content=state.content,style=content.ballotStyles[0];
 const entries=new Map(state.groups.flatMap(group=>group.sections.flatMap(section=>section.contests.map(race=>[race.id,race.choices]))));
 const headerNotes=new Map(state.notes.filter(note=>note.kind==='section'&&note.headerHighlighted&&note.opinion?.trim()).map(note=>[note.raceId,note]));
 const races=new Map(content.contests.map(race=>[race.id,race])),sections=new Map(content.sections.map(section=>[section.id,section]));
 const mapping=[...(style.pageMapping||[])].sort((a,b)=>a.viewerPage-b.viewerPage);
 if(mapping.length!==2)throw Error('This PDF needs Front and Back page information. Use Print my Guide for this ballot.');
 const seen=new Set();
 const sides=mapping.map((page,index)=>{
  const columns=[[],[],[]];
  for(const id of page.contestIds){
   if(seen.has(id))continue;seen.add(id);const race=races.get(id);if(!race)continue;
   const reference=race.sourceRefs?.find(ref=>ref.viewerPage===page.viewerPage);
   const column=Math.max(0,Math.min(2,(reference?.column||1)-1));
   const category=text(sections.get(race.sectionId)?.officialTitle);
   columns[column].push({id,title:contextualTitle(text(race.officialTitle),category),instruction:text(race.officialSelectionInstruction),category,headerOpinion:headerNotes.get(id)||null,choices:entries.get(id)||[]});
  }
  return {label:index?'Back':'Front',columns};
 });
 if(content.contests.some(race=>!seen.has(race.id)))throw Error('Some sections do not have a PDF page. Use Print my Guide for the complete guide.');
 return sides;
}
function pdfSource(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?{label:'Source: '+url.hostname,href:url.href}:null;}catch{return null;}
}
function oval(choice){
 const ink=colors(choice.color).ink;
 const arrow='<path d="M22 0h12v12h8L28 27 14 12h8Z" fill="'+ink+'"/>';
 const optional='<text x="28" y="43" text-anchor="middle" font-family="Roboto" font-size="21" font-weight="bold" fill="white">OR</text>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="50" viewBox="0 0 56 50">'+(choice.mark==='this'?arrow:'')+'<ellipse cx="28" cy="36" rx="24" ry="11" fill="'+ink+'"/>'+(choice.mark==='or'?optional:'')+'</svg>';
}
function pdfOpinion(note,color='#435767'){
 const source=pdfSource(note.sourceUrl);
 return [
  {text:'Opinion'+(note.author?' · '+note.author:''),fontSize:9.5,bold:true,color,margin:[0,3,0,2]},
  {text:note.opinion,fontSize:10.5,lineHeight:1.12,color:'#263e50'},
  ...(source?[{text:source.label,link:source.href,fontSize:9.5,color:'#435767',margin:[0,3,0,0]}]:[])
 ];
}
function pdfChoice(choice){
 const color=colors(choice.color);
 return {stack:[
  {columns:[{svg:oval(choice),width:24},{width:'*',stack:[
   {text:choice.mark==='this'?'Recommended':'Optional',fontSize:9.5,bold:true,color:color.ink},
   {text:choice.label,bold:true,fontSize:11.5,color:'#18354f'}
  ]}],columnGap:5},
  ...(choice.opinion.trim()?pdfOpinion(choice,color.ink):[])
 ],fillColor:color.tint};
}
function pdfRace(race){
 const body=[
  [{text:race.title,fontSize:11.5,bold:true,lineHeight:1.02,color:'#ffffff',fillColor:'#244459'}],
  ...(race.instruction?[[{text:race.instruction,fontSize:10.5,color:'#526572'}]]:[]),
  ...(race.headerOpinion?[[{stack:pdfOpinion(race.headerOpinion,colors(race.headerOpinion.headerColor).ink)}]]:[]),
  ...(race.choices.length?race.choices.map(choice=>[pdfChoice(choice)]):[[{text:'No recommendations',fontSize:10.5,color:'#536777'}]])
 ];
 return {table:{widths:['*'],headerRows:1,body},layout:{
  hLineWidth:index=>index===0?0:.6,vLineWidth:()=>0,hLineColor:()=>'#ffffff',
  paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>4,paddingBottom:()=>4
 },margin:[0,0,0,6]};
}
async function measureRaces(engine,sides){
 const positions=new Map(),races=sides.flatMap(side=>side.columns.flat());
 const marker=id=>({id,text:' ',fontSize:.01,lineHeight:1,margin:0});
 const doc={
  pageSize:{width:325,height:25000},pageMargins:[25,0,25,0],
  defaultStyle:{font:'Roboto',fontSize:10.5,color:'#18354f',lineHeight:1.08},
  content:races.flatMap((race,index)=>[marker('start-'+index),pdfRace(race),marker('end-'+index)]),
  pageBreakBefore:node=>{if(node.id)positions.set(node.id,node.startPosition);return false;}
 };
 await engine.createPdf(doc).getBlob();
 const heights=new Map();
 races.forEach((race,index)=>{const a=positions.get('start-'+index),b=positions.get('end-'+index);heights.set(race.id,a&&b&&a.pageNumber===b.pageNumber?b.top-a.top:Infinity);});
 return heights;
}
function paginateSides(sides,heights){
 const pages=[];
 for(const side of sides){
  const columns=[[]];let height=0;
  for(const race of side.columns.flat()){
   const next=heights.get(race.id)+2;
   if(!Number.isFinite(next)||next>689)return null;
   if(height+next>689&&columns.at(-1).length){columns.push([]);height=0;}
   columns.at(-1).push(race);height+=next;
  }
  for(let index=0;index<columns.length;index+=2)pages.push({label:side.label,continued:index>0,columns:[columns[index],columns[index+1]||[]]});
 }
 return pages;
}
function definition(state,pages,onPageCount,{flow=false,frontPages=null}={}){
 return {
  pageSize:'LETTER',pageMargins:[25,62,25,31],
  info:{title:'Ballot with Recommendations',subject:state.areaLabel,creator:'What’s on my ballot · B.7H'},
  defaultStyle:{font:'Roboto',fontSize:10.5,color:'#18354f',lineHeight:1.08},
  header:page=>{
   const entry=flow?{label:frontPages!==null&&page>frontPages?'Back':pages[0].label,continued:page!==1&&page!==frontPages+1}:pages[page-1]||pages.at(-1);
   return {stack:[
    {columns:[{text:'Ballot with Recommendations',fontSize:16,bold:true},{text:entry.label+(entry.continued?' · continued':''),alignment:'right',width:115,fontSize:12,bold:true}]},
    {text:state.areaLabel,fontSize:10.5,margin:[0,4,0,0]},
    {canvas:[{type:'line',x1:0,y1:0,x2:562,y2:0,lineWidth:1,lineColor:'#244459'}],margin:[0,7,0,0]}
   ],margin:[25,18,25,0]};
  },
  footer:(page,count)=>{
   onPageCount(count);
   return {columns:[{text:'Recommendation guide · Fictional sample',alignment:'left'},{text:page+' / '+count,alignment:'right'}],margin:[25,7,25,0],fontSize:9,color:'#526777'};
  },
  content:pages.map((page,index)=>({
   ...(index?{pageBreak:'before'}:{}),
   ...(flow?{stack:page.columns.flat().map(pdfRace)}:{columns:page.columns.map(races=>({width:'*',stack:races.length?races.map(pdfRace):[{text:''}]})),columnGap:12})
  }))
 };
}
export async function makeBallotPdf(options){
 const state=snapshot(options),sides=paperSides(state);
 const {engine,ranges}=await library();
 const noteStrings=note=>note?[note.opinion,note.author,note.sourceUrl]:[];
 const strings=[state.areaLabel,...sides.flatMap(side=>side.columns.flatMap(column=>column.flatMap(race=>[
  race.title,race.category,race.instruction,...noteStrings(race.headerOpinion),
  ...race.choices.flatMap(choice=>[choice.label,...noteStrings(choice)])
 ])))];
 checkText(strings,ranges);
 // Measure real PDF text before assigning page-by-page reading order.
 // Exceptionally long edited sections use one flowing column, never clipped type.
 const heights=await measureRaces(engine,sides),pages=paginateSides(sides,heights);
 let pageCount=0,blob;
 if(pages)blob=await engine.createPdf(definition(state,pages,count=>pageCount=count)).getBlob();
 if(!pages||pageCount!==pages.length){
  let frontPages=0;
  await engine.createPdf(definition(state,[sides[0]],count=>frontPages=count,{flow:true})).getBlob();
  blob=await engine.createPdf(definition(state,sides,count=>pageCount=count,{flow:true,frontPages})).getBlob();
 }
 if(pageCount>80){const error=Error('This PDF has more than 80 pages. Use Print my Guide for this large guide.');error.code='PDF_TOO_LONG';throw error;}
 return {blob,filename:'ballot-with-recommendations.pdf',pageCount,pageSize:'LETTER',fontSize:10.5};
}
export async function downloadBallotPdf(options){
 const result=await makeBallotPdf(options),url=URL.createObjectURL(result.blob),link=document.createElement('a');
 link.href=url;link.download=result.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 return result;
}
function sourceLink(value){
 try{const url=new URL(value);return url.protocol==='https:'?'<a href="'+esc(url.href)+'">Source: '+esc(url.hostname)+'</a>':'';}catch{return '';}
}
function printChoice(choice){
 const color=colors(choice.color);
 return '<div class="b-print-choice" data-print-choice="'+esc(choice.id)+'" style="--print-ink:'+color.ink+';--print-tint:'+color.tint+'"><div class="b-print-choice-top"><span class="b-print-mark">'+guideChoiceSymbol(choice.mark)+'</span><div><span class="b-print-kind">'+(choice.mark==='this'?'Recommended':'Optional')+'</span><strong>'+esc(choice.label)+'</strong></div></div>'+
 (choice.opinion.trim()?'<div class="b-print-opinion"><span class="b-print-author">Opinion'+(choice.author?' · '+esc(choice.author):'')+'</span><p>'+esc(choice.opinion)+'</p>'+sourceLink(choice.sourceUrl)+'</div>':'')+'</div>';
}
export function prepareGuidePrint(options){
 const state=snapshot(options);
 let root=document.querySelector('#b-guide-print');
 if(!root){root=document.createElement('article');root.id='b-guide-print';document.body.append(root);}
 root.setAttribute('aria-hidden','true');
 root.innerHTML='<header class="b-print-heading"><h1>My Guide</h1><p>'+esc(state.areaLabel)+'</p></header><div class="b-print-groups">'+
 (state.groups.length?state.groups.map(group=>'<table class="b-print-group" role="presentation" data-print-category="'+esc(group.category)+'"><thead><tr><td><h2>'+esc(group.label)+'</h2></td></tr></thead><tbody><tr><td><div class="b-print-columns">'+group.sections.map(section=>section.contests.map(race=>'<section class="b-print-race" data-print-race="'+esc(race.id)+'"><div class="b-print-leading"><h3>'+esc(contextualTitle(race.title,section.title))+'</h3>'+printChoice(race.choices[0])+'</div>'+race.choices.slice(1).map(printChoice).join('')+'</section>').join('')).join('')+'</div></td></tr></tbody></table>').join(''):'<p>No recommendations have been added to this guide.</p>')+'</div>';
 document.body.dataset.guidePrint='ready';
 return root;
}
export async function printGuide(options){
 prepareGuidePrint(options);
 if(document.fonts?.ready)await document.fonts.ready;
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 window.addEventListener('afterprint',()=>{delete document.body.dataset.guidePrint;},{once:true});
 window.print();
}
