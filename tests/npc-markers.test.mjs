import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('NPC standard replaces passive greetings with world markers below menus',()=>{
 const styles=[],c=vm.createContext({window:{},document:{createElement:()=>({}),head:{appendChild:s=>styles.push(s)}}});vm.runInContext(fs.readFileSync(new URL('../js/npc-dialogue-standard.js',import.meta.url),'utf8'),c);
 const standard=c.window.ATMNpcDialogueStandard;assert.equal(standard.STANDARD.passiveBeckon,false);assert.match(styles[0].textContent,/WorldSpeech.*[\s\S]*z-index:60!important/);assert.match(styles[0].textContent,/#nftDropPanel:not\(\[hidden\]\)/);
 let mark;const ctx=new Proxy({fillText(text,x,y){mark={text,x,y};}},{get:(t,k)=>t[k]||(()=>{})});standard.drawMarker(ctx,{characterId:'fuzzy',drawX:100,drawY:200});assert.deepEqual(mark,{text:'!',x:100,y:85});
});
