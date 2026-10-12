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
  querySelector(k){const child=this.children.find(n=>k.startsWith('.')?n.className===k.slice(1):n.tag===k);if(child)return child;if(!this.queries.has(k))this.queries.set(k,new Element(k.startsWith('[data-')&&!k.includes('status')&&!k.includes('list')?'button':'div'));return this.queries.get(k);}
  querySelectorAll(){return [...this.queries.entries()].filter(([k])=>k!=='[data-close]').map(([,v])=>v).filter(v=>v.tag==='button').concat(this.children.flatMap(n=>n.tag==='button'?[n]:n.querySelectorAll()));}
  focus(){}
  scrollIntoView(){}
}
function setup(rows=[],start=async()=>({id:'drop',deeplink:'https://xumm.app/sign/request'}),box=[],art=null,nfts=[{name:'Ticket',token_id:'A'.repeat(64)}]){
 const body=new Element(),calls=[],store=new Map();
 const context=vm.createContext({window:{},document:{body,head:new Element(),createElement:t=>new Element(t),addEventListener(){}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},fetch:async url=>({ok:true,json:async()=>String(url).includes('drop-art')?art:({drops:[],nfts:box})}),setTimeout(){},clearTimeout(){},setInterval(){},URL,Date,Math});
 vm.runInContext(fs.readFileSync(new URL('../js/nft-drops.js',import.meta.url),'utf8'),context);
 context.window.ATMNftDrops.init({ready:()=>true,userId:()=> 'user',broadcast(){},nfts:async()=>nfts,api:async(url,options)=>{calls.push(url);if(url.includes('xrpl-nft-metadata'))return art;if(url.includes('drop-start'))return start();if(url.includes('drop-status'))return {status:'pending'};return {drops:rows};}});
 const panel=body.children.find(n=>n.id==='nftDropPanel');return {api:context.window.ATMNftDrops,panel,list:panel.querySelector('[data-list]'),note:panel.querySelector('[data-status]'),calls,store};
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
