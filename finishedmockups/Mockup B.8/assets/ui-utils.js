import{marked}from'../../Mockup A/assets/vendor/marked.esm.js';
export const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const lines=value=>(value||[]).map(h).join('<br>');
const paths={print:'M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h1',menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M6 18 18 6',back:'m14 5-7 7 7 7',next:'m10 5 7 7-7 7',search:'M16.5 16.5 22 22M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',scale:'M12 3v17M6 21h12M4 7h16M6 7l-4 7h8L6 7m12 0-4 7h8l-4-7',ballot:'M6 2h12v20H6zM9 6h6M9 10h6M9 14h6M9 18h6',district:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6m6-3v15m6-12v15',guide:'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',edit:'m14 4 6 6M4 20l4-1L21 6l-3-3L5 16l-1 4',upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',download:'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',check:'m5 12 4 4 10-10'};
export const icon=name=>'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.ballot)+'"/></svg>';
export function markdown(text){if(!text?.trim())return'';return DOMPurify.sanitize(marked.parse(text,{async:false}),{ALLOWED_TAGS:['p','br','strong','em','ul','ol','li','blockquote','h2','h3','h4','a','code','pre','hr'],ALLOWED_ATTR:['href','title'],ALLOW_DATA_ATTR:false,ALLOWED_URI_REGEXP:/^https:\/\//i});}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export const megabytes=n=>(n/1_000_000).toFixed(2)+' MB';
export const makeId=prefix=>prefix+'-'+crypto.randomUUID();
export const option=(id,label,current)=>'<option value="'+h(id)+'"'+(id===current?' selected':'')+'>'+h(label)+'</option>';

export const ownValue=(object,key,fallback)=>object&&Object.hasOwn(object,key)?object[key]:fallback;
export const personalMarks=(session,ballotId,contestId)=>ownValue(ownValue(session.choices,ballotId,{}),contestId,[]);
