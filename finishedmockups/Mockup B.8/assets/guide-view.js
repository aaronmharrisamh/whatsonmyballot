import{h,lines,icon}from'./ui-utils.js';
import{button,guideHint,personalOval,actionsView,opinionView,ownContent}from'./ballot-ui.js';
import{projectGuide}from'./guide-output.js';
export const guideUI={opinions:new Map(),scope:'',sync(session){const key=session.token.generation+'|'+session.preferences.selection?.ballotId+'|'+session.preferences.selection?.guideId;if(this.scope!==key){this.scope=key;this.opinions.clear();}}};
export function guideTargetState(session,id){const state=ownContent(session.model,session.preferences.selection?.guideId,id);return{...state,open:Boolean(state.opinion&&(guideUI.opinions.has(id)?guideUI.opinions.get(id):state.recommended))};}
export const flagMark=()=>'<svg class="guide-emblem" viewBox="0 0 48 48" aria-hidden="true"><rect x="3" y="8" width="42" height="30" rx="3" fill="#fff" stroke="#d7e0e7"/><path d="M4 12h40M4 21h40M4 30h40" stroke="#a3414a" stroke-width="4"/><path fill="#1d3c5a" d="M3 8h21v20H3z"/><path d="m13.5 12 1.5 4 4.4.2-3.5 2.8 1.2 4.2-3.6-2.5-3.6 2.5 1.2-4.2-3.5-2.8 4.4-.2z" fill="#fff"/></svg>';
const dateLabel=value=>value?new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(value)):'';
export function guideHeader(snapshot,{logoURL='',print=false}={}){
 const {election,areaPath,ballot,guide,author}=snapshot;
 return '<header class="voter-guide-header">'+(logoURL?'<img class="guide-emblem" src="'+h(logoURL)+'" alt="'+h(author?.organization||author?.name||'Guide')+' logo">':flagMark())+'<div><p class="guide-election">'+h(election.title)+' · '+h(dateLabel(election.date))+'</p><h1>Voter Guide</h1><p class="guide-area">'+h(areaPath.map(a=>a.label).join(' · '))+'</p><p class="guide-ballot-name">'+h(ballot.title)+'</p>'+(ballot.districtLabels.length?'<p class="guide-districts">'+ballot.districtLabels.map(h).join(' <span aria-hidden="true">|</span> ')+'</p>':'')+'<p class="guide-attribution">'+h(guide?guide.title:'No opinion guide')+(author?' — '+h(author.name)+(author.organization?' · '+h(author.organization):''):'')+(guide?.updatedAt?'<small>Updated '+h(dateLabel(guide.updatedAt))+'</small>':'')+'</p></div></header>';
}
export function outputActions(){return '<div class="guide-actions">'+button('ballot-pdf',icon('download')+'<span>PDF of Ballot with Recommendations</span>','','primary')+button('print-guide',icon('print')+'<span>Print my Guide</span>','','quiet')+'</div><p class="output-status small" role="status" aria-live="polite"></p>';}
const meaning=mark=>mark==='this'?'Choose This':'Optional';
function printOpinion(opinion,heading='Opinion'){return opinion?'<aside class="print-opinion"><strong>'+h(heading)+'</strong><p>'+h(opinion.text)+'</p><small>'+h(opinion.author.name)+'</small></aside>':'';}
export function recommendationRow(row,session,{print=false}={}){
 const c=row.choice,marker='<span class="recommendation-symbol" aria-label="'+(row.mark==='this'?'Recommended':'Optional')+'">'+guideHint(row.mark)+personalOval(false,row.mark)+'<small>'+(row.mark==='this'?'RECOMMENDED':'OPTIONAL')+'</small></span>';
 const controls=print?'':'<div class="row-tools guide-row-tools">'+actionsView(session,c.id,'guide',guideTargetState(session,c.id))+'</div>';
 return '<div class="guide-choice'+(print&&JSON.stringify(c).length+(row.opinion?.text.length||0)<1800?' print-choice-compact':'')+'" data-guide-choice="'+h(c.id)+'" data-color="'+h(row.color)+'">'+marker+'<div class="guide-choice-copy"><strong>'+lines(c.labelLines)+'</strong>'+(c.members?'<p class="guide-ticket">'+c.members.map(m=>h(m.role)+': '+h(m.name)).join('<br>')+'</p>':'')+(c.party||c.designation?'<small>'+h([c.party,c.designation].filter(Boolean).join(' · '))+'</small>':'')+controls+(print?printOpinion(row.opinion,'Opinion — '+meaning(row.mark)):opinionView(session,c.id,'guide',guideTargetState(session,c.id)))+'</div></div>';
}
export function guideContest(row,session,{print=false}={}){
 const r=row.contest;
 const heading='<header><div><h3>'+lines(r.titleLines)+'</h3><p class="guide-instruction">'+h(r.instruction)+'</p>'+(r.district?'<small>'+h(r.district)+'</small>':'')+'</div>'+(print?'':'<div class="row-tools guide-header-tools">'+actionsView(session,r.id,'guide',guideTargetState(session,r.id))+'</div>')+'</header>'+
 (r.kind==='proposal'&&r.question?'<p class="guide-question">'+h(r.question)+'</p>':'')+
 (print?printOpinion(row.opinion):opinionView(session,r.id,'guide',guideTargetState(session,r.id)));
 const choices=row.recommendations.map(choice=>recommendationRow(choice,session,{print})),first=choices.shift()||'<p class="no-recommendations">— No recommendations</p>';
 const leadLength=r.titleLines.join('').length+r.instruction.length+(r.question?.length||0)+(row.opinion?.text.length||0)+(row.recommendations[0]?.opinion?.text.length||0)+JSON.stringify(row.recommendations[0]?.choice||{}).length;
 return '<article class="guide-contest" data-guide-contest="'+h(r.id)+'">'+(print?'<div class="'+(leadLength<1000?'print-contest-lead':'')+'">'+heading+first+'</div>':heading+first)+choices.join('')+'</article>';
}
export function guideGroup(group,session,options={}){
 return '<section class="cheatsheet-group" data-category="'+h(group.category)+'" data-guide-group="'+h(group.id)+'"><h2>'+h(group.title)+'</h2>'+group.contests.map(row=>guideContest(row,session,options)).join('')+'</section>';
}
export function guideBody(snapshot,session,{print=false}={}){
 const left=snapshot.groups.filter(g=>g.category==='partisan'),right=snapshot.groups.filter(g=>g.category==='nonpartisan'),proposals=snapshot.groups.filter(g=>g.category==='proposals'),columns=[left,right].filter(g=>g.length),render=groups=>groups.map(group=>guideGroup(group,session,{print})).join('');
 const printStreams=columns.map(groups=>groups.flatMap(group=>group.contests.map((row,i)=>({
 html:'<div class="print-group-cell" data-category="'+h(group.category)+'">'+(i===0?'<h2>'+h(group.title)+'</h2>':'')+guideContest(row,null,{print:true})+'</div>',
 weight:row.contest.titleLines.join('').length+row.contest.instruction.length+(row.opinion?.text.length||0)+row.recommendations.reduce((n,r)=>n+200+r.choice.labelLines.join('').length+(r.opinion?.text.length||0),0)
 }))));
 const printRows=Array.from({length:Math.max(0,...printStreams.map(s=>s.length))},(_,i)=>'<div class="print-contest-row'+(printStreams.some(stream=>(stream[i]?.weight||0)>1600)?' print-long-row':'')+'">'+printStreams.map(stream=>stream[i]?.html||'<div class="print-group-cell print-empty"></div>').join('')+'</div>').join('');
 const primary=print?'<div class="print-columns'+(columns.length===1?' print-one-column':'')+'">'+printRows+'</div>':'<div class="guide-columns" style="--guide-columns:'+Math.max(1,columns.length)+'">'+columns.map(groups=>'<div class="guide-column">'+render(groups)+'</div>').join('')+'</div>';
 return (columns.length?primary:'')+'<div class="guide-proposals">'+render(proposals)+'</div>';
}
export function guideView(session){
 if(!session.preferences.selection?.ballotId)return '<h1>Choose an area first.</h1>';
 guideUI.sync(session);const snapshot=projectGuide(session.model,session.preferences.selection),logo=snapshot.author?.logoAttachmentId;
 return '<div class="voter-guide">'+guideHeader(snapshot,{logoURL:logo?session.resources.url(logo):''})+outputActions()+guideBody(snapshot,session)+outputActions()+'</div>';
}
export function printGuideHTML(snapshot){
 return '<div class="print-sheet">'+guideHeader(snapshot,{print:true})+guideBody(snapshot,null,{print:true})+'<p class="print-reference-note">Guide recommendations · '+h(snapshot.guide?.title||'No opinion guide')+' · Revision '+snapshot.revision+'</p></div>';
}
export function printPageStyle(snapshot){
 const quote=value=>'"'+Array.from(value).map(c=>/[\r\n\f]/.test(c)?' ':c==='\\'||c==='"'?'\\'+c:c).join('')+'"';
 const label=Array.from(snapshot.area.label+' · '+(snapshot.guide?.title||'No opinion guide'));
 const right=label.length>75?label.slice(0,74).join('')+'…':label.join('');
 return '@media print{@page{@top-left{content:'+quote('Voter Guide · '+snapshot.election.date)+';font:8pt Arial;color:#526376;vertical-align:bottom;padding-bottom:3mm}@top-right{content:'+quote(right)+';font:8pt Arial;color:#526376;vertical-align:bottom;padding-bottom:3mm}}}';
}
