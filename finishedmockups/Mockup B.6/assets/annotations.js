// Guide marks are editor data. They never fill or limit a visitor's choices.
export const COLORS=['blue','green','red','yellow','orange','gray'];
export const MARKS=['none','this','or'];
const copy=v=>structuredClone(v);
export function createAnnotationStore(original,storage,basePath){
 const key='whatsonmyballot:'+basePath+':'+original.datasetId+':annotations:v1';
 const ids=new Map(original.records.map(r=>[r.id,r]));
 let value=copy(original),serialized=null,warning='',unreadable=false;
 function validate(next){
  if(!next||Array.isArray(next)||Object.keys(next).sort().join()!==Object.keys(original).sort().join()||
   next.format!=='whatsonmyballot-guide-annotations'||next.schemaVersion!=='1.0.0'||next.datasetId!==original.datasetId||
   !Number.isSafeInteger(next.revision)||next.revision<0||!Array.isArray(next.records)||next.records.length!==ids.size)
   throw Error('Use a matching guide marks file with schema 1.0.0.');
  const seen=new Set();
  for(const r of next.records){
   const base=ids.get(r?.id);
   if(!base||seen.has(r.id)||Object.keys(r).sort().join()!==Object.keys(base).sort().join())throw Error('Unknown, missing, or repeated guide option.');
   seen.add(r.id);
   for(const k of ['kind','raceId','label'])if(r[k]!==base[k])throw Error('Guide option identities cannot change.');
   if(!MARKS.includes(r.mark)||!COLORS.includes(r.color))throw Error('Choose None, THIS, or OR and a listed color.');
  }
  return next;
 }
 validate(original);
 function load(){
  warning='';unreadable=false;
  try{serialized=storage?.getItem(key)||null;value=serialized?copy(validate(JSON.parse(serialized))):copy(original);}
  catch{value=copy(original);unreadable=true;warning='Saved guide marks could not be read. Export the saved file before restoring the original.';}
  return copy(value);
 }
 const values=(id,baseline=false)=>{const r=(baseline?original:value).records.find(r=>r.id===id);if(!r)throw Error('Unknown guide option.');return{mark:r.mark,color:r.color};};
 const proposed=(id,changes)=>{const next=copy(value),r=next.records.find(r=>r.id===id);if(!r)throw Error('Unknown guide option.');Object.assign(r,changes);return validate(next);};
 function recoveries(){
  const out=[];try{for(let i=0;i<storage.length;i++){
   const k=storage.key(i);if(!k.startsWith(key+':draft:'))continue;
   try{const r=JSON.parse(storage.getItem(k));
    if(r.format!=='whatsonmyballot-annotation-draft'||r.schemaVersion!=='1.0.0'||!ids.has(r.id)||!Number.isSafeInteger(r.revision)||r.revision<0)continue;
    if(!r.values||Object.keys(r.values).sort().join()!=='color,mark')continue;
    proposed(r.id,r.values);out.push({...r,owner:k.slice((key+':draft:').length),matching:r.revision===value.revision&&!unreadable});
   }catch{}
  }}catch{}return out;
 }
 return {key,original:copy(original),validate,load,values,proposed,recoveries,
  get:id=>copy(value.records.find(r=>r.id===id)||null),
  get value(){return copy(value);},get warning(){return warning;},get unreadable(){return unreadable;},
  get raw(){return serialized;},
  async commit(next,expected,{replaceUnreadable=false}={}){
   const run=()=>{
    if(!storage)throw Error('Browser saving is unavailable. Export your draft to keep a copy.');
    if(unreadable&&!replaceUnreadable)throw Error('Export the unreadable saved file, then use Restore original guide marks.');
    if(storage.getItem(key)!==serialized||expected!==value.revision)throw Error('Guide marks changed in another tab. Export your draft, then reload saved marks.');
    const checked=copy(validate({...next,revision:expected+1})),text=JSON.stringify(checked);
    storage.setItem(key,text);value=checked;serialized=text;warning='';unreadable=false;return copy(value);
   };
   return globalThis.navigator?.locks?globalThis.navigator.locks.request(key,run):run();
  },
  saveRecovery(draft,owner){try{if(!storage)return false;storage.setItem(key+':draft:'+owner,JSON.stringify({format:'whatsonmyballot-annotation-draft',schemaVersion:'1.0.0',id:draft.id,revision:draft.annotationRevision,values:draft.values}));return true;}catch{return false;}},
  clearRecovery(owner){try{storage?.removeItem(key+':draft:'+owner);}catch{}}
 };
}
