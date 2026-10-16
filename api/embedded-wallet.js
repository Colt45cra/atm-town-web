import { requireUser, sendError, setCors } from '../lib/auth.js';
import { handlePushAction, isPushAction } from '../lib/push-notifications.js';
import { handleLiveChatAction, isLiveChatAction } from '../lib/live-chat.js';

// Keep social, push and live chat on the existing function. Wallet operations
// are retired here; mainnet signing remains in the separate ATM Pay app.
export default async function handler(req,res){
 if(setCors(req,res))return;
 res.setHeader('Cache-Control','no-store, max-age=0');
 try{
  const {admin,user}=await requireUser(req);
  const action=String(req.query?.action||'').toLowerCase();
  if(isPushAction(action))return await handlePushAction(req,res,{admin,user,action});
  if(isLiveChatAction(action))return await handleLiveChatAction(req,res,{admin,user,action});
  return res.status(410).json({error:'This wallet flow has been retired. Close and reopen ATM Town to use your connected mainnet ATM Pay wallet.',code:'WALLET_FLOW_RETIRED'});
 }catch(error){return sendError(res,error);}
}
