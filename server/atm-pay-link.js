import { randomUUID, randomBytes } from 'node:crypto';
import { adminClient, requireUser, sendError, setCors } from '../lib/auth.js';
import { PAY_ORIGIN, capabilityHash, checkCapability, verifyWalletLink, nftWallet } from '../lib/atm-pay-town.js';
const check = ({data,error}) => { if (error) throw error; return data; };
const fail = (text, status = 409) => Object.assign(new Error(text), {status});
export default async function handler(req,res) {
  if (setCors(req,res)) return;
  res.setHeader('Cache-Control','no-store');
  const action = String(req.query?.action || '').replace('pay-link-','');
  const publicAction = ['challenge','proof'].includes(action);
  if (req.method !== (action === 'status' ? 'GET' : 'POST')) return res.status(405).json({error:'Unsupported method.'});
  try {
    const auth = publicAction ? {admin:adminClient()} : await requireUser(req);
    const {admin,user} = auth;
    if (action === 'status') {
      const link = check(await admin.from('player_atm_pay_links').select('wallet_address,active,verified_at').eq('user_id',user.id).maybeSingle());
      return res.json({link, wallet:await nftWallet(admin,user.id)});
    }
    if (action === 'select') {
      const active = req.body?.provider === 'atm_pay';
      if (!active && req.body?.provider !== 'xaman') throw fail('Choose ATM Pay or Xaman.',400);
      const link = check(await admin.from('player_atm_pay_links').update({active}).eq('user_id',user.id).select('wallet_address').maybeSingle());
      if (active && !link) throw fail('Connect ATM Pay first.');
      return res.json({wallet:await nftWallet(admin,user.id)});
    }
    if (action === 'start') {
      const recent = await admin.from('atm_pay_link_requests').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-3600000).toISOString());
      if (recent.error) throw recent.error;
      if (recent.count >= 10) throw fail('Wait before creating another wallet link.',429);
      const id = randomUUID(), secret = randomBytes(32).toString('hex');
      check(await admin.from('atm_pay_link_requests').insert({id,user_id:user.id,secret_hash:capabilityHash(secret),expires_at:new Date(Date.now()+10*60000).toISOString()}));
      return res.json({id,deeplink:`${PAY_ORIGIN}/town#kind=link&id=${id}&request=${id}&secret=${secret}`});
    }
    const id = String(req.body?.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw fail('Invalid link request.',400);
    const row = check(await admin.from('atm_pay_link_requests').select('*').eq('id',id).maybeSingle());
    if (!row || Date.parse(row.expires_at)<=Date.now()) throw fail('This link request expired.',404);
    if (publicAction) checkCapability({provider:'atm_pay',uuid:row.id,secret_hash:row.secret_hash},req.body?.request,req.body?.secret);
    else if (row.user_id !== user.id) throw fail('Link request not found.',404);
    if (action === 'challenge') {
      if (row.status !== 'pending') return res.json({kind:'link',id:row.id,status:row.status,wallet_address:row.wallet_address});
      const player = check(await admin.from('player_accounts').select('display_name').eq('user_id',row.user_id).maybeSingle());
      return res.json({kind:'link',id:row.id,town_user_id:row.user_id,town_name:player?.display_name || 'ATM Town player',expires_at:row.expires_at});
    }
    if (action === 'proof') {
      if (row.status !== 'pending') throw fail('This link request was already used.');
      const wallet = verifyWalletLink(req.body?.blob,row,req.body?.pay_user_id);
      const data = check(await admin.from('atm_pay_link_requests').update({status:'proved',wallet_address:wallet,pay_user_id:req.body.pay_user_id}).eq('id',id).eq('status','pending').select('id').maybeSingle());
      if (!data) throw fail('This link request changed.');
      return res.json({status:'proved',wallet_address:wallet});
    }
    if (action === 'inspect') return res.json({status:row.status,wallet_address:row.wallet_address});
    if (action === 'confirm') {
      const result = check(await admin.rpc('atm_pay_confirm_town_link',{request_id:id,town_user_id:user.id}));
      return res.json({linked:result,wallet:await nftWallet(admin,user.id)});
    }
    throw fail('Unknown ATM Pay link action.',400);
  } catch(error) {sendError(res,error);}
}
