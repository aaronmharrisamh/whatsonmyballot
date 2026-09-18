import{CollectionError}from'./collection-errors.js';
import{normalizeCollection}from'./collection-model.js';
import{createAttachmentResolver}from'./attachments.js';
// One isolated worker per operation keeps parsing and compression off the UI thread.
// Cancellation terminates it; no operation reads/writes storage or changes active UI state.
export function collectionOperation(operation,input,{signal,onProgress,...options}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Operation cancelled.','AbortError'));return;}
  const worker=new Worker(new URL('./collection-worker.js',import.meta.url),{type:'module'});
  const close=()=>{signal?.removeEventListener('abort',cancel);worker.terminate();};
  const cancel=()=>{close();reject(new DOMException('Operation cancelled.','AbortError'));};
  signal?.addEventListener('abort',cancel,{once:true});
  worker.onmessage=({data})=>{
   if(data.type==='progress'){onProgress?.(data.progress);return;}
   close();
   if(data.type==='error'){
    const e=data.error.diagnostics?new CollectionError(data.error.diagnostics):Object.assign(new Error(data.error.message),{name:data.error.name});
    reject(e);
   }else resolve(data.result);
  };
  worker.onerror=()=>{close();reject(new Error('The collection worker could not run. Serve the app over HTTP(S) in a current browser.'));};
  try{worker.postMessage({operation,input,options});}catch(error){close();reject(error);}
 });
}
export async function loadCollectionInWorker(input,options){
 const result=await collectionOperation('validate',input,options),model=normalizeCollection(result.value);
 return{model,stats:result.stats,resources:createAttachmentResolver(model.value,result.bytesById)};
}
