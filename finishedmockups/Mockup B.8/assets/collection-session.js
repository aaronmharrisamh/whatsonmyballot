import{openCollectionStore,createSessionStore,tokenOf,initialPreferences,ConflictError}from'./collection-store.js';
import{loadCollectionInWorker,collectionOperation}from'./collection-client.js';
export const DEMO_URL=new URL('../data/demo.collection.json',import.meta.url);
export const BLUEPRINT_URL=new URL('../../../sharedrefs/mockup-b.8/SCHEMASAMPLE.JSON',import.meta.url);
export const serialized=value=>new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});
export function validPreferences(model,preferences){
 const v=model.value,p=structuredClone(preferences||initialPreferences(v));
 const selection=s=>{if(!s)return null;const a=v.areas.find(a=>a.id===s.areaId)||model.get(v.defaultSelection.areaId),ballots=model.ballotsFor(a.id),b=ballots.find(b=>b.id===s.ballotId)||ballots[0],guides=b?model.guidesFor(b.id):[],g=guides.find(g=>g.id===s.guideId)||guides[0];return{areaId:a.id,ballotId:b?.id||null,guideId:g?.id||null};};
 return{selection:selection(p.selection),district:selection(p.district||v.defaultSelection),onlyRecommendations:p.onlyRecommendations!==false,opinionGuideVisible:p.opinionGuideVisible!==false,sections:Object.fromEntries(v.ballots.map(b=>[b.id,Math.max(0,Math.min(b.contests.length-1,Number.isInteger(p.sections?.[b.id])?p.sections[b.id]:0))]))};
}
export class CollectionSession extends EventTarget{
 constructor(store){super();this.store=store;this.id=crypto.randomUUID();this.stale=false;
  try{this.channel=new BroadcastChannel(store.name||'b8-session');this.channel.onmessage=({data})=>{if(data.sender!==this.id){this.stale=true;this.dispatchEvent(new Event('external'));}};}catch{}
 }
 static async open(){
  let store,snapshot;
  try{store=await openCollectionStore();snapshot=await store.read();}
  catch(error){
   store?.close();const response=await fetch(DEMO_URL);if(!response.ok)throw Error('The demo could not load.');
   const loaded=await loadCollectionInWorker(await response.blob());store=createSessionStore(loaded.model.value,loaded.stats);loaded.resources.dispose();
   const session=new CollectionSession(store);session.storageWarning=error.message;try{await session.reload();return session;}catch(error){session.dispose();throw error;}
  }
  if(!snapshot){
   const response=await fetch(DEMO_URL);if(!response.ok)throw Error('The demo could not load.');
   const loaded=await loadCollectionInWorker(await response.blob());
   try{await store.replace(loaded.model.value,loaded.stats,null,{autoActivate:true});}
   catch(error){if(!(error instanceof ConflictError)){store.close();store=createSessionStore(loaded.model.value,loaded.stats);store.initialWarning=error.message;}}
   finally{loaded.resources.dispose();}
  }
  const session=new CollectionSession(store);session.storageWarning=store.initialWarning;try{await session.reload();return session;}catch(error){session.dispose();throw error;}
 }
 notify(){this.channel?.postMessage({sender:this.id});this.dispatchEvent(new Event('change'));}
 async reload(){
  const snapshot=await this.store.read();if(!snapshot?.collection?.working)throw Error('The saved collection could not be read. Import a valid collection or restore the demo.');
  const loaded=await loadCollectionInWorker(serialized(snapshot.collection.working));
  this.loaded?.resources.dispose();this.loaded=loaded;this.token=tokenOf(snapshot.active);
  this.baseline=snapshot.collection.baseline;this.preferences=validPreferences(loaded.model,snapshot.preferences||initialPreferences(loaded.model.value,true));
  this.choices=Object.fromEntries((snapshot.personal||[]).filter(r=>r.generation===this.token.generation).map(r=>[r.ballotId,r.choices]));
  this.recoveries=snapshot.drafts||[];this.stale=false;this.dispatchEvent(new Event('change'));
 }
 get model(){return this.loaded.model;}get value(){return this.model.value;}get resources(){return this.loaded.resources;}get stats(){return this.loaded.stats;}
 async replace(loaded,expected,{signal,autoActivate=false}={}){
  const next=await this.store.replace(loaded.model.value,loaded.stats,expected,{signal,autoActivate});
  this.loaded?.resources.dispose();this.loaded=loaded;this.token=next;this.baseline=structuredClone(loaded.model.value);
  this.preferences=initialPreferences(this.value,autoActivate);this.choices={};this.recoveries=[];this.stale=false;this.notify();
 }
 async save(value,expected,{draftId}={}){
  const next=structuredClone(value);next.revision=expected.revision+1;next.exportedAt=new Date().toISOString();
  const loaded=await loadCollectionInWorker(serialized(next));
  try{
   const preferences=validPreferences(loaded.model,this.preferences);const token=await this.store.save(loaded.model.value,loaded.stats,expected,{draftId,preferences});this.preferences=preferences;
   this.loaded.resources.dispose();this.loaded=loaded;this.token=token;this.stale=false;this.recoveries=this.recoveries.filter(d=>d.id!==draftId);this.notify();
  }catch(error){loaded.resources.dispose();throw error;}
 }
 async setPreferences(next){await this.store.preferences(next,this.token);this.preferences=structuredClone(next);this.dispatchEvent(new Event('change'));}
 async setChoices(ballotId,choices){await this.store.personal(ballotId,choices,this.token);this.choices[ballotId]=structuredClone(choices);this.dispatchEvent(new Event('choices'));}
 async clearChoices(){await this.store.clearPersonal(this.token);this.choices={};this.dispatchEvent(new Event('choices'));}
 async export(){return collectionOperation('export',this.value);}
 dispose(){this.loaded?.resources.dispose();this.channel?.close();this.store.close();}
}
