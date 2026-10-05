import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { inflateSync } from 'node:zlib';
export const BASE_ATTRIBUTE_CATALOG=JSON.parse(readFileSync(new URL('../admin/catalog.json',import.meta.url),'utf8'));
export const ATTRIBUTE_BUCKET='attribute-sprites';
export const MAX_SPRITE_BYTES=6*1024*1024;
export const ATTRIBUTE_CATEGORIES=Object.freeze({body:'body',chest:'chest',face:'face',head:'head',backpack:'back',back:'katana',gloves:'hands',shoes:'feet',aura:'aura',equipment:'back'});
const fail=message=>Object.assign(new Error(message),{status:400});
export function normalizeEffects(input={}){
 const limits={speed:[.5,2.5],gravity:[.2,3],jump:[.5,4]},effects={};
 for(const [key,[min,max]] of Object.entries(limits)){const value=input[key]??1;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw fail(`${key} is outside its supported range.`);effects[key]=Math.round(value*100)/100;}return effects;
}
export function defaultEffects(id){return {speed:id==='shoes:lightning-force-ones'?1.6:1,gravity:1,jump:1};}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function inspectSpritePng(input){
 const bytes=Buffer.from(input);if(bytes.length>MAX_SPRITE_BYTES||bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw fail('Upload a PNG sprite sheet, up to 6 MB.');
 if(bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(8)!==13)throw fail('Invalid PNG header.');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),depth=bytes[24],color=bytes[25];
 if(width!==768||height!==1280)throw fail('The sprite sheet must be 768 × 1280 pixels (3 columns × 4 rows).');
 if(depth!==8||![2,3,4,6].includes(color)||bytes[26]!==0||bytes[27]!==0||bytes[28]!==0)throw fail('Use an 8-bit, non-interlaced PNG.');
 let alpha=[4,6].includes(color),ended=false;const compressed=[];
 for(let offset=8;offset+12<=bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(length>bytes.length-offset-12)throw fail('The PNG is incomplete.');if(crc32(bytes.subarray(offset+4,offset+8+length))!==bytes.readUInt32BE(offset+8+length))throw fail('The PNG is damaged.');if(type==='tRNS')alpha=true;if(type==='IDAT')compressed.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12;if(type==='IEND'){ended=true;break;}}
 if(!alpha||!ended||!compressed.length)throw fail('The sheet needs a transparent background.');
 const channels={2:3,3:1,4:2,6:4}[color],expected=(width*channels+1)*height;let pixels;
 try{pixels=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected+1});}catch{throw fail('The PNG pixel data is invalid.');}
 if(pixels.length!==expected)throw fail('The PNG pixel data is incomplete.');
 if([4,6].includes(color)){
 const stride=width*channels;let previous=Buffer.alloc(stride),transparent=false;
 for(let row=0;row<height;row++){const at=row*(stride+1),filter=pixels[at],scan=Buffer.from(pixels.subarray(at+1,at+1+stride));if(filter>4)throw fail('Invalid PNG filter.');
 for(let i=0;i<stride;i++){const left=i>=channels?scan[i-channels]:0,up=previous[i],upperLeft=i>=channels?previous[i-channels]:0;let predictor=0;if(filter===1)predictor=left;if(filter===2)predictor=up;if(filter===3)predictor=Math.floor((left+up)/2);if(filter===4){const p=left+up-upperLeft,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upperLeft);predictor=a<=b&&a<=c?left:b<=c?up:upperLeft;}scan[i]=(scan[i]+predictor)&255;}
 for(let i=channels-1;i<stride;i+=channels){if(scan[i]<255){transparent=true;break;}}previous=scan;}
 if(!transparent)throw fail('The background must be transparent.');
 }
 return {width,height};
}
export async function loadAttributeDefinitions(admin){const {data,error}=await admin.from('attribute_definitions').select('item_id,name,character_id,category,slot,sprite_path,effects,updated_at');if(error)throw error;return data||[];}
export function publicAttributeDefinitions(admin,rows){return rows.map(row=>({...row,sprite_url:row.sprite_path?admin.storage.from(ATTRIBUTE_BUCKET).getPublicUrl(row.sprite_path).data.publicUrl:null}));}
export function mergedAttributeCatalog(rows){const items=BASE_ATTRIBUTE_CATALOG.items.map(item=>({...item,effects:defaultEffects(item.id)}));for(const row of rows){const index=items.findIndex(item=>item.id===row.item_id),item={id:row.item_id,name:row.name,characterIds:[row.character_id],category:row.category,slot:row.slot,effects:row.effects,sprite_path:row.sprite_path};if(index<0)items.push(item);else items[index]={...items[index],...item};}return {...BASE_ATTRIBUTE_CATALOG,items};}
export async function createAttributeUpload(admin,user){const path=`${user.id}/${randomUUID()}.png`;const {data,error}=await admin.storage.from(ATTRIBUTE_BUCKET).createSignedUploadUrl(path);if(error)throw error;return {path,token:data.token,bucket:ATTRIBUTE_BUCKET};}
export async function attributePatch(admin,user,body){
 const existing=body.item_id?BASE_ATTRIBUTE_CATALOG.items.find(item=>item.id===body.item_id):null;
 let row=null;if(body.item_id){const result=await admin.from('attribute_definitions').select('*').eq('item_id',body.item_id).maybeSingle();if(result.error)throw result.error;row=result.data;if(!existing&&!row)throw fail('Unknown attribute.');}
 const character_id=String(body.character_id||'');if(!BASE_ATTRIBUTE_CATALOG.characters.some(character=>character.id===character_id))throw fail('Choose a playable character.');
 const category=String(body.category||'');if(!Object.hasOwn(ATTRIBUTE_CATEGORIES,category))throw fail('Choose an attribute category.');
 if(existing&&(existing.id.split(':')[0]!==category||!existing.characterIds.includes(character_id)))throw fail('An existing attribute keeps its character and category.');
 if(row&&(row.character_id!==character_id||row.category!==category))throw fail('An existing attribute keeps its character and category.');
 const name=String(body.name||'').trim();if(name.length<2||name.length>70||/[<>&"\x00-\x1f]/.test(name))throw fail('Enter a name of 2–70 characters without HTML symbols.');
 let sprite_path=row?.sprite_path||null;
 if(body.sprite_path){const path=String(body.sprite_path);if(!new RegExp(`^${user.id}/[a-f0-9-]{36}\\.png$`).test(path))throw fail('Use a sprite uploaded from your admin account.');const {data,error}=await admin.storage.from(ATTRIBUTE_BUCKET).download(path);if(error)throw fail('Upload the sprite sheet before publishing.');inspectSpritePng(await data.arrayBuffer());sprite_path=path;}
 if(!existing&&!row&&!sprite_path)throw fail('Upload a sprite sheet first.');
 return {item_id:body.item_id||`${category}:custom-${randomUUID()}`,name,character_id,category,slot:ATTRIBUTE_CATEGORIES[category],sprite_path,effects:normalizeEffects(body.effects)};
}

export async function adminAttributeAccess(admin,user){
 const {data,error}=await admin.from('town_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error)throw error;return !!data;
}
