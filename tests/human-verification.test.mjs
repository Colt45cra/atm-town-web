import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requireTownHuman,needsHumanVerification} from '../lib/human-verification.js';
const req={method:'POST',headers:{'x-is-human':'signed-browser-challenge'}};
const human={isHuman:true,isBot:false,isVerifiedBot:false,bypassed:false};
test('absent challenges cannot reach the verifier',async()=>{
 let called=false;await assert.rejects(requireTownHuman({headers:{}},async()=>{called=true;return human;}),{status:403});assert.equal(called,false);
});
test('only verified humans pass; bot, crawler, unknown and bypass verdicts fail',async()=>{
 for(const result of [{isHuman:false,isBot:true},{...human,isVerifiedBot:true},{...human,bypassed:true},{},null])await assert.rejects(requireTownHuman(req,async()=>result),{status:403});
 let options;await requireTownHuman(req,async o=>{options=o;return human;});assert.equal(options.developmentOptions.isDevelopment,false);assert.equal(options.advancedOptions.checkLevel,'basic');
});
test('verification outages stop claims instead of paying without verification',async()=>{
 await assert.rejects(requireTownHuman(req,async()=>{throw Error('offline');}),{status:503});
});
test('protect entry, NPC payouts and new arcade reward sessions without blocking cron, admin, status or webhooks',()=>{
 for(const action of ['rewards-human-check','rewards-npc-claim','rewards-start'])assert.equal(needsHumanVerification({method:'POST',body:{action}}),true);
 for(const action of ['rewards-cron','admin-state','rewards-npc-status','rewards-visit'])assert.equal(needsHumanVerification({method:'POST',body:{action}}),false);
 assert.equal(needsHumanVerification({method:'GET',query:{action:'rewards-npc-claim'}}),false);
});
function routerFixture(verify){
 let paid=0;const dependencies={requireTownHuman:verify,needsHumanVerification,setCors:()=>false,sendError:(res,e)=>res.status(e.status||500).json({error:e.message}),handleEconomy:async(_req,res)=>{paid++;return res.json({ok:true});}};
 const source=readFileSync('api/leaderboards.js','utf8').replace(/^import .*$/mg,'').replace('export default async function','async function');
 const handler=new Function(...Object.keys(dependencies),source+';return handler;')(...Object.values(dependencies));
 const res={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 return {handler,res,paid:()=>paid};
}
test('generic NPC claim API rejects automation before payout; verified requests proceed',async()=>{
 const rejected=routerFixture(()=>requireTownHuman({headers:{}}));await rejected.handler({method:'POST',body:{action:'rewards-npc-claim',npc_id:'luci'}},rejected.res);assert.equal(rejected.res.code,403);assert.equal(rejected.paid(),0);
 const accepted=routerFixture(()=>requireTownHuman(req,async()=>human));await accepted.handler({method:'POST',body:{action:'rewards-npc-claim',npc_id:'luci'}},accepted.res);assert.equal(accepted.res.code,200);assert.equal(accepted.paid(),1);
});
test('legacy Luci claim API also rejects automation before any account or payout lookup',async()=>{
 let paid=0;const source=readFileSync('api/xaman-vending-start.js','utf8').replace(/^import[\s\S]*?;\n/mg,'').replace('export default async function','async function');
 const claim=new Function('requireTownHuman','requireUser','payloadIntegrationRequest',source+';return handleLuci666RewardClaim;')(requireTownHuman,()=>{throw Error('Should not reach auth');},()=>{paid++;});
 await assert.rejects(claim({headers:{}},{}),{status:403});assert.equal(paid,0);
});
test('browser bundle loads before the game and challenge routes bypass the offline cache',()=>{
 const html=readFileSync('index.html','utf8');assert.ok(html.indexOf('src="js/human-verification.js')<html.indexOf('src="js/runtime/game-core.js'));
 const config=JSON.parse(readFileSync('vercel.json','utf8'));assert.equal(config.rewrites.length,2);assert.match(config.rewrites[0].destination,/bot-protection\/v1\/challenge/);
 assert.match(readFileSync('service-worker.js','utf8'),/url.pathname.startsWith\('\/149e9513/);
});
