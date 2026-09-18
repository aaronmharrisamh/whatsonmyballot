// All records belong to this B.8 app path. Legacy databases are never opened.
export const DATABASE_NAME='whatsonmyballot:b8:'+new URL('../',import.meta.url).pathname;
const STORES=['meta','collections','preferences','personal','drafts'];
export class StorageError extends Error{constructor(message,cause){super(message,{cause});this.name='StorageError';}}
export class ConflictError extends Error{constructor(){super('This collection changed in another tab. Export your draft, then load the latest saved data.');this.name='ConflictError';}}
export const tokenOf=active=>active?{generation:active.generation,collectionId:active.collectionId,revision:active.revision}:null;
export function sameToken(a,b){return(!a&&!b)||Boolean(a&&b&&a.generation===b.generation&&a.collectionId===b.collectionId&&a.revision===b.revision);}
export function initialPreferences(value,autoActivate=false){return{selection:autoActivate?structuredClone(value.defaultSelection):null,district:structuredClone(value.defaultSelection),onlyRecommendations:true,sections:{}};}
const failure=e=>e instanceof ConflictError||e?.name==='AbortError'?e:new StorageError('Browser storage could not save this change. Your previous saved collection is still in place. Export your work or try again.',e);
export async function openCollectionStore({indexedDB=globalThis.indexedDB,name=DATABASE_NAME}={}){
 if(!indexedDB)throw new StorageError('Browser storage is unavailable.');
 const db=await new Promise((resolve,reject)=>{
  let ended=false;const request=indexedDB.open(name,1);
  request.onupgradeneeded=()=>{for(const store of STORES)request.result.createObjectStore(store);};
  request.onsuccess=()=>{if(ended)request.result.close();else{ended=true;resolve(request.result);}};
  request.onerror=()=>{ended=true;reject(failure(request.error));};
  request.onblocked=()=>{ended=true;reject(new StorageError('Close older B.8 tabs, then reload to open browser storage.'));};
 });
 db.onversionchange=()=>db.close();
 function transaction(mode,action,{signal}={}){
  return new Promise((resolve,reject)=>{
   if(signal?.aborted){reject(new DOMException('Operation cancelled.','AbortError'));return;}
   let tx,result,reason;
   try{tx=db.transaction(STORES,mode);}catch(e){reject(failure(e));return;}
   const stores=Object.fromEntries(STORES.map(n=>[n,tx.objectStore(n)]));
   const abort=()=>{reason=new DOMException('Operation cancelled.','AbortError');try{tx.abort();}catch{}};
   signal?.addEventListener('abort',abort,{once:true});
   tx.oncomplete=()=>{signal?.removeEventListener('abort',abort);resolve(result);};
   tx.onabort=()=>{signal?.removeEventListener('abort',abort);reject(failure(reason||tx.error));};
   tx.onerror=()=>{};
   const stop=e=>{reason=e;try{tx.abort();}catch{}};
   try{action(stores,value=>result=value,stop);}catch(e){stop(e);}
  });
 }
 function guarded(expected,action,options){
  return transaction('readwrite',(s,done,stop)=>{
   const request=s.meta.get('active');request.onsuccess=()=>{
    if(!sameToken(request.result,expected)){stop(new ConflictError());return;}
    try{action(s,request.result,done,stop);}catch(e){stop(e);}
   };
  },options);
 }
 return{
  durable:true,name,close:()=>db.close(),
  async read(){
   return transaction('readonly',(s,done)=>{
    const r=s.meta.get('active');r.onsuccess=()=>{
     if(!r.result){done(null);return;}const active=r.result,result={active};
     const tasks=[['collection',s.collections.get(active.generation)],['preferences',s.preferences.get(active.generation)],['personal',s.personal.getAll()],['drafts',s.drafts.getAll()]];
     let left=tasks.length;for(const[key,q]of tasks)q.onsuccess=()=>{result[key]=q.result;if(--left===0)done(result);};
    };
   });
  },
  async replace(value,stats,expected,{signal,autoActivate=false}={}){
   const generation=crypto.randomUUID(),active={generation,collectionId:value.collectionId,revision:value.revision};
   return guarded(expected,(s,old,done)=>{
    // Deletion and the pointer switch are one transaction; abort restores the old generation.
    for(const name of STORES)s[name].clear();
    s.collections.put({baseline:value,working:value,stats,createdAt:new Date().toISOString()},generation);
    s.preferences.put(initialPreferences(value,autoActivate),generation);s.meta.put(active,'active');done(active);
   },{signal});
  },
  async save(value,stats,expected,{draftId,signal,preferences}={}){
   if(value.collectionId!==expected.collectionId||value.revision!==expected.revision+1)throw new ConflictError();
   return guarded(expected,(s,active,done,stop)=>{
    const r=s.collections.get(active.generation);r.onsuccess=()=>{try{
     if(!r.result)throw new StorageError('The saved collection is missing.');
     s.collections.put({...r.result,working:value,stats},active.generation);
     const next={...active,revision:value.revision};s.meta.put(next,'active');if(preferences)s.preferences.put(preferences,active.generation);if(draftId)s.drafts.delete(draftId);done(next);
    }catch(e){stop(e);}};
   },{signal});
  },
  preferences(value,expected){return guarded(expected,(s,a,done)=>{s.preferences.put(value,a.generation);done(value);});},
  personal(ballotId,choices,expected){return guarded(expected,(s,a,done)=>{s.personal.put({generation:a.generation,ballotId,choices},a.generation+':'+ballotId);done(choices);});},
  clearPersonal(expected){return guarded(expected,(s,a,done)=>{s.personal.clear();done(true);});},
  draft(value,expected){return guarded(expected,(s,a,done)=>{s.drafts.put({...value,generation:a.generation,collectionId:a.collectionId,revision:a.revision},value.id);done(true);});},
  removeDraft(id,expected){return guarded(expected,(s,a,done)=>{s.drafts.delete(id);done(true);});}
 };
}
// Used only when the first-load demo cannot open/save IndexedDB. Import is refused.
export function createSessionStore(value,stats){
 const active={generation:crypto.randomUUID(),collectionId:value.collectionId,revision:value.revision};
 let snapshot={active,collection:{baseline:structuredClone(value),working:structuredClone(value),stats},preferences:initialPreferences(value,true),personal:[],drafts:[]};
 const check=expected=>{if(!sameToken(snapshot.active,expected))throw new ConflictError();};
 return{
  durable:false,name:DATABASE_NAME+':session:'+active.generation,close(){},read:async()=>structuredClone(snapshot),
  replace:async()=>{throw new StorageError('Import needs browser storage. The current demo is running only in this tab. Export any edits before closing it.');},
  save:async(v,stats,expected,{draftId,preferences}={})=>{check(expected);if(v.revision!==expected.revision+1)throw new ConflictError();snapshot.collection.working=structuredClone(v);snapshot.collection.stats=stats;if(preferences)snapshot.preferences=structuredClone(preferences);snapshot.active.revision=v.revision;snapshot.drafts=snapshot.drafts.filter(d=>d.id!==draftId);return structuredClone(snapshot.active);},
  preferences:async(v,e)=>{check(e);snapshot.preferences=structuredClone(v);return v;},
  personal:async(ballotId,choices,e)=>{check(e);snapshot.personal=snapshot.personal.filter(p=>p.ballotId!==ballotId);snapshot.personal.push({generation:e.generation,ballotId,choices:structuredClone(choices)});},
  clearPersonal:async e=>{check(e);snapshot.personal=[];},
  draft:async(v,e)=>{check(e);snapshot.drafts=snapshot.drafts.filter(d=>d.id!==v.id);snapshot.drafts.push({...structuredClone(v),...e});},
  removeDraft:async(id,e)=>{check(e);snapshot.drafts=snapshot.drafts.filter(d=>d.id!==id);}
 };
}
