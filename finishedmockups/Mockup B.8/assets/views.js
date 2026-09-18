import{h,lines,icon,option,megabytes,personalMarks}from'./ui-utils.js';
import{BLUEPRINT_URL,serialized}from'./collection-session.js';
import{LIMITS}from'./collection-errors.js';
export function defaultForArea(model,areaId,ballotId,guideId){
 const ballots=model.ballotsFor(areaId),b=ballots.find(b=>b.id===ballotId)||ballots[0];
 const guides=b?model.guidesFor(b.id):[],g=guides.find(g=>g.id===guideId)||guides[0];
 return{areaId,ballotId:b?.id||null,guideId:g?.id||null};
}
export function leafFor(model,id){let a=model.get(id);while(a){const children=model.childrenOf(a.id);if(!children.length)return a.id;a=children[0];}return null;}
const button=(action,label,extra='',className='')=>'<button type="button" class="'+className+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
const disabled=value=>value?' disabled':'';
export function districtView(session,district){
 const m=session.model,path=m.areaPath(district.areaId),selection=session.preferences.selection;
 let parent=null,fields='';
 for(const level of session.value.areaLevels){
  const choices=m.childrenOf(parent).filter(a=>a.levelId===level.id);if(!choices.length)break;
  const selected=choices.find(a=>path.some(p=>p.id===a.id))||choices[0];parent=selected.id;
  const available=a=>a.ballotIds.length||m.childrenOf(a.id).some(available);
  fields+=choices.length===1?'<div class="static-field"><span>'+h(level.label)+'</span><strong>'+h(selected.label)+'</strong></div>':'<label>'+h(level.label)+'<select data-area-level="'+h(level.id)+'">'+choices.map(a=>option(a.id,(available(a)?'● ':'')+a.label+(available(a)?'':' — No ballot data'),selected.id)).join('')+'</select></label>';
 }
 const ballots=m.ballotsFor(district.areaId),guides=m.guidesFor(district.ballotId),b=m.get(district.ballotId);
 if(ballots.length>1)fields+='<label>Ballot / election<select data-district-ballot>'+ballots.map(b=>option(b.id,m.get(b.electionId).title+' · '+b.title,district.ballotId)).join('')+'</select></label>';
 else if(b)fields+='<div class="static-field"><span>Election</span><strong>'+h(m.get(b.electionId).title)+'</strong></div>';
 if(guides.length>1)fields+='<label>Opinion guide<select data-district-guide>'+guides.map(g=>option(g.id,g.title+' — '+m.get(g.authorId).name,district.guideId)).join('')+'</select></label>';
 else if(guides.length===1)fields+='<div class="static-field"><span>Opinion guide</span><strong>'+h(guides[0].title)+'</strong><small>'+h(m.get(guides[0].authorId).name)+'</small></div>';
 else if(b)fields+='<p class="notice">This ballot has no opinion guide. You can use the ballot or create a guide in Admin.</p>';
 return'<p class="eyebrow">YOUR AREA</p><h1>Find your ballot.</h1><p>Choose an area, then use its ballot.</p><section class="card">'+fields+(!b?'<p class="notice" role="status">No ballot information is available for this area. District and Admin remain available.</p>':'')+button('use-area','Use this area','','primary wide')+'</section><p class="muted">● Ballot data available</p>'+(selection?'<p class="small">Current area: '+h(m.get(selection.areaId)?.label||'Not selected')+'</p>':'<p class="notice">Choose Use this area to enable ballot navigation.</p>');
}
export function adminView(session,{ballotId,guideId,contestId,adminMode}){
 const m=session.model,v=session.value,b=m.get(ballotId)||v.ballots[0],guides=m.guidesFor(b.id),g=guides.find(g=>g.id===guideId),r=b.contests.find(c=>c.id===contestId)||b.contests[0];
 const editor=(kind,target,label,gid=g?.id)=>button('edit',h(label),'data-kind="'+kind+'" data-target="'+h(target)+'" data-guide="'+h(gid||'')+'"','quiet');
 return'<p class="eyebrow">LOCAL ADMIN</p><h1>Your collection.</h1><p>Edit saved guide content in this browser, then export it to share.</p>'+
 '<section class="card"><h2>Ballot data</h2><p class="small"><strong>'+h(v.collectionId)+'</strong><br>Schema '+h(v.schemaVersion)+' · Revision '+v.revision+'</p><p class="limits">JSON limit: '+LIMITS.fileBytes/1e6+' MB · Expanded content limit: '+LIMITS.expandedBytes/1e6+' MB</p><p id="file-usage">Current JSON: '+megabytes(serialized(v).size)+' · Expanded: '+megabytes(session.stats.expandedBytes)+'</p><div class="button-grid">'+button('import',icon('upload')+'Import JSON ballot data','','primary')+button('export',icon('download')+'Export JSON ballot data','','quiet')+'</div><div class="admin-drop-zone" tabindex="0" role="button" data-action="import" aria-label="Choose or drop one JSON collection">Drop one .JSON file here<br><small>Or choose a file</small></div><a class="button quiet" download href="'+h(BLUEPRINT_URL.href)+'">Download SCHEMASAMPLE.JSON</a><div class="button-grid">'+button('restore-collection','Restore imported original','','quiet')+button('restore-demo','Restore bundled demo','','quiet')+'</div></section>'+
 '<section class="card"><h2>Edit a guide</h2><label>Ballot<select data-admin-ballot>'+v.ballots.map(x=>option(x.id,x.title+' · '+m.get(x.electionId).title,b.id)).join('')+'</select></label>'+
 (guides.length?'<label>Guide to edit<select data-admin-guide>'+guides.map(x=>option(x.id,x.title+' — '+m.get(x.authorId).name,g?.id)).join('')+'</select></label>':'<p class="notice">No guide yet. Create a named guide for this ballot.</p>')+
 '<div class="button-grid">'+button('create-guide','Create guide','data-ballot="'+h(b.id)+'"','primary')+(g?editor('guide',g.id,'Edit guide profile'):'')+'</div>'+
 '<label>Ballot section<select data-admin-contest>'+b.contests.map(x=>option(x.id,x.titleLines.join(' · '),r.id)).join('')+'</select></label>'+
 '<div class="admin-target"><strong>'+lines(r.titleLines)+'</strong><div class="button-grid">'+editor('details',r.id,'Edit section information')+(g?editor('section',r.id,'Edit section opinion'):'')+'</div></div>'+
 r.choices.map(c=>'<div class="admin-target"><strong>'+lines(c.labelLines)+'</strong><div class="button-grid">'+editor('details',c.id,'Edit information')+(g?editor('choice',c.id,'Edit recommendation'):'')+'</div></div>').join('')+
 '<label class="check-row"><input type="checkbox" data-admin-mode'+(adminMode?' checked':'')+'>Show Edit buttons on the ballot</label></section>'+
 '<section class="card"><h2>Sources</h2>'+button('edit','Add source','data-kind="source" data-target=""','quiet')+v.sources.map(s=>'<div class="resource-row"><span>'+h(s.title)+'</span>'+editor('source',s.id,'Edit')+'</div>').join('')+'</section>'+
 '<section class="card"><h2>Files</h2><p class="small">Add a file here, then assign it in an information or source editor. Replacing a file keeps its ID.</p>'+button('edit','Add file','data-kind="attachment" data-target=""','quiet')+
 v.attachments.items.map(a=>'<div class="resource-row"><div><strong>'+h(a.fileName)+'</strong><small>'+h(a.mediaType)+' · '+megabytes(a.rawBytes)+'</small></div><div class="button-grid">'+button('resource','Open','data-id="'+h(a.id)+'"','quiet')+editor('attachment',a.id,'Replace')+button('remove-attachment','Remove','data-id="'+h(a.id)+'"','quiet')+'</div></div>').join('')+'</section>'+
 '<section class="card"><h2>Create a ballot</h2><p>Use the schema sample with your source ballots, then import the completed JSON. The visual ballot builder is a placeholder.</p>'+button('import','Import a prepared ballot','','quiet')+'</section>';
}
export{guideView}from'./guide-view.js';

export{ballotView,viewerView,rowView,sectionView}from'./ballot-ui.js';
