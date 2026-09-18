import{h,lines,icon,personalMarks}from'./ui-utils.js';
// View state is never author content or a personal ballot mark.
export const ballotUI={opinions:new Map(),reveals:new Set(),scope:'',showBackToStart:false,
 sync(session){const key=session.token.generation+'|'+session.preferences.selection?.ballotId+'|'+session.preferences.selection?.guideId;if(key!==this.scope){this.scope=key;this.opinions.clear();this.reveals.clear();}},
 navigate(){this.reveals.clear();}
};
export const button=(action,label,extra='',className='')=>'<button type="button" class="'+className+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
const disabled=value=>value?' disabled':'';
export function ownContent(m,guideId,targetId){
 const r=m.get(targetId),header=Boolean(r?.choices);
 const state=header?{mark:'none',recommended:false,color:'blue',opinion:m.sectionOpinion(guideId,targetId)}:m.choiceGuide(guideId,targetId);
 return{...state,header,information:m.detailsAvailable(r)};
}
export function targetState(session,targetId){
 const state=ownContent(session.model,session.preferences.selection?.guideId,targetId),guided=session.preferences.opinionGuideVisible!==false;
 return{...state,recommended:guided&&state.recommended,mark:guided?state.mark:'none',open:Boolean(state.opinion&&(ballotUI.opinions.has(targetId)?ballotUI.opinions.get(targetId):guided&&state.recommended))};
}
export function scaleIcon({open=false,exception=false}={}){
 return '<svg class="icon opinion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
 '<g'+(open?' transform="translate(2.4 0) scale(.8)"':'')+'><path d="M12 3v17M6 21h12M4 7h16M6 7l-4 7h8L6 7m12 0-4 7h8l-4-7"/>'+(exception?'<path class="exception-star" d="M20 1v6m-2.6-4.5 5.2 3m-5.2 0 5.2-3" stroke-width="1.6"/>':'')+'</g>'+(open?'<path class="collapse-chevron" d="m4 22 8-4 8 4" stroke-width="1.6"/>':'')+'</svg>';
}
export function personalOval(marked,mark='none'){
 return '<svg class="oval'+(mark!=='none'?' guided-oval':'')+'" viewBox="0 0 56 30" aria-hidden="true"><ellipse class="oval-outline" cx="28" cy="15" rx="24" ry="11" fill="white" stroke="currentColor" stroke-width="2"/>'+
 (marked?'<ellipse class="oval-fill" cx="28" cy="15" rx="19.5" ry="6.5" fill="currentColor"/>':'')+
 (mark!=='none'?'<ellipse class="guide-march" cx="28" cy="15" rx="26" ry="13" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 5"/>':'')+'</svg>';
}
export function guideHint(mark){
 return '<svg class="guide-hint" viewBox="0 0 56 30" aria-hidden="true">'+
 (mark==='this'?'<path class="guide-arrow" fill="currentColor" d="M22 2h12v12h10L28 29 12 14h10z"/>':mark==='or'?'<text x="28" y="24" text-anchor="middle" fill="currentColor" font-size="25" font-weight="850">OR</text>':'')+'</svg>';
}
export function actionsView(session,id,context='reader',s=targetState(session,id)){
 const panel=context+'-opinion-'+id;
 return button('opinion',scaleIcon({open:s.open,exception:!s.header&&!s.recommended&&Boolean(s.opinion)}),
 'data-target="'+h(id)+'" aria-label="'+(s.opinion?(s.open?'Collapse':'Open')+(s.header?' section opinion':' opinion'):'No opinion added')+'"'+
 (s.opinion?' aria-expanded="'+s.open+'" aria-controls="'+h(panel)+'"':'')+disabled(!s.opinion),'icon-button')+
 button('info',icon('search'),'data-target="'+h(id)+'" aria-label="'+(s.information?(s.header?'Section information':'More information'):'No information added')+'"'+disabled(!s.information),'icon-button');
}
export function opinionView(session,id,context='reader',s=targetState(session,id)){
 if(!s.opinion)return'';
 return '<div class="opinion-note" id="'+h(context+'-opinion-'+id)+'" data-opinion="'+h(id)+'"'+(s.open?'':' hidden')+'><strong>'+icon('scale')+'Opinion'+(s.header?'':' — '+(s.mark==='this'?'Choose This':s.mark==='or'?'Optional':'Not recommended'))+'</strong><p>'+h(s.opinion.text)+'</p><small>'+h(s.opinion.author.name)+'</small></div>';
}
export function rowView(session,c,{adminMode,ballotId,paper=false}){
 const s=targetState(session,c.id),marked=personalMarks(session,ballotId,session.model.ownerId(c.id)).includes(c.id),guideId=session.preferences.selection?.guideId;
 return '<div class="choice-row'+(s.recommended?' recommended':'')+'" data-color="'+h(s.color)+'" data-choice-row="'+h(c.id)+'"><label class="ballot-mark"><input type="checkbox" data-choice="'+h(c.id)+'"'+(marked?' checked':'')+' aria-label="Mark '+h(c.labelLines.join(' '))+'">'+guideHint(s.mark)+personalOval(marked,s.mark)+'<small>'+(s.mark==='this'?'(RECOMMENDED)':s.mark==='or'?'(OPTIONAL)':'')+'</small></label>'+
 '<div class="choice-content"><strong>'+lines(c.labelLines)+'</strong>'+(c.party?'<span class="party-label">'+h(c.party)+'</span>':'')+(c.members?'<span class="ticket-members">'+c.members.map(x=>h(x.role)+': '+h(x.name)).join('<br>')+'</span>':'')+(c.designation?'<small>'+h(c.designation)+'</small>':'')+
 '<div class="row-tools">'+actionsView(session,c.id,paper?'paper':'reader')+(adminMode?button('edit',icon('edit')+'Edit','data-kind="choice" data-target="'+h(c.id)+'" data-guide="'+h(guideId||'')+'"'+disabled(!guideId),'edit-pill'):'')+'</div>'+opinionView(session,c.id,paper?'paper':'reader')+'</div></div>';
}
export function sectionView(session,r,ctx){
 const m=session.model,b=m.get(ctx.ballotId),recommendations=r.choices.filter(c=>targetState(session,c.id).recommended),reveal=ballotUI.reveals.has(r.id);
 const filtered=session.preferences.onlyRecommendations&&session.preferences.opinionGuideVisible!==false;
 const choices=!filtered||reveal?r.choices:recommendations,count=personalMarks(session,b.id,r.id).length,context=ctx.paper?'paper':'reader';
 return '<section class="ballot-section" data-section="'+h(r.id)+'"><div class="ballot-group">'+h(m.get(r.groupId).title)+'</div><header><h2>'+lines(r.titleLines)+'</h2><p>'+h(r.instruction)+'</p>'+(r.term?'<p>'+h(r.term)+'</p>':'')+(r.district?'<p>'+h(r.district)+'</p>':'')+(r.question?'<p class="proposal-question">'+h(r.question)+'</p>':'')+
 '<div class="row-tools">'+actionsView(session,r.id,context)+(ctx.adminMode?button('edit','Edit section','data-kind="details" data-target="'+h(r.id)+'"','edit-pill'):'')+'</div>'+opinionView(session,r.id,context)+'</header>'+
 (!recommendations.length?'<p class="notice centered">There are no recommendations for this section. Use your best judgement!</p>':'')+choices.map(c=>rowView(session,c,ctx)).join('')+
 (filtered?'<label class="check-row show-all"><input type="checkbox" data-show-all="'+h(r.id)+'"'+(reveal?' checked':'')+'>Show all choices</label>':'')+
 '<footer><span>'+count+'/'+r.maxSelections+' choices marked</span>'+button('clear-section','Clear Selection','data-contest="'+h(r.id)+'"','quiet slim')+'</footer></section>';
}
export function filterView(session){
 const checked=session.preferences.onlyRecommendations;
 return '<label class="filter-switch"><input type="checkbox" role="switch" data-only-recommendations'+(checked?' checked':'')+'><span aria-hidden="true"></span><b>'+ (checked?'Only Recommendations':'Showing All')+'</b></label>';
}
const weight=r=>r.weight||Math.max(1,2+r.choices.length+(r.question?2:0));
export function layoutMap(model,ballotId){
 const pages=model.layoutFor(ballotId);let x=0;
 return pages.map(({page,columns})=>{const width=Math.max(45,page.columns*23),height=112;
 const max=Math.max(1,...columns.map(col=>col.contests.reduce((n,r)=>n+weight(r),0)));
 const cells=columns.flatMap(col=>{let y=9;return col.contests.map(r=>{const height=weight(r)/max*94,cell={id:r.id,x:x+4+(col.number-1)*(width-8)/page.columns,y,width:(width-8)/page.columns-2,height:Math.max(1,height-1)};y+=height;return cell;});});
 const result={page,x,width,height,cells};x+=width+7;return result;});
}
export function minimapView(session,currentId){
 const sel=session.preferences.selection,pages=layoutMap(session.model,sel.ballotId),width=pages.at(-1).x+pages.at(-1).width;
 return '<svg class="ballot-minimap" viewBox="0 0 '+width+' 112" role="img" aria-label="Ballot map, current section highlighted">'+pages.map(p=>'<rect x="'+p.x+'" y="1" width="'+p.width+'" height="110" rx="2" fill="#fff" stroke="#607586"/>'+p.cells.map(c=>'<rect data-map-section="'+h(c.id)+'" x="'+c.x+'" y="'+c.y+'" width="'+c.width+'" height="'+c.height+'" rx=".6" fill="'+(c.id===currentId?'#355f83':personalMarks(session,sel.ballotId,c.id).length?'#a8c0d3':'#e1e7eb')+'"/>').join('')).join('')+'</svg>';
}
export function progressView(session,b,index){
 return '<div class="progress-line"><div class="page-progress">'+b.pages.map(page=>'<div class="progress-page" style="flex:'+b.contests.filter(r=>r.pageId===page.id).reduce((n,r)=>n+weight(r),0)+'"><div class="progress-segments">'+b.contests.filter(r=>r.pageId===page.id).map(r=>{const done=personalMarks(session,b.id,r.id).length>0;return '<span class="progress-segment'+(r.id===b.contests[index].id?' current':'')+(done?' done':'')+'" style="flex:'+weight(r)+'" title="'+h(r.titleLines.join(' '))+(done?' — choices marked':'')+'">'+(done?icon('check'):'')+'</span>';}).join('')+'</div>'+(page.label?'<small>'+h(page.label)+'</small>':'')+'</div>').join('')+'</div><strong>'+(index+1)+'/'+b.contests.length+'</strong></div>';
}
export function backToStartView(){return button('back-to-start','← Back to Start',ballotUI.showBackToStart?'':'hidden tabindex="-1"','nav-chip back-to-start');}
export function ballotView(session,{index=0,adminMode=false}){
 const sel=session.preferences.selection,b=session.model.get(sel?.ballotId);if(!b)return'<h1>Choose an area first.</h1>'+button('district','Open District','','primary');
 const r=b.contests[Math.min(index,b.contests.length-1)],g=session.model.get(sel.guideId);
 return '<p class="eyebrow">'+h(session.model.get(b.electionId).title)+'</p><h1 class="guide-title">Voting Guide for '+h(session.model.get(sel.areaId)?.label)+'</h1><p class="small">'+h(g?g.title+' · '+session.model.get(g.authorId).name:'No opinion guide')+'</p>'+progressView(session,b,index)+filterView(session)+
 (index>0?button('previous','← Back: '+h(b.contests[index-1].titleLines[0])+' ('+index+'/'+b.contests.length+')','','nav-chip'):'')+sectionView(session,r,{...sel,adminMode})+
 (index<b.contests.length-1?'<div class="next-chip">'+button('next','Next: '+h(b.contests[index+1].titleLines[0])+' ('+(index+2)+'/'+b.contests.length+') →','','nav-chip')+'</div>':'')+'<div class="next-chip">'+backToStartView()+'</div>'+
 '<div class="section-dock">'+button('view',minimapView(session,r.id)+'<span>Ballot Viewer</span>','','map-button')+button('previous',icon('back')+'Back',disabled(index===0),'quiet')+button('next','Next'+icon('next'),disabled(index===b.contests.length-1),'primary')+'</div>';
}
export function paperView(session,{index=0,adminMode=false}){
 const sel=session.preferences.selection,m=session.model,b=m.get(sel.ballotId),r=b.contests[index],layout=m.layoutFor(b.id).find(x=>x.page.id===r.pageId);
 return '<div class="paper-page" data-page="'+h(layout.page.id)+'" style="--columns:'+layout.page.columns+';--paper-width:'+Math.max(720,layout.page.columns*340)+'px"><header class="paper-heading"><h2>'+h(b.title)+'</h2><p>'+h(m.get(b.electionId).title)+(layout.page.label?' · '+h(layout.page.label):'')+'</p></header><div class="paper-columns">'+layout.columns.map(col=>'<div class="paper-column" data-column="'+col.number+'">'+col.contests.map(c=>sectionView(session,c,{...sel,adminMode,paper:true})).join('')+'</div>').join('')+'</div></div>';
}
export const allIcon=()=>'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6M7 7h10v10H7z"/></svg>';
export function viewerView(session){
 return '<header class="dialog-header"><h2 id="viewer-title" tabindex="-1">Ballot Viewer</h2>'+button('close-view',icon('close'),'aria-label="Close ballot viewer"','icon-button')+'</header><div class="viewer-filter">'+filterView(session)+'</div>'+
 '<div class="viewer-canvas" tabindex="0" aria-label="Ballot canvas. Drag to pan. Use the zoom controls or mouse wheel to zoom."><div class="viewer-paper"></div><div class="focus-frame" aria-hidden="true"></div></div>'+
 '<div class="zoom-capsule"><button type="button" data-camera="plus" aria-label="Zoom in">+</button><input type="range" min="0" max="100" step="1" value="0" aria-label="Ballot zoom"><button type="button" data-camera="minus" aria-label="Zoom out">−</button></div>'+
 '<button class="all-button icon-button" type="button" data-camera="all" aria-label="All — fit the current ballot page" title="All — fit the current ballot page">'+allIcon()+'</button><button type="button" class="section-return" data-camera="return" hidden></button><div class="pinch-hint" aria-hidden="true">Pinch &amp; Zoom</div>'+
 '<footer class="viewer-toolbar"><label class="check-row"><input type="checkbox" data-snap>Snap</label><button type="button" data-camera="previous" aria-label="Previous section">'+icon('back')+'Prev</button><span class="viewer-count" aria-live="polite"></span><button type="button" data-camera="next" aria-label="Next section">Next'+icon('next')+'</button></footer>';
}
