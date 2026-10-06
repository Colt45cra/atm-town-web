const ACCOUNT_WAIT_MS=24*60*60*1000;
const WALLET_WAIT_MS=60*60*1000;
export function luciEligibility(user,account,now=Date.now()) {
 if(!user.email_confirmed_at)return {eligible:false,reason:'Verify your account email before claiming Luci rewards.'};
 const created=Date.parse(user.created_at),linked=Date.parse(account?.wallet_verified_at);
 if(!Number.isFinite(created))return {eligible:false,reason:'Your account age could not be verified. Sign in again.'};
 if(!Number.isFinite(linked))return {eligible:false,reason:'Link and verify your Xaman wallet before claiming Luci rewards.'};
 const eligibleAt=Math.max(created+ACCOUNT_WAIT_MS,linked+WALLET_WAIT_MS);
 if(now<eligibleAt)return {eligible:false,eligibleAt:new Date(eligibleAt).toISOString(),reason:'Luci rewards require an account at least 24 hours old and a wallet linked for at least 1 hour.'};
 return {eligible:true};
}
