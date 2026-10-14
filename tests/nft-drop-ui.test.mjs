import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.queries=new Map();this.attributes={};}
  set textContent(v){this.text=v;this.children=[];}
  get textContent(){return (this.text||'')+this.children.map(n=>n.textContent).join('');}
  set innerHTML(v){this.html=v;}
  setAttribute(k,v){this.attributes[k]=v;}
  removeAttribute(k){delete this.attributes[k];}
  hasAttribute(k){return k in this.attributes;}
  get childNodes(){return this.children;}
  get isConnected(){return true;}
  append(...v){for(const n of v)n.parent=this;this.children.push(...v);}
  prepend(...v){for(const n of v)n.parent=this;this.children.unshift(...v);}
  replaceChildren(...v){this.text='';this.children=[...v];}
  replaceWith(n){const i=this.parent?.children.indexOf(this);if(i>=0){this.parent.children[i]=n;n.parent=this.parent;}}
  querySelector(k){if(k.includes(' ')){const [first,...rest]=k.split(' ');return this.querySelector(first)?.querySelector(rest.join(' '));}const child=this.children.find(n=>k.startsWith('.')?n.className===k.slice(1):n.tag===k);if(child)return child;if(!this.queries.has(k))this.queries.set(k,new Element(k.startsWith('[data-')&&!k.includes('status')&&!k.includes('list')?'button':'div'));return this.queries.get(k);}
  querySelectorAll(){return [...this.queries.entries()].filter(([k])=>k!=='[data-close]').map(([,v])=>v).filter(v=>v.tag==='button').concat(this.children.flatMap(n=>n.tag==='button'?[n]:n.querySelectorAll()));}
  focus(){}
  scrollIntoView(){}
}
function setup(rows=[],start=async()=>({id:'drop',deeplink:'https://xumm.app/sign/request'}),box=[],art=null,nfts=[{name:'Ticket',token_id:'A'.repeat(64)}],donationConfig=null){
 const pose={map:'town',x:10,y:20,jump:0};const body=new Element(),calls=[],store=new Map(),timers=[],imageLoads=[];
 const context=vm.createContext({window:{},Image:class{constructor(){imageLoads.push(this);this.complete=false;this.naturalWidth=0;}},document:{body,head:new Element(),createElement:t=>new Element(t),addEventListener(){}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},fetch:async url=>({ok:true,json:async()=>String(url).includes('drop-art')||String(url).includes('drop-box-art')?art:({drops:[],nfts:box})}),setTimeout(fn,delay){timers.push({fn,delay});return timers.length;},clearTimeout(){},setInterval(){},URL,Date,Math});
 vm.runInContext(fs.readFileSync(new URL('../js/nft-drops.js',import.meta.url),'utf8'),context);
 context.window.ATMNftDrops.init({ready:()=>true,pose:()=>pose,userId:()=> 'user',broadcast(){},nfts:async()=>nfts,api:async(url,options)=>{calls.push(url);if(url.includes('drop-art'))return art;if(url.includes('drop-cancel')){const id=JSON.parse(options.body).id;rows.splice(rows.findIndex(r=>r.id===id),1);return {cancelled:true};}if(url.includes('donation-config'))return donationConfig;if(url.includes('donation-status'))return {status:'signing'};if(url.includes('donation-start'))return start(JSON.parse(options.body));if(url.includes('xrpl-nft-metadata'))return art;if(url.includes('drop-start'))return start();if(url.includes('drop-status'))return {status:'pending'};return {drops:rows};}});
 const panel=body.children.find(n=>n.id==='nftDropPanel');return {api:context.window.ATMNftDrops,panel,list:panel.querySelector('[data-list]'),note:panel.querySelector('[data-status]'),calls,store,timers,imageLoads,pose};
}
test('creation immediately shows progress, prevents duplicate clicks, and gives an explicit signing link',async()=>{
 let release;const wait=new Promise(r=>release=r),t=setup([],()=>wait);await t.api.open();await t.panel.querySelector('[data-create]').onclick();
 const choose=t.list.children.find(n=>n.tag==='article').children.find(n=>n.tag==='button');const work=choose.onclick();
 assert.match(t.note.textContent,/Preparing/);assert.equal(t.panel.querySelector('[data-create]').disabled,true);
 await choose.onclick();assert.equal(t.calls.filter(u=>u.includes('drop-start')).length,1);
 release({id:'drop',deeplink:'https://xumm.app/sign/request'});await work;
 assert.match(t.note.textContent,/Open Xaman/);assert.equal(t.list.children.find(n=>n.tag==='a').href,'https://xumm.app/sign/request');assert.equal(t.panel.querySelector('[data-create]').disabled,false);
});
test('rejected creation displays the actual error and retry control',async()=>{
 const t=setup([],async()=>{throw Error('Xaman rejected request (code 413).');});await t.api.open();await t.panel.querySelector('[data-create]').onclick();await t.list.children.find(n=>n.tag==='article').children.find(n=>n.tag==='button').onclick();
 assert.match(t.note.textContent,/413/);assert.equal(t.list.children.find(n=>n.tag==='button').textContent,'Try again');assert.equal(t.panel.attributes['aria-busy'],'false');
});
test('saved pending request resumes the same link without creating another offer',async()=>{
 const t=setup([{id:'saved',status:'pending',kind:'drop',token_id:'A'.repeat(64),deeplink:'https://xumm.app/sign/saved'}]);await t.api.open();t.list.children.find(n=>n.tag==='article').children.find(n=>n.tag==='button').onclick();
 assert.equal(t.list.children.find(n=>n.tag==='a').href,'https://xumm.app/sign/saved');assert.equal(t.calls.some(u=>u.includes('drop-start')),false);
});
test('Cancel clears only the selected failed entry and keeps the other NFT visible',async()=>{
 const t=setup([{id:'failed',status:'failed',kind:'drop',token_id:'A'.repeat(64),can_cancel:true},{id:'other',status:'received',kind:'donation',token_id:'B'.repeat(64)}]);await t.api.open();
 const cancel=t.list.children[0].children.find(n=>n.tag==='button'&&n.textContent==='Cancel');await cancel.onclick();
 assert.equal(t.calls.filter(u=>u.includes('drop-cancel')).length,1);assert.equal(t.list.children.filter(n=>n.tag==='article').length,1);assert.match(t.note.textContent,/can now donate/);
});

test('carrying a draft tells the player to choose a spot instead of opening Xaman',async()=>{
 const t=setup([],async()=>({id:'draft',status:'carried',kind:'drop',token_id:'A'.repeat(64)}));await t.api.open();await t.panel.querySelector('[data-create]').onclick();await t.list.children.find(n=>n.tag==='article').children.find(n=>n.tag==='button').onclick();assert.match(t.note.textContent,/choose your spot/);assert.equal(t.list.children.some(n=>n.tag==='a'),false);assert.equal(t.api.publicState().id,'draft');
});
test('donation box opens a thumbnail grid with a clear donate button',async()=>{
 const t=setup([],undefined,[{name:'In box',token_id:'A'.repeat(64),image_url:'https://example.invalid/nft.png'}]);await t.api.open(true);assert.equal(t.panel.querySelector('h2').textContent,'NFT Donation Box');assert.equal(t.panel.querySelector('[data-create]').textContent,'Donate an NFT');assert.equal(t.list.children[0].className,'nftDropGrid');assert.match(t.list.textContent,/In box/);assert.equal(t.calls.some(u=>u.includes('drop-start')),false);
});

test('finding a drop with missing artwork loads its actual NFT image above the claim button',async()=>{
 const t=setup([],undefined,[],{image_url:'https://example.invalid/found.png'});
 await t.api.claim({id:'found',name:'NFT'});await new Promise(r=>setImmediate(r));
 assert.equal(t.panel.querySelector('h2').textContent,'You just found an NFT!');
 const image=t.list.children[0].children.find(n=>n.tag==='img');assert.equal(image.src,'https://example.invalid/found.png');
 assert.equal(t.list.children[1].textContent,'Click to claim');
});

test('donation picker updates missing names and artwork after metadata arrives',async()=>{
 const t=setup([],undefined,[],{name:'Recovered NFT',image_url:'https://example.invalid/recovered.png'},[{name:'XRPL NFT',token_id:'A'.repeat(64),uri:'ABCD'}]);
 await t.api.open(true);await t.panel.querySelector('[data-create]').onclick();await new Promise(r=>setImmediate(r));
 const card=t.list.children.find(n=>n.tag==='article');assert.equal(card.querySelector('strong').textContent,'Recovered NFT');assert.equal(card.querySelector('.nftDropThumb').children.find(n=>n.tag==='img').src,'https://example.invalid/recovered.png');assert.equal(card.children.find(n=>n.tag==='button').textContent,'Donate this NFT');
});

test('a late fallback timer cannot hide or replace artwork that already loaded',async()=>{
 const t=setup([],undefined,[],null,[{name:'Art',token_id:'A'.repeat(64),image_url:'https://example.invalid/art.png'}]);await t.api.open();await t.panel.querySelector('[data-create]').onclick();
 const img=t.list.children.find(n=>n.tag==='article').querySelector('.nftDropThumb img');img.complete=true;img.naturalWidth=160;img.onload();
 for(const timer of t.timers.filter(r=>r.delay===4500))timer.fn();assert.equal(img.hidden,false);assert.equal(img.src,'https://example.invalid/art.png');
});
test('a metadata retry finishing after an image loads preserves the working thumbnail',async()=>{
 let finish;const pending=new Promise(r=>finish=r);const t=setup([],undefined,[],pending,[{name:'Art',token_id:'A'.repeat(64),uri:'ABCD',image_url:'https://example.invalid/working.png'}]);await t.api.open();await t.panel.querySelector('[data-create]').onclick();
 const card=t.list.children.find(n=>n.tag==='article'),img=card.querySelector('.nftDropThumb img'),toolbar=t.list.children.find(n=>n.className==='nftPickerTools');const work=toolbar.children.find(n=>n.tag==='button').onclick();
 img.complete=true;img.naturalWidth=160;img.onload();finish({name:'Art resolved',image_url:'https://example.invalid/retry.png'});await work;
 assert.equal(card.querySelector('.nftDropThumb img'),img);assert.equal(img.src,'https://example.invalid/working.png');
});

test('ATM Pay donations select at most eight NFTs and open one approval for the selected set',async()=>{
 const nfts=Array.from({length:9},(_,i)=>({name:'NFT '+i,token_id:(i+1).toString(16).padStart(64,'0').toUpperCase()}));let body;
 const t=setup([],async b=>{body=b;return {kind:'donation',donation_request:true,provider:'atm_pay',id:'batch',status:'signing',received:0,total:8,deeplink:'https://atm-pay-two.vercel.app/town#request'};},[],null,nfts,{provider:'atm_pay',batch_enabled:true});
 await t.api.open(true);await t.panel.querySelector('[data-create]').onclick();
 const cards=t.list.children.filter(n=>n.tag==='article');for(const c of cards){const checkbox=c.children.find(n=>n.tag==='label').children[0];checkbox.checked=true;checkbox.onchange();}
 assert.equal(cards[8].children.find(n=>n.tag==='label').children[0].checked,false);
 const donate=t.list.children.find(n=>n.tag==='button');assert.equal(donate.textContent,'Donate selected (8 / 8)');await donate.onclick();assert.equal(body.token_ids.length,8);assert.equal(t.calls.filter(u=>u.includes('donation-start')).length,1);assert.equal(t.list.children.find(n=>n.tag==='a').textContent,'Open ATM Pay to approve');assert.equal(JSON.parse(t.store.get('atm_nft_drop_pending_v1')).donation,true);
});

test('box thumbnails recover missing image metadata without reopening the donation box',async()=>{
 const id='A'.repeat(64);
 const t=setup([],undefined,[{name:'XRPL NFT',token_id:id,image_url:null}],{name:'Recovered image',image_url:'https://example.invalid/ready.png',image_candidates:['https://example.invalid/backup.png']});
 await t.api.open(true);await new Promise(r=>setImmediate(r));
 const tile=t.list.children.find(n=>n.className==='nftDropGrid').children[0];
 assert.equal(tile.querySelector('.nftDropThumb').children.find(n=>n.tag==='img').src,'https://example.invalid/ready.png');
 assert.equal(tile.querySelector('strong').textContent,'Recovered image');
});
test('donation box has a local image fallback even with no stored external URL',async()=>{
 const id='A'.repeat(64),t=setup([],undefined,[{name:'Donation',token_id:id,image_url:null}],null);
 await t.api.open(true);
 const tile=t.list.children.find(n=>n.className==='nftDropGrid').children[0];
 assert.match(tile.querySelector('.nftDropThumb img').src,/drop-box-image&token_id=/);
});

test('box thumbnail falls back from a broken image to another gateway without losing the NFT',async()=>{
 const id='A'.repeat(64);
 const t=setup([],undefined,[{name:'NFT',token_id:id,image_url:'https://example.invalid/fail.png',image_candidates:['https://example.invalid/recovered.png']}]);
 await t.api.open(true);
 const tile=t.list.children.find(n=>n.className==='nftDropGrid').children[0],img=tile.querySelector('.nftDropThumb img');
 img.onerror();
 assert.match(img.src,/drop-box-image&token_id=/);
 img.onerror();
 assert.equal(img.src,'https://example.invalid/recovered.png');
 assert.equal(tile.querySelector('strong').textContent,'NFT');
 img.complete=true;img.naturalWidth=64;img.onload();
 assert.equal(img.hidden,false);
});

function canvas(){const draws=[];return {draws,save(){},restore(){},translate(){},beginPath(){},ellipse(){},fill(){},fillRect(){},strokeRect(){},fillText(){},drawImage(img){draws.push(img);}};}
test('map art falls back from a failed image and reuses the loaded image across frames',()=>{
 const t=setup(),ctx=canvas(),row={id:'map',token_id:'A'.repeat(64),x:10,y:20,image_url:'https://example.invalid/broken.png',image_candidates:['https://example.invalid/working.png']};
 t.api.draw(ctx,row);assert.equal(t.imageLoads.length,1);t.imageLoads[0].onerror();assert.equal(t.imageLoads.length,2);
 const loaded=t.imageLoads[1];loaded.complete=true;loaded.naturalWidth=200;loaded.onload();
 for(let i=0;i<100;i++)t.api.draw(ctx,{...row});assert.equal(t.imageLoads.length,2);assert.equal(ctx.draws.at(-1),loaded);
 assert.equal(JSON.parse(t.store.get('atm_nft_box_art_v1'))[row.token_id].url,'https://example.invalid/working.png');
});
test('carried artwork with no URL recovers once using the authenticated drop-art route',async()=>{
 const t=setup([],undefined,[],{image_url:'https://example.invalid/carried.png'}),ctx=canvas(),row={id:'owned',token_id:'B'.repeat(64)};
 for(let i=0;i<100;i++)t.api.draw(ctx,row,1,2,true);
 await new Promise(r=>setImmediate(r));assert.equal(t.calls.filter(u=>u.includes('drop-art')).length,1);assert.equal(t.imageLoads[0].src,'https://example.invalid/carried.png');
});
test('map artwork metadata can recover without opening the claim dialog',async()=>{
 const t=setup([],undefined,[],{image_url:'https://example.invalid/map.png'}),ctx=canvas();
 t.api.draw(ctx,{id:'placed',token_id:'C'.repeat(64),x:10,y:20});await new Promise(r=>setImmediate(r));
 assert.equal(t.imageLoads[0].src,'https://example.invalid/map.png');
});
test('world artwork timeout advances a stalled gateway only once',()=>{
 const t=setup(),ctx=canvas(),row={id:'stalled',token_id:'D'.repeat(64),x:10,y:20,image_url:'https://example.invalid/slow.png',image_candidates:['https://example.invalid/fast.png']};
 t.api.draw(ctx,row);const timeout=t.timers.at(-1);timeout.fn();assert.equal(t.imageLoads.length,2);timeout.fn();assert.equal(t.imageLoads.length,2);
});

test('local and remote carried NFT artwork follows jump height while depth stays on the ground',async()=>{
 const t=setup([{id:'carry',token_id:'A'.repeat(64),kind:'drop',status:'carried'}]);await t.api.open();t.pose.jump=50;
 const actors=t.api.actors({x:0,y:0,w:100,h:100},[{map:'town',drawX:60,drawY:70,jump:40,nftDrop:{id:'remote',token_id:'B'.repeat(64)}}]);
 const local=actors.find(a=>a.row.id==='carry'),remote=actors.find(a=>a.row.id==='remote');assert.equal(local.row.y,-22);assert.equal(local.depth,44);assert.equal(remote.row.y,38);assert.equal(remote.depth,94);
});
