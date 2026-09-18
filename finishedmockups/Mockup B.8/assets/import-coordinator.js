import{loadCollectionInWorker}from'./collection-client.js';
import{CollectionError,diagnostic}from'./collection-errors.js';
export class ImportCoordinator{
 constructor({session,beforeImport,onState,onSuccess,onError}){Object.assign(this,{session,beforeImport,onState,onSuccess,onError});this.busy=false;}
 cancel(){this.controller?.abort();}
 async import(files,{autoActivate=false}={}){
  if(this.busy){this.onError(Error('An import is already in progress. Cancel it before choosing another file.'));return false;}
  let staged;this.busy=true;this.controller=new AbortController();
  try{
   if(files.length!==1)throw new CollectionError([diagnostic('JSN-E03',{message:'Put these ballots in one collection JSON. Choose one file.'})]);
   const file=files[0];
   if(!/\.json$/i.test(file.name||''))throw new CollectionError([diagnostic('JSN-E01',{message:'Choose a .json collection. Gzip belongs inside its attachment section.'})]);
   if(!await this.beforeImport(file))return false;
   const expected=structuredClone(this.session.token),signal=this.controller.signal;
   this.onState('Read and validate','Reading JSON; checking structure, references, ballot rules, and guide authors.');
   staged=await loadCollectionInWorker(file,{fileName:file.name,signal,onProgress:p=>this.onState('Decode attachments','Checking attachment '+(p.index+1)+' of '+p.total+'.')});
   signal.throwIfAborted();this.onState('Stage collection','All records passed. Saving the complete replacement.');
   await this.session.replace(staged,expected,{signal,autoActivate});staged=null;
   this.onSuccess();return true;
  }catch(error){if(error.name!=='AbortError')this.onError(error);else this.onState('Cancelled','Your previous collection is unchanged.');return false;}
  finally{staged?.resources.dispose();this.busy=false;this.controller=null;this.onState('Idle');}
 }
}
