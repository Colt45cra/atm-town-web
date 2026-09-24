import crypto from 'node:crypto';
import { createPayloadDraftToken, payloadIntegrationRequest, verifyPayloadDraftToken } from './payload-integration.js';
import { XAMAN_API_BASE, readJson, xamanHeaders, xamanError, fetchXamanPayload } from './xaman-vending.js';

const ADDRESS=/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
function conflict(m){return Object.assign(new Error(m),{status:409});}
function bad(m){return Object.assign(new Error(m),{status:400});}
async function linkedWallet(admin,userId){
  const {data,error}=await admin.from('player_accounts').select('wallet_address,wallet_verified_at').eq('user_id',userId).maybeSingle();
  if(error) throw error;
  const address=String(data?.wallet_address||'').trim();
  if(!ADDRESS.test(address)||!data?.wallet_verified_at) throw conflict('Link and verify a Xaman wallet before starting a Mainnet Money Rain.');
  return address;
}
function amount(v,label='amount'){
  const s=String(v??'').trim();
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,12})?$/.test(s)||Number(s)<=0) throw bad(`${label} must be greater than zero.`);
  return s;
}
function assetFrom(o={}){
  if(String(o.type||'xrp').toLowerCase()==='xrp') return {type:'xrp'};
  const currency=String(o.currency||'').trim();
  const issuer=String(o.issuer||'').trim();
  if(!currency||currency.toUpperCase()==='XRP'||!ADDRESS.test(issuer)) throw bad('Choose a valid XRPL issued token (currency + issuer).');
  return {type:'iou',currency,issuer};
}
function xrpToDropsExact(value){
  const match=/^(\\d+)(?:\\.(\\d{1,6}))?$/.exec(String(value||'').trim());
  if(!match) throw bad('XRP funding amount must use no more than 6 decimal places.');
  return (BigInt(match[1])*1_000_000n+BigInt(((match[2]||'')+'000000').slice(0,6))).toString();
}
async function createXamanPayment({wallet,destination,asset,value,instruction}){
  const txjson={TransactionType:'Payment',Account:wallet,Destination:destination,
    Amount:asset.type==='xrp'?xrpToDropsExact(value):{currency:asset.currency,issuer:asset.issuer,value:String(value)}};
  const response=await fetch(`${XAMAN_API_BASE}/payload`,{method:'POST',headers:xamanHeaders(),cache:'no-store',body:JSON.stringify({
    txjson,options:{submit:true,expire:10,force_network:'MAINNET'},custom_meta:{identifier:`mr:${crypto.randomUUID()}`,instruction:String(instruction||'').slice(0,280)}
  })});
  const created=await readJson(response);
  if(!response.ok||!created?.uuid||!created?.next?.always) throw xamanError(created,'Xaman rejected the Money Rain funding request');
  return {payload_uuid:created.uuid,deeplink:created.next.always,qr_png:created.refs?.qr_png||null};
}
export async function createMainnetMoneyRainDraft(admin,user,options={}){
  const refundAddress=await linkedWallet(admin,user.id);
  const asset=assetFrom(options.asset);
  const poolAmount=amount(options.poolAmount,'Prize pool');
  const externalEventId=crypto.randomUUID();
  const externalCampaignId=`atm-town-money-rain-${externalEventId}`;
  const created=await payloadIntegrationRequest('/api/integrations/v1/campaigns',{
    externalCampaignId,externalEventId,kind:'atm_town_money_rain',name:`${String(options.sponsorLabel||'ATM Town player').slice(0,32)} Money Rain`,
    sponsorLabel:String(options.sponsorLabel||'ATM Town player').slice(0,32),asset,poolAmount,maxRecipients:100,refundAddress,
    metadata:{source:'atm_town',worldEvent:'money_rain',fundingWallet:'xaman'}
  },{timeoutMs:20000});
  const state=created?.state;
  if(state?.network!=='mainnet'||!state?.funding?.address) throw conflict('Payload did not return a Mainnet Money Rain execution wallet.');
  const draft=createPayloadDraftToken({purpose:'money_rain_mainnet',user_id:user.id,integration_campaign_id:state.integrationCampaignId,
    external_campaign_id:externalCampaignId,external_event_id:externalEventId,sponsor_mode:String(options.sponsorMode||'player'),
    sponsor_label:String(options.sponsorLabel||'ATM Town player').slice(0,32),refund_address:refundAddress,asset,pool_amount:poolAmount});
  return {draft_token:draft,network:'mainnet',asset,pool_amount:poolAmount,state};
}
export async function mainnetMoneyRainStatus(admin,user,draftToken){
  const draft=verifyPayloadDraftToken(draftToken,user.id);
  const wallet=await linkedWallet(admin,user.id);
  if(wallet!==draft.refund_address) throw conflict('The linked Xaman wallet changed during Money Rain funding.');
  const response=await payloadIntegrationRequest(`/api/integrations/v1/campaigns/${encodeURIComponent(draft.integration_campaign_id)}/funding-status`,{});
  if(response?.state?.network!=='mainnet') throw conflict('Payload campaign network mismatch.');
  return {draft,state:response.state,funded:response.state?.status==='funded'&&response.state?.funding?.stage==='ready'};
}
export async function startMainnetMoneyRainFunding(admin,user,draftToken){
  const status=await mainnetMoneyRainStatus(admin,user,draftToken);
  if(status.funded) return {funded:true,state:status.state};
  const {draft,state}=status; const funding=state.funding||{}; const stage=String(funding.stage||'');
  let asset,value,instruction;
  if(stage==='xrp'){
    asset={type:'xrp'}; value=String(funding.xrpRequired||'');
    instruction=`Activate this disposable Money Rain wallet with ${value} XRP. Payload will create the ${draft.asset.currency} trustline after validation.`;
  } else if(stage==='token'){
    asset=draft.asset; value=String(funding.depositRequired||'');
    instruction=`Fund this Money Rain with ${value} ${draft.asset.currency}. Unused funds are returned after settlement.`;
  } else if(stage==='deposit'&&draft.asset.type==='xrp'){
    asset={type:'xrp'}; value=String(funding.depositRequired||'');
    instruction=`Fund this Money Rain with ${value} XRP including Payload's calculated reserve/fee buffer. Unused XRP is returned after settlement.`;
  } else throw conflict('Payload is still preparing the disposable Money Rain wallet.');
  amount(value,'Funding amount');
  const xaman=await createXamanPayment({wallet:draft.refund_address,destination:funding.address,asset,value,instruction});
  return {funded:false,network:'mainnet',stage,asset,value,destination:funding.address,...xaman};
}
export async function checkMainnetMoneyRainXaman(admin,user,draftToken,payloadUuid){
  verifyPayloadDraftToken(draftToken,user.id);
  const found=await fetchXamanPayload(payloadUuid);
  const signed=found.found&&found.payload?.meta?.signed===true;
  const resolved=found.found&&found.payload?.meta?.resolved===true;
  const cancelled=found.found&&found.payload?.meta?.cancelled===true;
  const status=await mainnetMoneyRainStatus(admin,user,draftToken);
  return {signed,resolved,cancelled,funded:status.funded,state:status.state};
}

export async function assertMainnetMoneyRainRecipient(admin,userId,asset){
  const wallet=await linkedWallet(admin,userId);
  if(asset?.type==='iou'){
    const response=await fetch('https://xrplcluster.com/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'account_lines',params:[{account:wallet,ledger_index:'validated',peer:String(asset.issuer)}]})});
    const json=await response.json(); const lines=json?.result?.lines||[];
    const currency=String(asset.currency||'').toUpperCase();
    if(!lines.some(line=>String(line.currency||'').toUpperCase()===currency)) return null;
  }
  return wallet;
}
