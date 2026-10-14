import {VEHICLE_MODELS,validateVehicle,validateVehicleTuning} from '../js/vehicle-contract.js';
import {importedMapObjects} from './map-importer.js';
import {listWorldObjects} from './world-objects.js';

const fail=message=>Object.assign(new Error(message),{status:400});
const unwrap=result=>{if(result.error)throw result.error;return result.data;};
export async function vehicleAssets(admin){
 const [uploaded,imported]=await Promise.all([listWorldObjects(admin,{all:true}),importedMapObjects(admin)]);
 const byId=new Map();
 for(const object of [...uploaded,...imported]){
  if(object.active===false||!object.collision?.vehicle)continue;
  try{validateVehicle(object.collision.vehicle);byId.set(object.id,object);}catch{}
 }
 return [...byId.values()];
}
export async function vehicleOverrides(admin){
 const rows=unwrap(await admin.from('town_vehicle_tuning').select('vehicle_id,speed,suspension'));
 return new Map(rows.map(row=>[row.vehicle_id,row]));
}
export function applyVehicleOverrides(objects,overrides){
 return objects.map(object=>{
  const tuning=object.collision?.vehicle&&overrides.get(object.id);
  return tuning?{...object,collision:{...object.collision,vehicle:{...object.collision.vehicle,speed:tuning.speed,suspension:Number(tuning.suspension)}}}:object;
 });
}
export async function listVehicleAdmin(admin){
 const [assets,overrides]=await Promise.all([vehicleAssets(admin),vehicleOverrides(admin)]);
 return assets.map(o=>{
  const model=o.collision.vehicle.model,defaults=VEHICLE_MODELS[model],saved=overrides.get(o.id);
  return{id:o.id,name:o.name,model,source:o.sprite_path?.startsWith('assets/objects/')?'Map Studio':'Admin uploaded',speed:saved?.speed??o.collision.vehicle.speed??defaults.speed,defaultSpeed:defaults.speed,suspension:Number(saved?.suspension??o.collision.vehicle.suspension??1)};
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
export async function saveVehicleAdmin(admin,input){
 const id=String(input.vehicle_id||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw fail('Choose a valid vehicle.');
 const vehicle=(await vehicleAssets(admin)).find(o=>o.id===id);
 if(!vehicle)throw fail('This vehicle is not on the live map. Refresh the list.');
 let tuning;try{tuning=validateVehicleTuning({speed:input.speed,suspension:input.suspension});}catch(error){throw fail(error.message);}
 const row=unwrap(await admin.from('town_vehicle_tuning').upsert({vehicle_id:id,...tuning,updated_at:new Date().toISOString()},{onConflict:'vehicle_id'}).select('vehicle_id,speed,suspension').single());
 return{vehicle_id:row.vehicle_id,speed:row.speed,suspension:Number(row.suspension)};
}
