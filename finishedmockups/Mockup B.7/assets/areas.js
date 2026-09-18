// A versioned catalog describes geography separately from each ballot bundle.
export function createAreaCatalog(value){
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const exact=(v,fields)=>object(v)&&Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
 const id=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(v),label=v=>typeof v==='string'&&v.trim().length>0&&v.length<=160;
 if(!exact(value,['format','schemaVersion','catalogId','revision','defaultAreaId','levels','locations','ballots'])||value.format!=='whatsonmyballot-area-catalog'||value.schemaVersion!=='1.0.0'||!id(value.catalogId)||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.levels)||!value.levels.length||!Array.isArray(value.locations)||!Array.isArray(value.ballots))throw Error('Unsupported area catalog.');
 const levels=new Map(),nodes=new Map(),ballots=new Map();
 for(const [i,l]of value.levels.entries()){if(!exact(l,['id','label'])||!id(l.id)||!label(l.label)||levels.has(l.id))throw Error('Invalid area level.');levels.set(l.id,{...l,index:i});}
 for(const b of value.ballots){
  if(!exact(b,['id','datasetId','label','basePath','pages'])||!id(b.id)||!id(b.datasetId)||!label(b.label)||ballots.has(b.id)||typeof b.basePath!=='string'||!/^\.\/(?:[a-zA-Z0-9_-]+\/)*$/.test(b.basePath)||!Array.isArray(b.pages))throw Error('Invalid ballot entry.');
  const pages=new Set();for(const p of b.pages){if(!exact(p,['page','label'])||!Number.isInteger(p.page)||p.page<1||!label(p.label)||pages.has(p.page))throw Error('Invalid ballot page.');pages.add(p.page);}
  ballots.set(b.id,b);
 }
 for(const n of value.locations){if(!exact(n,['id','level','parentId','label','ballotId'])||!id(n.id)||!label(n.label)||!levels.has(n.level)||nodes.has(n.id)||n.parentId!==null&&!id(n.parentId)||n.ballotId!==null&&!ballots.has(n.ballotId))throw Error('Invalid location.');nodes.set(n.id,n);}
 for(const n of nodes.values()){
  const depth=levels.get(n.level).index,parent=nodes.get(n.parentId);
  if(depth===0?n.parentId!==null:!parent||levels.get(parent.level).index!==depth-1)throw Error('Invalid location parent.');
  const children=[...nodes.values()].filter(c=>c.parentId===n.id);
  if(depth<value.levels.length-1&&!children.length||children.length&&n.ballotId!==null)throw Error('Only leaf areas can have ballots.');
 }
 if(!nodes.has(value.defaultAreaId)||!nodes.get(value.defaultAreaId).ballotId)throw Error('The default area needs a ballot.');
 const children=parentId=>[...nodes.values()].filter(n=>n.parentId===parentId);
 const path=areaId=>{const out=[];let n=nodes.get(areaId);while(n){out.unshift(n);n=nodes.get(n.parentId);}return out;};
 const available=areaId=>{const n=nodes.get(areaId);return Boolean(n&&(n.ballotId||children(n.id).some(c=>available(c.id))));};
 const leaf=areaId=>{let n=nodes.get(areaId);while(n){const next=children(n.id);if(!next.length)return n; n=next.find(c=>available(c.id))||next[0];}return null;};
 return{value,children,path,available,leaf,node:areaId=>nodes.get(areaId),ballot:areaId=>ballots.get(nodes.get(areaId)?.ballotId),label:areaId=>path(areaId).map(n=>n.label).join(' · '),defaultArea:()=>nodes.get(value.defaultAreaId),
  restore(storage,key){try{const s=JSON.parse(storage?.getItem(key));if(s?.schemaVersion==='1.0.0'&&s.catalogId===value.catalogId&&nodes.has(s.areaId)&&!children(s.areaId).length)return s.areaId;}catch{}return value.defaultAreaId;},
  save(storage,key,areaId){if(!nodes.has(areaId)||children(areaId).length)throw Error('Choose a complete area.');try{storage?.setItem(key,JSON.stringify({schemaVersion:'1.0.0',catalogId:value.catalogId,areaId}));return Boolean(storage);}catch{return false;}}
 };
}
