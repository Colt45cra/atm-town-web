import {currentMap} from './map-importer.js';
import {VEHICLE_MODELS,validateVehicle} from '../js/vehicle-contract.js';
const check=r=>{if(r.error)throw r.error;return r.data;};
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function publicVehicleState(row){return{vehicle_id:row.vehicle_id,x:row.x,y:row.y,facing:row.facing,driver_session:Date.parse(row.lease_expires)>Date.now()?row.driver_session:null,updated_at:row.updated_at};}
export async function handleVehicles(admin,req){
 const action=String(req.query?.action||req.body?.action||''),current=await currentMap(admin),objects=current.objects.filter(o=>o.active!==false&&o.collision?.vehicle);
 if(action==='vehicle-state'&&req.method==='GET'){const rows=check(await admin.from('town_vehicle_state').select('vehicle_id,x,y,facing,driver_session,lease_expires,updated_at'));const ids=new Set(objects.map(o=>o.id));return{vehicles:rows.filter(r=>ids.has(r.vehicle_id)).map(publicVehicleState)};}
 if(req.method!=='POST'||!['vehicle-claim','vehicle-heartbeat','vehicle-release'].includes(action))throw fail('Method not allowed.',405);
 const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{},id=body.vehicle_id,session=body.session_id;
 if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id||'')||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(session||''))throw fail('Invalid vehicle or session.');
 const object=objects.find(o=>o.id===id);if(!object)throw fail('This vehicle is no longer on the map.',404);const spec=validateVehicle(object.collision.vehicle),b=current.manifest.bounds;
 let x=Number(body.x),y=Number(body.y),facing=body.facing;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<b.minX||x>b.maxX||y<b.minY||y>b.maxY)throw fail('Keep the vehicle inside the map.');
 if(action==='vehicle-claim'){
  const existing=check(await admin.from('town_vehicle_state').select('x,y').eq('vehicle_id',id).maybeSingle());const p=existing||{x:object.x,y:object.y-22};
  if(Math.hypot(x-p.x,y-p.y)>180+object.width/2)throw fail('Move closer to this vehicle.');x=p.x;y=p.y;facing=spec.facing;
 }
 if(!['north','south','east','west'].includes(facing))throw fail('Invalid facing.');
 const token=action==='vehicle-claim'?null:body.lease_token;if(token&&!/^[a-f0-9-]{36}$/i.test(token))throw fail('Invalid vehicle lock.');
 const row=check(await admin.rpc('town_vehicle_drive',{p_op:action.slice(8),p_vehicle:id,p_session:session,p_token:token||null,p_x:x,p_y:y,p_facing:facing}));
 if(!row)throw fail(action==='vehicle-claim'?'Another player is driving this vehicle.':'The vehicle lock expired. Get in again.',409);
 return{...publicVehicleState(row),...(action==='vehicle-claim'?{lease_token:row.lease_token}:{})};
}

export async function vehicleArt(query){const spec=validateVehicle({model:query.model,facing:query.facing}),url='https://atm-town-map-studio.cavetech360.chatgpt.site/assets/transport/vehicle-'+spec.model+'-'+spec.facing+'.png';const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))throw fail('Vehicle artwork unavailable.',503);const bytes=await response.arrayBuffer();if(bytes.byteLength>6291456)throw fail('Vehicle artwork is too large.',503);return bytes;}
