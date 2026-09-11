/* Secure cross-origin session handoff from ATM Town to standalone ATM Pay.
 * The shared Supabase project owns the session; this bridge only copies an
 * already-authenticated session to a specifically allow-listed ATM Pay origin.
 * Tokens are sent with postMessage to the opener and never placed in the URL.
 */
(function installAtmPaySessionHandoff(global){
  'use strict';

  const params=new URLSearchParams(global.location.search);
  if(params.get('atmPayHandoff')!=='1')return;

  const requestedOrigin=String(params.get('origin')||'');
  const allowedOrigins=new Set([
    'https://atm-pay-two.vercel.app',
    'https://atm-pay-colton-adams-s-projects.vercel.app',
    'https://atm-pay-git-main-colton-adams-s-projects.vercel.app',
    'https://pay.atmtown.fun'
  ]);

  if(!allowedOrigins.has(requestedOrigin)||!global.opener){
    console.warn('ATM Pay handoff rejected: untrusted or missing opener origin.');
    return;
  }

  let delivered=false;
  let subscription=null;

  function finish(session){
    if(delivered||!session?.access_token||!session?.refresh_token)return false;
    delivered=true;
    try{
      global.opener.postMessage({
        type:'ATM_PAY_SESSION_HANDOFF',
        accessToken:session.access_token,
        refreshToken:session.refresh_token
      },requestedOrigin);
    }catch(_error){
      delivered=false;
      return false;
    }
    try{subscription?.unsubscribe?.();}catch(_error){}
    global.setTimeout(()=>{try{global.close();}catch(_error){}},120);
    return true;
  }

  async function start(){
    try{
      if(typeof global.getSupabaseClient!=='function')return;
      const client=await global.getSupabaseClient();
      const {data}=await client.auth.getSession();
      if(finish(data?.session))return;

      const listener=client.auth.onAuthStateChange((_event,session)=>{
        if(session)finish(session);
      });
      subscription=listener?.data?.subscription||null;
    }catch(error){
      console.warn('ATM Pay handoff could not initialize.',error);
    }
  }

  start();
})(window);
