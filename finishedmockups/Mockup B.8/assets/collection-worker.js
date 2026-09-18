import{parseCollection,exportCollection}from'./collection-contract.js';
import{encodeAttachment}from'./attachments.js';
self.onmessage=async({data:{operation,input,options={}}})=>{
 try{
  if(operation==='validate'){
   const result=await parseCollection(input,{...options,onProgress:progress=>self.postMessage({type:'progress',progress})});
   self.postMessage({type:'result',result},[...result.bytesById.values()].map(bytes=>bytes.buffer));
  }else if(operation==='export')self.postMessage({type:'result',result:await exportCollection(input,options)});
  else if(operation==='encode')self.postMessage({type:'result',result:await encodeAttachment(input,options)});
  else throw Error('Unknown collection operation.');
 }catch(error){self.postMessage({type:'error',error:{name:error.name,message:error.message,diagnostics:error.diagnostics}});}
};
