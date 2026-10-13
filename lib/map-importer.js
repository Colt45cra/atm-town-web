import {canonical,hydrateFileMetadata,resolveDelta} from './map-delta.js';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fail,uuid,validateMapPlan,inspectMapPng,mergeSelectedMap} from './map-import-validation.js';
const BUCKET='world-maps';
const fingerprint=plan=>canonical({selection:plan.selection,objects:plan.objects,files:(plan.files||plan.assets).map(({storage_path,...file})=>file)});
const baseline=()=>JSON.parse(readFileSync(new URL('../assets/world/manifest.json',import.meta.url),'utf8'));
const check=result=>{if(result.error)throw result.error;return result.data;};
export async function currentMap(admin){const live=check(await admin.from('town_map_live').select('*').eq('singleton',true).single());let version=null;if(live.version_id)version=check(await admin.from('town_map_versions').select('id,manifest,objects,assets').eq('id',live.version_id).single());const manifest=structuredClone(version?.manifest||baseline()),objects=structuredClone(version?.objects||[]);hydrateFileMetadata(manifest,objects,version?.assets);return{live,manifest,objects};}
export async function publicMapManifest(admin){const {live,manifest}=await currentMap(admin);return{...manifest,mapRevision:live.revision,mapVersion:live.version_id};}
export async function importedMapObjects(admin,versionId){if(versionId==='original')return[];if(versionId){uuid(versionId);const row=check(await admin.from('town_map_versions').select('objects,published_at').eq('id',versionId).single());if(!row.published_at)throw fail('Map version is not published.',404);return row.objects;}return(await currentMap(admin)).objects;}
async function getOwnedDraft(admin,user,id){uuid(id);const row=check(await admin.from('town_map_versions').select('*').eq('id',id).eq('created_by',user.id).single());if(row.status!=='draft')throw fail('This map is already validated. Create a new upload.');return row;}
export async function handleMapAdmin(admin,user,action,body){
 if(action==='admin-map-state'){const current=await currentMap(admin);const versions=check(await admin.from('town_map_versions').select('id,label,status,created_at,published_at,base_revision').order('created_at',{ascending:false}).limit(30));return{revision:current.live.revision,version_id:current.live.version_id,manifest:current.manifest,objects:current.objects,versions};}
 if(action==='admin-map-init'){
  const current=await currentMap(admin);if(body.base_revision!==current.live.revision)throw fail('The game map changed. Refresh Map Studio and prepare the selection again.',409);
  const plan=validateMapPlan(body,current.objects);const delta=resolveDelta(plan,current);plan.files=delta.files;if(delta.no_changes)return{no_changes:true,summary:delta.summary};mergeSelectedMap(current.manifest,{...plan,id:'validation'},()=> 'validated-url',current.objects);
  const nativeIds=check(await admin.from('town_world_objects').select('id'));const ids=new Set(nativeIds.map(o=>o.id));if(plan.objects.some(o=>ids.has(o.id)))throw fail('An imported object conflicts with an existing game object.');
  const candidates=check(await admin.from('town_map_versions').select('*').eq('created_by',user.id).eq('status','draft').eq('base_revision',current.live.revision).order('created_at',{ascending:false}).limit(20));
  const existing=candidates.find(row=>fingerprint(row)===fingerprint(plan));if(existing)return{id:existing.id,file_count:existing.assets.filter(f=>!f.reuse).length,upload_paths:existing.assets.filter(f=>!f.reuse).map(f=>f.path),summary:delta.summary,resumed:true};
  const drafts=await admin.from('town_map_versions').select('id',{count:'exact',head:true}).eq('created_by',user.id).eq('status','draft').gte('created_at',new Date(Date.now()-3600000).toISOString());if(drafts.error)throw drafts.error;if(drafts.count>=20)throw fail('Too many unfinished map uploads. Retry an existing upload or wait before starting another.',429);
  const id=randomUUID(),files=plan.files.map((f,i)=>({...f,storage_path:f.reuse?f.storage_path:`${user.id}/${id}/${i}.png`}));check(await admin.from('town_map_versions').insert({id,created_by:user.id,base_revision:current.live.revision,label:plan.label,selection:plan.selection,assets:files,objects:plan.objects}));return{id,file_count:files.filter(f=>!f.reuse).length,upload_paths:files.filter(f=>!f.reuse).map(f=>f.path),summary:delta.summary};
 }
 if(action==='admin-map-upload'){
  const row=await getOwnedDraft(admin,user,body.id);
  if(body.check_only===true){const prefix=`${user.id}/${row.id}`,names=new Set();for(let offset=0;offset<=row.assets.length;offset+=1000){const page=check(await admin.storage.from(BUCKET).list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}}));for(const entry of page)if(entry.id)names.add(entry.name);if(page.length<1000)break;}return{uploaded:row.assets.filter(file=>file.reuse||names.has(file.storage_path.slice(prefix.length+1))).map(file=>file.path)};}
  if(!Array.isArray(body.paths)||body.paths.length<1||body.paths.length>8)throw fail('Request up to 8 upload links at a time.');
  const links=await Promise.all(body.paths.map(async path=>{const file=row.assets.find(f=>f.path===path);if(!file)throw fail('Unknown upload file.');if(file.reuse)return{path:file.path,uploaded:true};const storage=admin.storage.from(BUCKET);const split=file.storage_path.lastIndexOf('/'),name=file.storage_path.slice(split+1);const entries=check(await storage.list(file.storage_path.slice(0,split),{search:name,limit:100}));if(entries.some(entry=>entry.name===name&&entry.id))return{path:file.path,uploaded:true};const data=check(await storage.createSignedUploadUrl(file.storage_path));return{path:file.path,url:data.signedUrl};}));return{links};
 }
 if(action==='admin-map-validate'){
  const row=await getOwnedDraft(admin,user,body.id),current=await currentMap(admin);if(row.base_revision!==current.live.revision)throw fail('The game map changed during upload. Prepare the update again.',409);
  const plan={id:row.id,label:row.label,selection:row.selection,objects:row.objects,files:row.assets};
  // Immutable, server-minted paths only. Check bytes, PNG CRCs and dimensions before readiness.
  let nextFile=0;await Promise.all(Array.from({length:4},async()=>{while(nextFile<row.assets.length){const file=row.assets[nextFile++];if(file.reuse)continue;const data=check(await admin.storage.from(BUCKET).download(file.storage_path));inspectMapPng(await data.arrayBuffer(),file);}}));
  const byPath=new Map(row.assets.map(f=>[f.path,f.storage_path]));const urlFor=path=>{const stored=byPath.get(path);if(!stored)throw fail('Missing map asset.');return admin.storage.from(BUCKET).getPublicUrl(stored).data.publicUrl;};
  const merged=mergeSelectedMap(current.manifest,plan,urlFor,current.objects);
  check(await admin.from('town_map_versions').update({status:'ready',manifest:merged.manifest,objects:merged.objects}).eq('id',row.id).eq('status','draft'));
  return{id:row.id,ready:true,section_count:Object.keys(row.selection.cells).length,object_count:plan.objects.length,manifest:merged.manifest,base_revision:row.base_revision};
 }
 if(action==='admin-map-publish'||action==='admin-map-rollback'){
  const rollback=action==='admin-map-rollback';if(!Number.isSafeInteger(body.expected_revision)||body.expected_revision<0)throw fail('Refresh the map before publishing.');const id=rollback&&body.id===null?null:uuid(body.id);
  const result=await admin.rpc('town_map_activate',{p_actor:user.id,p_version:id,p_expected_revision:body.expected_revision,p_rollback:rollback});if(result.error?.code==='40001')throw fail(result.error.message,409);const revision=check(result);return{published:true,revision,version_id:id};
 }
 throw fail('Unknown map import action.');
}

