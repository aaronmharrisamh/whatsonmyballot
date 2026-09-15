import validateSchema from'./vendor/validate-collection.js';
import{COLLECTION_FORMAT,SCHEMA_VERSION,LIMITS,diagnostic,fail,CollectionError}from'./collection-errors.js';
import{decodeAttachments,createAttachmentResolver,readBounded}from'./attachments.js';
import{normalizeCollection}from'./collection-model.js';
const encode=new TextEncoder();
export function safeHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function shapeGuard(value){
 const stack=[[value,0]],seen=new Set();let nodes=0;
 while(stack.length){const [v,depth]=stack.pop();if(depth>80||++nodes>1000000)fail('JSN-E03',{message:'JSON nesting or complexity is too large.'});
  if(v&&typeof v==='object'){if(seen.has(v))fail('JSN-E03',{message:'Collection data must be a JSON tree.'});seen.add(v);if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)fail('JSN-E03');for(const x of Object.values(v))stack.push([x,depth+1]);}
 }
}
export function validateStructure(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('JSN-E03',{message:'Use a collection object.'});
 if(value.format!==COLLECTION_FORMAT||value.schemaVersion!==SCHEMA_VERSION)fail('JSN-E02',{path:'/schemaVersion',receivedVersion:typeof value.schemaVersion==='string'?value.schemaVersion:null});
 shapeGuard(value);
 if(!validateSchema(value)){
  const errors=validateSchema.errors.slice(0,12).map(e=>{
   const p=e.instancePath+(e.keyword==='required'?'/'+e.params.missingProperty:'');let code='JSN-E03';
   if(p.startsWith('/attachments'))code='JSN-E08';
   if(/\/contests\/\d+\/(?:kind|maxSelections|column)$/.test(p))code='JSN-E06';
   if(e.keyword==='maximum'&&/\/(?:rawBytes|gzipBytes)$/.test(p))code='JSN-E09';
   return diagnostic(code,{path:p,message:'Invalid field: '+e.message,receivedVersion:value.schemaVersion});
  });throw new CollectionError(errors);
 }
 return value;
}
export function validateRelationships(c){
 const records=new Map(),paths=new Map(),owners=new Map(),add=(r,type,p,owner=null)=>{
  if(records.has(r.id))fail('JSN-E04',{path:p+'/id',recordId:r.id});records.set(r.id,{record:r,type,owner});paths.set(r.id,p);owners.set(r.id,owner);
 };
 for(const [key,type]of [['elections','election'],['areaLevels','level'],['areas','area'],['authors','author'],['guides','guide'],['sources','source']])c[key].forEach((r,i)=>add(r,type,'/'+key+'/'+i));
 c.attachments.items.forEach((r,i)=>add(r,'attachment','/attachments/items/'+i));
 c.ballots.forEach((b,i)=>{const p='/ballots/'+i;add(b,'ballot',p);b.pages.forEach((r,j)=>add(r,'page',p+'/pages/'+j,b.id));b.groups.forEach((r,j)=>add(r,'group',p+'/groups/'+j,b.id));b.contests.forEach((r,j)=>{const q=p+'/contests/'+j;add(r,'contest',q,b.id);r.choices.forEach((o,k)=>add(o,'choice',q+'/choices/'+k,r.id));});});
 const requireRef=(id,type,p,owner=null,code='JSN-E05')=>{const found=records.get(id);if(!found||found.type!==type||(owner!==null&&found.owner!==owner))fail(code,{path:p,recordId:id,message:'Expected '+type+(owner?' owned by '+owner:'')+': '+id});return found.record;};
 const sources=(ids,p)=>ids?.forEach((id,i)=>requireRef(id,'source',p+'/'+i));
 const detail=(d,p)=>{if(!d)return;sources(d.sourceIds,p+'/sourceIds');d.attachmentIds?.forEach((id,i)=>requireRef(id,'attachment',p+'/attachmentIds/'+i));};
 const image=(id,p)=>{if(id){const a=requireRef(id,'attachment',p);if(!a.mediaType.startsWith('image/'))fail('JSN-E05',{path:p,recordId:id,message:'This image reference needs a PNG, JPEG, or WebP attachment.'});}};
 const levels=new Map(c.areaLevels.map((l,i)=>[l.id,i])),children=new Map();
 for(const a of c.areas){const p=paths.get(a.id);requireRef(a.levelId,'level',p+'/levelId');const depth=levels.get(a.levelId);
  if(a.parentId===null){if(depth!==0)fail('JSN-E05',{path:p+'/parentId',recordId:a.id,message:'Only a root-level area can have no parent.'});}
  else{const parent=requireRef(a.parentId,'area',p+'/parentId');if(levels.get(parent.levelId)!==depth-1)fail('JSN-E05',{path:p+'/parentId',recordId:a.id,message:'An area parent must use the preceding hierarchy level.'});if(!children.has(a.parentId))children.set(a.parentId,[]);children.get(a.parentId).push(a.id);}
  a.ballotIds.forEach((id,i)=>requireRef(id,'ballot',p+'/ballotIds/'+i));
 }
 for(const a of c.areas)if(children.has(a.id)&&a.ballotIds.length)fail('JSN-E05',{path:paths.get(a.id)+'/ballotIds',recordId:a.id,message:'Only a leaf area can have ballot assignments.'});
 const assigned=new Set(c.areas.flatMap(a=>a.ballotIds));for(const b of c.ballots)if(!assigned.has(b.id))fail('JSN-E05',{path:paths.get(b.id),recordId:b.id,message:'Assign this ballot to an area.'});
 c.elections.forEach(e=>sources(e.sourceIds,paths.get(e.id)+'/sourceIds'));
 c.authors.forEach(a=>image(a.logoAttachmentId,paths.get(a.id)+'/logoAttachmentId'));
 for(const s of c.sources){const p=paths.get(s.id);if(s.url&&!safeHttps(s.url))fail('JSN-E03',{path:p+'/url',recordId:s.id,message:'Use HTTPS without URL credentials.'});if(s.attachmentId)requireRef(s.attachmentId,'attachment',p+'/attachmentId');}
 for(const b of c.ballots){
  const bp=paths.get(b.id);requireRef(b.electionId,'election',bp+'/electionId');sources(b.sourceIds,bp+'/sourceIds');let lastPage=-1,lastColumn=-1;const usedGroups=new Set(),usedPages=new Set();
  for(const r of b.contests){const p=paths.get(r.id),page=requireRef(r.pageId,'page',p+'/pageId',b.id);requireRef(r.groupId,'group',p+'/groupId',b.id);usedGroups.add(r.groupId);usedPages.add(r.pageId);
   const pi=b.pages.findIndex(a=>a.id===r.pageId);if(r.column>page.columns||pi<lastPage||(pi===lastPage&&r.column<lastColumn))fail('JSN-E06',{path:p+'/column',recordId:r.id,message:'Contest order must follow pages, columns, then printed order.'});lastPage=pi;lastColumn=r.column;
   if(r.maxSelections>r.choices.length)fail('JSN-E06',{path:p+'/maxSelections',recordId:r.id,message:'The choice limit exceeds the available choices and write-in slots.'});
   const allowed=r.kind==='candidate'?['candidate','write-in']:r.kind==='ticket'?['ticket','write-in']:r.kind==='straight-party'?['party']:['answer'];
   if(['straight-party','proposal'].includes(r.kind)&&r.maxSelections!==1)fail('JSN-E06',{path:p+'/maxSelections',recordId:r.id});
   if(r.kind==='proposal'&&(!r.question?.trim()||r.choices.length!==2||new Set(r.choices.map(o=>o.answer)).size!==2||!r.choices.some(o=>o.answer==='yes')||!r.choices.some(o=>o.answer==='no')))fail('JSN-E06',{path:p,recordId:r.id,message:'A proposal needs its full question and exactly one Yes and one No option.'});
   if((r.kind==='proposal')!==(requireRef(r.groupId,'group',p+'/groupId').category==='proposals'))fail('JSN-E06',{path:p+'/groupId',recordId:r.id,message:'Proposal contests belong in a proposals group.'});
   if(r.kind!=='proposal'&&r.question!==undefined)fail('JSN-E06',{path:p+'/question',recordId:r.id,message:'Only proposals have a proposal question.'});
   detail(r.details,p+'/details');sources(r.sourceIds,p+'/sourceIds');
   for(const o of r.choices){const q=paths.get(o.id);if(!allowed.includes(o.kind)||(o.kind==='ticket'&&!o.members?.length)||(o.kind!=='ticket'&&o.members!==undefined)||(o.kind!=='answer'&&o.answer!==undefined))fail('JSN-E06',{path:q,recordId:o.id,message:'Choice mechanics do not match the contest.'});detail(o.details,q+'/details');sources(o.sourceIds,q+'/sourceIds');image(o.imageAttachmentId,q+'/imageAttachmentId');}
  }
  if(usedGroups.size!==b.groups.length||usedPages.size!==b.pages.length)fail('JSN-E06',{path:bp,recordId:b.id,message:'Each declared group and page must contain at least one contest.'});
 }
 const opinion=(o,g,p)=>{if(!o)return;const id=o.authorId||g.authorId;if(o.text.trim()&&!records.has(id))fail('JSN-E07',{path:p,recordId:g.id,message:'A nonempty opinion needs an author.'});if(o.authorId)requireRef(o.authorId,'author',p+'/authorId',null,'JSN-E07');sources(o.sourceIds,p+'/sourceIds');};
 for(const g of c.guides){const p=paths.get(g.id);requireRef(g.ballotId,'ballot',p+'/ballotId');requireRef(g.authorId,'author',p+'/authorId',null,'JSN-E07');const sections=new Set(),options=new Set();
  g.sectionOpinions.forEach((n,i)=>{const q=p+'/sectionOpinions/'+i;if(sections.has(n.contestId))fail('JSN-E07',{path:q,recordId:g.id,message:'A guide has two opinions for the same header.'});sections.add(n.contestId);requireRef(n.contestId,'contest',q+'/contestId',g.ballotId,'JSN-E07');opinion(n.opinion,g,q+'/opinion');});
  g.recommendations.forEach((n,i)=>{const q=p+'/recommendations/'+i;if(options.has(n.choiceId))fail('JSN-E07',{path:q,recordId:g.id,message:'A guide has two marks for the same choice.'});options.add(n.choiceId);const choice=requireRef(n.choiceId,'choice',q+'/choiceId',null,'JSN-E07');if(owners.get(owners.get(choice.id))!==g.ballotId)fail('JSN-E07',{path:q+'/choiceId',recordId:g.id,message:'This option is from another ballot.'});opinion(n.opinion,g,q+'/opinion');});
 }
 const d=c.defaultSelection,area=requireRef(d.areaId,'area','/defaultSelection/areaId');if(!area.ballotIds.includes(d.ballotId)||children.has(area.id))fail('JSN-E05',{path:'/defaultSelection',message:'Default selection must name an available leaf area and its ballot.'});
 if(d.guideId!==null){const g=requireRef(d.guideId,'guide','/defaultSelection/guideId');if(g.ballotId!==d.ballotId)fail('JSN-E07',{path:'/defaultSelection/guideId',recordId:g.id,message:'Default guide belongs to another ballot.'});}
 return c;
}
export async function validateCollection(value,options={}){
 validateStructure(value);let json;try{json=JSON.stringify(value);}catch{fail('JSN-E03');}
 const fileBytes=options.fileBytes??encode.encode(json).length;if(fileBytes>LIMITS.fileBytes)fail('JSN-E09',{actualBytes:fileBytes,limitBytes:LIMITS.fileBytes});
 validateRelationships(value);const decoded=await decodeAttachments(value,options);
 return{value,stats:{fileBytes,expandedBytes:decoded.expandedBytes,attachmentCount:value.attachments.items.length},bytesById:decoded.bytesById};
}
export async function parseCollection(input,{fileName=input?.name,signal,...options}={}){
 if(fileName&&!/\.json$/i.test(fileName))fail('JSN-E01',{message:'Choose one .json collection file.'});
 let bytes;if(typeof input==='string')bytes=encode.encode(input);else if(input instanceof Blob){if(input.size>LIMITS.fileBytes)fail('JSN-E09',{actualBytes:input.size,limitBytes:LIMITS.fileBytes});bytes=await readBounded(input.stream(),LIMITS.fileBytes,{signal});}else if(input instanceof Uint8Array)bytes=input;else fail('JSN-E01');
 if(bytes.length>LIMITS.fileBytes)fail('JSN-E09',{actualBytes:bytes.length,limitBytes:LIMITS.fileBytes});
 let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail('JSN-E01');}
 return validateCollection(value,{...options,signal,fileBytes:bytes.length});
}
export async function loadCollection(input,options={}){
 const result=await parseCollection(input,options);const model=normalizeCollection(result.value);return{model,stats:result.stats,resources:createAttachmentResolver(model.value,result.bytesById)};
}
export async function exportCollection(value,{exportedAt=new Date().toISOString(),signal}={}){
 const next=structuredClone(value);next.exportedAt=exportedAt;await validateCollection(next,{signal});const text=JSON.stringify(next,null,2)+'\n',bytes=encode.encode(text).length;
 if(bytes>LIMITS.fileBytes)fail('JSN-E09',{actualBytes:bytes,limitBytes:LIMITS.fileBytes});return new Blob([text],{type:'application/json'});
}
