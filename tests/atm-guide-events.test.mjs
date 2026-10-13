import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function setup(){
 const nodes=new Map(),frames=[];let phase='none',now=100000,interactions=0;
 const element=()=>({style:{setProperty(k,v){this[k]=v;}},classList:{values:new Set(),add(v){this.values.add(v);},remove(v){this.values.delete(v);},toggle(v,on){if(on)this.values.add(v);else this.values.delete(v);}},setAttribute(){},addEventListener(){},appendChild(){},querySelectorAll:()=>[]});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element};
 const context=vm.createContext({window:{ATMWorldEvents:{getState:()=>({phase})},ATMNpcScreenAnchor:()=>({x:100,y:100})},document,currentMap:'town',townBots:[{id:'bot-atm',name:'ATM Bot',characterId:'classic',x:0,y:0}],player:{x:0,y:0},nearestThing:()=>({type:'event-action'}),interact:()=>interactions++,updateTownBots(){},requestAnimationFrame(fn){frames.push(fn);},Date:{now:()=>now},Math,URL,console});
 vm.runInContext(fs.readFileSync(new URL('../js/atm-ecosystem-guide.js',import.meta.url),'utf8'),context);
 return{context,nodes,get interactions(){return interactions;},tick(value,advance=0){phase=value;now+=advance;frames.shift()();}};
}
test('ATM greeting hides when an event starts, does not intercept event actions, and returns after it ends',()=>{
 const s=setup();s.tick('none');assert.equal(s.nodes.get('atmGuideBeckon').style.display,'block');
 s.tick('active');assert.equal(s.nodes.get('atmGuideBeckon').style.display,'none');assert.equal(s.context.window.ATMAtmGuide.open(),false);assert.equal(s.context.nearestThing().type,'event-action');s.context.interact();assert.equal(s.interactions,1);
 s.tick('completed',50000);assert.equal(s.nodes.get('atmGuideBeckon').style.display,'block');
});
test('event announcement closes an open conversation and clears its visible speech',()=>{
 const s=setup();assert.equal(s.context.window.ATMAtmGuide.open(),true);assert.equal(s.nodes.get('atmGuidePanel').classList.values.has('open'),true);
 s.tick('announced');assert.equal(s.nodes.get('atmGuidePanel').classList.values.has('open'),false);assert.equal(s.nodes.get('atmGuideWorldSpeech').style.display,'none');assert.equal(s.nodes.get('atmGuideBeckon').style.display,'none');
});
