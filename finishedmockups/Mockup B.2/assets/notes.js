// B-series notes are a versioned companion to the original ballot content.
// IDs, ballot choices, and the existing A/B content contract remain separate.
const clone=value=>structuredClone(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fields=['synopsis','author','opinion','sourceUrl'];
export function createNotesStore(original,storage,basePath){
 const key='whatsonmyballot:'+basePath+':'+original.datasetId+':notes:v1';
 let value=clone(original),serialized=null,warning='';
 const ids=new Map(original.records.map(r=>[r.id,r]));
 function validate(next){
  if(!next||typeof next!=='object'||Array.isArray(next)||Object.keys(next).sort().join()!==Object.keys(original).sort().join()
   ||next.format!==original.format||next.schemaVersion!=='1.0.0'||next.datasetId!==original.datasetId
   ||!Number.isSafeInteger(next.revision)||next.revision<0||!Array.isArray(next.records)||next.records.length!==ids.size)
   throw Error('This is not a matching notes file with schema 1.0.0.');
  const seen=new Set();
  for(const r of next.records){
   const base=ids.get(r?.id);
   if(!base||seen.has(r.id)||Object.keys(r).sort().join()!==Object.keys(base).sort().join())throw Error('A note has an unknown or repeated ID.');
   seen.add(r.id);
   for(const k of ['kind','raceId','label'])if(r[k]!==base[k])throw Error('Note identities cannot change.');
   for(const k of fields)if(typeof r[k]!=='string'||r[k].length>(k==='opinion'?4000:k==='sourceUrl'?2000:500))throw Error('A note field is missing or too long.');
   if(!r.synopsis.trim()||/[\r\n]/.test(r.synopsis)||!/[.!?]$/.test(r.synopsis.trim())||/[.!?]\s+[A-Z]/.test(r.synopsis))throw Error('Use one short sentence for the neutral synopsis.');
   if(r.opinion.trim()&&!r.author.trim())throw Error('Add the opinion author before saving an opinion.');
   if(r.sourceUrl){let url;try{url=new URL(r.sourceUrl);}catch{throw Error('Use a full HTTPS source link.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS source link without sign-in details.');}
  }
  return next;
 }
 validate(original);
 function load(){
  try{serialized=storage?.getItem(key)||null;value=serialized?clone(validate(JSON.parse(serialized))):clone(original);warning='';}
  catch{warning='Saved notes could not be read. The original notes are shown; export a recovery copy before replacing saved data.';value=clone(original);}
  return clone(value);
 }
 const get=id=>clone(value.records.find(r=>r.id===id));
 function values(id,baseline=false){const r=(baseline?original.records:value.records).find(r=>r.id===id);return Object.fromEntries(fields.map(k=>[k,r[k]]));}
 function changed(){return value.records.filter(r=>!same(fields.map(k=>r[k]),fields.map(k=>ids.get(r.id)[k])));}
 function readRecovery(owner){try{const r=JSON.parse(storage.getItem(key+':draft:'+owner));if(r.format!=='whatsonmyballot-note-draft'||!ids.has(r.id)||!Number.isSafeInteger(r.revision)||!r.values||Object.keys(r.values).sort().join()!==[...fields].sort().join()||Object.values(r.values).some(s=>typeof s!=='string'||s.length>4000))return null;return{...r,owner,matching:r.revision===value.revision};}catch{return null;}}
 return {
  key,original:clone(original),validate,load,get,values,changed,
  get value(){return clone(value);},get warning(){return warning;},
  async commit(next,expectedRevision){
   const run=()=>{
    if(!storage)throw Error('Browser saving is unavailable. Export your note draft to keep a copy.');
    if(storage.getItem(key)!==serialized||expectedRevision!==value.revision)throw Error('Notes changed in another tab. Export your draft, then reload the saved notes.');
    const checked=clone(validate({...next,revision:expectedRevision+1})),text=JSON.stringify(checked);
    storage.setItem(key,text);value=checked;serialized=text;warning='';return clone(value);
   };
   return globalThis.navigator?.locks?globalThis.navigator.locks.request(key,run):run();
  },
  proposed(id,changes){const next=clone(value),r=next.records.find(r=>r.id===id);if(!r)throw Error('Unknown note.');Object.assign(r,changes);return next;},
  saveRecovery(draft,owner){try{if(!storage)return false;storage.setItem(key+':draft:'+owner,JSON.stringify({format:'whatsonmyballot-note-draft',schemaVersion:'1.0.0',id:draft.id,revision:draft.noteRevision,values:draft.values}));return true;}catch{return false;}},
  clearRecovery(owner){try{storage?.removeItem(key+':draft:'+owner);}catch{}},
  recoveries(){const out=[];try{for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k.startsWith(key+':draft:')){const r=readRecovery(k.slice((key+':draft:').length));if(r)out.push(r);}}}catch{}return out;}
 };
}
