import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSocialAction,preferences} from '../lib/social.js';
const me='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
function db(result){const calls=[];const chain={};for(const method of ['select','eq','or','order','limit','update','delete','upsert','gte','maybeSingle'])chain[method]=(...args)=>{calls.push([method,...args]);return chain;};chain.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);return {calls,from:()=>chain};}
const response={status(){return this;},json(data){return data;}};
test('notification defaults preserve existing pings and opt out of world alerts',async()=>{assert.deepEqual(await preferences(db({data:null}),me),{player_pings:true,world_events:false});});
test('friend accept is restricted to recipient and pending request',async()=>{const admin=db({data:[]});await assert.rejects(()=>handleSocialAction({method:'POST',body:{target_user_id:other}},response,{admin,user:{id:me},action:'friend-accept'}),/no longer available/);assert.ok(admin.calls.some(x=>x[0]==='eq'&&x[1]==='recipient_id'&&x[2]===me));assert.ok(admin.calls.some(x=>x[0]==='eq'&&x[1]==='status'&&x[2]==='pending'));});
test('cannot add yourself or malformed target',async()=>{for(const target of [me,'x'])await assert.rejects(()=>handleSocialAction({method:'POST',body:{target_user_id:target}},response,{admin:db({}),user:{id:me},action:'friend-request'}),/another signed-in/);});
test('notification settings require explicit boolean values',async()=>{await assert.rejects(()=>handleSocialAction({method:'POST',body:{player_pings:'false',world_events:true}},response,{admin:db({}),user:{id:me},action:'notification-preferences'}),/both notification/);});
test('friend removals filter both pair and membership',async()=>{const admin=db({data:[]});await handleSocialAction({method:'POST',body:{target_user_id:other}},response,{admin,user:{id:me},action:'friend-remove'});assert.ok(admin.calls.some(x=>x[0]==='eq'&&x[1]==='pair_key'&&x[2]===[me,other].sort().join(':')));assert.ok(admin.calls.some(x=>x[0]==='or'&&x[1].includes('requester_id.eq.'+me)));});
