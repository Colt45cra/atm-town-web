import { createClient } from '@supabase/supabase-js';

const ATM_TOWN_ORIGINS=new Set([
  'https://atmtown.fun',
  'https://www.atmtown.fun',
  'https://atm-town-web.vercel.app',
  'https://atm-town-web-colton-adams-s-projects.vercel.app',
  'https://atm-town-web-git-main-colton-adams-s-projects.vercel.app'
]);

export function publicOriginForRequest(req){
  const origin=String(req?.headers?.origin||'').trim();
  return ATM_TOWN_ORIGINS.has(origin)?origin:'https://atmtown.fun';
}

export function setCors(req,res){
  const origin=String(req?.headers?.origin||'').trim();
  if(ATM_TOWN_ORIGINS.has(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS'){res.status(204).end();return true;} return false;
}
export function adminClient(){
  const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server environment variables are missing.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireUser(req){
  const header=String(req.headers.authorization||'');const token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!token)throw Object.assign(new Error('Sign in required.'),{status:401});
  const admin=adminClient();const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)throw Object.assign(new Error('Your session is invalid or expired.'),{status:401});
  return {admin,user:data.user};
}
export function sendError(res,error){
  console.error(error);res.status(error?.status||500).json({error:error?.message||'Server request failed.'});
}
