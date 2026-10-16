import {readFileSync} from 'node:fs';

async function testMainnetOnly(adapter,apiSource,worldApiSource,indexSource){
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const calls=[],button={textContent:'',onclick:null};
 let linked=false;
 const mainnet={linkedAddress:()=>linked?'rLinked':null,open:()=>calls.push('connect'),openApp:()=>calls.push('app'),refresh:async()=>calls.push('refresh')};
 const window={ATMMainnetWallet:mainnet,dispatchEvent(){}};
 const document={readyState:'complete',getElementById:id=>id==='embeddedWalletBtn'?button:null};
 new Function('window','document','authSession','playerAccount','CustomEvent',adapter)(window,document,{user:{id:'player-id'}},{display_name:'Player'},class {});
 window.ATMPay.open();assert(calls.at(-1)==='connect','unlinked legacy entry opens mainnet connect');
 linked=true;
 for(const fn of [window.ATMPay.open,window.ATMPay.openToRecipient,window.ATMPay.openRequest,window.ATMEmbeddedWallet.open,button.onclick]){fn();assert(calls.at(-1)==='app','all linked legacy entries open mainnet app');}
 assert(window.ATMPay.getPublicIdentity().user_id==='player-id','signed-in ping identity preserved');
 let signingBlocked=false;try{await window.ATMEmbeddedWallet.signPayloadMoneyRainFunding();}catch{signingBlocked=true;}assert(signingBlocked,'legacy signing refuses operation');
 const handler=new Function('requireUser','sendError','setCors','isPushAction','handlePushAction','isLiveChatAction','handleLiveChatAction',apiSource.replace(/^import .*;\n/gm,'').replace('export default ','')+';return handler;')(async()=>({admin:{},user:{id:'player'}}),()=>{},()=>false,a=>a==='social-state',async(_q,r)=>r.status(200).json({social:true}),a=>a==='chat',async(_q,r)=>r.status(200).json({chat:true}));
 const res=()=>({code:0,setHeader(){},status(n){this.code=n;return this;},json(body){return {status:this.code,body};}});
 for(const action of ['status','balance','save','reset-testnet-wallet','pay-prepare','pay-relay-submit','pay-claim-handle'])assert((await handler({query:{action},method:'POST'},res())).status===410,'legacy API blocked: '+action);
 assert((await handler({query:{action:'social-state'},method:'GET'},res())).body.social,'social API retained');
 assert((await handler({query:{action:'chat'},method:'GET'},res())).body.chat,'chat API retained');
 assert(!/testnet/i.test(indexSource),'HTML contains no obsolete network labels');
 assert(!worldApiSource.includes('await prepareMoneyRainFunding')&&!worldApiSource.includes('await relayMoneyRainFunding'),'legacy event funding removed');
 assert(worldApiSource.includes("draft.purpose !== 'money_rain_mainnet'"),'funded event refuses legacy campaign token');
 return 'Passed: all legacy entry points use mainnet, identity retained, signing retired, seven API actions refused, social/chat retained, labels removed, event funding restricted.';
}

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
console.log(await testMainnetOnly(read('js/wallet/embedded-wallet.js'),read('api/embedded-wallet.js'),read('api/world-time.js'),read('index.html')));
