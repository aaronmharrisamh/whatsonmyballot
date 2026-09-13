import { createGuideModel as createRaceGuide } from '../../Mockup A/assets/model.js';
// Preserve the existing 27-race save. The party mark is a separate, versioned choice.
export function createGuideModel(seed, storage) {
 const base=createRaceGuide(seed,storage),party=seed.content.contests.find(r=>r.kind==='straight-party');
 const key='whatsonmyballot:'+new URL('../../',import.meta.url).pathname+':'+seed.datasetId+':party-choice:v1';
 let optionId=null,currentId=base.state.currentRaceId,available=Boolean(storage);
 const empty=()=>({candidateIds:[],optionIds:optionId?[optionId]:[],writeIns:{}});
 try {
  const saved=JSON.parse(storage?.getItem(key)||'null');
  if(saved?.format==='whatsonmyballot-party-choice'&&saved.schemaVersion==='1.0.0'&&saved.datasetId===seed.datasetId&&saved.baseDatasetVersion===seed.baseDatasetVersion&&party.optionIds.includes(saved.optionId))optionId=saved.optionId;
 } catch {available=false;}
 function save(){try{if(optionId)storage?.setItem(key,JSON.stringify({format:'whatsonmyballot-party-choice',schemaVersion:'1.0.0',datasetId:seed.datasetId,baseDatasetVersion:seed.baseDatasetVersion,optionId}));else storage?.removeItem(key);}catch{available=false;}}
 return {
  ...base,races:seed.content.contests,key:base.key,partyKey:key,
  get state(){return {...base.state,currentRaceId:currentId,choices:{...base.state.choices,[party.id]:empty()}};},
  get storageAvailable(){return available&&base.storageAvailable;},
  record:id=>id===party.id?empty():base.record(id),
  count:id=>id===party.id?Number(Boolean(optionId)):base.count(id),
  answered:()=>base.answered()+Number(Boolean(optionId)),
  visit(id){if(id===party.id||base.races.some(r=>r.id===id)){currentId=id;if(id!==party.id)base.visit(id);}},
  chooseOption(id,next,checked){
   if(id!==party.id)return base.chooseOption(id,next,checked);
   if(!party.optionIds.includes(next))return {ok:false,message:'This party is not in the sample.'};
   optionId=checked?next:null;save();return {ok:true};
  },
  clearRace(id,skipped=false){if(id===party.id){optionId=null;save();}else base.clearRace(id,skipped);},
  clearAll(){base.clearAll();optionId=null;currentId=party.id;save();},
  example(){base.example();optionId=null;currentId=base.state.currentRaceId;save();}
 };
}
