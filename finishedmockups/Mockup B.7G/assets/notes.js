// B-series notes are a versioned companion to the original ballot content.
// B.7G adds an independent header-opinion highlight; it is not a vote recommendation.
export const NOTE_SCHEMA_VERSION='1.1.0';
export const HEADER_COLORS=['blue','green','red','yellow','orange','gray'];
const clone=value=>structuredClone(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fields=['synopsis','author','opinion','sourceUrl'];
const identityFields=['id','kind','raceId','label'];
const headerFields=['headerHighlighted','headerColor'];
const editableFields=r=>r.kind==='section'?[...fields,...headerFields]:fields;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exactKeys=(value,keys)=>object(value)&&Object.keys(value).sort().join()===([...keys].sort().join());
function validateHeader(r){
 if(r.kind==='section'&&(typeof r.headerHighlighted!=='boolean'||!HEADER_COLORS.includes(r.headerColor)))throw Error('Use a header highlight checkbox and one of the listed colors.');
}
export function createNotesStore(original,storage,basePath){
 const key='whatsonmyballot:'+basePath+':'+original.datasetId+':notes:v1';
 let value=clone(original),serialized=null,warning='';
 const ids=new Map(original.records.map(r=>[r.id,r]));
 function validate(next){
  if(!exactKeys(next,['format','schemaVersion','datasetId','revision','records'])
   ||next.format!=='whatsonmyballot-notes'||next.schemaVersion!==NOTE_SCHEMA_VERSION||next.datasetId!==original.datasetId
   ||!Number.isSafeInteger(next.revision)||next.revision<0||!Array.isArray(next.records)||next.records.length!==ids.size)
   throw Error('This is not a matching notes file with schema '+NOTE_SCHEMA_VERSION+'.');
  const seen=new Set();
  for(const r of next.records){
   const base=ids.get(r?.id);
   if(!base||seen.has(r.id)||!exactKeys(r,[...identityFields,...editableFields(base)]))throw Error('A note has unknown fields or an unknown or repeated ID.');
   seen.add(r.id);
   for(const k of ['kind','raceId','label'])if(r[k]!==base[k])throw Error('Note identities cannot change.');
   for(const k of fields)if(typeof r[k]!=='string'||r[k].length>(k==='opinion'?4000:k==='sourceUrl'?2000:500))throw Error('A note field is missing or too long.');
   validateHeader(r);
   if(r.synopsis.trim()&&(/[\r\n]/.test(r.synopsis)||!/[.!?]$/.test(r.synopsis.trim())||/[.!?]\s+[A-Z]/.test(r.synopsis)))throw Error('Use one short sentence for the neutral synopsis, or leave it empty.');
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
 function values(id,baseline=false){
  const r=(baseline?original.records:value.records).find(r=>r.id===id);if(!r)throw Error('Unknown note.');
  return Object.fromEntries(editableFields(r).map(k=>[k,r[k]]));
 }
 function changed(){return value.records.filter(r=>!same(editableFields(r).map(k=>r[k]),editableFields(r).map(k=>ids.get(r.id)[k])));}
 function validDraft(r){
  if(!exactKeys(r,['format','schemaVersion','id','revision','values'])||r.format!=='whatsonmyballot-note-draft'||r.schemaVersion!==NOTE_SCHEMA_VERSION||!ids.has(r.id)||!Number.isSafeInteger(r.revision)||r.revision<0)return false;
  const base=ids.get(r.id);
  if(!exactKeys(r.values,editableFields(base))||fields.some(k=>typeof r.values[k]!=='string'||r.values[k].length>4000))return false;
  // Draft text can be unfinished. Header types and field scope must still be valid.
  try{validateHeader({...r.values,kind:base.kind});}catch{return false;}
  return true;
 }
 function readRecovery(owner){try{const r=JSON.parse(storage.getItem(key+':draft:'+owner));if(!validDraft(r))return null;return{...r,owner,matching:r.revision===value.revision&&!warning};}catch{return null;}}
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
  saveRecovery(draft,owner){
   try{
    if(!storage)return false;
    const next={format:'whatsonmyballot-note-draft',schemaVersion:NOTE_SCHEMA_VERSION,id:draft.id,revision:draft.noteRevision,values:draft.values};
    if(!validDraft(next))return false;
    storage.setItem(key+':draft:'+owner,JSON.stringify(next));return true;
   }catch{return false;}
  },
  clearRecovery(owner){try{storage?.removeItem(key+':draft:'+owner);}catch{}},
  recoveries(){const out=[];try{for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k?.startsWith(key+':draft:')){const r=readRecovery(k.slice((key+':draft:').length));if(r)out.push(r);}}}catch{}return out;}
 };
}
