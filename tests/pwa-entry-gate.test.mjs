import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function setup(){
 const listeners=new Map(),sent=[],nodes=[];let deliver;
 const element=()=>{const n={children:[],style:{},setAttribute(){},append(...items){this.children.push(...items);},appendChild(n){this.children.push(n);},replaceChildren(...items){this.children=items;},remove(){this.removed=true;}};nodes.push(n);return n;};
 const global={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const context=vm.createContext({global,state:{supported:true,download:{}},navigator:{storage:{persist:async()=>true}},document:{createElement:element,body:element()},MessageChannel:class{constructor(){this.port1={close(){}};this.port2={};deliver=data=>this.port1.onmessage({data});}},readyRegistration:async()=>({active:{postMessage(data){sent.push(data);}},update:async()=>{}}),emit(){listeners.get('atm:pwa-state-changed')?.();},cleanMessage:x=>String(x),setTimeout:()=>1,clearTimeout(){}});
 const source=fs.readFileSync(new URL('../js/pwa.js',import.meta.url),'utf8');vm.runInContext(source.slice(source.indexOf('  let worldPreparation'),source.indexOf('  async function storageEstimate')),context);
 return{context,sent,nodes,deliver:data=>deliver(data)};
}
test('map entry waits for worker completion, displays progress, and shares one download across callers',async()=>{
 const s=setup(),manifest={mapVersion:'live'};let complete=false;const task=s.context.prepareWorld(manifest).then(()=>complete=true);s.context.prepareWorld(manifest);await new Promise(r=>setImmediate(r));
 assert.equal(s.sent.length,1);assert.equal(s.sent[0].manifest.mapVersion,'live');assert.equal(complete,false);
 s.deliver({type:'ATM_PWA_DOWNLOAD_PROGRESS',completed:5,total:12});assert.ok(s.nodes.some(n=>n.textContent==='5 / 12 map files ready'));
 s.deliver({type:'ATM_PWA_DOWNLOAD_COMPLETE',completed:12,total:12});await task;assert.equal(complete,true);assert.equal(s.nodes.find(n=>n.id==='atmMapPreparation').removed,true);
});
test('browsers without service workers retain ordinary entry without creating a download gate',async()=>{const s=setup();s.context.state.supported=false;assert.equal(await s.context.prepareWorld({}),false);assert.equal(s.sent.length,0);});
test('a saved map enters without mounting the download overlay',async()=>{
 const s=setup(),task=s.context.prepareWorld({mapVersion:'saved'});await new Promise(r=>setImmediate(r));
 s.deliver({type:'ATM_PWA_DOWNLOAD_PROGRESS',phase:'checking',completed:0,total:0});assert.equal(s.context.document.body.children.length,0);
 s.deliver({type:'ATM_PWA_DOWNLOAD_COMPLETE',completed:0,total:0});await task;assert.equal(s.context.document.body.children.length,0);
 const next=s.context.prepareWorld({mapVersion:'next'});await new Promise(r=>setImmediate(r));s.deliver({type:'ATM_PWA_DOWNLOAD_PROGRESS',phase:'world',completed:0,total:2});assert.equal(s.context.document.body.children.length,1);s.deliver({type:'ATM_PWA_DOWNLOAD_COMPLETE',completed:2,total:2});await next;
});
