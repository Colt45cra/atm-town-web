import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../js/attribute-effects.js',import.meta.url),'utf8'),context);
const stats=context.ATMAttributeEffects;

test('standard players retain identical arcade physics',()=>{
 const base=stats.arcadeProfile(stats.combine([]));
 assert.equal(base.speed,1);
 assert.equal(base.jump,1);
 assert.equal(base.gravity,1);
 assert.equal(base.jumpImpulse,1);
 assert.equal(stats.arcadeLabel(base),'STANDARD STATS');
 assert.equal(Object.isFrozen(base),true);
});

test('equipped published speed and jump effects create real, bounded arcade bonuses',()=>{
 const combined=stats.combine([{speed:2.5,jump:1.35,gravity:1}]);
 const bonus=stats.arcadeProfile(combined);
 assert.equal(bonus.speed,1.8);
 assert.equal(bonus.jump,1.35);
 assert.ok(bonus.jumpImpulse>1);
 assert.match(stats.arcadeLabel(bonus),/RUN 1.80×/);
 assert.match(stats.arcadeLabel(bonus),/JUMP 1.35×/);
 // Jump height is proportional to impulse squared divided by gravity.
 assert.ok(Math.abs(bonus.jumpImpulse**2/bonus.gravity-bonus.jump)<1e-10);
});

test('gravity modifies hang time without reducing configured jump height',()=>{
 const normal=stats.arcadeProfile({speed:1,jump:1.3,gravity:1});
 const float=stats.arcadeProfile({speed:1,jump:1.3,gravity:.75});
 assert.ok(float.jumpImpulse<normal.jumpImpulse);
 assert.ok(Math.abs(float.jumpImpulse**2/float.gravity-normal.jumpImpulse**2/normal.gravity)<1e-10);
 assert.ok(float.jumpImpulse/float.gravity>normal.jumpImpulse/normal.gravity);
});

test('arcade multipliers reject extreme or missing inputs and do not affect overworld combination',()=>{
 const extreme=stats.arcadeProfile({speed:200,jump:100,gravity:.001});
 assert.equal(extreme.speed,1.8);
 assert.equal(extreme.jump,1.75);
 assert.equal(extreme.gravity,.75);
 assert.equal(stats.arcadeProfile({speed:NaN,jump:0,gravity:Infinity}).jumpImpulse,1);
 assert.equal(stats.combine([{speed:2.5,jump:2.5,gravity:.5}]).speed,2.5);
});

test('each character-based arcade game snapshots owned equipment at round start',()=>{
 const games={
  'sky-run.js':['state.attributes=window.atmArcadeAttributes?.()','state.attributes.speed','state.attributes.jumpImpulse','state.attributes.gravity'],
  'platform-panic.js':['state.attributes=window.atmArcadeAttributes?.()','state.attributes.speed','state.attributes.jumpImpulse','state.attributes.gravity'],
  'flappy-jetpack.js':['state.attributes=window.atmArcadeAttributes?.()','state.attributes.jumpImpulse','state.attributes.gravity'],
  'ring-rumble.js':['state.attributes=window.atmArcadeAttributes?.()','state.attributes.speed']
 };
 for(const [name,needles]of Object.entries(games)){
  const src=readFileSync(new URL('../js/runtime/'+name,import.meta.url),'utf8');
  for(const needle of needles)assert.ok(src.includes(needle),name+' missing '+needle);
 }
 const core=readFileSync(new URL('../js/runtime/game-core.js',import.meta.url),'utf8');
 assert.ok(core.includes('arcadeProfile(equippedAttributeEffects())'));
});
