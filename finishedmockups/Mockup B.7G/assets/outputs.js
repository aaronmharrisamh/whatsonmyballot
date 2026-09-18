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
   columns[column].push({id,title:contextualTitle(text(race.officialTitle),category),instruction:text(race.officialSelectionInstruction),category,choices:entries.get(id)||[]});
  }
  return {label:index?'Back':'Front',columns};
 });
 if(content.contests.some(race=>!seen.has(race.id)))throw Error('Some sections do not have a PDF page. Use Print my Guide for the complete guide.');
 return sides;
}
function oval(choice){
 const ink=colors(choice.color).ink;
 const arrow='<path d="M10 0h8v8h5L14 18 5 8h5Z" fill="'+ink+'"/>';
 const optional='<text x="14" y="14" text-anchor="middle" font-family="Roboto" font-size="17" font-weight="bold" fill="'+ink+'">OR</text>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34">'+(choice.mark==='this'?arrow:optional)+'<ellipse cx="14" cy="26" rx="11" ry="6" fill="white" stroke="'+ink+'" stroke-width="1.4"/></svg>';
}
function pdfChoice(choice,size){
 const color=colors(choice.color);
 return {table:{widths:[19,'*'],body:[[
  {svg:oval(choice),width:18,margin:[0,0,0,0],border:[false,false,false,false]},
  {text:choice.label,bold:true,fontSize:size,margin:[0,2,0,0],border:[false,false,false,false]}
 ]]},layout:{fillColor:()=>color.tint,paddingLeft:()=>3,paddingRight:()=>3,paddingTop:()=>2,paddingBottom:()=>2},margin:[0,0,0,2]};
}
function pdfRace(race,size){
 const body=[
  [{text:race.title,fontSize:size,bold:true,lineHeight:1.02,color:'#ffffff',fillColor:'#244459'}],
  [{stack:[
   ...(race.instruction?[{text:race.instruction,fontSize:10.5,color:'#526572',margin:[0,0,0,2]}]:[]),
   ...(race.choices.length?race.choices.map(choice=>pdfChoice(choice,size)):[{text:'No recommendations',fontSize:10.5,color:'#536777',margin:[0,3,0,4]}])
  ]}]
 ];
 return {table:{widths:['*'],dontBreakRows:true,keepWithHeaderRows:1,headerRows:1,body},layout:{
  hLineWidth:()=>.5,vLineWidth:()=>.5,hLineColor:()=>'#c5d0d7',vLineColor:()=>'#c5d0d7',
  paddingLeft:()=>5,paddingRight:()=>5,paddingTop:row=>row===0?3:1,paddingBottom:row=>row===0?1:3
 },margin:[0,0,0,4]};
}
function balancedColumns(side,size){
 // Keep source order and Front/Back membership, but balance the printable columns.
 // Source columns have very different heights once unmarked options are removed.
 const races=side.columns.flat();if(races.length<3)return races.map(race=>[race]).concat(Array.from({length:3-races.length},()=>[]));
 const context=document.createElement('canvas').getContext('2d');
 const lineCount=(value,width,font)=>{context.font=font;let lines=1,line='';for(const word of String(value).split(/\s+/)){const next=line?line+' '+word:word;if(context.measureText(next).width>width&&line){lines++;line=word;}else line=next;}return lines;};
 const heights=races.map(race=>{const title=lineCount(race.title,162,'bold '+size+'px Arial')*size*1.28;const rule=lineCount(race.instruction,162,'10.5px Arial')*13;const choices=race.choices.reduce((total,choice)=>total+Math.max(22,lineCount(choice.label,131,'bold '+size+'px Arial')*size*1.28)+6,0);return title+rule+choices+15;});
 const prefix=[0];for(const height of heights)prefix.push(prefix.at(-1)+height);
 let best={score:Infinity,cuts:[1,2]};for(let first=1;first<races.length-1;first++)for(let second=first+1;second<races.length;second++){const values=[prefix[first],prefix[second]-prefix[first],prefix.at(-1)-prefix[second]],score=Math.max(...values)+.015*(Math.max(...values)-Math.min(...values));if(score<best.score)best={score,cuts:[first,second]};}
 const [first,second]=best.cuts;return [races.slice(0,first),races.slice(first,second),races.slice(second)];
}
function definition(state,sides,size,pageSize,onPageCount){
 return {
  pageSize,pageMargins:[25,28,25,30],
  info:{title:'Ballot with Recommendations',subject:state.areaLabel,creator:'What’s on my ballot · B.7G'},
  defaultStyle:{font:'Roboto',fontSize:size,color:'#18354f',lineHeight:1.05},
  footer:(page,count)=>{
   onPageCount(count);
   return {columns:[{text:'Recommendation guide · Fictional sample',alignment:'left'},{text:page+' / '+count,alignment:'right'}],margin:[25,7,25,0],fontSize:9,color:'#526777'};
  },
  content:sides.map((side,index)=>({
   ...(index?{pageBreak:'before'}:{}),
   stack:[
    {columns:[{text:'Ballot with Recommendations',fontSize:17,bold:true},{text:side.label,fontSize:17,bold:true,alignment:'right',width:62}],margin:[0,0,0,5]},
    {text:state.areaLabel,fontSize:11,margin:[0,0,0,4]},
    {text:'Arrows show recommendations. OR shows another option. Empty ovals are for practice.',fontSize:10.5,color:'#526572',margin:[0,0,0,3]},
    {canvas:[{type:'line',x1:0,y1:0,x2:562,y2:0,lineWidth:1.2,lineColor:'#244459'}],margin:[0,0,0,3]},
    {columns:balancedColumns(side,size).map(races=>({width:'*',stack:races.length?races.map((race,index)=>pdfRace(race,size,index===0||race.category!==races[index-1].category)):[{text:'',fontSize:size}]})),columnGap:10}
   ]
  }))
 };
}
export async function makeBallotPdf(options){
 const state=snapshot(options),sides=paperSides(state);
 const {engine,ranges}=await library();
 const strings=[state.areaLabel,...sides.flatMap(side=>side.columns.flatMap(column=>column.flatMap(race=>[race.title,race.category,race.instruction,...race.choices.map(choice=>choice.label)])))];
 checkText(strings,ranges);
 // Never crop or shrink to tiny type. The normal sample fits Letter; unusually
 // long edited names may use Legal. Longer data gets an honest print alternative.
 for(const pageSize of ['LETTER','LEGAL'])for(const fontSize of [11.5,11,10.5]){
  let pageCount=0;
  const pdf=engine.createPdf(definition(state,sides,fontSize,pageSize,count=>pageCount=count));
  const blob=await pdf.getBlob();
  if(pageCount===2)return {blob,filename:'ballot-with-recommendations.pdf',pageCount,pageSize,fontSize};
 }
 const error=Error('The guide is too long for two readable PDF pages. Use Print my Guide to include all recommendations, or shorten the edited names.');
 error.code='PDF_TOO_LONG';throw error;
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
