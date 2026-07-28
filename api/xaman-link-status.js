import { XummSdk } from 'xumm-sdk';
import { setCors, requireUser, sendError } from './_auth.js';

const XRPL_ADDRESS=/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
export default async function handler(req,res){
  if(setCors(req,res))return;
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET required.'});}
  try{
    const {admin,user}=await requireUser(req);const payloadUuid=String(req.query?.payload_uuid||'');
    if(!/^[0-9a-f-]{36}$/i.test(payloadUuid))return res.status(400).json({error:'A valid payload UUID is required.'});
    const {data:request,error:reqError}=await admin.from('wallet_link_requests').select('*').eq('payload_uuid',payloadUuid).eq('user_id',user.id).single();
    if(reqError||!request)return res.status(404).json({error:'Wallet-link request not found.'});
    if(request.status!=='pending')return res.status(200).json({status:request.status,wallet_address:request.wallet_address||null});
    if(new Date(request.expires_at).getTime()<Date.now()){
      await admin.from('wallet_link_requests').update({status:'expired',completed_at:new Date().toISOString()}).eq('id',request.id);
      return res.status(200).json({status:'expired'});
    }
    const xumm=new XummSdk(process.env.XAMAN_API_KEY,process.env.XAMAN_API_SECRET);
    const payload=await xumm.payload.get(payloadUuid,true);
    if(!payload?.meta?.resolved)return res.status(200).json({status:'pending'});
    if(!payload.meta.signed){
      await admin.from('wallet_link_requests').update({status:'rejected',completed_at:new Date().toISOString()}).eq('id',request.id);
      return res.status(200).json({status:'rejected'});
    }
    const wallet=String(payload.response?.account||'');
    if(!XRPL_ADDRESS.test(wallet))throw new Error('Xaman returned an invalid XRPL address.');
    const {data:existing}=await admin.from('player_accounts').select('user_id').eq('wallet_address',wallet).maybeSingle();
    if(existing&&existing.user_id!==user.id){
      await admin.from('wallet_link_requests').update({status:'failed',wallet_address:wallet,completed_at:new Date().toISOString()}).eq('id',request.id);
      return res.status(409).json({error:'That wallet is already linked to another ATM Town account.',status:'failed'});
    }
    const now=new Date().toISOString();
    const {error:updateError}=await admin.from('player_accounts').update({wallet_address:wallet,wallet_verified_at:now}).eq('user_id',user.id);
    if(updateError)throw updateError;
    await admin.from('wallet_link_requests').update({status:'signed',wallet_address:wallet,completed_at:now}).eq('id',request.id);
    return res.status(200).json({status:'signed',wallet_address:wallet});
  }catch(error){sendError(res,error);}
}
