import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {inspectSpritePng} from './attribute-catalog.js';
const bucket='world-objects';
const check=({data,error})=>{if(error)throw error;return data;};
const fail=message=>Object.assign(new Error(message),{status:400});
export async function listWorldObjects(admin,{all=false}={}){
 let query=admin.from('town_world_objects').select(all?'*':'id,name,sprite_path,image_width,image_height,x,y,width,solid,active,updated_at').order('updated_at');if(!all)query=query.eq('active',true);
 return check(await query).map(row=>({...row,sprite_url:admin.storage.from(bucket).getPublicUrl(row.sprite_path).data.publicUrl}));
}
export async function worldObjectUpload(admin,user){const path=`${user.id}/${randomUUID()}.png`;const data=check(await admin.storage.from(bucket).createSignedUploadUrl(path));return {bucket,path,token:data.token};}
export async function saveWorldObject(admin,user,input){
 const name=String(input.name||'').trim();if(name.length<2||name.length>70)throw fail('Enter an object name of 2–70 characters.');
 const bounds=JSON.parse(readFileSync(new URL('../assets/world/manifest.json',import.meta.url))).bounds;
 const {x,y,width}=input;if(![x,y,width].every(Number.isFinite)||x<bounds.minX||x>bounds.maxX||y<bounds.minY||y>bounds.maxY||width<16||width>512)throw fail('Place the object inside the map and set its width between 16 and 512 pixels.');
 if(typeof input.active!=='boolean'||typeof input.solid!=='boolean')throw fail('Invalid object visibility or collision settings.');
 let old=null;if(input.id){old=check(await admin.from('town_world_objects').select('*').eq('id',input.id).single());}
 let path=old?.sprite_path,dimensions=old?{width:old.image_width,height:old.image_height}:null;
 if(input.sprite_path){path=String(input.sprite_path);if(!new RegExp(`^${user.id}/[a-f0-9-]{36}\\.png$`).test(path))throw fail('Use an image uploaded from this admin account.');const image=check(await admin.storage.from(bucket).download(path));dimensions=inspectSpritePng(await image.arrayBuffer(),{object:true});}
 if(!path||!dimensions)throw fail('Upload a PNG (transparency optional) first.');
 if(width*dimensions.height/dimensions.width>1024)throw fail('The object’s displayed height must be at most 1024 world pixels. Reduce its width.');
 const patch={name,sprite_path:path,image_width:dimensions.width,image_height:dimensions.height,x,y,width,solid:input.solid,active:input.active,updated_at:new Date().toISOString()};
 if(old)return check(await admin.from('town_world_objects').update(patch).eq('id',old.id).select('*').single());
 const count=await admin.from('town_world_objects').select('id',{count:'exact',head:true});if(count.error)throw count.error;if(count.count>=100)throw fail('The map supports up to 100 uploaded objects.');
 return check(await admin.from('town_world_objects').insert({...patch,created_by:user.id}).select('*').single());
}
