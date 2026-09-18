// Reminder intervals advance only after a reminder has actually appeared.
export function createIdleHint(doc=document){
 let element=null,timer=null,shown=0,active=false;
 const delays=[3000,30000,60000];
 function hide(){element?.classList.remove('is-visible');}
 function schedule(){
  clearTimeout(timer);
  if(!element||!active||doc.hidden||doc.querySelector('dialog[open]:not(#ballot-dialog)'))return;
  const delay=delays[Math.min(shown,2)];element.dataset.nextDelay=String(delay);
  timer=setTimeout(()=>{if(active&&!doc.hidden&&!doc.querySelector('dialog[open]:not(#ballot-dialog)')){element.classList.add('is-visible');shown++;element.dataset.shown=String(shown);}},delay);
 }
 function activity(){hide();schedule();}
 const events=['pointerdown','pointermove','wheel','keydown','input'];
 for(const event of events)doc.addEventListener(event,activity,{passive:true,capture:true});
 doc.addEventListener('visibilitychange',activity);
 return {attach(next){element=next;active=Boolean(next);hide();schedule();},pause(){active=false;hide();clearTimeout(timer);},resume(){active=Boolean(element);schedule();},activity,
 destroy(){clearTimeout(timer);for(const event of events)doc.removeEventListener(event,activity,true);doc.removeEventListener('visibilitychange',activity);}};
}
