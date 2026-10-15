import { checkBotId } from 'botid/server';

const denied=()=>Object.assign(new Error('Browser verification failed. Refresh ATM Town in your normal browser, then try again.'),{status:403});
// Never trust browser identity flags, user-agent strings, or a client-only check.
// Both claim routes verify the signed browser challenge before contacting Payload.
export async function requireTownHuman(req,verify=checkBotId){
 if(!req.headers?.['x-is-human'])throw denied();
 let result;
 try{result=await verify({developmentOptions:{isDevelopment:false},advancedOptions:{checkLevel:'basic',headers:req.headers}});}
 catch(error){console.error('ATM Town browser verification unavailable:',error?.message);throw Object.assign(new Error('Browser verification is temporarily unavailable. Please try again shortly.'),{status:503});}
 if(result?.isHuman!==true||result.isBot!==false||result.isVerifiedBot===true||result.bypassed===true)throw denied();
}
export function needsHumanVerification(req){
 if(req.method!=='POST')return false;
 const action=String(req.body?.action||req.query?.action||'');
 return ['rewards-human-check','rewards-npc-claim','rewards-start'].includes(action);
}
