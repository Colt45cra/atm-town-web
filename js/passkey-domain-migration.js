/* ATM Town passkey domain migration
 * Only activates after the browser reports the legacy Vercel RP ID mismatch.
 * New users and users without legacy passkeys are unaffected.
 */
(function initializePasskeyDomainMigration(global){
  'use strict';
  if(global.ATMPasskeyDomainMigration)return;

  const CURRENT_HOST='atmtown.fun';
  const LEGACY_RP='atm-town-web.vercel.app';
  const FLAG='atm_passkey_domain_migration_v1';
  const DONE='atm_passkey_domain_migrated_v1';

  function onCustomDomain(){
    const host=String(location.hostname||'').toLowerCase();
    return host===CURRENT_HOST||host===`www.${CURRENT_HOST}`;
  }
  function read(key){try{return localStorage.getItem(key)||'';}catch(_e){return '';}}
  function write(key,value){try{localStorage.setItem(key,value);return true;}catch(_e){return false;}}
  function remove(key){try{localStorage.removeItem(key);}catch(_e){}}
  function migrationPending(){return onCustomDomain()&&read(FLAG)==='1'&&read(DONE)!=='1';}
  function isLegacyRpError(text){
    const value=String(text||'').toLowerCase();
    return onCustomDomain()&&value.includes('rp id')&&value.includes(LEGACY_RP);
  }

  function friendlyMessage(){
    return 'ATM Town moved to atmtown.fun. Your existing passkey is tied to the old ATM Town web address. Verify the same email once, then update your passkey for atmtown.fun.';
  }

  function markLegacyMigration(){
    if(!onCustomDomain())return;
    write(FLAG,'1');
    remove(DONE);
    const welcome=document.getElementById('welcomeStatus');
    const identity=document.getElementById('identityStatus');
    if(welcome)welcome.textContent=friendlyMessage();
    if(identity)identity.textContent=friendlyMessage();
    setTimeout(()=>{
      try{global.atmShowFlowScreen?.('signup');}catch(_e){}
      const signup=document.getElementById('signupStatus');
      if(signup)signup.textContent='Verify the SAME email you used before. After verification, ATM Town will let you replace the old-domain passkey.';
    },250);
  }

  function watchStatusNode(node){
    if(!node)return;
    const check=()=>{if(isLegacyRpError(node.textContent))markLegacyMigration();};
    new MutationObserver(check).observe(node,{childList:true,subtree:true,characterData:true});
    check();
  }

  async function applySignedInMigrationUi(){
    if(!migrationPending())return;
    let client=null,session=null;
    try{
      client=await global.atmGetSupabaseClient?.();
      session=(await client?.auth?.getSession?.())?.data?.session||null;
    }catch(_e){}
    if(!session?.user)return;
    const button=document.getElementById('registerPasskeyBtn');
    if(button){
      button.textContent='UPDATE PASSKEY FOR ATMTOWN.FUN';
      button.dataset.domainMigration='1';
    }
    const identity=document.getElementById('identityStatus');
    if(identity)identity.textContent='Account verified. Add a new passkey for atmtown.fun. Your account and wallet stay the same.';
    const signup=document.getElementById('signupStatus');
    if(signup)signup.textContent='Email verified. Update your passkey for atmtown.fun, then continue.';
  }

  function watchMigrationCompletion(){
    const button=document.getElementById('registerPasskeyBtn');
    const status=document.getElementById('identityStatus');
    if(!button||!status)return;
    const observer=new MutationObserver(()=>{
      if(!migrationPending())return;
      const text=String(status.textContent||'').toLowerCase();
      if(text.includes('passkey added to this account')){
        write(DONE,'1');remove(FLAG);
        button.textContent='Add fingerprint / passkey';
        delete button.dataset.domainMigration;
        status.textContent='Passkey updated for atmtown.fun. Future Log In taps can use your device passkey normally.';
      }
    });
    observer.observe(status,{childList:true,subtree:true,characterData:true});
  }

  function initialize(){
    if(!onCustomDomain())return;
    watchStatusNode(document.getElementById('welcomeStatus'));
    watchStatusNode(document.getElementById('identityStatus'));
    watchMigrationCompletion();
    applySignedInMigrationUi();
    global.addEventListener('focus',applySignedInMigrationUi);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)applySignedInMigrationUi();});
    setInterval(applySignedInMigrationUi,1800);
  }

  global.ATMPasskeyDomainMigration=Object.freeze({pending:migrationPending,mark:markLegacyMigration,refresh:applySignedInMigrationUi});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})(window);
