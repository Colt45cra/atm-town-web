import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {webcrypto,createHash} from 'node:crypto';
const origin='https://town.invalid',tile='https://storage.invalid/maps/new.png',sprite='https://storage.invalid/building.png',hash=createHash('sha256').update('tile').digest('hex');
function setup(){
 const stores=new Map(),handlers={},requests=[],messages=[];let failURL=null;
 const absolute=value=>new URL(typeof value==='string'?value:value.url,origin).href;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return{async keys(){return [...m.keys()].map(url=>new Request(url));},async delete(key){return m.delete(absolute(key));},async match(key){return m.get(absolute(key))?.clone();},async put(key,r){m.set(absolute(key),r.clone());}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 const objects=[{active:true,sprite_url:sprite,image_file:{sha256:hash}}];
 const manifest={chunkSize:1024,bounds:{},cells:{'0_0':{}},mapVersion:'new-map',overview:{day:'/assets/overview.webp'},layers:{terrain:{path:'assets/world/terrain',format:'webp',chunks:['0_0','1_0'],sources:{'1_0':tile},fileMeta:{'1_0':{sha256:hash}}},collision:{path:'assets/world/collision',format:'png',chunks:['1_0'],sources:{'1_0':'https://storage.invalid/maps/mask.png'},fileMeta:{'1_0':{sha256:hash}}}}};
 const context=vm.createContext({self:{location:{origin},addEventListener(type,fn){handlers[type]=fn;}},caches,Response,Request,URL,AbortSignal,Uint8Array,crypto:webcrypto,fetch:async input=>{const url=typeof input==='string'?input:input.url;requests.push(url);if(url===failURL)return new Response('offline',{status:503});if(url.includes('rewards-world-objects'))return Response.json({objects});if(url.includes('rewards-map-manifest'))return Response.json(manifest);return new Response('tile',{headers:{etag:'"tile"'}});}});
 vm.runInContext(fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8'),context);
 return{context,caches,manifest,requests,messages,handlers,set failURL(v){failURL=v;},download:()=>context.downloadWorld({postMessage:m=>messages.push(m)},manifest)};
}
test('live downloads include overridden external chunks and sprites; unchanged visits download no assets',async()=>{
 const s=setup();await s.download();assert.ok(s.requests.includes(tile));assert.ok(s.requests.includes(sprite));assert.equal(s.requests.includes(origin+'/assets/world/terrain/1_0.webp'),false);
 const first=s.requests.length;await s.download();assert.equal(s.requests.length-first,1);assert.match(s.requests.at(-1),/rewards-world-objects/);assert.equal(s.messages.at(-1).type,'ATM_PWA_DOWNLOAD_COMPLETE');
 const cache=await s.caches.open('atm-town-world-v2');assert.equal((await(await cache.match('/__atm_world__/manifest.json')).json()).mapVersion,'new-map');
});
test('new expansion URLs download only their changed files',async()=>{
 const s=setup();await s.download();const before=s.requests.length;s.manifest.layers.terrain.sources['1_0']='https://storage.invalid/maps/updated.png';await s.download();assert.deepEqual(s.requests.slice(before).filter(u=>!u.includes('/api/')),['https://storage.invalid/maps/updated.png']);
});
test('interrupted downloads preserve completed files and do not publish an incomplete snapshot',async()=>{
 const s=setup();s.failURL=tile;await assert.rejects(s.download());const cache=await s.caches.open('atm-town-world-v2');assert.equal(await cache.match('/__atm_world__/manifest.json'),undefined);
 s.failURL=null;const existing=(await cache.match(sprite))!==undefined;const before=s.requests.length;await s.download();if(existing)assert.equal(s.requests.slice(before).includes(sprite),false);assert.ok(await cache.match('/__atm_world__/manifest.json'));
});
test('cached cross-origin expansion images are served locally without another network request',async()=>{
 const s=setup();await s.download();const before=s.requests.length;let response;
 s.handlers.fetch({request:{method:'GET',url:tile,headers:new Headers(),destination:'image',mode:'cors'},respondWith(p){response=p;}});
 assert.equal(await(await response).text(),'tile');assert.equal(s.requests.length,before);
});
test('incorrect uploaded checksums cannot mark a download complete',async()=>{
 const s=setup();s.manifest.layers.terrain.fileMeta['1_0'].sha256='0'.repeat(64);await assert.rejects(s.download(),/changed during download/);assert.equal(s.messages.some(m=>m.type==='ATM_PWA_DOWNLOAD_COMPLETE'),false);
});
