import { XummSdk } from 'xumm-sdk';
import { setCors, requireUser, sendError } from './_auth.js';

export default async function handler(req,res){
  if(setCors(req,res))return;
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required.'});}
  try{
    const {admin,user}=await requireUser(req);
    const {data:account,error:accountError}=await admin.from('player_accounts').select('wallet_address').eq('user_id',user.id).single();
    if(accountError)throw accountError;
    if(account?.wallet_address)return res.status(409).json({error:'This ATM Town account already has a linked wallet.'});
    const apiKey=process.env.XAMAN_API_KEY,apiSecret=process.env.XAMAN_API_SECRET;
    if(!apiKey||!apiSecret)throw new Error('Xaman server environment variables are missing.');
    const xumm=new XummSdk(apiKey,apiSecret);
    const created=await xumm.payload.create({
      txjson:{TransactionType:'SignIn'},
      options:{expire:5,return_url:{app:'https://atm-town-web.vercel.app',web:'https://atm-town-web.vercel.app'}},
      custom_meta:{identifier:'atm-town-wallet-link-'+user.id,instruction:'Verify this XRPL wallet for your ATM Town player account.'}
    },true);
    if(!created?.uuid||!created?.next?.always)throw new Error('Xaman did not create a wallet verification request.');
    const expiresAt=new Date(Date.now()+5*60*1000).toISOString();
    const {error}=await admin.from('wallet_link_requests').insert({user_id:user.id,payload_uuid:created.uuid,status:'pending',expires_at:expiresAt});
    if(error)throw error;
    return res.status(201).json({payload_uuid:created.uuid,deeplink:created.next.always,qr_png:created.refs?.qr_png||null,expires_at:expiresAt});
  }catch(error){sendError(res,error);}
}
