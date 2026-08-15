(function ATMEmbeddedWalletModule(){
  'use strict';

  const CONFIG = window.ATM_TOWN_CONFIG?.embeddedWallet || {};
  const NETWORK = 'testnet';
  const ATM_PAY_VALIDATION_WAIT_MS = 60_000;
  const ATM_PAY_VALIDATION_POLL_MS = 1_500;
  const PAYMENT_PREVIEW_TTL_MS = 60 * 1000;
  const MIN_LEDGER_HEADROOM = 2;
  const MAX_TEST_PAYMENT_DROPS = 10_000_000n; // 10 Testnet XRP hard cap.
  const MAX_PAYLOAD_FUNDING_DROPS = 25_000_000n; // 25 Testnet XRP hard cap for pre-funded Money Rain campaigns.
  const MAX_TEST_FEE_DROPS = 10_000n; // 0.01 Testnet XRP safety ceiling.
  const CLASSIC_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
  const PAYMENT_TX_FIELDS = new Set(['TransactionType','Account','Destination','Amount','Fee','Sequence','LastLedgerSequence','Memos']);
  const ATM_PAY_MEMO_TYPE = 'ATM-PAY-INTENT';
  const PAYLOAD_MONEY_RAIN_MEMO_TYPE = 'PAYLOAD-MONEY-RAIN';
  const ATM_PAY_ACTIVITY_POLL_MS = 30_000;
  const ATM_PAY_CHARACTER_THUMBNAILS = Object.freeze({
    classic:'assets/characters/thumbnails/character-atm.webp',
    fuzzy:'assets/characters/thumbnails/character-fuzzy.webp',
    miracle:'assets/characters/thumbnails/character-miracle.webp',
    luci:'assets/characters/thumbnails/character-luci.webp',
    triskeleton:'assets/characters/thumbnails/character-triskeleton.webp',
    phnix:'assets/characters/thumbnails/character-phnix.webp',
    bear:'assets/characters/thumbnails/character-bear.webp',
    xoge:'assets/characters/thumbnails/character-xoge.webp',
    flippy:'assets/characters/thumbnails/character-flippy.webp'
  });
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();
  let state = { record:null, recoveryKey:null, busy:false, preparedPayment:null, lastTransaction:null, payProfile:null, paySuggestedHandle:'', payDisplayName:'ATM Player', payView:'send', selectedRecipient:null, pendingOpenRecipient:null, recipientSearchResults:[], paySearchQuery:'', activity:[], activityInitialized:false, pendingRequestCount:0, requestDraft:null, xrplDetailsVisible:false, balanceXrp:null, balanceFunded:false, balanceAvailable:false };
  let xrplLoadPromise = null;
  let paySearchTimer = null;
  let payActivityPollTimer = null;
  let payloadFundingBusy = false;

  function randomBytes(length){ const out=new Uint8Array(length); crypto.getRandomValues(out); return out; }
  function bytesToB64u(bytes){
    let binary=''; const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function b64uToBytes(value){
    const normalized=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
    const pad=normalized+'='.repeat((4-normalized.length%4)%4); const binary=atob(pad); const out=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i); return out;
  }
  function formatRecoveryKey(bytes){ return 'ATM1-'+bytesToB64u(bytes); }
  function parseRecoveryKey(value){
    const compact=String(value||'').trim().replace(/\s+/g,'');
    const body=compact.toUpperCase().startsWith('ATM1-')?compact.slice(5):compact;
    let bytes; try{bytes=b64uToBytes(body);}catch(_error){throw new Error('Recovery key format is invalid.');}
    if(bytes.length!==32)throw new Error('Recovery key must be the 256-bit ATM1 recovery key created with this wallet.');
    return bytes;
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
  function shortAddress(value){value=String(value||'');return value.length>18?value.slice(0,9)+'…'+value.slice(-7):value;}
  function utf8ToHex(value){return Array.from(textEncoder.encode(String(value||'')),byte=>byte.toString(16).padStart(2,'0')).join('').toUpperCase();}
  function expectedIntentMemos(intentId){return [{Memo:{MemoType:utf8ToHex(ATM_PAY_MEMO_TYPE),MemoData:utf8ToHex(String(intentId||''))}}];}
  function payloadMoneyRainMemoTypeHex(){return utf8ToHex(PAYLOAD_MONEY_RAIN_MEMO_TYPE);}
  function dropsToXrpText(drops){
    const value=BigInt(String(drops||'0')); const whole=value/1_000_000n; const fraction=(value%1_000_000n).toString().padStart(6,'0');
    return `${whole}.${fraction}`;
  }
  function parseTestXrpAmount(value){
    const text=String(value??'').trim();
    if(!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(text))throw new Error('Enter a Testnet XRP amount with no more than 6 decimal places.');
    const [wholeText,fractionText='']=text.split('.');
    const drops=BigInt(wholeText)*1_000_000n+BigInt((fractionText+'000000').slice(0,6));
    if(drops<=0n)throw new Error('Testnet payment amount must be greater than 0 XRP.');
    if(drops>MAX_TEST_PAYMENT_DROPS)throw new Error('ATM Town currently limits each test payment to 10 XRP.');
    return {drops:drops.toString(),xrp:dropsToXrpText(drops)};
  }
  function paymentResultCode(result){
    const meta=result?.meta;
    if(meta&&typeof meta==='object'&&typeof meta.TransactionResult==='string')return meta.TransactionResult;
    return String(result?.engine_result||result?.engineResult||'');
  }
  function transactionHash(result,fallback=''){return String(result?.hash||result?.tx_json?.hash||result?.tx_json?.Hash||fallback||'');}
  function walletApi(){
    if(typeof window.atmApiWithAuth!=='function')throw new Error('ATM Town account session is not ready. Sign in first.');
    return window.atmApiWithAuth;
  }
  function clearRecoveryKey(){if(state.recoveryKey){state.recoveryKey.fill?.(0);state.recoveryKey=null;}}
  function clearPreparedPayment(){state.preparedPayment=null;}
  function clearEphemeral(clearRecovery=false){clearPreparedPayment();if(clearRecovery)clearRecoveryKey();}

  async function importAesKey(bytes, usages){return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,usages);}
  async function encryptBytes(keyBytes,plainBytes,iv,aadText){
    const key=await importAesKey(keyBytes,['encrypt']);
    const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:textEncoder.encode(aadText)},key,plainBytes);
    return new Uint8Array(cipher);
  }
  async function decryptBytes(keyBytes,cipherBytes,iv,aadText){
    const key=await importAesKey(keyBytes,['decrypt']);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:textEncoder.encode(aadText)},key,cipherBytes);
    return new Uint8Array(plain);
  }
  async function hkdf(secret,salt,info){
    const material=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info:textEncoder.encode(info)},material,256);
    return new Uint8Array(bits);
  }
  async function sha256Text(text){const digest=await crypto.subtle.digest('SHA-256',textEncoder.encode(text));return bytesToB64u(new Uint8Array(digest));}
  function aad(kind,address){return `ATM-TOWN|${kind}|v1|${NETWORK}|${address}`;}

  async function wrapVaultKey(vaultKey,secret,kind,address){
    const salt=randomBytes(32), iv=randomBytes(12);
    const kek=await hkdf(secret,salt,`ATM Town ${kind} wallet key wrapping v1`);
    try{
      const ciphertext=await encryptBytes(kek,vaultKey,iv,aad(`wallet-wrap-${kind}`,address));
      return {kdf:'HKDF-SHA-256',salt:bytesToB64u(salt),iv:bytesToB64u(iv),ciphertext:bytesToB64u(ciphertext)};
    }finally{kek.fill(0);}
  }
  async function unwrapVaultKey(wrapper,secret,kind,address){
    const kek=await hkdf(secret,b64uToBytes(wrapper.salt),`ATM Town ${kind} wallet key wrapping v1`);
    try{return await decryptBytes(kek,b64uToBytes(wrapper.ciphertext),b64uToBytes(wrapper.iv),aad(`wallet-wrap-${kind}`,address));}
    finally{kek.fill(0);}
  }

  function webAuthnSupported(){return !!(window.isSecureContext&&window.PublicKeyCredential&&navigator.credentials);}
  async function prfFromCredential(credentialId,prfSalt){
    const credential=await navigator.credentials.get({publicKey:{
      challenge:randomBytes(32),
      allowCredentials:[{type:'public-key',id:b64uToBytes(credentialId)}],
      userVerification:'required',timeout:60000,
      extensions:{prf:{eval:{first:prfSalt}}}
    }});
    const first=credential?.getClientExtensionResults?.()?.prf?.results?.first;
    return first?new Uint8Array(first):null;
  }
  async function createWalletPasskey(address,vaultKey){
    if(!webAuthnSupported())return null;
    const prfSalt=randomBytes(32), userId=randomBytes(32);
    let credential;
    try{
      credential=await navigator.credentials.create({publicKey:{
        challenge:randomBytes(32),
        rp:{name:'ATM Town Wallet'},
        user:{id:userId,name:`atm-wallet-${bytesToB64u(userId).slice(0,16)}`,displayName:'ATM Town Embedded Wallet'},
        pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
        timeout:60000,attestation:'none',
        authenticatorSelection:{residentKey:'required',userVerification:'required'},
        extensions:{prf:{eval:{first:prfSalt}}}
      }});
    }catch(error){
      if(error?.name==='NotAllowedError'||error?.name==='NotSupportedError')return null;
      throw error;
    }
    if(!credential)return null;
    const credentialId=bytesToB64u(new Uint8Array(credential.rawId));
    let prfResult=credential.getClientExtensionResults?.()?.prf?.results?.first;
    let prfBytes=prfResult?new Uint8Array(prfResult):null;
    if(!prfBytes){try{prfBytes=await prfFromCredential(credentialId,prfSalt);}catch(_error){prfBytes=null;}}
    if(!prfBytes)return null;
    try{
      const wrapper=await wrapVaultKey(vaultKey,prfBytes,'passkey',address);
      return {credential_id:credentialId,prf_salt:bytesToB64u(prfSalt),...wrapper};
    }finally{prfBytes.fill(0);}
  }
  async function unlockVaultWithPasskey(record){
    const wrapper=record?.encrypted_backup?.passkey;
    if(!wrapper)throw new Error('This backup does not have a wallet passkey. Use the recovery key.');
    if(!webAuthnSupported())throw new Error('Passkey authorization is not available in this browser. Use the recovery key.');
    const prf=await prfFromCredential(wrapper.credential_id,b64uToBytes(wrapper.prf_salt));
    if(!prf)throw new Error('This authenticator did not return the WebAuthn PRF needed for this wallet. Use the recovery key.');
    try{return await unwrapVaultKey(wrapper,prf,'passkey',record.address);}finally{prf.fill(0);}
  }
  async function unlockVaultWithRecovery(record,recoveryText){
    let recovery=null;
    try{
      recovery=parseRecoveryKey(recoveryText);
      return await unwrapVaultKey(record.encrypted_backup.recovery,recovery,'recovery',record.address);
    }finally{recovery?.fill(0);}
  }

  async function loadXrpl(){
    if(window.xrpl?.Wallet)return window.xrpl;
    if(xrplLoadPromise)return xrplLoadPromise;
    const sources=Array.isArray(CONFIG.xrplBrowserSources)?CONFIG.xrplBrowserSources:[];
    xrplLoadPromise=(async()=>{
      for(const src of sources){
        try{
          await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';s.onload=resolve;s.onerror=()=>reject(new Error('XRPL library failed to load.'));document.head.appendChild(s);});
          if(window.xrpl?.Wallet)return window.xrpl;
        }catch(_error){}
      }
      throw new Error('ATM Town could not load the pinned XRPL Testnet wallet library.');
    })();
    return xrplLoadPromise;
  }
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

  async function prepareLedgerViaAtmPay(intentId){
    return walletApi()('/api/embedded-wallet?action=pay-ledger-prepare',{method:'POST',body:JSON.stringify({intent_id:String(intentId||'')})});
  }
  async function recheckLedgerViaAtmPay(intentId){
    return walletApi()('/api/embedded-wallet?action=pay-ledger-recheck',{method:'POST',body:JSON.stringify({intent_id:String(intentId||'')})});
  }
  async function relaySignedBlobViaAtmPay(prepared,signed){
    return walletApi()('/api/embedded-wallet?action=pay-relay-submit',{method:'POST',body:JSON.stringify({intent_id:prepared.payIntentId,tx_hash:String(signed.hash),tx_blob:String(signed.tx_blob)})});
  }
  async function waitForAtmPayValidation(prepared,signed){
    const started=Date.now(); let last=null;
    while(Date.now()-started<ATM_PAY_VALIDATION_WAIT_MS){
      try{
        const verified=await walletApi()('/api/embedded-wallet?action=pay-complete',{method:'POST',body:JSON.stringify({intent_id:prepared.payIntentId,tx_hash:String(signed.hash)})});
        last=verified;
        if(verified?.validated===true)return verified;
      }catch(error){
        last={error};
        if(error?.status&&Number(error.status)>=400&&Number(error.status)<500)throw error;
      }
      await sleep(ATM_PAY_VALIDATION_POLL_MS);
    }
    return last?.validated?last:{validated:false,pending:true,tx_hash:String(signed.hash)};
  }

  async function withDecryptedWallet(record,vaultKey,callback){
    const backup=record?.encrypted_backup;
    if(!backup||backup.version!==1||backup.network!==NETWORK)throw new Error('Unsupported encrypted wallet backup.');
    const payload=await decryptBytes(vaultKey,b64uToBytes(backup.payload.ciphertext),b64uToBytes(backup.payload.iv),aad('wallet-payload',record.address));
    let decoded=null;
    try{
      decoded=JSON.parse(textDecoder.decode(payload));
      if(decoded?.version!==1||decoded?.network!==NETWORK||decoded?.address!==record.address||typeof decoded?.seed!=='string')throw new Error('Wallet backup integrity check failed.');
      const xrpl=await loadXrpl();
      const wallet=xrpl.Wallet.fromSeed(decoded.seed);
      if(wallet.classicAddress!==record.address)throw new Error('Recovered key does not match the saved XRPL address.');
      return await callback(wallet,decoded.seed);
    }finally{
      if(decoded&&typeof decoded.seed==='string')decoded.seed='';
      payload.fill(0);
    }
  }
  async function verifyVault(record,vaultKey){return withDecryptedWallet(record,vaultKey,async()=>true);}

  async function fetchRecord(){
    const data=await walletApi()('/api/embedded-wallet?action=status',{method:'GET'});
    state.record=data.wallet||null; return state.record;
  }
  async function saveBackup(backup){
    const data=await walletApi()('/api/embedded-wallet?action=save',{method:'POST',body:JSON.stringify({address:backup.address,encrypted_backup:backup})});
    state.record={...(state.record||{}),...data.wallet,encrypted_backup:backup}; return state.record;
  }

  async function fetchPayStatus(){
    const data=await walletApi()('/api/embedded-wallet?action=pay-status',{method:'GET'});
    state.payProfile=data.profile||null;
    state.paySuggestedHandle=String(data.suggested_handle||'');
    state.payDisplayName=String(data.display_name||'ATM Player');
    emitConsumerState();
    return data;
  }
  function activityKey(item){return `${String(item?.kind||'item')}:${String(item?.id||'')}`;}
  function pendingIncomingRequests(){return state.activity.filter(item=>item?.kind==='request'&&item.direction==='request_received'&&item.status==='pending'&&Date.parse(item.expires_at||0)>Date.now());}
  function recentRecipients(){
    const out=[],seen=new Set();
    for(const item of state.activity){
      if(item?.direction!=='sent'&&item?.direction!=='requested')continue;
      const person=normalizeRecipient(item.other); if(!person||seen.has(person.user_id))continue;
      if(item.kind==='payment'&&item.status!=='validated')continue;
      seen.add(person.user_id);out.push(person);if(out.length>=4)break;
    }
    return out;
  }
  function emitActivityNotification(item){
    const person=normalizeRecipient(item?.other); if(!person)return;
    let message='',tone='waiting';
    if(item.kind==='payment'&&item.direction==='received'&&item.status==='validated'){message=`${person.display_name} paid you ${item.amount_xrp} XRP ✓`;tone='success';}
    else if(item.kind==='request'&&item.direction==='request_received'&&item.status==='pending'&&Date.parse(item.expires_at||0)>Date.now()){message=`${person.display_name} requested ${item.amount_xrp} XRP · Open ATM Pay to respond.`;tone='waiting';}
    if(message)window.dispatchEvent(new CustomEvent('atm:pay-notification',{detail:{message,tone,item}}));
  }
  function emitConsumerState(){window.dispatchEvent(new CustomEvent('atm:pay-state-changed',{detail:getConsumerSnapshot()}));}
  function updatePendingRequestCount(){state.pendingRequestCount=pendingIncomingRequests().length;refreshButton();emitConsumerState();}
  async function fetchPayActivity(options={}){
    if(!state.payProfile)return [];
    try{
      const previous=new Map(state.activity.map(item=>[activityKey(item),String(item?.status||'')]));
      const data=await walletApi()('/api/embedded-wallet?action=pay-activity',{method:'GET'});
      const next=Array.isArray(data.items)?data.items:[];
      if(options.notify&&state.activityInitialized){
        for(const item of next){
          const oldStatus=previous.get(activityKey(item));
          if(oldStatus===undefined||oldStatus!==String(item?.status||''))emitActivityNotification(item);
        }
      }
      state.activity=next; state.activityInitialized=true; updatePendingRequestCount();
      if(state.payView==='activity'&&document.getElementById('atmEmbeddedWalletModal')?.classList.contains('open'))render();
      if(!options.silent)setMessage('ATM Pay activity refreshed.','ok');
      return state.activity;
    }catch(error){if(!options.silent)setMessage(error.message||'Could not load ATM Pay activity.','error');return state.activity;}
  }
  function stopActivityPolling(){if(payActivityPollTimer){clearInterval(payActivityPollTimer);payActivityPollTimer=null;}}
  function startActivityPolling(){
    stopActivityPolling();
    if(!state.payProfile)return;
    payActivityPollTimer=setInterval(()=>{if(!document.hidden&&state.payProfile)fetchPayActivity({silent:true,notify:true});},ATM_PAY_ACTIVITY_POLL_MS);
  }
  function personInitial(person){return String(person?.display_name||person?.handle||'A').trim().charAt(0).toUpperCase()||'A';}
  function characterThumbnail(person){const id=String(person?.character_id||'classic');return ATM_PAY_CHARACTER_THUMBNAILS[id]||ATM_PAY_CHARACTER_THUMBNAILS.classic;}
  function avatarHtml(person,extraClass=''){return `<span class="atmPayAvatar${extraClass?' '+escapeHtml(extraClass):''}"><img src="${escapeHtml(characterThumbnail(person))}" alt=""></span>`;}
  function normalizeRecipient(value){
    if(!value||typeof value!=='object')return null;
    const userId=String(value.user_id||''); const handle=String(value.handle||'');
    if(!/^[0-9a-f-]{36}$/i.test(userId)||!/^[a-z0-9_]{3,20}$/.test(handle))return null;
    return {user_id:userId,handle,display_name:String(value.display_name||'ATM Player').slice(0,30),character_id:String(value.character_id||'classic').slice(0,40),atm_pay_ready:value.atm_pay_ready!==false};
  }

  function ensureUi(){
    if(document.getElementById('atmEmbeddedWalletModal'))return;
    const style=document.createElement('style'); style.textContent=`
#atmEmbeddedWalletModal{position:fixed;inset:0;z-index:10080;display:none;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));background:rgba(0,7,12,.86);backdrop-filter:blur(10px)}
#atmEmbeddedWalletModal.open{display:flex}.atmWalletCard{width:min(590px,100%);max-height:min(800px,92dvh);overflow:auto;background:linear-gradient(180deg,#0c1d29,#07131c);border:1px solid rgba(88,241,230,.25);border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.55);color:#eafcff;padding:18px}.atmWalletHead{display:flex;gap:12px;align-items:flex-start}.atmWalletHead>div{min-width:0;flex:1}.atmWalletHead h3{margin:0;font-size:22px}.atmWalletHead small{display:block;color:#8fb1bf;line-height:1.4;margin-top:4px}.atmWalletClose{border:0;background:#182b37;color:#dffcff;border-radius:10px;width:38px;height:38px;font-size:21px}.atmWalletTestnet{display:inline-flex;margin-top:10px;padding:5px 9px;border-radius:999px;background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.3);color:#ffd166;font-weight:900;font-size:10px;letter-spacing:.08em}.atmWalletSecurityBadge{display:inline-flex;margin:8px 0 0 6px;padding:5px 9px;border-radius:999px;background:rgba(112,249,200,.08);border:1px solid rgba(112,249,200,.25);color:#70f9c8;font-weight:900;font-size:9px;letter-spacing:.06em}.atmWalletBody{display:grid;gap:12px;margin-top:14px}.atmWalletPanel{border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:13px;background:rgba(255,255,255,.035)}.atmWalletPanel strong{display:block;font-size:12px}.atmWalletPanel p{margin:6px 0 0;color:#9db9c5;font-size:11px;line-height:1.5}.atmWalletAddress{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;overflow-wrap:anywhere;color:#70f9c8;margin-top:7px}.atmWalletBalance{font-size:28px;font-weight:1000;margin-top:3px}.atmWalletActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.atmWalletActions .wide{grid-column:1/-1}.atmWalletBtn{border:0;border-radius:12px;padding:11px 12px;font-weight:1000;font-size:10px;letter-spacing:.04em;text-transform:uppercase;background:#183142;color:#eafcff;border:1px solid rgba(88,241,230,.16)}.atmWalletBtn.primary{background:linear-gradient(90deg,#58f1e6,#70f9c8);color:#052029}.atmWalletBtn.gold{background:linear-gradient(90deg,#facd69,#f0a54e);color:#261600}.atmWalletBtn.danger{border-color:rgba(255,112,132,.3);color:#ffadb9}.atmWalletBtn:disabled{opacity:.45}.atmWalletInput{width:100%;margin-top:8px;background:#041018;border:1px solid rgba(88,241,230,.2);border-radius:11px;color:#fff;padding:12px 12px;font-family:inherit;font-size:13px;box-sizing:border-box}.atmWalletRecovery{word-break:break-all;background:#031018;padding:10px;border-radius:10px;border:1px dashed rgba(255,209,102,.4);color:#ffe2a0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;margin-top:8px}.atmWalletLabel{display:block;margin-top:10px;color:#8fb1bf;font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.atmWalletTxGrid{display:grid;grid-template-columns:minmax(90px,.7fr) minmax(0,1.3fr);gap:7px 10px;margin-top:10px;font-size:11px}.atmWalletTxGrid span{color:#88a8b5}.atmWalletTxGrid b{overflow-wrap:anywhere;text-align:right}.atmWalletTxActions{margin-top:10px}.atmWalletTxStatus{font-size:16px;font-weight:1000;margin-top:7px}.atmWalletTxResult.ok{border-color:rgba(112,249,200,.32)}.atmWalletTxResult.error{border-color:rgba(255,112,132,.38)}.atmWalletTxResult.pending{border-color:rgba(255,209,102,.38)}.atmWalletLink{display:inline-flex;margin-top:9px;color:#70f9c8;font-size:11px;font-weight:900;text-decoration:none}.atmWalletWarning{color:#ffd166!important}.atmWalletSecurity{color:#70f9c8!important}.atmWalletMsg{min-height:18px;font-size:11px;line-height:1.45;color:#9fc3cc}.atmWalletMsg.ok{color:#70f9c8}.atmWalletMsg.error{color:#ff9eae}.atmPayHero{display:flex;align-items:center;gap:12px}.atmPayAvatar{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,#173d4c,#102631);border:1px solid rgba(88,241,230,.25);font-size:18px;font-weight:1000;color:#70f9c8;flex:0 0 auto}.atmPayAvatar img{width:100%;height:100%;object-fit:cover;image-rendering:auto}.atmPayHeroText{min-width:0;flex:1}.atmPayHeroText b{display:block;font-size:15px}.atmPayHandle{color:#70f9c8;font-size:12px;font-weight:900;margin-top:2px}.atmPayTabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.atmPayTab{border:1px solid rgba(88,241,230,.12);background:#102431;color:#a8c4ce;border-radius:11px;padding:9px 6px;font-size:9px;font-weight:1000;text-transform:uppercase}.atmPayTab.active{background:rgba(88,241,230,.12);color:#70f9c8;border-color:rgba(88,241,230,.3)}.atmPayPerson{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:1px solid rgba(255,255,255,.08);background:#0a1922;color:#eafcff;border-radius:13px;padding:10px;margin-top:7px}.atmPayPerson .atmPayAvatar{width:36px;height:36px;border-radius:12px;font-size:15px}.atmPayPersonText{min-width:0;flex:1}.atmPayPersonText b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atmPayPersonText span{display:block;color:#70f9c8;font-size:10px;margin-top:2px}.atmPayPersonAction{font-size:9px;color:#8fb1bf;font-weight:900}.atmPaySelected{display:flex;align-items:center;gap:10px;margin:8px 0;padding:10px;border-radius:13px;background:rgba(112,249,200,.06);border:1px solid rgba(112,249,200,.16)}.atmPayAmountWrap{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 0}.atmPayAmountInput{width:170px;max-width:65%;background:transparent;border:0;border-bottom:1px solid rgba(88,241,230,.25);color:#fff;text-align:center;font-size:34px;font-weight:1000;outline:none}.atmPayAmountUnit{font-size:14px;font-weight:1000;color:#70f9c8}.atmPayReview{text-align:center;padding:8px 0}.atmPayReview .atmPayAvatar{margin:0 auto 8px;width:56px;height:56px;border-radius:18px;font-size:22px}.atmPayReviewAmount{font-size:34px;font-weight:1000;margin:8px 0}.atmPayReviewName{font-size:16px;font-weight:1000}.atmPayMeta{font-size:10px;color:#8fb1bf;margin-top:6px;line-height:1.5}.atmPaySearchResults{margin-top:8px}.atmPayEmpty{padding:14px;text-align:center;color:#7f9aa6;font-size:11px}.atmPayActivityItem{border:1px solid rgba(255,255,255,.07);border-radius:13px;padding:11px;margin-top:8px;background:rgba(255,255,255,.025)}.atmPayActivityTop{display:flex;gap:10px;align-items:center}.atmPayActivityTop .atmPayAvatar{width:34px;height:34px;border-radius:11px;font-size:14px}.atmPayActivityMain{min-width:0;flex:1}.atmPayActivityMain b{display:block;font-size:11px}.atmPayActivityMain span{display:block;color:#8fb1bf;font-size:9px;margin-top:2px}.atmPayActivityAmount{font-size:13px;font-weight:1000}.atmPayActivityActions{display:flex;gap:6px;margin-top:9px}.atmPayActivityActions .atmWalletBtn{flex:1;padding:8px}.atmPayStatusPill{display:inline-flex;margin-top:7px;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:1000;text-transform:uppercase;background:rgba(255,255,255,.06);color:#9db9c5}.atmPayStatusPill.ok{background:rgba(112,249,200,.08);color:#70f9c8}.atmPaySetupHandle{display:flex;align-items:center;gap:0;margin-top:9px}.atmPaySetupHandle span{padding:12px 0 12px 12px;background:#041018;border:1px solid rgba(88,241,230,.2);border-right:0;border-radius:11px 0 0 11px;color:#70f9c8;font-weight:1000}.atmPaySetupHandle input{margin-top:0;border-radius:0 11px 11px 0;border-left:0;padding-left:3px}.atmPayDetails{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)}.atmPaySectionTitle{display:flex;align-items:center;justify-content:space-between;gap:8px}.atmPaySectionTitle span{font-size:9px;color:#70f9c8;font-weight:1000}.atmPayRecent{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}.atmPayRecentPerson{border:1px solid rgba(88,241,230,.12);background:#0a1922;color:#eafcff;border-radius:13px;padding:9px 5px;display:grid;justify-items:center;gap:5px;min-width:0}.atmPayRecentPerson .atmPayAvatar{width:38px;height:38px;border-radius:13px}.atmPayRecentPerson b{font-size:9px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.atmPayRecentPerson small{font-size:8px;color:#70f9c8;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.atmPayIncoming{border-color:rgba(255,209,102,.28);background:rgba(255,209,102,.045)}.atmPaySuccessCelebration{position:relative;overflow:hidden;animation:atmPaySuccessPop .45s cubic-bezier(.2,.9,.2,1)}.atmPaySuccessMark{width:54px;height:54px;border-radius:50%;margin:2px auto 8px;display:grid;place-items:center;background:rgba(112,249,200,.14);border:1px solid rgba(112,249,200,.38);color:#70f9c8;font-size:30px;font-weight:1000;animation:atmPayCheck .65s cubic-bezier(.2,.9,.2,1)}.atmPaySuccessSparkles{font-size:18px;letter-spacing:8px;text-align:center;height:18px;animation:atmPaySparkles 1.5s ease-out both}.atmPayButtonBadge{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 4px;margin-left:6px;border-radius:999px;background:#ffd166;color:#251900;font-size:9px;font-weight:1000}@keyframes atmPaySuccessPop{0%{transform:scale(.96);opacity:.35}100%{transform:scale(1);opacity:1}}@keyframes atmPayCheck{0%{transform:scale(.35) rotate(-16deg);opacity:0}70%{transform:scale(1.12) rotate(3deg)}100%{transform:scale(1);opacity:1}}@keyframes atmPaySparkles{0%{transform:translateY(8px);opacity:0}35%{opacity:1}100%{transform:translateY(-10px);opacity:0}}
@media(max-width:560px){.atmWalletCard{padding:14px;border-radius:17px}.atmWalletActions{grid-template-columns:1fr}.atmWalletActions .wide{grid-column:auto}.atmWalletBalance{font-size:24px}.atmPayTabs{gap:4px}.atmPayTab{font-size:8px;padding:9px 3px}.atmPayAmountInput{font-size:30px}.atmPayRecent{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.atmPayRecentPerson{padding:8px 3px}.atmPayRecentPerson .atmPayAvatar{width:34px;height:34px}}
`;
    document.head.appendChild(style);
    const modal=document.createElement('div'); modal.id='atmEmbeddedWalletModal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','atmWalletTitle');
    modal.innerHTML=`<div class="atmWalletCard"><div class="atmWalletHead"><div><h3 id="atmWalletTitle">ATM Pay</h3><small>Pay people by name. XRPL settlement stays behind the scenes.</small><span class="atmWalletTestnet">TESTNET PREVIEW</span><span class="atmWalletSecurityBadge">FRESH AUTH PER PAYMENT</span></div><button class="atmWalletClose" id="atmWalletClose" type="button" aria-label="Close">×</button></div><div class="atmWalletBody" id="atmWalletBody"></div><div class="atmWalletMsg" id="atmWalletMsg" aria-live="polite"></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('atmWalletClose')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
  }
  function setMessage(message,tone='info'){
    const el=document.getElementById('atmWalletMsg'); if(!el)return; el.textContent=message||''; el.className='atmWalletMsg'+(tone==='ok'?' ok':tone==='error'?' error':'');
  }
  function setBusy(busy,message){state.busy=!!busy;document.querySelectorAll('#atmEmbeddedWalletModal button').forEach(btn=>{if(btn.id!=='atmWalletClose')btn.disabled=!!busy;});if(message)setMessage(message);}

  function personHtml(person,actionText='SELECT'){
    const p=normalizeRecipient(person); if(!p)return '';
    return `<button class="atmPayPerson" type="button" data-recipient-id="${escapeHtml(p.user_id)}">${avatarHtml(p)}<span class="atmPayPersonText"><b>${escapeHtml(p.display_name)}</b><span>@${escapeHtml(p.handle)}</span></span><span class="atmPayPersonAction">${escapeHtml(actionText)}</span></button>`;
  }
  function recipientResultsHtml(){
    if(!state.paySearchQuery)return '<div class="atmPayEmpty">Search by ATM Pay @handle or player name.</div>';
    if(!state.recipientSearchResults.length)return '<div class="atmPayEmpty">No ATM Pay users found yet.</div>';
    return state.recipientSearchResults.map(person=>personHtml(person,state.payView==='request'?'REQUEST':'PAY')).join('');
  }
  function selectedRecipientHtml(person){
    const p=normalizeRecipient(person); if(!p)return '';
    return `<div class="atmPaySelected">${avatarHtml(p)}<span class="atmPayPersonText"><b>${escapeHtml(p.display_name)}</b><span>@${escapeHtml(p.handle)}</span></span><button class="atmWalletBtn" id="atmPayChangeRecipient" type="button">Change</button></div>`;
  }
  function recentRecipientsHtml(){
    const people=recentRecipients(); if(!people.length)return '';
    return `<div class="atmWalletPanel"><div class="atmPaySectionTitle"><strong>Recent</strong><span>QUICK PAY</span></div><div class="atmPayRecent">${people.map(p=>`<button class="atmPayRecentPerson" type="button" data-recipient-id="${escapeHtml(p.user_id)}">${avatarHtml(p)}<b>${escapeHtml(p.display_name)}</b><small>@${escapeHtml(p.handle)}</small></button>`).join('')}</div></div>`;
  }
  function pendingRequestsHtml(){
    const requests=pendingIncomingRequests(); if(!requests.length)return '';
    return `<div class="atmWalletPanel atmPayIncoming"><div class="atmPaySectionTitle"><strong>Requests for you</strong><span>${requests.length} PENDING</span></div>${requests.slice(0,3).map(item=>{const p=normalizeRecipient(item.other);return `<div class="atmPayActivityItem"><div class="atmPayActivityTop">${avatarHtml(p)}<span class="atmPayActivityMain"><b>${escapeHtml(p?.display_name||'ATM Player')} requested</b><span>@${escapeHtml(p?.handle||'player')}${item.note?` · ${escapeHtml(item.note)}`:''}</span></span><span class="atmPayActivityAmount">${escapeHtml(item.amount_xrp)} XRP</span></div><div class="atmPayActivityActions"><button class="atmWalletBtn primary" data-pay-request="${escapeHtml(item.id)}" type="button">Pay</button><button class="atmWalletBtn" data-decline-request="${escapeHtml(item.id)}" type="button">Decline</button></div></div>`;}).join('')}</div>`;
  }
  function transactionResultHtml(){
    const tx=state.lastTransaction; if(!tx?.hash)return '';
    const explorerBase=String(CONFIG.explorerTxBase||'https://testnet.xrpl.org/transactions/');
    const status=tx.result||'STATUS UNKNOWN'; const validated=tx.validated===true; const success=validated&&status==='tesSUCCESS'; const recipient=normalizeRecipient(tx.recipient)||{display_name:'ATM Player',handle:'player',character_id:'classic'};
    const detail=validated?(success?`${tx.amountXrp} XRP sent to ${recipient.display_name}.`:`Transaction validated with result ${status}.`):'Payment status is not confirmed yet.';
    return `<div class="atmWalletPanel atmWalletTxResult ${success?'ok atmPaySuccessCelebration':validated?'error':'pending'}">${success?'<div class="atmPaySuccessSparkles">✦ ✧ ✦</div><div class="atmPaySuccessMark">✓</div>':''}<strong>${success?'Payment complete':'Last payment'}</strong><div class="atmWalletTxStatus">${success?'SENT':escapeHtml(status)}</div><p>${escapeHtml(detail)}</p><div class="atmPayHero" style="margin-top:9px">${avatarHtml(recipient)}<span class="atmPayHeroText"><b>${escapeHtml(recipient.display_name)}</b><span class="atmPayHandle">@${escapeHtml(recipient.handle)}</span></span></div><a class="atmWalletLink" href="${escapeHtml(explorerBase+encodeURIComponent(tx.hash))}" target="_blank" rel="noopener noreferrer">Transaction details ↗</a></div>`;
  }
  function paySearchHtml(mode){
    const quick=mode==='send'&&!state.paySearchQuery?pendingRequestsHtml()+recentRecipientsHtml():'';
    return `${quick}<div class="atmWalletPanel"><strong>${mode==='request'?'Who do you want to request from?':'Who do you want to pay?'}</strong><label class="atmWalletLabel" for="atmPaySearch">Search ATM Town</label><input class="atmWalletInput" id="atmPaySearch" type="search" autocomplete="off" autocapitalize="none" spellcheck="false" value="${escapeHtml(state.paySearchQuery)}" placeholder="@handle or player name"><div class="atmPaySearchResults" id="atmPaySearchResults">${recipientResultsHtml()}</div></div>`;
  }
  function paymentReviewHtml(){
    const prepared=state.preparedPayment; if(!prepared)return '';
    const passkey=!!state.record?.encrypted_backup?.passkey; const recipient=normalizeRecipient(prepared.recipient);
    return `<div class="atmWalletPanel atmWalletTxPreview"><div class="atmPayReview">${avatarHtml(recipient)}<div class="atmPayReviewName">${escapeHtml(recipient.display_name)}</div><div class="atmPayHandle">@${escapeHtml(recipient.handle)}</div><div class="atmPayReviewAmount">${escapeHtml(prepared.amountXrp)} XRP</div>${prepared.note?`<p>“${escapeHtml(prepared.note)}”</p>`:''}<div class="atmPayMeta">XRPL Testnet · network fee ${escapeHtml(prepared.feeXrp)} XRP<br>Your authorization is bound to this exact recipient, amount, fee, sequence and expiration.</div></div>${passkey?'':`<label class="atmWalletLabel" for="atmWalletSignRecoveryInput">ATM1 recovery key</label><input class="atmWalletInput" id="atmWalletSignRecoveryInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ATM1-… recovery key">`}<div class="atmWalletActions atmWalletTxActions">${passkey?`<button class="atmWalletBtn primary wide" id="atmWalletSignPaymentPasskey" type="button">Pay ${escapeHtml(prepared.amountXrp)} XRP</button>`:`<button class="atmWalletBtn primary wide" id="atmWalletSignPaymentRecovery" type="button">Authorize & Pay ${escapeHtml(prepared.amountXrp)} XRP</button>`}${passkey?'<button class="atmWalletBtn" id="atmWalletShowRecoverySign" type="button">Use Recovery Key</button>':''}<button class="atmWalletBtn" id="atmWalletCancelPayment" type="button">Cancel</button></div><div id="atmWalletRecoverySignFallback"></div></div>`;
  }
  function sendViewHtml(){
    if(state.preparedPayment)return paymentReviewHtml();
    if(!state.selectedRecipient)return paySearchHtml('send');
    const request=state.requestDraft;
    return `<div class="atmWalletPanel"><strong>${request?'Pay request':'Send money'}</strong>${selectedRecipientHtml(state.selectedRecipient)}<div class="atmPayAmountWrap"><input class="atmPayAmountInput" id="atmPayAmount" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(request?.amount_xrp||'1.00')}" ${request?'readonly':''}><span class="atmPayAmountUnit">XRP</span></div>${request?`<p>This amount came from the request and cannot be changed.</p>`:''}<label class="atmWalletLabel" for="atmPayNote">Note · optional</label><input class="atmWalletInput" id="atmPayNote" maxlength="80" type="text" autocomplete="off" value="${escapeHtml(request?.note||'')}" ${request?'readonly':''} placeholder="What's it for?"><div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn primary wide" id="atmPayReviewPayment" type="button">Review Payment</button></div></div>`;
  }
  function requestViewHtml(){
    if(!state.selectedRecipient)return paySearchHtml('request');
    return `<div class="atmWalletPanel"><strong>Request money</strong>${selectedRecipientHtml(state.selectedRecipient)}<div class="atmPayAmountWrap"><input class="atmPayAmountInput" id="atmPayRequestAmount" type="text" inputmode="decimal" autocomplete="off" value="1.00"><span class="atmPayAmountUnit">XRP</span></div><label class="atmWalletLabel" for="atmPayRequestNote">Note · optional</label><input class="atmWalletInput" id="atmPayRequestNote" maxlength="80" type="text" autocomplete="off" placeholder="What's it for?"><div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn primary wide" id="atmPayCreateRequest" type="button">Send Request</button></div></div>`;
  }
  function activityItemHtml(item){
    const person=normalizeRecipient(item?.other)||{display_name:'ATM Player',handle:'player',user_id:''};
    const isPayment=item.kind==='payment';
    let verb='';
    if(isPayment)verb=item.direction==='sent'?`Paid ${person.display_name}`:`${person.display_name} paid you`;
    else verb=item.direction==='requested'?`Requested from ${person.display_name}`:`${person.display_name} requested`;
    const status=String(item.status||'pending'); const ok=status==='validated'||status==='paid';
    const canPay=item.kind==='request'&&item.direction==='request_received'&&status==='pending'&&Date.parse(item.expires_at||0)>Date.now();
    const canDecline=canPay; const canCancel=item.kind==='request'&&item.direction==='requested'&&status==='pending';
    return `<div class="atmPayActivityItem"><div class="atmPayActivityTop">${avatarHtml(person)}<span class="atmPayActivityMain"><b>${escapeHtml(verb)}</b><span>@${escapeHtml(person.handle)}${item.note?` · ${escapeHtml(item.note)}`:''}</span></span><span class="atmPayActivityAmount">${escapeHtml(item.amount_xrp)} XRP</span></div><span class="atmPayStatusPill ${ok?'ok':''}">${escapeHtml(status)}</span>${isPayment&&item.tx_hash?` <a class="atmWalletLink" href="${escapeHtml(String(CONFIG.explorerTxBase||'https://testnet.xrpl.org/transactions/')+encodeURIComponent(item.tx_hash))}" target="_blank" rel="noopener noreferrer">Details ↗</a>`:''}${canPay||canDecline||canCancel?`<div class="atmPayActivityActions">${canPay?`<button class="atmWalletBtn primary" data-pay-request="${escapeHtml(item.id)}" type="button">Pay</button>`:''}${canDecline?`<button class="atmWalletBtn" data-decline-request="${escapeHtml(item.id)}" type="button">Decline</button>`:''}${canCancel?`<button class="atmWalletBtn" data-cancel-request="${escapeHtml(item.id)}" type="button">Cancel Request</button>`:''}</div>`:''}</div>`;
  }
  function activityViewHtml(){
    return `<div class="atmWalletPanel"><strong>Activity</strong><p>Payments and requests use ATM Town identities. XRPL addresses stay out of the normal flow.</p><div id="atmPayActivityList">${state.activity.length?state.activity.map(activityItemHtml).join(''):'<div class="atmPayEmpty">No ATM Pay activity yet.</div>'}</div><div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn wide" id="atmPayRefreshActivity" type="button">Refresh Activity</button></div></div>`;
  }
  function settingsViewHtml(){
    const passkey=!!state.record?.encrypted_backup?.passkey;
    return `<div class="atmWalletPanel"><strong>ATM Pay security</strong><p class="atmWalletSecurity">Your XRPL signing key is encrypted when not in use. Every payment signature requires fresh authorization and is created locally on this device.</p><p>${passkey?'Wallet passkey protection is active. Recovery-key authorization remains available as backup.':'Recovery-key authorization is active. Add a PRF-capable wallet passkey for faster payments.'}</p></div><div class="atmWalletPanel"><strong>Recovery & backup</strong>${passkey?'':`<label class="atmWalletLabel" for="atmWalletManagementRecovery">ATM1 recovery key for passkey setup/export</label><input class="atmWalletInput" id="atmWalletManagementRecovery" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ATM1-… recovery key">`}<div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn" id="atmWalletRefreshBalance" type="button">Refresh Balance</button>${passkey?'':'<button class="atmWalletBtn" id="atmWalletAddPasskey" type="button">Add Wallet Passkey</button>'}<button class="atmWalletBtn gold" id="atmWalletExportBackup" type="button">Download Encrypted Backup</button>${passkey?'<button class="atmWalletBtn danger" id="atmWalletCopySeedPasskey" type="button">Emergency Seed Copy</button>':'<button class="atmWalletBtn danger" id="atmWalletCopySeedRecovery" type="button">Emergency Seed Copy</button>'}</div></div><div class="atmWalletPanel"><strong>Advanced XRPL details</strong><p>Most people never need these. ATM Pay uses your identity instead.</p><div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn wide" id="atmPayToggleXrplDetails" type="button">${state.xrplDetailsVisible?'Hide':'Show'} XRPL Details</button></div>${state.xrplDetailsVisible?`<div class="atmPayDetails"><span class="atmWalletLabel">Network</span><div>XRPL TESTNET</div><span class="atmWalletLabel">Public address</span><div class="atmWalletAddress">${escapeHtml(state.record.address)}</div></div>`:''}</div>`;
  }
  function dashboardViewHtml(){
    if(state.payView==='request')return requestViewHtml();
    if(state.payView==='activity')return activityViewHtml();
    if(state.payView==='settings')return settingsViewHtml();
    return sendViewHtml();
  }
  function render(){
    ensureUi(); const body=document.getElementById('atmWalletBody'); if(!body)return;
    const record=state.record;
    if(!record){
      body.innerHTML=`<div class="atmWalletPanel"><strong>Set up ATM Pay</strong><p>Create a secure payment account on this device so you can send and receive by @name. Wallet addresses stay out of the normal experience.</p><p class="atmWalletWarning">ATM Pay is still XRPL Testnet only. Test XRP has no Mainnet value.</p></div><div class="atmWalletActions"><button class="atmWalletBtn primary wide" id="atmWalletCreate" type="button">Set Up ATM Pay</button><button class="atmWalletBtn wide" id="atmWalletRestoreFile" type="button">Restore ATM Pay Backup</button><input id="atmWalletRestoreInput" type="file" accept="application/json,.json" hidden></div>`;
      document.getElementById('atmWalletCreate')?.addEventListener('click',createWallet);
      document.getElementById('atmWalletRestoreFile')?.addEventListener('click',()=>document.getElementById('atmWalletRestoreInput')?.click());
      document.getElementById('atmWalletRestoreInput')?.addEventListener('change',restoreEncryptedBackupFile);
      return;
    }
    const passkey=!!record.encrypted_backup?.passkey;
    if(state.recoveryKey){renderCreationSuccess(passkey);return;}
    if(!state.payProfile){
      const suggested=state.paySuggestedHandle||'atmplayer';
      body.innerHTML=`<div class="atmWalletPanel"><strong>Choose your ATM Pay name</strong><p>This is what people will search, pay, and request. Your XRPL wallet address stays behind the scenes.</p><div class="atmPaySetupHandle"><span>@</span><input class="atmWalletInput" id="atmPayHandleInput" type="text" maxlength="20" autocomplete="off" autocapitalize="none" spellcheck="false" value="${escapeHtml(suggested)}"></div><p class="atmWalletWarning">Choose carefully. Handle changes are locked during this security preview.</p></div><div class="atmWalletActions"><button class="atmWalletBtn primary wide" id="atmPayClaimHandle" type="button">Create ATM Pay Name</button></div>`;
      document.getElementById('atmPayClaimHandle')?.addEventListener('click',claimPayHandle);
      return;
    }
    body.innerHTML=`<div class="atmWalletPanel atmPayHero">${avatarHtml(state.payProfile)}<span class="atmPayHeroText"><b>${escapeHtml(state.payProfile.display_name||state.payDisplayName)}</b><span class="atmPayHandle">@${escapeHtml(state.payProfile.handle)}</span></span><span><div class="atmWalletBalance" id="atmWalletBalance">—</div><small>XRP</small></span></div>${transactionResultHtml()}<div class="atmPayTabs"><button class="atmPayTab ${state.payView==='send'?'active':''}" data-pay-view="send" type="button">Send</button><button class="atmPayTab ${state.payView==='request'?'active':''}" data-pay-view="request" type="button">Request</button><button class="atmPayTab ${state.payView==='activity'?'active':''}" data-pay-view="activity" type="button">Activity${state.pendingRequestCount?` · ${state.pendingRequestCount}`:''}</button><button class="atmPayTab ${state.payView==='settings'?'active':''}" data-pay-view="settings" type="button">Security</button></div>${dashboardViewHtml()}`;
    bindDashboardUi(); refreshBalance({silent:true});
  }

  function bindRecipientButtons(){
    document.querySelectorAll('#atmEmbeddedWalletModal [data-recipient-id]').forEach(button=>button.addEventListener('click',()=>{
      const id=String(button.dataset.recipientId||''); const person=[...state.recipientSearchResults,...recentRecipients()].find(item=>item.user_id===id); if(!person)return;
      state.selectedRecipient=person; state.paySearchQuery=''; state.recipientSearchResults=[]; clearPreparedPayment(); render(); setMessage(`${state.payView==='request'?'Request from':'Pay'} @${person.handle}.`);
    }));
  }
  function updateRecipientResults(){const host=document.getElementById('atmPaySearchResults');if(!host)return;host.innerHTML=recipientResultsHtml();bindRecipientButtons();}
  async function runRecipientSearch(query){
    state.paySearchQuery=String(query||'').trim();
    if(state.paySearchQuery.length<2){state.recipientSearchResults=[];updateRecipientResults();return;}
    try{
      const data=await walletApi()(`/api/embedded-wallet?action=pay-search&q=${encodeURIComponent(state.paySearchQuery)}`,{method:'GET'});
      state.recipientSearchResults=(Array.isArray(data.results)?data.results:[]).map(normalizeRecipient).filter(Boolean); updateRecipientResults();
    }catch(error){state.recipientSearchResults=[];updateRecipientResults();setMessage(error.message||'Could not search ATM Pay users.','error');}
  }
  async function claimPayHandle(){
    const handle=String(document.getElementById('atmPayHandleInput')?.value||'').trim().toLowerCase().replace(/^@+/, '');
    try{
      setBusy(true,'Creating your ATM Pay name…');
      const data=await walletApi()('/api/embedded-wallet?action=pay-claim-handle',{method:'POST',body:JSON.stringify({handle})});
      state.payProfile=normalizeRecipient(data.profile); state.payView='send'; await fetchPayActivity({silent:true}); startActivityPolling();
      if(state.pendingOpenRecipient){state.selectedRecipient=state.pendingOpenRecipient;state.pendingOpenRecipient=null;}
      render(); setMessage(state.selectedRecipient?`ATM Pay is ready. Pay @${state.selectedRecipient.handle} without using a wallet address.`:`ATM Pay is ready. People can now find you as @${state.payProfile.handle}.`,'ok');
    }catch(error){setMessage(error.message||'Could not create that ATM Pay name.','error');}
    finally{setBusy(false);}
  }
  async function createPayRequest(){
    const recipient=normalizeRecipient(state.selectedRecipient); if(!recipient)return;
    try{
      const amount=parseTestXrpAmount(document.getElementById('atmPayRequestAmount')?.value||'');
      const note=String(document.getElementById('atmPayRequestNote')?.value||'').trim().slice(0,80);
      setBusy(true,`Sending request to @${recipient.handle}…`);
      await walletApi()('/api/embedded-wallet?action=pay-request',{method:'POST',body:JSON.stringify({payer_id:recipient.user_id,amount_drops:amount.drops,note})});
      state.selectedRecipient=null; state.payView='activity'; await fetchPayActivity({silent:true}); render(); setMessage(`Request sent to @${recipient.handle}.`,'ok');
    }catch(error){setMessage(error.message||'Could not send ATM Pay request.','error');}
    finally{setBusy(false);}
  }
  function requestItemById(id){return state.activity.find(item=>item.kind==='request'&&item.id===id)||null;}
  async function actOnPayRequest(id,requestAction){
    try{setBusy(true,requestAction==='decline'?'Declining request…':'Cancelling request…');await walletApi()('/api/embedded-wallet?action=pay-request-action',{method:'POST',body:JSON.stringify({request_id:id,request_action:requestAction})});await fetchPayActivity({silent:true});render();setMessage(requestAction==='decline'?'Request declined.':'Request cancelled.','ok');}
    catch(error){setMessage(error.message||'Could not update request.','error');}finally{setBusy(false);}
  }
  async function payRequestedItem(id){
    const item=requestItemById(id); if(!item||item.status!=='pending')return;
    const recipient=normalizeRecipient(item.other); if(!recipient)return;
    state.payView='send';state.selectedRecipient=recipient;state.requestDraft={id:item.id,amount_drops:item.amount_drops,amount_xrp:item.amount_xrp,note:item.note||''};state.preparedPayment=null;render();setMessage(`Preparing ${item.amount_xrp} XRP for @${recipient.handle}…`);
    await prepareAtmPayPayment();
  }
  function bindDashboardUi(){
    document.querySelectorAll('#atmEmbeddedWalletModal [data-pay-view]').forEach(button=>button.addEventListener('click',()=>{
      state.payView=String(button.dataset.payView||'send'); state.selectedRecipient=null; state.requestDraft=null; clearPreparedPayment(); state.paySearchQuery=''; state.recipientSearchResults=[]; render(); if(state.payView==='activity')fetchPayActivity({silent:true});
    }));
    const search=document.getElementById('atmPaySearch'); if(search)search.addEventListener('input',()=>{clearTimeout(paySearchTimer);paySearchTimer=setTimeout(()=>runRecipientSearch(search.value),260);});
    bindRecipientButtons();
    document.getElementById('atmPayChangeRecipient')?.addEventListener('click',()=>{state.selectedRecipient=null;state.requestDraft=null;clearPreparedPayment();render();});
    document.getElementById('atmPayReviewPayment')?.addEventListener('click',prepareAtmPayPayment);
    document.getElementById('atmWalletSignPaymentPasskey')?.addEventListener('click',()=>signAndSubmitAtmPayPayment('passkey'));
    document.getElementById('atmWalletSignPaymentRecovery')?.addEventListener('click',()=>signAndSubmitAtmPayPayment('recovery'));
    document.getElementById('atmWalletShowRecoverySign')?.addEventListener('click',showRecoverySignFallback);
    document.getElementById('atmWalletCancelPayment')?.addEventListener('click',cancelPreparedAtmPayPayment);
    document.getElementById('atmPayCreateRequest')?.addEventListener('click',createPayRequest);
    document.getElementById('atmPayRefreshActivity')?.addEventListener('click',()=>fetchPayActivity());
    document.querySelectorAll('#atmEmbeddedWalletModal [data-pay-request]').forEach(button=>button.addEventListener('click',()=>payRequestedItem(String(button.dataset.payRequest||''))));
    document.querySelectorAll('#atmEmbeddedWalletModal [data-decline-request]').forEach(button=>button.addEventListener('click',()=>actOnPayRequest(String(button.dataset.declineRequest||''),'decline')));
    document.querySelectorAll('#atmEmbeddedWalletModal [data-cancel-request]').forEach(button=>button.addEventListener('click',()=>actOnPayRequest(String(button.dataset.cancelRequest||''),'cancel')));
    document.getElementById('atmWalletRefreshBalance')?.addEventListener('click',refreshBalance);
    document.getElementById('atmWalletExportBackup')?.addEventListener('click',downloadEncryptedBackup);
    document.getElementById('atmWalletAddPasskey')?.addEventListener('click',addPasskeyWrapper);
    document.getElementById('atmWalletCopySeedPasskey')?.addEventListener('click',()=>copyEmergencySeed('passkey'));
    document.getElementById('atmWalletCopySeedRecovery')?.addEventListener('click',()=>copyEmergencySeed('recovery'));
    document.getElementById('atmPayToggleXrplDetails')?.addEventListener('click',()=>{state.xrplDetailsVisible=!state.xrplDetailsVisible;render();});
  }
  function showRecoverySignFallback(){
    const host=document.getElementById('atmWalletRecoverySignFallback'); if(!host)return;
    host.innerHTML=`<label class="atmWalletLabel" for="atmWalletSignRecoveryInput">ATM1 recovery key</label><input class="atmWalletInput" id="atmWalletSignRecoveryInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ATM1-… recovery key"><div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn primary wide" id="atmWalletSignPaymentRecovery" type="button">Authorize & Pay</button></div>`;
    document.getElementById('atmWalletSignPaymentRecovery')?.addEventListener('click',()=>signAndSubmitAtmPayPayment('recovery'));
  }

  async function open(){
    ensureUi(); document.getElementById('atmEmbeddedWalletModal')?.classList.add('open'); setMessage('');
    try{
      setBusy(true,'Opening ATM Pay…');
      await fetchRecord();
      await fetchPayStatus();
      if(state.payProfile){await fetchPayActivity({silent:true});startActivityPolling();}
      if(state.pendingOpenRecipient&&state.payProfile){state.payView='send';state.selectedRecipient=state.pendingOpenRecipient;state.pendingOpenRecipient=null;}
      render();
      setMessage(state.selectedRecipient?`Pay @${state.selectedRecipient.handle} without using a wallet address.`:state.payProfile?`ATM Pay ready as @${state.payProfile.handle}.`:state.record?'Choose your ATM Pay @name to finish setup.':'Set up ATM Pay to send and receive by name.');
    }catch(error){render();setMessage(error.message||'Could not open ATM Pay.','error');}
    finally{setBusy(false);}
  }
  function close(){
    if(state.recoveryKey){
      const proceed=window.confirm('Your newly created wallet recovery key has not been marked as saved. Close anyway and erase it from this page?');
      if(!proceed)return;
      clearRecoveryKey();
    }
    clearPreparedPayment(); state.selectedRecipient=null;state.requestDraft=null;state.paySearchQuery='';state.recipientSearchResults=[];document.getElementById('atmEmbeddedWalletModal')?.classList.remove('open');
  }

  async function createWallet(){
    if(state.record)return;
    if(!window.crypto?.subtle){setMessage('Web Crypto is unavailable in this browser. Wallet creation is blocked.','error');return;}
    setBusy(true,'Generating XRPL Testnet wallet locally…');
    let recoveryBytes=null,vaultKey=null,wallet=null,seed='';
    try{
      const xrpl=await loadXrpl(); wallet=xrpl.Wallet.generate();
      const address=wallet.classicAddress; seed=wallet.seed;
      if(!address||!seed)throw new Error('XRPL wallet generation did not return a usable keypair.');
      vaultKey=randomBytes(32); recoveryBytes=randomBytes(32);
      const payloadIv=randomBytes(12);
      const payloadPlain=textEncoder.encode(JSON.stringify({version:1,network:NETWORK,address,seed}));
      const payloadCipher=await encryptBytes(vaultKey,payloadPlain,payloadIv,aad('wallet-payload',address)); payloadPlain.fill(0);
      const recovery=await wrapVaultKey(vaultKey,recoveryBytes,'recovery',address);
      setMessage('Securing the wallet with your device passkey if supported…');
      let passkey=null; try{passkey=await createWalletPasskey(address,vaultKey);}catch(_error){passkey=null;}
      const backup={version:1,network:NETWORK,address,payload:{alg:'AES-GCM',iv:bytesToB64u(payloadIv),ciphertext:bytesToB64u(payloadCipher)},recovery,passkey,created_at:new Date().toISOString()};
      await saveBackup(backup);
      state.recoveryKey=recoveryBytes; recoveryBytes=null;
      renderCreationSuccess(passkey);
    }catch(error){clearEphemeral(true);render();setMessage(error.message||'Wallet creation failed. No wallet secret was uploaded.','error');}
    finally{seed='';wallet=null;vaultKey?.fill(0);recoveryBytes?.fill(0);setBusy(false);}
  }
  function renderCreationSuccess(passkey){
    const body=document.getElementById('atmWalletBody'); if(!body||!state.record||!state.recoveryKey)return;
    const recoveryText=formatRecoveryKey(state.recoveryKey);
    body.innerHTML=`<div class="atmWalletPanel"><strong>ATM Pay security created</strong><p>${passkey?'Device passkey protection is active.':'This device did not expose WebAuthn PRF, so recovery-key authorization is active.'}</p><p class="atmWalletSecurity">Your signing key is already encrypted again. ATM Town does not keep it unlocked.</p></div><div class="atmWalletPanel"><strong>Save this recovery key now</strong><p class="atmWalletWarning">ATM Town does not know this key and cannot recreate it. It unlocks your encrypted ATM Pay backup if you lose device access.</p><div class="atmWalletRecovery" id="atmWalletRecoveryDisplay">${escapeHtml(recoveryText)}</div></div><div class="atmWalletActions"><button class="atmWalletBtn gold" id="atmWalletCopyRecovery" type="button">Copy Recovery Key</button><button class="atmWalletBtn gold" id="atmWalletExportBackup" type="button">Download Encrypted Backup</button><button class="atmWalletBtn primary wide" id="atmWalletRecoverySaved" type="button">I Saved My Recovery Key</button></div>`;
    document.getElementById('atmWalletCopyRecovery')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(recoveryText);setMessage('Recovery key copied. Store it somewhere private.','ok');}catch(_error){setMessage('Copy was blocked. Select and save the recovery key manually.','error');}});
    document.getElementById('atmWalletExportBackup')?.addEventListener('click',downloadEncryptedBackup);
    document.getElementById('atmWalletRecoverySaved')?.addEventListener('click',async()=>{clearRecoveryKey();try{await fetchPayStatus();}catch(_error){}render();setMessage('Recovery saved. Choose your ATM Pay @name next.','ok');});
    setMessage('ATM Pay security created. Save the recovery key before continuing.','ok');
  }

  async function addPasskeyWrapper(){
    if(!state.record)return;
    let vaultKey=null;
    try{
      setBusy(true,'Authorizing passkey setup…');
      const input=document.getElementById('atmWalletManagementRecovery');
      const recoveryText=String(input?.value||'').trim();
      if(!recoveryText)throw new Error('Enter the ATM1 recovery key first.');
      vaultKey=await unlockVaultWithRecovery(state.record,recoveryText); if(input)input.value='';
      await verifyVault(state.record,vaultKey);
      const passkey=await createWalletPasskey(state.record.address,vaultKey);
      if(!passkey)throw new Error('This authenticator does not support the WebAuthn PRF required for wallet signing authorization. Recovery-key authorization remains available.');
      const backup={...state.record.encrypted_backup,passkey,updated_at:new Date().toISOString()}; await saveBackup(backup);render();setMessage('Wallet passkey added. No signing key was retained.','ok');
    }catch(error){setMessage(error?.name==='OperationError'?'Recovery key did not unlock this backup.':(error.message||'Could not add wallet passkey.'),'error');}
    finally{vaultKey?.fill(0);setBusy(false);}
  }

  async function restoreEncryptedBackupFile(event){
    const file=event?.target?.files?.[0]; if(event?.target)event.target.value=''; if(!file)return;
    let recovery=null,vault=null;
    try{
      setBusy(true,'Reading encrypted backup locally…');
      if(file.size>64*1024)throw new Error('That wallet backup file is unexpectedly large.');
      const parsed=JSON.parse(await file.text());
      const backup=parsed?.type==='ATM-TOWN-ENCRYPTED-XRPL-WALLET'?parsed.backup:parsed?.backup||parsed;
      if(!backup||backup.version!==1||backup.network!==NETWORK||typeof backup.address!=='string'||!backup.payload||!backup.recovery)throw new Error('This is not an ATM Town v234 Testnet wallet backup.');
      const recoveryInput=window.prompt('Enter the ATM1 recovery key for this encrypted backup.');
      if(!recoveryInput)throw new Error('Restore cancelled.');
      recovery=parseRecoveryKey(recoveryInput);
      vault=await unwrapVaultKey(backup.recovery,recovery,'recovery',backup.address);
      const candidate={network:NETWORK,address:backup.address,encrypted_backup:backup};
      await verifyVault(candidate,vault);
      state.lastTransaction=null; state.record=candidate;
      await saveBackup(backup);
      render(); setMessage('Encrypted backup restored and verified locally. No signing key was retained.','ok');
    }catch(error){state.record=null;clearEphemeral(true);render();setMessage(error?.name==='OperationError'?'Recovery key did not unlock that backup.':(error.message||'Encrypted backup restore failed.'),'error');}
    finally{recovery?.fill(0);vault?.fill(0);setBusy(false);}
  }

  function assertOnlyAllowedPaymentFields(tx,intentId){
    const keys=Object.keys(tx||{});
    const extra=keys.filter(key=>!PAYMENT_TX_FIELDS.has(key));
    if(extra.length)throw new Error(`Prepared transaction contains unexpected field${extra.length===1?'':'s'}: ${extra.join(', ')}. Nothing will be signed.`);
    if(tx.TransactionType!=='Payment')throw new Error('Only direct XRP Payment transactions are allowed.');
    if(typeof tx.Amount!=='string'||!/^[0-9]+$/.test(tx.Amount))throw new Error('Only direct XRP amounts in drops are allowed.');
    if('DestinationTag' in tx||'SendMax' in tx||'Paths' in tx||'Signers' in tx)throw new Error('Prepared transaction contains a field not allowed by the ATM Town wallet policy.');
    const expected=expectedIntentMemos(intentId);
    const memos=tx.Memos;
    if(!Array.isArray(memos)||memos.length!==1||!memos[0]?.Memo||Object.keys(memos[0]).length!==1)throw new Error('ATM Pay transaction binding is missing. Nothing will be signed.');
    const memo=memos[0].Memo;
    const memoKeys=Object.keys(memo).sort();
    if(memoKeys.length!==2||memoKeys[0]!=='MemoData'||memoKeys[1]!=='MemoType'||String(memo.MemoType||'').toUpperCase()!==expected[0].Memo.MemoType||String(memo.MemoData||'').toUpperCase()!==expected[0].Memo.MemoData)throw new Error('ATM Pay transaction binding changed. Nothing will be signed.');
  }
  function canonicalPaymentIntent(prepared,tx){
    assertOnlyAllowedPaymentFields(tx,prepared.payIntentId);
    return JSON.stringify({
      atmPayIntentId:String(prepared.payIntentId||''),recipientUserId:String(prepared.recipient?.user_id||''),recipientHandle:String(prepared.recipient?.handle||''),
      TransactionType:tx.TransactionType,Account:tx.Account,Destination:tx.Destination,Amount:String(tx.Amount),Fee:String(tx.Fee),Sequence:Number(tx.Sequence),LastLedgerSequence:Number(tx.LastLedgerSequence),Memos:tx.Memos,network:NETWORK
    });
  }

  async function prepareAtmPayPayment(){
    let createdIntentId='';
    if(!state.record||!state.payProfile){setMessage('Finish ATM Pay setup first.','error');return;}
    const recipient=normalizeRecipient(state.selectedRecipient); if(!recipient){setMessage('Choose an ATM Pay recipient first.','error');return;}
    const amountInput=state.requestDraft?.amount_xrp||document.getElementById('atmPayAmount')?.value||'';
    const note=String(document.getElementById('atmPayNote')?.value||state.requestDraft?.note||'').trim().slice(0,80);
    try{
      setBusy(true,`Preparing payment to @${recipient.handle}…`);
      const amount=parseTestXrpAmount(amountInput);
      const intentData=await walletApi()('/api/embedded-wallet?action=pay-prepare',{method:'POST',body:JSON.stringify({recipient_id:recipient.user_id,amount_drops:amount.drops,note,request_id:state.requestDraft?.id||null})});
      const intent=intentData?.intent; const serverRecipient=normalizeRecipient(intent?.recipient);
      createdIntentId=String(intent?.id||'');
      if(!intent?.id||!serverRecipient||serverRecipient.user_id!==recipient.user_id||serverRecipient.handle!==recipient.handle)throw new Error('ATM Pay recipient identity changed during preparation. Nothing was signed.');
      const destination=String(intent.destination_address||'');
      const xrpl=await loadXrpl();
      const validAddress=typeof xrpl.isValidClassicAddress==='function'?xrpl.isValidClassicAddress(destination):CLASSIC_ADDRESS_RE.test(destination);
      if(!validAddress||destination===state.record.address)throw new Error('ATM Pay recipient settlement route is invalid. Nothing was signed.');
      if(String(intent.amount_drops)!==amount.drops)throw new Error('ATM Pay amount changed during preparation. Nothing was signed.');
      const preparedLedger=await prepareLedgerViaAtmPay(intent.id);
      const tx=preparedLedger?.tx||{}; assertOnlyAllowedPaymentFields(tx,intent.id);
      if(tx.Account!==state.record.address||tx.Destination!==destination||String(tx.Amount||'')!==amount.drops)throw new Error('Prepared XRPL transaction did not match the ATM Pay request. Nothing was signed.');
      const feeDrops=BigInt(String(tx.Fee||'0'));
      if(feeDrops<=0n||feeDrops>MAX_TEST_FEE_DROPS)throw new Error(`XRPL Testnet fee safety check blocked ${dropsToXrpText(feeDrops)} XRP.`);
      const sequence=Number(tx.Sequence),lastLedgerSequence=Number(tx.LastLedgerSequence),ledgerIndex=Number(preparedLedger.ledger_index);
      if(!Number.isSafeInteger(sequence)||sequence<=0)throw new Error('Prepared transaction is missing a valid XRPL account sequence.');
      if(!Number.isSafeInteger(lastLedgerSequence)||lastLedgerSequence<=0)throw new Error('Prepared transaction is missing its ledger expiration.');
      if(!Number.isSafeInteger(ledgerIndex)||lastLedgerSequence<=ledgerIndex+MIN_LEDGER_HEADROOM)throw new Error('Prepared payment does not have enough ledger-expiration headroom.');
      const prepared={tx,payIntentId:String(intent.id),recipient:serverRecipient,destination,amountDrops:amount.drops,amountXrp:amount.xrp,note:String(intent.note||note),requestId:intent.request_id||state.requestDraft?.id||null,feeDrops:feeDrops.toString(),feeXrp:dropsToXrpText(feeDrops),sequence,lastLedgerSequence,ledgerIndex,preparedAt:Date.now(),intentDigest:''};
      prepared.intentDigest=await sha256Text(canonicalPaymentIntent(prepared,tx));
      state.preparedPayment=prepared; render(); setMessage(`Review your payment to @${serverRecipient.handle}, then authorize it.`,'ok');
    }catch(error){
      clearPreparedPayment();
      if(createdIntentId){try{await walletApi()('/api/embedded-wallet?action=pay-cancel-intent',{method:'POST',body:JSON.stringify({intent_id:createdIntentId})});}catch(_cancelError){}}
      setMessage(error.message||'Could not prepare ATM Pay payment. Nothing was signed.','error');
    }
    finally{setBusy(false);}
  }

  async function assertPreparedPaymentStillSafe(prepared){
    if(!prepared||!state.record)throw new Error('Review the ATM Pay payment again.');
    if(Date.now()-Number(prepared.preparedAt||0)>PAYMENT_PREVIEW_TTL_MS)throw new Error('That ATM Pay review expired. Review the payment again.');
    const recipient=normalizeRecipient(prepared.recipient); if(!recipient)throw new Error('ATM Pay recipient identity is missing.');
    const tx=prepared.tx||{}; assertOnlyAllowedPaymentFields(tx,prepared.payIntentId);
    if(tx.Account!==state.record.address||tx.Destination!==prepared.destination||String(tx.Amount||'')!==prepared.amountDrops)throw new Error('Prepared payment changed before signing. Nothing was signed.');
    if(Number(tx.Sequence)!==prepared.sequence||Number(tx.LastLedgerSequence)!==prepared.lastLedgerSequence)throw new Error('Prepared sequence or ledger expiration changed. Nothing was signed.');
    const feeDrops=BigInt(String(tx.Fee||'0'));
    if(feeDrops!==BigInt(prepared.feeDrops)||feeDrops<=0n||feeDrops>MAX_TEST_FEE_DROPS)throw new Error('Prepared network fee failed the signing safety check.');
    if(BigInt(prepared.amountDrops)<=0n||BigInt(prepared.amountDrops)>MAX_TEST_PAYMENT_DROPS)throw new Error('Prepared amount failed the test-payment safety cap.');
    const digest=await sha256Text(canonicalPaymentIntent(prepared,tx));
    if(digest!==prepared.intentDigest)throw new Error('ATM Pay intent integrity check failed. Nothing was signed.');
    return tx;
  }
  async function verifyServerPayIntent(prepared){
    const data=await walletApi()('/api/embedded-wallet?action=pay-verify',{method:'POST',body:JSON.stringify({intent_id:prepared.payIntentId})});
    const intent=data?.intent; const recipient=normalizeRecipient(intent?.recipient);
    if(data?.valid!==true||!recipient)throw new Error('ATM Pay could not re-verify this recipient. Nothing was signed.');
    if(String(intent.id)!==prepared.payIntentId||recipient.user_id!==prepared.recipient.user_id||recipient.handle!==prepared.recipient.handle||String(intent.amount_drops)!==prepared.amountDrops||String(intent.destination_address)!==prepared.destination)throw new Error('ATM Pay recipient routing changed after review. Nothing was signed.');
    return intent;
  }
  async function recheckLiveLedgerBeforeSigning(prepared){
    const live=await recheckLedgerViaAtmPay(prepared.payIntentId);
    const liveSequence=Number(live?.sequence);
    const ledgerIndex=Number(live?.ledger_index||0);
    if(!Number.isSafeInteger(liveSequence)||liveSequence!==prepared.sequence)throw new Error('Your ATM Pay balance changed since review. Review the payment again.');
    if(!Number.isSafeInteger(ledgerIndex)||Number(prepared.lastLedgerSequence)<=ledgerIndex+MIN_LEDGER_HEADROOM)throw new Error('That payment review is too close to expiration. Review it again.');
    return ledgerIndex;
  }
  async function authorizeVaultForOperation(method){
    if(method==='passkey')return unlockVaultWithPasskey(state.record);
    if(method==='recovery'){
      const input=document.getElementById('atmWalletSignRecoveryInput')||document.getElementById('atmWalletManagementRecovery');
      const value=String(input?.value||'').trim();
      if(!value)throw new Error('Enter the ATM1 recovery key to authorize this operation.');
      const vault=await unlockVaultWithRecovery(state.record,value); if(input)input.value=''; return vault;
    }
    throw new Error('Unsupported wallet authorization method.');
  }
  async function cancelPreparedAtmPayPayment(){
    const id=state.preparedPayment?.payIntentId;
    clearPreparedPayment();state.requestDraft=null;render();setMessage('Payment cancelled. Nothing was signed.');
    if(id){try{await walletApi()('/api/embedded-wallet?action=pay-cancel-intent',{method:'POST',body:JSON.stringify({intent_id:id})});}catch(_error){}}
  }

  async function signAndSubmitAtmPayPayment(method){
    const prepared=state.preparedPayment; let signed=null,vault=null;
    try{
      await assertPreparedPaymentStillSafe(prepared);
      setBusy(true,`Checking @${prepared.recipient.handle} before authorization…`);
      await verifyServerPayIntent(prepared);
      setMessage(method==='passkey'?`Confirm ${prepared.amountXrp} XRP to @${prepared.recipient.handle} with your device passkey.`:'Authorize this payment with your ATM1 recovery key.');
      vault=await authorizeVaultForOperation(method);
      await assertPreparedPaymentStillSafe(prepared);
      await verifyServerPayIntent(prepared);
      setMessage('Authorization accepted. Rechecking the live Testnet ledger…');
      await recheckLiveLedgerBeforeSigning(prepared);
      const tx=await assertPreparedPaymentStillSafe(prepared);
      setMessage('Signing this payment locally…');
      signed=await withDecryptedWallet(state.record,vault,async(wallet)=>wallet.sign(tx));
      vault.fill(0); vault=null;
      if(!signed?.tx_blob||!signed?.hash||!/^[A-F0-9]{64}$/i.test(String(signed.hash)))throw new Error('Local XRPL signing did not return a valid transaction.');
      state.lastTransaction={hash:String(signed.hash),recipient:prepared.recipient,amountXrp:prepared.amountXrp,result:'SUBMISSION PENDING',validated:false,ledgerIndex:null};
      await walletApi()('/api/embedded-wallet?action=pay-submitted',{method:'POST',body:JSON.stringify({intent_id:prepared.payIntentId,tx_hash:String(signed.hash)})});
      setMessage('Authorized. ATM Pay is sending the signed payment…');
      const relay=await relaySignedBlobViaAtmPay(prepared,signed);
      const relayHash=String(relay?.tx_hash||signed.hash);
      if(relayHash.toUpperCase()!==String(signed.hash).toUpperCase())throw new Error('ATM Pay relay returned a different transaction hash than the locally signed payment.');
      setMessage('Payment submitted. Waiting for XRPL validation…');
      const serverVerified=await waitForAtmPayValidation(prepared,signed);
      const validated=serverVerified?.validated===true;
      const code=String(serverVerified?.result||relay?.engine_result||'UNKNOWN');
      state.lastTransaction={hash:String(signed.hash),recipient:prepared.recipient,amountXrp:prepared.amountXrp,result:code,validated,ledgerIndex:serverVerified?.ledger_index||null,completedAt:Date.now()};
      clearPreparedPayment();state.selectedRecipient=null;state.requestDraft=null;render();await refreshBalance({silent:true});await fetchPayActivity({silent:true});
      if(state.lastTransaction.validated&&state.lastTransaction.result==='tesSUCCESS')setMessage(`Paid @${prepared.recipient.handle} ${prepared.amountXrp} XRP. ✓`,'ok');
      else if(validated)setMessage(`Payment validated with ${state.lastTransaction.result}. Check Activity before trying again.`,'error');
      else setMessage('Payment submission returned without validated finality. Check Activity before trying again.','error');
    }catch(error){
      if(signed?.hash){
        state.lastTransaction={...(state.lastTransaction||{}),hash:String(signed.hash),recipient:prepared?.recipient||null,amountXrp:prepared?.amountXrp||'',result:'STATUS UNKNOWN',validated:false};
        try{
          const verified=await walletApi()('/api/embedded-wallet?action=pay-complete',{method:'POST',body:JSON.stringify({intent_id:prepared?.payIntentId,tx_hash:String(signed.hash)})});
          if(verified?.validated){state.lastTransaction={...state.lastTransaction,result:String(verified.result||'UNKNOWN'),validated:true,ledgerIndex:verified.ledger_index||null};clearPreparedPayment();state.selectedRecipient=null;state.requestDraft=null;await fetchPayActivity({silent:true});}
        }catch(_verifyError){}
        render();
      }
      setMessage(error?.name==='OperationError'?'ATM Pay authorization failed. Nothing new will be signed without another authorization.':(error.message||'ATM Pay transaction failed. If signing occurred, check Activity before trying again.'),'error');
    }finally{vault?.fill(0);setBusy(false);}
  }

  function assertPayloadMoneyRainFundingPrepared(prepared){
    if(!prepared||prepared.network!==NETWORK)throw new Error('Money Rain funding is not a Testnet transaction.');
    if(!state.record)throw new Error('Create or restore your ATM Pay Testnet wallet first.');
    const tx=prepared.tx;
    if(!tx||typeof tx!=='object')throw new Error('Money Rain funding transaction is missing.');
    const keys=Object.keys(tx);
    const extra=keys.filter(key=>!PAYMENT_TX_FIELDS.has(key));
    if(extra.length)throw new Error(`Money Rain funding contains unexpected field${extra.length===1?'':'s'}: ${extra.join(', ')}.`);
    if(tx.TransactionType!=='Payment')throw new Error('Money Rain funding must be a direct XRP Payment.');
    if(tx.Account!==state.record.address)throw new Error('Money Rain funding account does not match your ATM Pay wallet.');
    if(!CLASSIC_ADDRESS_RE.test(String(tx.Destination||'')))throw new Error('Money Rain funding destination is invalid.');
    if(typeof tx.Amount!=='string'||!/^[0-9]+$/.test(tx.Amount))throw new Error('Money Rain funding amount is invalid.');
    const amountDrops=BigInt(tx.Amount);
    if(amountDrops<=0n||amountDrops>MAX_PAYLOAD_FUNDING_DROPS)throw new Error('Money Rain funding exceeds the Testnet safety limit.');
    if(String(prepared.amount_drops||'')!==tx.Amount)throw new Error('Money Rain funding amount changed after review.');
    const feeDrops=BigInt(String(tx.Fee||'0'));
    if(feeDrops<=0n||feeDrops>MAX_TEST_FEE_DROPS||String(prepared.fee_drops||'')!==String(tx.Fee||''))throw new Error('Money Rain funding fee failed the safety check.');
    if(!Number.isSafeInteger(Number(tx.Sequence))||Number(tx.Sequence)<=0||!Number.isSafeInteger(Number(tx.LastLedgerSequence))||Number(tx.LastLedgerSequence)<=0)throw new Error('Money Rain funding ledger bounds are invalid.');
    if('DestinationTag' in tx||'SendMax' in tx||'Paths' in tx||'Signers' in tx)throw new Error('Money Rain funding contains an unsupported XRPL field.');
    const memos=tx.Memos;
    if(!Array.isArray(memos)||memos.length!==1||!memos[0]?.Memo||Object.keys(memos[0]).length!==1)throw new Error('Money Rain funding memo binding is missing.');
    const memo=memos[0].Memo;
    const memoKeys=Object.keys(memo).sort();
    if(memoKeys.length!==2||memoKeys[0]!=='MemoData'||memoKeys[1]!=='MemoType'||String(memo.MemoType||'').toUpperCase()!==payloadMoneyRainMemoTypeHex())throw new Error('Money Rain funding memo binding changed.');
    return tx;
  }

  async function payloadFundingDigest(prepared,tx){
    return sha256Text(JSON.stringify({
      purpose:'payload_money_rain_funding',
      integrationCampaignId:String(prepared.integration_campaign_id||''),
      externalEventId:String(prepared.external_event_id||''),
      poolXrp:String(prepared.pool_xrp||''),
      fundingRequiredXrp:String(prepared.funding_required_xrp||''),
      network:NETWORK,
      tx,
    }));
  }

  async function assertPayloadFundingDigest(prepared){
    const tx=assertPayloadMoneyRainFundingPrepared(prepared);
    const digest=await payloadFundingDigest(prepared,tx);
    if(!prepared.intent_digest||digest!==String(prepared.intent_digest))throw new Error('Money Rain funding intent integrity check failed. Nothing was signed.');
    return tx;
  }

  async function authorizePayloadFundingVault(){
    if(state.record?.encrypted_backup?.passkey)return unlockVaultWithPasskey(state.record);
    const recoveryText=window.prompt('Enter your ATM1 recovery key to authorize this Testnet Money Rain funding payment.');
    if(!recoveryText)throw new Error('Money Rain funding authorization was cancelled.');
    return unlockVaultWithRecovery(state.record,recoveryText);
  }

  async function signPayloadMoneyRainFunding(prepared,draftToken){
    if(payloadFundingBusy)throw new Error('A Money Rain funding authorization is already in progress.');
    let vault=null,signed=null;
    try{
      payloadFundingBusy=true;
      if(!state.record)await fetchRecord();
      if(!state.record)throw new Error('Create or restore your ATM Pay Testnet wallet before funding Money Rain.');
      await assertPayloadFundingDigest(prepared);
      const recheck=await walletApi()('/api/world-time?action=payload-funding-recheck',{method:'POST',body:JSON.stringify({draft_token:String(draftToken||''),prepared})});
      if(recheck?.funded===true)throw new Error('This Payload Money Rain campaign is already funded.');
      if(Number(recheck?.sequence)!==Number(prepared.tx.Sequence))throw new Error('Your Testnet wallet changed since review. Review Money Rain funding again.');
      if(Number(prepared.tx.LastLedgerSequence)<=Number(recheck?.ledger_index||0)+MIN_LEDGER_HEADROOM)throw new Error('Money Rain funding review is too close to expiration. Review it again.');
      vault=await authorizePayloadFundingVault();
      await assertPayloadFundingDigest(prepared);
      const finalCheck=await walletApi()('/api/world-time?action=payload-funding-recheck',{method:'POST',body:JSON.stringify({draft_token:String(draftToken||''),prepared})});
      if(finalCheck?.funded===true)throw new Error('This Payload Money Rain campaign became funded before signing. Nothing new was signed.');
      if(Number(finalCheck?.sequence)!==Number(prepared.tx.Sequence))throw new Error('Your Testnet wallet changed during authorization. Review Money Rain funding again.');
      signed=await withDecryptedWallet(state.record,vault,async(wallet)=>wallet.sign(prepared.tx));
      vault.fill(0);vault=null;
      if(!signed?.tx_blob||!signed?.hash||!/^[A-F0-9]{64}$/i.test(String(signed.hash)))throw new Error('Local XRPL signing did not return a valid Money Rain funding transaction.');
      return {tx_blob:String(signed.tx_blob),hash:String(signed.hash).toUpperCase()};
    }finally{
      vault?.fill(0);
      payloadFundingBusy=false;
    }
  }

  async function refreshBalance(options={}){
    if(!state.record){state.balanceXrp=null;state.balanceFunded=false;state.balanceAvailable=false;emitConsumerState();return null;}
    const el=document.getElementById('atmWalletBalance'),note=document.getElementById('atmWalletFunded'); if(el&&!options.silent)el.textContent='… XRP';
    try{
      const data=await walletApi()('/api/embedded-wallet?action=balance',{method:'GET'});
      state.balanceXrp=String(data.balance_xrp??'0');state.balanceFunded=!!data.funded;state.balanceAvailable=true;
      if(el)el.textContent=`${state.balanceXrp}`; if(note)note.textContent=state.balanceFunded?'Validated XRPL Testnet balance.':'Account is not funded on Testnet yet.';
      emitConsumerState();
      if(!options.silent)setMessage('Testnet balance refreshed.','ok');
      return data;
    }catch(error){state.balanceXrp=null;state.balanceFunded=false;state.balanceAvailable=false;if(el)el.textContent='— XRP';if(note)note.textContent='Balance unavailable.';emitConsumerState();if(!options.silent)setMessage(error.message||'Could not read Testnet balance.','error');return null;}
  }
  function downloadEncryptedBackup(){
    if(!state.record?.encrypted_backup)return;
    const exportData={type:'ATM-TOWN-ENCRYPTED-XRPL-WALLET',warning:'TESTNET ONLY',exported_at:new Date().toISOString(),backup:state.record.encrypted_backup};
    const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`atm-town-testnet-wallet-${state.record.address}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Encrypted backup downloaded. It still requires your recovery key or wallet passkey.','ok');
  }
  async function copyEmergencySeed(method){
    if(!state.record)return; let vault=null;
    try{
      const approved=window.confirm('EMERGENCY TESTNET SEED EXPORT\n\nThis copies the plaintext XRPL Testnet seed to your clipboard. Anyone who gets that seed can control this wallet. Continue?');
      if(!approved)return;
      setBusy(true,method==='passkey'?'Waiting for wallet passkey…':'Authorizing emergency export with recovery key…');
      vault=await authorizeVaultForOperation(method);
      await withDecryptedWallet(state.record,vault,async(_wallet,seed)=>{
        if(!navigator.clipboard?.writeText)throw new Error('Secure clipboard access is unavailable in this browser. Use the encrypted backup + recovery key instead.');
        await navigator.clipboard.writeText(seed);
      });
      setMessage('Testnet seed copied for emergency export. Clear your clipboard after storing it securely. No seed was displayed or retained by ATM Town.','ok');
    }catch(error){setMessage(error?.name==='OperationError'?'Wallet authorization failed.':(error.message||'Emergency seed export failed.'),'error');}
    finally{vault?.fill(0);setBusy(false);}
  }

  function sanitizeActivityForConsumer(item){
    const other=normalizeRecipient(item?.other);
    if(!other)return null;
    return {
      id:String(item?.id||''),kind:String(item?.kind||''),direction:String(item?.direction||''),status:String(item?.status||''),
      amount_xrp:String(item?.amount_xrp||''),amount_drops:String(item?.amount_drops||''),note:String(item?.note||'').slice(0,80),
      expires_at:item?.expires_at||null,created_at:item?.created_at||null,other
    };
  }
  function getConsumerSnapshot(){
    return {
      ready:!!(state.record&&state.payProfile),
      profile:normalizeRecipient(state.payProfile),
      pendingRequestCount:state.pendingRequestCount,
      balanceXrp:state.balanceXrp,
      balanceFunded:state.balanceFunded,
      balanceAvailable:state.balanceAvailable,
      recentPeople:recentRecipients().map(person=>({...person})),
      incomingRequests:pendingIncomingRequests().map(sanitizeActivityForConsumer).filter(Boolean),
      recentActivity:state.activity.slice(0,12).map(sanitizeActivityForConsumer).filter(Boolean)
    };
  }
  async function refreshConsumerSnapshot(){
    try{
      await fetchRecord();await fetchPayStatus();
      if(state.record)await refreshBalance({silent:true});
      if(state.payProfile)await fetchPayActivity({silent:true});
    }catch(_error){}
    return getConsumerSnapshot();
  }
  async function searchPeopleForConsumer(query){
    const q=String(query||'').trim();if(q.length<2)return [];
    const data=await walletApi()(`/api/embedded-wallet?action=pay-search&q=${encodeURIComponent(q)}`,{method:'GET'});
    return (Array.isArray(data.results)?data.results:[]).map(normalizeRecipient).filter(Boolean);
  }
  async function openRequestForConsumer(id){
    await open();
    const item=requestItemById(String(id||''));
    if(item)await payRequestedItem(item.id);
    else{state.payView='activity';render();setMessage('That request is no longer pending.');}
  }
  function bindButton(){
    const button=document.getElementById('embeddedWalletBtn'); if(!button||button.dataset.atmWalletBound)return; button.dataset.atmWalletBound='1'; button.addEventListener('click',open);
  }
  function refreshButton(){const button=document.getElementById('embeddedWalletBtn');if(button)button.innerHTML='<span class="identityBtnIcon">◇</span>ATM PAY · TESTNET'+(state.pendingRequestCount?`<span class="atmPayButtonBadge">${state.pendingRequestCount}</span>`:'');}
  async function refreshPublicState(){
    try{
      await fetchRecord();await fetchPayStatus();
      if(state.payProfile){await fetchPayActivity({silent:true});startActivityPolling();}else{stopActivityPolling();state.activity=[];state.pendingRequestCount=0;}
      refreshButton();emitConsumerState();return state.payProfile;
    }catch(_error){stopActivityPolling();refreshButton();emitConsumerState();return null;}
  }
  async function openToRecipient(value){
    const recipient=normalizeRecipient(value);if(!recipient)return open();
    state.pendingOpenRecipient=recipient;
    await open();
    if(state.payProfile&&state.record){state.payView='send';state.selectedRecipient=recipient;state.pendingOpenRecipient=null;state.requestDraft=null;clearPreparedPayment();render();setMessage(`Pay @${recipient.handle} without using a wallet address.`);}
  }
  function getPublicIdentity(){if(!state.record)return null;const p=normalizeRecipient(state.payProfile);return p?{...p,atm_pay_ready:true}:null;}

  window.ATMEmbeddedWallet={open,close,refreshBalance,lock:()=>{clearPreparedPayment();render();},resetForAuthChange:()=>{stopActivityPolling();clearEphemeral(true);state.record=null;state.lastTransaction=null;state.payProfile=null;state.activity=[];state.activityInitialized=false;state.pendingRequestCount=0;state.selectedRecipient=null;state.pendingOpenRecipient=null;state.requestDraft=null;state.balanceXrp=null;state.balanceFunded=false;state.balanceAvailable=false;refreshButton();document.getElementById('atmEmbeddedWalletModal')?.classList.remove('open');},refresh:refreshPublicState,signPayloadMoneyRainFunding};
  window.ATMPay={open,openToRecipient,openRequest:openRequestForConsumer,refresh:refreshPublicState,getPublicIdentity,getConsumerSnapshot,refreshConsumerSnapshot,searchPeople:searchPeopleForConsumer};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();bindButton();refreshButton();});else{ensureUi();bindButton();refreshButton();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearPreparedPayment();if(!state.recoveryKey)render();}else if(state.payProfile)fetchPayActivity({silent:true,notify:true});});
  window.addEventListener('focus',()=>{if(state.payProfile)fetchPayActivity({silent:true,notify:true});});
  window.addEventListener('pagehide',()=>clearEphemeral(true));
})();
