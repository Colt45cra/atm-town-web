import {fail} from './map-import-validation.js';
export const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const root='https://xnyjurertwohlqczaeux.supabase.co/storage/v1/object/public/world-maps/';
export function storagePath(url){return typeof url==='string'&&url.startsWith(root)?url.slice(root.length):null;}
export function hydrateFileMetadata(manifest,objects,assets=[]){
 const byStorage=new Map(assets.map(f=>[f.storage_path,f]));
 for(const name of ['terrain','collision']){const layer=manifest.layers[name];layer.fileMeta??={};for(const [key,url]of Object.entries(layer.sources||{})){const f=byStorage.get(storagePath(url));if(f)layer.fileMeta[key]={format:f.format||'png',size:f.size,sha256:f.sha256,width:f.width,height:f.height};}}
 for(const o of objects){const f=byStorage.get(storagePath(o.sprite_url));if(f)o.image_file={size:f.size,sha256:f.sha256,width:f.width,height:f.height};}
 const overview=byStorage.get(storagePath(manifest.overview.day));if(overview)manifest.overview.fileMeta={size:overview.size,sha256:overview.sha256,width:overview.width,height:overview.height};
}
export function liveFiles(manifest,objects){const files=new Map();for(const name of ['terrain','collision']){const l=manifest.layers[name];for(const [key,meta]of Object.entries(l.fileMeta||{})){const storage_path=storagePath(l.sources?.[key]);if(storage_path)files.set(`assets/world/${name}/${key}.${meta.format||(/\.webp$/.test(l.sources?.[key]||'')?'webp':'png')}`,{...meta,storage_path});}}
 for(const o of objects){const storage_path=storagePath(o.sprite_url);if(storage_path&&o.image_file)files.set(`assets/objects/${o.id}.png`,{...o.image_file,storage_path});}
 const storage_path=storagePath(manifest.overview.day);if(storage_path&&manifest.overview.fileMeta)files.set('overview.png',{...manifest.overview.fileMeta,storage_path});return files;}
const intersects=(o,b)=>o.x+o.width/2>b.minX&&o.x-o.width/2<b.maxX&&o.y>b.minY&&o.y-o.width*o.image_height/o.image_width<b.maxY;
const placement=o=>({id:o.id,name:o.name,x:o.x,y:o.y,width:o.width,image_width:o.image_width,image_height:o.image_height,solid:o.solid,collision:o.collision,active:o.active!==false});
export function resolveDelta(plan,current){
 const known=liveFiles(current.manifest,current.objects),previous=new Map(current.objects.map(o=>[o.id,o]));
 const files=plan.files.map(f=>{const live=known.get(f.path),same=live&&['size','sha256','width','height'].every(k=>f[k]===live[k]);if(f.reuse&&!same)throw fail('A reused image no longer matches the live map. Prepare the area again.',409);return same?{...f,storage_path:live.storage_path,reuse:true}:{...f,reuse:false};});
 const incoming=new Set(plan.objects.map(o=>o.id)),deleted=plan.selection.deletedObjectIds||[];
 if(!Array.isArray(deleted)||deleted.length>1000||new Set(deleted).size!==deleted.length)throw fail('Invalid deleted object list.');
 for(const id of deleted){const old=previous.get(id);if(!old||incoming.has(id)||!intersects(old,plan.selection.bounds))throw fail('A deleted object must be an imported object in the selected area.');}
 let added=0,changed=0,unchanged=0;for(const o of plan.objects){const old=previous.get(o.id),image=files.find(f=>f.path===o.sprite_path);if(!old)added++;else if(canonical(placement(old))===canonical(placement(o))&&image.reuse)unchanged++;else changed++;}
 const changedFiles=files.filter(f=>!f.reuse),sections=new Set(changedFiles.filter(f=>['terrain','collision'].includes(f.kind)).map(f=>f.path.split('/').pop()));
 // Tracking metadata can be established even when all image bytes are reusable.
 const trackingChanged=plan.selection.updateMode!=='objects-only'&&canonical(plan.selection.editorSources||{})!==canonical(Object.fromEntries(Object.keys(plan.selection.cells).map(k=>[k,current.manifest.editorSources?.[k]]).filter(([,v])=>v)));
 return{files,summary:{new_objects:added,changed_objects:changed,deleted_objects:deleted.length,unchanged_objects:unchanged,changed_sections:sections.size,reused_files:files.length-changedFiles.length,upload_files:changedFiles.length},no_changes:!changedFiles.length&&!added&&!changed&&!deleted.length&&!trackingChanged};
}
