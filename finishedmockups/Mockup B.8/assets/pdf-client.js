import{ballotPdfContent}from'./pdf-layout.js';
let coveragePromise;
const coverage=()=>coveragePromise||(coveragePromise=fetch(new URL('./vendor/pdf/roboto-coverage.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('The bundled PDF fonts did not load. Reload the page and try again.');return r.json();}).catch(e=>{coveragePromise=null;throw e;}));
const abortError=()=>new DOMException('PDF generation cancelled.','AbortError');
function systemTextLines(value,width,size,bold,color){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('This browser cannot render the text needed for this PDF. Try a current browser.');
 const font=(bold?'700 ':'400 ')+size+'px "Segoe UI", Arial, sans-serif';ctx.font=font;
 const segments=new Intl.Segmenter(undefined,{granularity:'grapheme'}),lines=[];
 for(const paragraph of value.split('\n')){let line='';for(const {segment} of segments.segment(paragraph)){if(line&&ctx.measureText(line+segment).width>width-3){lines.push(line);line='';}line+=segment;}lines.push(line);}
 return lines.map(line=>{const scale=4,height=Math.ceil(size*1.5);canvas.width=Math.ceil(width*scale);canvas.height=height*scale;ctx.scale(scale,scale);ctx.font=font;ctx.fillStyle=color||'#203a50';ctx.textBaseline='alphabetic';ctx.direction=/[\u0590-\u08ff]/.test(line)?'rtl':'ltr';ctx.textAlign=ctx.direction==='rtl'?'right':'left';ctx.fillText(line,ctx.direction==='rtl'?width-2:1,size*1.15);return{image:canvas.toDataURL('image/png'),width,height};});
}
async function prepareContent(snapshot,{signal,onProgress}){
 const content=ballotPdfContent(snapshot),ranges=await coverage(),supported=text=>Array.from(text).every(ch=>ch==='\n'||ch==='\t'||ranges.some(([a,b])=>ch.codePointAt(0)>=a&&ch.codePointAt(0)<=b));let count=0;
 async function walk(node){
  if(signal?.aborted)throw abortError();if(!node||typeof node!=='object')return;
  if(node.table)delete node.layout; // Functions are recreated locally in the worker.
  if(typeof node.text==='string'&&!supported(node.text)){
   const value=node.text;delete node.text;node.stack=systemTextLines(value,node.fallbackWidth||510,node.fontSize||12,node.bold,node.color);
  }
  delete node.fallbackWidth;
  for(const value of Object.values(node)){if(Array.isArray(value)){for(const item of value)await walk(item);}else if(value&&typeof value==='object')await walk(value);}
  if(++count%100===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 onProgress?.('Preparing the saved guide…');await walk(content);return content;
}
export async function generateBallotPdf(snapshot,{signal,onProgress}={}){
 const content=await prepareContent(snapshot,{signal,onProgress});if(signal?.aborted)throw abortError();
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./pdf-worker.js',import.meta.url));let settled=false;
  const done=(error,result)=>{if(settled)return;settled=true;worker.terminate();signal?.removeEventListener('abort',cancel);error?reject(error):resolve(result);};
  const cancel=()=>done(abortError());signal?.addEventListener('abort',cancel,{once:true});
  worker.onmessage=({data})=>{if(data.stage)onProgress?.(data.stage);else if(data.error)done(Error(data.error));else if(data.bytes)done(null,new Blob([data.bytes],{type:'application/pdf'}));};
  worker.onerror=()=>done(Error('The local PDF engine could not finish. Reload the page and try again.'));
  worker.postMessage({snapshot,content});
 });
}
