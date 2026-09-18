import{projectGuide,outputFilename}from'./guide-output.js';
import{printGuideHTML,printPageStyle}from'./guide-view.js';
import{generateBallotPdf}from'./pdf-client.js';
import{APP_VERSION}from'../../../version.js';
export function createOutputController({getSession,onError}){
 let job=null,printing=false,printFocus=null,lastStatus='',urls=new Set();
 const root=document.createElement('div');root.className='print-root';root.id='print-root';document.body.append(root);
 function refresh(){
  for(const button of document.querySelectorAll('[data-action=ballot-pdf],[data-action=print-guide]'))button.disabled=Boolean(job||printing);
  for(const el of document.querySelectorAll('.output-status')){
   el.replaceChildren(document.createTextNode(lastStatus));
   if(job){const cancel=document.createElement('button');cancel.type='button';cancel.className='output-cancel quiet';cancel.dataset.action='cancel-output';cancel.textContent='Cancel';el.append(cancel);}
  }
 }
 function status(value){lastStatus=value;refresh();}
 const snapshot=()=>{const s=getSession();return projectGuide(s.model,s.preferences.selection);};
 async function pdf(){
  if(job||printing)return;const saved=snapshot(),controller=new AbortController();job=controller;
  status('Preparing PDF — '+(saved.guide?.title||'No opinion guide')+'…');
  try{
   const blob=await generateBallotPdf(saved,{signal:controller.signal,onProgress:status});if(controller.signal.aborted)return;
   const url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download=outputFilename(saved,new Date(),APP_VERSION);a.click();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},30000);
   lastStatus='PDF downloaded — '+(saved.guide?.title||'No opinion guide')+'.';
  }catch(error){if(error.name==='AbortError')lastStatus='PDF cancelled.';else{lastStatus='PDF could not be created. Try again.';onError('Could not create the PDF',error.message+'\nYour saved guide is unchanged. Reload the page and try again.');}}
  finally{if(job===controller)job=null;refresh();}
 }
 function preparePrint(saved=snapshot()){root.innerHTML=printGuideHTML(saved);const style=document.createElement("style");style.textContent=printPageStyle(saved);root.append(style);root.dataset.revision=saved.revision;root.dataset.guide=saved.guide?.id||'';root.dataset.collection=saved.collectionId;}
 function finishPrint(){printing=false;root.replaceChildren();lastStatus='';refresh();if(printFocus?.isConnected)printFocus.focus({preventScroll:true});}
 function print(){
  if(job||printing)return;printFocus=document.activeElement;preparePrint();printing=true;status('Opening the print dialog…');
  try{window.print();}catch(error){finishPrint();onError('Could not open printing','Use your browser’s Print command, or try another browser. '+error.message);}
 }
 const beforePrint=()=>{if(!printing&&getSession()?.preferences.selection?.ballotId){printFocus=document.activeElement;preparePrint();printing=true;refresh();}},afterPrint=()=>finishPrint();
 window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 const media=matchMedia('print');media.addEventListener('change',event=>{if(!event.matches&&printing)finishPrint();});
 window.addEventListener('pagehide',()=>{job?.abort();for(const url of urls)URL.revokeObjectURL(url);urls.clear();});
 return{refresh,pdf,print,cancel(){job?.abort();},preparePrint};
}
