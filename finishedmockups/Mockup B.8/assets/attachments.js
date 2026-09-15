import{LIMITS,MEDIA_TYPES,fail,CollectionError}from'./collection-errors.js';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const abort=signal=>{if(signal?.aborted)throw new DOMException('Operation cancelled.','AbortError');};
function issue(item,path,message){fail('JSN-E08',{path,recordId:item?.id,message});}
export async function readBounded(stream,limit,{signal,onProgress}={}){
 const reader=stream.getReader(),chunks=[];let total=0;
 const cancel=()=>{reader.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
 try{abort(signal);while(true){const {done,value}=await reader.read();abort(signal);if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();fail('JSN-E09',{message:'Expanded or encoded data exceeds its byte limit.',limitBytes:limit,actualBytes:total});}chunks.push(value);onProgress?.(total);}
  const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
 }finally{signal?.removeEventListener('abort',cancel);reader.releaseLock();}
}
export function gzipSupported(){try{return Boolean(new CompressionStream('gzip')&&new DecompressionStream('gzip')&&globalThis.crypto?.subtle);}catch{return false;}}
function compression(bytes,decode){if(!gzipSupported())throw Error('This browser needs gzip stream and SHA-256 support. Use a current browser to open attachments.');return new Blob([bytes]).stream().pipeThrough(decode?new DecompressionStream('gzip'):new CompressionStream('gzip'));}
function base64(bytes){let binary='';for(let i=0;i<bytes.length;i+=24576)binary+=String.fromCharCode(...bytes.subarray(i,i+24576));return btoa(binary);}
function unbase64(item,path){
 if(typeof item.data!=='string'||item.data.length%4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.data))issue(item,path,'Attachment base64 is malformed.');
 let binary;try{binary=atob(item.data);}catch{issue(item,path,'Attachment base64 could not be decoded.');}
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(base64(bytes)!==item.data)issue(item,path,'Use canonical base64 without extra bits or whitespace.');return bytes;
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function checkMedia(item,bytes,path=''){
 const t=item.mediaType,has=(offset,...signature)=>signature.every((v,i)=>bytes[offset+i]===v),ascii=(at,n)=>String.fromCharCode(...bytes.subarray(at,at+n));
 if(!MEDIA_TYPES.includes(t))issue(item,path,'This attachment type is not supported.');
 let valid=false;
 if(t==='application/pdf')valid=ascii(0,5)==='%PDF-'&&new TextDecoder().decode(bytes.subarray(Math.max(0,bytes.length-1024))).includes('%%EOF');
 if(t==='image/png')valid=bytes.length>=33&&has(0,137,80,78,71,13,10,26,10)&&ascii(12,4)==='IHDR'&&ascii(bytes.length-8,4)==='IEND';
 if(t==='image/jpeg')valid=bytes.length>4&&has(0,255,216,255)&&has(bytes.length-2,255,217);
 if(t==='image/webp')valid=bytes.length>=20&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'&&['VP8 ','VP8L','VP8X'].includes(ascii(12,4))&&new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true)+8===bytes.length;
 if(t==='text/plain'||t==='text/markdown'){try{const text=decoder.decode(bytes);valid=!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)&&!/<\s*(?:script|iframe|object|embed|html|svg)\b/i.test(text);}catch{valid=false;}}
 if(!valid)issue(item,path,'Attachment bytes do not match the declared resource type or supported document format.');
}
export async function decodeAttachment(item,{maxBytes=LIMITS.expandedBytes,signal,onProgress,path='/attachments/items'}={}){
 abort(signal);if(item.rawBytes>maxBytes)fail('JSN-E09',{path,recordId:item.id,actualBytes:item.rawBytes,limitBytes:maxBytes});
 const zipped=unbase64(item,path+'/data');if(zipped.length!==item.gzipBytes)issue(item,path+'/gzipBytes','Compressed byte count does not match the payload.');
 let bytes;try{bytes=await readBounded(compression(zipped,true),maxBytes,{signal,onProgress});}
 catch(error){if(error instanceof CollectionError||error.name==='AbortError'||!gzipSupported())throw error;issue(item,path+'/data','Gzip data is corrupt, incomplete, or contains trailing data.');}
 if(bytes.length!==item.rawBytes)issue(item,path+'/rawBytes','Uncompressed byte count does not match the file.');
 if(await sha256(bytes)!==item.sha256)issue(item,path+'/sha256','Attachment SHA-256 does not match the file.');abort(signal);checkMedia(item,bytes,path+'/mediaType');return bytes;
}
export async function encodeAttachment(input,{id,fileName,mediaType,signal}){
 const bytes=input instanceof Blob?await readBounded(input.stream(),LIMITS.expandedBytes,{signal}):new Uint8Array(input);
 abort(signal);if(bytes.length>LIMITS.expandedBytes)fail('JSN-E09');const item={id,fileName,mediaType};
 checkMedia(item,bytes);const zipped=await readBounded(compression(bytes,false),LIMITS.fileBytes,{signal});
 return{...item,gzipBytes:zipped.length,rawBytes:bytes.length,sha256:await sha256(bytes),data:base64(zipped)};
}
export function contentBytes(collection){
 const {attachments,...rest}=collection;
 return encoder.encode(JSON.stringify({...rest,attachments:{...attachments,items:attachments.items.map(({data,...metadata})=>metadata)}})).length;
}
export async function decodeAttachments(collection,{signal,onProgress}={}){
 const bytesById=new Map(),baseBytes=contentBytes(collection);let expandedBytes=baseBytes;
 if(expandedBytes>LIMITS.expandedBytes)fail('JSN-E09',{actualBytes:expandedBytes,limitBytes:LIMITS.expandedBytes});
 for(const [i,item]of collection.attachments.items.entries()){
  const bytes=await decodeAttachment(item,{maxBytes:LIMITS.expandedBytes-expandedBytes,signal,path:'/attachments/items/'+i,onProgress:n=>onProgress?.({stage:'attachments',itemId:item.id,index:i,total:collection.attachments.items.length,expandedBytes:expandedBytes+n})});
  expandedBytes+=bytes.length;bytesById.set(item.id,bytes);
 }
 return{bytesById,expandedBytes,contentBytes:baseBytes};
}
export function createAttachmentResolver(collection,bytesById,{urlApi=URL}={}){
 const items=new Map(collection.attachments.items.map(a=>[a.id,a])),urls=new Map();let disposed=false;
 const get=id=>{if(disposed)throw Error('Attachment resolver is disposed.');const item=items.get(id),bytes=bytesById.get(id);if(!item||!bytes)throw Error('Attachment not loaded: '+id);return{item,bytes};};
 return{
  blob(id){const {item,bytes}=get(id);return new Blob([bytes],{type:item.mediaType});},
  url(id){get(id);if(!urls.has(id))urls.set(id,urlApi.createObjectURL(this.blob(id)));return urls.get(id);},
  bytes(id){return get(id).bytes.slice();},
  release(id){if(urls.has(id)){urlApi.revokeObjectURL(urls.get(id));urls.delete(id);}},
  dispose(){for(const url of urls.values())urlApi.revokeObjectURL(url);urls.clear();bytesById.clear();disposed=true;}
 };
}
