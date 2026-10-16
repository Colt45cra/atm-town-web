import {readFileSync} from 'node:fs';

async function runWorldDownloadTests(source){
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 class TestURL{constructor(raw,base='https://town.test'){const absolute=/^https?:\/\//.test(raw)?raw:base.replace(/\/$/,'')+'/'+raw.replace(/^\//,'');this.href=absolute;this.origin=absolute.match(/^https?:\/\/[^/]+/)[0];this.hostname=this.origin.replace(/^https?:\/\//,'');this.pathname=absolute.slice(this.origin.length).split('?')[0]||'/';this.protocol='https:';}}
 class TestResponse{
  constructor(body='',options={}){this.value=body;this.status=options.status||200;this.ok=this.status>=200&&this.status<300;this.type='basic';this.headers={get:key=>options.headers?.[key]||null};this.body={cancel:async()=>{}};}
  clone(){return new TestResponse(this.value,{status:this.status});}
  async json(){return typeof this.value==='string'?JSON.parse(this.value):this.value;}
 }
 function fixture(responder){
  const events=[],calls=[],delays=[],cacheMaps=new Map();
  const key=x=>new TestURL(typeof x==='string'?x:x.url).href;
  const caches={open:async(name)=>{if(!cacheMaps.has(name))cacheMaps.set(name,new Map());const map=cacheMaps.get(name);return {match:async k=>map.get(key(k))?.clone(),put:async(k,v)=>map.set(key(k),v.clone()),keys:async()=>[...map.keys()].map(url=>({url})),delete:async k=>map.delete(key(k))};}};
  const self={location:{origin:'https://town.test'},addEventListener(){},clients:{}};
  const fetch=async(url,options)=>{calls.push({url,options});return responder(url,options,calls.length);};
  const api=new Function('self','fetch','caches','Response','URL','AbortSignal','setTimeout',source+';return {downloadWorld,requestWorldDownload,fetchWorldResource,worldRetryDelay};')(self,fetch,caches,TestResponse,TestURL,{timeout:()=>({})},(fn,ms)=>{delays.push(ms);fn();});
  return {api,calls,delays,events,client:{postMessage:p=>events.push(p)},caches};
 }
 const manifest={mapVersion:'v1',layers:{terrain:{path:'assets/world',format:'png',chunks:['a','b']}},cells:{a:{}},bounds:{minX:0}};
 let count=0;
 const f=fixture(url=>{if(url.startsWith('/api/'))return new TestResponse({objects:[]});if(url.endsWith('a.png')&&count++===0)return new TestResponse('',{status:429,headers:{'retry-after':'5'}});return new TestResponse('image');});
 await f.api.downloadWorld(f.client,manifest);
 assert(f.events.some(x=>x.phase==='waiting'&&x.retry_seconds===5),'429 respects Retry-After and reports countdown');
 assert(f.events.at(-1).type==='ATM_PWA_DOWNLOAD_COMPLETE','429 recovers to complete');
 assert(f.calls.filter(x=>x.url.endsWith('a.png')).length===2,'same failed asset retried');
 assert(f.calls.filter(x=>x.url.endsWith('.png')).every(x=>x.options.cache==='default'),'downloads use HTTP cache');
 const n=f.calls.length;await f.api.downloadWorld(f.client,manifest);
 assert(!f.calls.slice(n).some(x=>x.url.endsWith('.png')),'second visit reuses cached assets');
 const dead=fixture(()=>new TestResponse('',{status:429}));let error='';
 try{await dead.api.fetchWorldResource('https://storage.test/a.png');}catch(e){error=e.message;}
 assert(dead.calls.length===8&&error.includes('storage.test'),'retries bounded and failed host identified');
 const missing=fixture(()=>new TestResponse('',{status:404}));
 assert((await missing.api.fetchWorldResource('https://storage.test/a.png')).status===404&&missing.calls.length===1,'permanent errors not retried');
 let fail=true;
 const resume=fixture(url=>url.startsWith('/api/')?new TestResponse({objects:[]}):url.endsWith('b.png')&&fail?new TestResponse('',{status:404}):new TestResponse('image'));
 try{await resume.api.downloadWorld(resume.client,manifest);}catch{}
 fail=false;const before=resume.calls.length;await resume.api.downloadWorld(resume.client,manifest);
 assert(!resume.calls.slice(before).some(x=>x.url.endsWith('a.png')),'checkpoint preserves successful asset after later failure');
 const shared=fixture(url=>new TestResponse(url.startsWith('/api/')?{objects:[]}:'image'));
 const client2={events:[],postMessage(p){this.events.push(p);}};
 const p1=shared.api.requestWorldDownload(shared.client,manifest),p2=shared.api.requestWorldDownload(client2,manifest);
 assert(p1===p2,'duplicate starts share one active job');await Promise.all([p1,p2]);
 assert(shared.calls.filter(x=>x.url.endsWith('a.png')).length===1&&client2.events.at(-1).type==='ATM_PWA_DOWNLOAD_COMPLETE','both callers receive shared completion');
 assert(shared.api.worldRetryDelay(new TestResponse('',{headers:{'retry-after':new Date(Date.now()+90000).toUTCString()}}),0)>85000,'HTTP-date Retry-After respected');
 return 'Passed: rate-limit recovery, Retry-After seconds/date, bounded retries, permanent errors, cache reuse, partial resume, shared downloads, progress fanout.';
}

console.log(await runWorldDownloadTests(readFileSync(new URL('../service-worker.js',import.meta.url),'utf8')));
