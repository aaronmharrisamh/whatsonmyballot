import{h,option,makeId}from'./ui-utils.js';
import{COLORS}from'./collection-errors.js';
const clone=x=>structuredClone(x),split=text=>text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
export function findRecord(value,id){for(const list of [value.authors,value.guides,value.sources,value.attachments.items,value.ballots,...value.ballots.flatMap(b=>[b.contests,...b.contests.map(c=>c.choices)])]){const found=list.find(r=>r.id===id);if(found)return found;}return null;}
export function editorData(value,kind,target,guideId){
 const r=findRecord(value,target),g=value.guides.find(g=>g.id===guideId);
 if(kind==='details')return{label:(r?.titleLines||r?.labelLines||[]).join('\n'),instruction:r?.instruction||'',summary:r?.details?.summary||'',markdown:r?.details?.markdown||'',sourceIds:clone(r?.details?.sourceIds||[]),attachmentIds:clone(r?.details?.attachmentIds||[]),imageAttachmentId:r?.imageAttachmentId||''};
 if(kind==='choice'||kind==='section'){
  const e=kind==='choice'?g?.recommendations.find(n=>n.choiceId===target):g?.sectionOpinions.find(n=>n.contestId===target);
  return{mark:e?.mark||'none',color:e?.color||'',text:e?.opinion?.text||'',authorId:e?.opinion?.authorId||'',sourceIds:clone(e?.opinion?.sourceIds||[])};
 }
 if(kind==='guide')return{title:r?.title||'',authorId:r?.authorId||value.authors[0]?.id||'',color:r?.color||'red'};
 if(kind==='create-guide')return{ballotId:target,title:'',name:'',organization:'',color:'red'};
 if(kind==='source')return{id:r?.id||makeId('source'),title:r?.title||'',url:r?.url||'',publisher:r?.publisher||'',date:r?.date||'',notes:r?.notes||'',attachmentId:r?.attachmentId||'',pages:(r?.pages||[]).join(', ')};
 if(kind==='attachment')return{item:r?clone(r):null};
 throw Error('Unknown editor.');
}
const input=(name,label,value,extra='')=>'<label>'+h(label)+'<input name="'+name+'" value="'+h(value)+'" '+extra+'></label>';
const textarea=(name,label,value,rows=3)=>'<label>'+h(label)+'<textarea name="'+name+'" rows="'+rows+'">'+h(value)+'</textarea></label>';
const select=(name,label,options)=>'<label>'+h(label)+'<select name="'+name+'">'+options+'</select></label>';
function checks(name,label,records,values){return'<fieldset><legend>'+h(label)+'</legend>'+(records.length?records.map(r=>'<label class="check-row"><input type="checkbox" name="'+name+'" value="'+h(r.id)+'"'+(values.includes(r.id)?' checked':'')+'>'+h(r.title||r.fileName)+'</label>').join(''):'<p class="muted">None added. Add a source or file in Admin.</p>')+'</fieldset>';}
export function editorFields(value,draft){
 const{kind,data:d}=draft,r=findRecord(value,draft.target);
 const colors=()=>COLORS.map(c=>option(c,c[0].toUpperCase()+c.slice(1),d.color)).join('');
 if(kind==='details')return'<p class="notice">Shared ballot information. This edit applies to every guide for this ballot.</p>'+textarea('label','Ballot label (one line per printed line)',d.label,2)+(r?.instruction?input('instruction','Voting instruction',d.instruction):'')+textarea('summary','Neutral overview',d.summary)+textarea('markdown','Full information (Markdown)',d.markdown,8)+checks('sourceIds','Information sources',value.sources,d.sourceIds)+checks('attachmentIds','Information files',value.attachments.items,d.attachmentIds)+(!r?.choices?select('imageAttachmentId','Optional image',option('','No image',d.imageAttachmentId)+value.attachments.items.filter(a=>a.mediaType.startsWith('image/')).map(a=>option(a.id,a.fileName,d.imageAttachmentId)).join('')):'');
 if(kind==='choice'||kind==='section')return'<p class="notice">Opinion guide: '+h(value.guides.find(g=>g.id===draft.guideId)?.title)+'</p>'+(kind==='choice'?select('mark','Guide mark',[['none','None'],['this','THIS — Recommended'],['or','OR — Optional']].map(([a,b])=>option(a,b,d.mark)).join(''))+select('color','Row color',option('','Use guide color',d.color)+colors()):'')+textarea('text','Opinion (blank is allowed)',d.text,5)+select('authorId','Opinion author',option('','Use guide author',d.authorId)+value.authors.map(a=>option(a.id,a.name,d.authorId)).join(''))+checks('sourceIds','Opinion sources',value.sources,d.sourceIds);
 if(kind==='guide')return input('title','Guide title',d.title,'required maxlength="160"')+select('authorId','Author',value.authors.map(a=>option(a.id,a.name,d.authorId)).join(''))+select('color','Guide color',colors());
 if(kind==='create-guide')return'<p>Create the first guide or add another named guide for '+h(findRecord(value,d.ballotId)?.title)+'.</p>'+input('title','Guide title',d.title,'required maxlength="160"')+input('name','Author name',d.name,'required maxlength="160"')+input('organization','Organization (optional)',d.organization,'maxlength="160"')+select('color','Guide color',colors());
 if(kind==='source')return input('title','Source title',d.title,'required maxlength="160"')+input('url','HTTPS website (optional)',d.url,'type="url"')+input('publisher','Publisher (optional)',d.publisher)+input('date','Source date (optional)',d.date,'type="date"')+input('pages','Page numbers (optional; comma separated)',d.pages)+textarea('notes','Source notes',d.notes)+select('attachmentId','Attached source (optional)',option('','No attachment',d.attachmentId)+value.attachments.items.map(a=>option(a.id,a.fileName,d.attachmentId)).join(''));
 if(kind==='attachment')return'<p>PDF, PNG, JPEG, WebP, Markdown, or plain text.</p><p class="notice">JSON limit: 25 MB. Expanded content limit: 100 MB. Actual storage space can vary.</p><label>Choose a file<input type="file" id="attachment-file" accept=".pdf,.png,.jpg,.jpeg,.webp,.md,.txt"></label><p id="attachment-status">'+h(d.item?d.item.fileName+' · '+d.item.rawBytes+' bytes':'No file chosen yet.')+'</p><button type="button" class="quiet" data-action="cancel-upload" hidden>Cancel file processing</button>';
 return'';
}
export function collectFields(form,draft){
 const data=clone(draft.data);if(draft.kind==='attachment')return data;
 const f=new FormData(form);for(const key of Object.keys(data)){if(Array.isArray(data[key]))data[key]=f.getAll(key);else if(f.has(key))data[key]=String(f.get(key));}return data;
}
export function applyEditor(value,draft){
 const next=clone(value),d=draft.data,r=findRecord(next,draft.target),g=next.guides.find(g=>g.id===draft.guideId);
 const opinion=()=>({text:d.text,...(d.authorId?{authorId:d.authorId}:{}),...(d.sourceIds.length?{sourceIds:d.sourceIds}:{})});
 if(draft.kind==='details'){
  if(r.titleLines)r.titleLines=split(d.label);else r.labelLines=split(d.label);
  if(r.instruction!==undefined)r.instruction=d.instruction;
  r.details={summary:d.summary,markdown:d.markdown,sourceIds:d.sourceIds,attachmentIds:d.attachmentIds};
  if(!r.choices){if(d.imageAttachmentId)r.imageAttachmentId=d.imageAttachmentId;else delete r.imageAttachmentId;}
 }else if(draft.kind==='choice'){
  if(!g)throw Error('This guide no longer exists.');
  g.recommendations=g.recommendations.filter(n=>n.choiceId!==draft.target);
  if(d.mark!=='none'||d.text.trim()||d.sourceIds.length)g.recommendations.push({choiceId:draft.target,mark:d.mark,...(d.color?{color:d.color}:{}),opinion:opinion()});g.updatedAt=new Date().toISOString();
 }else if(draft.kind==='section'){
  if(!g)throw Error('This guide no longer exists.');g.sectionOpinions=g.sectionOpinions.filter(n=>n.contestId!==draft.target);
  if(d.text.trim()||d.sourceIds.length)g.sectionOpinions.push({contestId:draft.target,opinion:opinion()});g.updatedAt=new Date().toISOString();
 }else if(draft.kind==='guide'){Object.assign(r,{title:d.title,authorId:d.authorId,color:d.color,updatedAt:new Date().toISOString()});}
 else if(draft.kind==='create-guide'){
  const authorId=draft.newAuthorId,guideId=draft.newGuideId;
  next.authors.push({id:authorId,name:d.name,...(d.organization.trim()?{organization:d.organization}:{})});
  next.guides.push({id:guideId,ballotId:d.ballotId,title:d.title,authorId,color:d.color,sectionOpinions:[],recommendations:[],updatedAt:new Date().toISOString()});
  if(next.defaultSelection.ballotId===d.ballotId&&!next.defaultSelection.guideId)next.defaultSelection.guideId=guideId;
 }else if(draft.kind==='source'){
  const updated={...(r||{}),id:d.id,title:d.title};
  for(const key of ['url','publisher','date','notes','attachmentId'])if(d[key].trim())updated[key]=d[key].trim();else delete updated[key];
  if(d.pages.trim())updated.pages=d.pages.split(',').map(s=>Number(s.trim()));else delete updated.pages;
  if(r)Object.assign(r,updated);else next.sources.push(updated);
  // Deleting optional fields must not retain the old object keys.
  if(r)next.sources[next.sources.findIndex(x=>x.id===r.id)]=updated;
 }else if(draft.kind==='attachment'){
  if(!d.item)throw Error('Choose a file before saving.');
  const i=next.attachments.items.findIndex(a=>a.id===d.item.id);if(i<0)next.attachments.items.push(clone(d.item));else next.attachments.items[i]=clone(d.item);
 }else throw Error('Unknown editor.');
 return next;
}
export function attachmentUses(value,id){
 const uses=[];
 function walk(node,path){if(!node||typeof node!=='object')return;for(const[k,v]of Object.entries(node)){
  if(['attachmentId','imageAttachmentId','logoAttachmentId'].includes(k)&&v===id)uses.push(path+'/'+k);
  else if(k==='attachmentIds'&&v.includes(id))uses.push(path+'/'+k);
  else if(k!=='attachments'&&k!=='authoring')if(Array.isArray(v))v.forEach((x,i)=>walk(x,path+'/'+k+'/'+i));else if(typeof v==='object')walk(v,path+'/'+k);
 }}
 walk(value,'');return uses;
}
