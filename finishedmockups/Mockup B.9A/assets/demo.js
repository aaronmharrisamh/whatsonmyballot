// Bundled fixture: deterministic random data, initialized once per fictional dataset.
export function applyDemoChoices(model,fixture,storage,force=false){
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const fields=(v,keys)=>object(v)&&Object.keys(v).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(v,k));
 if(!fields(fixture,['format','schemaVersion','datasetId','randomSeed','records'])||!Array.isArray(fixture.records)||typeof fixture.randomSeed!=='string')throw Error('Invalid demo fixture.');
 if(fixture.format!=='whatsonmyballot-demo-choices'||fixture.schemaVersion!=='1.0.0'||fixture.datasetId!==model.state.datasetId)throw Error('The demo choices do not match this ballot.');
 const seen=new Set();
 for(const record of fixture.records){
  if(!fields(record,['raceId','candidateIds','optionIds','writeIns'])||!object(record.writeIns))throw Error('Invalid sample record.');
  const race=model.races.find(r=>r.id===record.raceId);
  if(!race||seen.has(race.id)||!Array.isArray(record.candidateIds)||!Array.isArray(record.optionIds)||!record.writeIns)throw Error('Invalid sample choices.');
  seen.add(race.id);
  const ids=[...record.candidateIds,...record.optionIds],writes=Object.entries(record.writeIns);
  if(new Set(ids).size!==ids.length||record.candidateIds.some(id=>!race.candidateIds.includes(id))||record.optionIds.some(id=>!race.optionIds.includes(id))||writes.some(([id,name])=>!race.writeIns.some(w=>w.id===id)||typeof name!=='string'||name.length>120)||ids.length+writes.filter(([,name])=>name.trim()).length>race.maxSelections)throw Error('Sample choices exceed this section’s limit.');
 }
 if(seen.size!==model.races.length)throw Error('A demo section is missing.');
 const key=model.key+':demo-seed:v1';
 if(!force){try{if(storage?.getItem(key)||storage?.getItem(model.key)||storage?.getItem(model.partyKey))return false;}catch{}}
 model.clearAll();
 for(const r of fixture.records){
  r.candidateIds.forEach(id=>model.choose(r.raceId,id,true));r.optionIds.forEach(id=>model.chooseOption(r.raceId,id,true));
  for(const[id,name]of Object.entries(r.writeIns))model.write(r.raceId,id,name);
 }
 try{storage?.setItem(key,JSON.stringify({schemaVersion:'1.0.0',datasetId:fixture.datasetId,seed:fixture.randomSeed}));}catch{}
 return true;
}
