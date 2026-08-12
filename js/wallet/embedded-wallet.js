(function ATMEmbeddedWalletModule(){
  'use strict';

  const CONFIG = window.ATM_TOWN_CONFIG?.embeddedWallet || {};
  const NETWORK = 'testnet';
  const TESTNET_WS = String(CONFIG.rpcWs || 'wss://s.altnet.rippletest.net:51233/');
  const AUTO_LOCK_MS = 5 * 60 * 1000;
  const PAYMENT_PREVIEW_TTL_MS = 60 * 1000;
  const MAX_TEST_PAYMENT_DROPS = 10_000_000n; // 10 Testnet XRP hard cap for Phase 2.
  const MAX_TEST_FEE_DROPS = 10_000n; // 0.01 Testnet XRP safety ceiling.
  const CLASSIC_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();
  let state = { record:null, wallet:null, seed:null, recoveryKey:null, busy:false, preparedPayment:null, lastTransaction:null };
  let lockTimer = null;
  let xrplLoadPromise = null;

  function randomBytes(length){ const out=new Uint8Array(length); crypto.getRandomValues(out); return out; }
  function concatBytes(...parts){ const size=parts.reduce((n,p)=>n+p.length,0); const out=new Uint8Array(size); let offset=0; for(const p of parts){out.set(p,offset);offset+=p.length;} return out; }
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
    if(drops>MAX_TEST_PAYMENT_DROPS)throw new Error('Phase 2 limits each test payment to 10 XRP.');
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

  async function importAesKey(bytes, usages){return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,usages);}
  async function encryptBytes(keyBytes,plainBytes,iv,aad){
    const key=await importAesKey(keyBytes,['encrypt']);
    const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:textEncoder.encode(aad)},key,plainBytes);
    return new Uint8Array(cipher);
  }
  async function decryptBytes(keyBytes,cipherBytes,iv,aad){
    const key=await importAesKey(keyBytes,['decrypt']);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:textEncoder.encode(aad)},key,cipherBytes);
    return new Uint8Array(plain);
  }
  async function hkdf(secret,salt,info){
    const material=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info:textEncoder.encode(info)},material,256);
    return new Uint8Array(bits);
  }
  function aad(kind,address){return `ATM-TOWN|${kind}|v1|${NETWORK}|${address}`;}

  async function wrapVaultKey(vaultKey,secret,kind,address){
    const salt=randomBytes(32), iv=randomBytes(12);
    const kek=await hkdf(secret,salt,`ATM Town ${kind} wallet key wrapping v1`);
    const ciphertext=await encryptBytes(kek,vaultKey,iv,aad(`wallet-wrap-${kind}`,address));
    kek.fill(0);
    return {kdf:'HKDF-SHA-256',salt:bytesToB64u(salt),iv:bytesToB64u(iv),ciphertext:bytesToB64u(ciphertext)};
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
    if(!prfBytes){
      try{prfBytes=await prfFromCredential(credentialId,prfSalt);}catch(_error){prfBytes=null;}
    }
    if(!prfBytes)return null;
    const wrapper=await wrapVaultKey(vaultKey,prfBytes,'passkey',address); prfBytes.fill(0);
    return {credential_id:credentialId,prf_salt:bytesToB64u(prfSalt),...wrapper};
  }
  async function unlockVaultWithPasskey(record){
    const wrapper=record?.encrypted_backup?.passkey;
    if(!wrapper)throw new Error('This backup does not have a passkey unlock. Use the recovery key.');
    if(!webAuthnSupported())throw new Error('Passkey unlock is not available in this browser. Use the recovery key.');
    const prf=await prfFromCredential(wrapper.credential_id,b64uToBytes(wrapper.prf_salt));
    if(!prf)throw new Error('This authenticator does not provide the WebAuthn PRF needed to unlock the wallet. Use the recovery key.');
    try{return await unwrapVaultKey(wrapper,prf,'passkey',record.address);}finally{prf.fill(0);}
  }

  async function loadXrpl(){
    if(window.xrpl?.Wallet)return window.xrpl;
    if(xrplLoadPromise)return xrplLoadPromise;
    const sources=Array.isArray(CONFIG.xrplBrowserSources)?CONFIG.xrplBrowserSources:[];
    xrplLoadPromise=(async()=>{
      for(const src of sources){
        try{
          await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.crossOrigin='anonymous';s.onload=resolve;s.onerror=()=>reject(new Error('XRPL library failed to load.'));document.head.appendChild(s);});
          if(window.xrpl?.Wallet)return window.xrpl;
        }catch(_error){}
      }
      throw new Error('ATM Town could not load the pinned XRPL Testnet wallet library.');
    })();
    return xrplLoadPromise;
  }

  async function withTestnetClient(callback){
    if(!/^wss:\/\/s\.altnet\.rippletest\.net:51233\/?$/i.test(TESTNET_WS))throw new Error('Embedded wallet transaction endpoint is not the approved XRPL Testnet server.');
    const xrpl=await loadXrpl();
    if(typeof xrpl.Client!=='function')throw new Error('XRPL Testnet client is unavailable.');
    const client=new xrpl.Client(TESTNET_WS);
    try{await client.connect();return await callback(client,xrpl);}
    finally{try{await client.disconnect();}catch(_error){}}
  }

  function clearUnlocked(clearRecovery=false){
    state.preparedPayment=null;
    if(state.seed)state.seed=null;
    state.wallet=null;
    if(clearRecovery&&state.recoveryKey){state.recoveryKey.fill?.(0);state.recoveryKey=null;}
    if(lockTimer)clearTimeout(lockTimer); lockTimer=null;
  }
  function scheduleAutoLock(){if(lockTimer)clearTimeout(lockTimer);lockTimer=setTimeout(()=>{clearUnlocked(false);render();setMessage('Wallet auto-locked.','info');},AUTO_LOCK_MS);}
  function lock(options={}){clearUnlocked(!!options.clearRecovery);render();}

  async function decryptPayload(record,vaultKey){
    const backup=record?.encrypted_backup;
    if(!backup||backup.version!==1||backup.network!==NETWORK)throw new Error('Unsupported encrypted wallet backup.');
    const payload=await decryptBytes(vaultKey,b64uToBytes(backup.payload.ciphertext),b64uToBytes(backup.payload.iv),aad('wallet-payload',record.address));
    let decoded;
    try{decoded=JSON.parse(textDecoder.decode(payload));}finally{payload.fill(0);}
    if(decoded?.version!==1||decoded?.network!==NETWORK||decoded?.address!==record.address||typeof decoded?.seed!=='string')throw new Error('Wallet backup integrity check failed.');
    const xrpl=await loadXrpl();
    const wallet=xrpl.Wallet.fromSeed(decoded.seed);
    if(wallet.classicAddress!==record.address)throw new Error('Recovered key does not match the saved XRPL address.');
    state.wallet=wallet; state.seed=decoded.seed; decoded.seed=''; scheduleAutoLock();
    return wallet;
  }

  async function fetchRecord(){
    const data=await walletApi()('/api/embedded-wallet?action=status',{method:'GET'});
    state.record=data.wallet||null; return state.record;
  }
  async function saveBackup(backup){
    const data=await walletApi()('/api/embedded-wallet?action=save',{method:'POST',body:JSON.stringify({address:backup.address,encrypted_backup:backup})});
    state.record={...(state.record||{}),...data.wallet,encrypted_backup:backup}; return state.record;
  }

  function ensureUi(){
    if(document.getElementById('atmEmbeddedWalletModal'))return;
    const style=document.createElement('style'); style.textContent=`
#atmEmbeddedWalletModal{position:fixed;inset:0;z-index:10080;display:none;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));background:rgba(0,7,12,.86);backdrop-filter:blur(10px)}
#atmEmbeddedWalletModal.open{display:flex}.atmWalletCard{width:min(560px,100%);max-height:min(760px,92dvh);overflow:auto;background:linear-gradient(180deg,#0c1d29,#07131c);border:1px solid rgba(88,241,230,.25);border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.55);color:#eafcff;padding:18px}.atmWalletHead{display:flex;gap:12px;align-items:flex-start}.atmWalletHead>div{min-width:0;flex:1}.atmWalletHead h3{margin:0;font-size:20px}.atmWalletHead small{display:block;color:#8fb1bf;line-height:1.4;margin-top:4px}.atmWalletClose{border:0;background:#182b37;color:#dffcff;border-radius:10px;width:38px;height:38px;font-size:21px}.atmWalletTestnet{display:inline-flex;margin-top:10px;padding:5px 9px;border-radius:999px;background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.3);color:#ffd166;font-weight:900;font-size:10px;letter-spacing:.08em}.atmWalletBody{display:grid;gap:12px;margin-top:14px}.atmWalletPanel{border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:13px;background:rgba(255,255,255,.035)}.atmWalletPanel strong{display:block;font-size:12px}.atmWalletPanel p{margin:6px 0 0;color:#9db9c5;font-size:11px;line-height:1.5}.atmWalletAddress{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;overflow-wrap:anywhere;color:#70f9c8;margin-top:7px}.atmWalletBalance{font-size:28px;font-weight:1000;margin-top:6px}.atmWalletActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.atmWalletActions .wide{grid-column:1/-1}.atmWalletBtn{border:0;border-radius:12px;padding:11px 12px;font-weight:1000;font-size:10px;letter-spacing:.04em;text-transform:uppercase;background:#183142;color:#eafcff;border:1px solid rgba(88,241,230,.16)}.atmWalletBtn.primary{background:linear-gradient(90deg,#58f1e6,#70f9c8);color:#052029}.atmWalletBtn.gold{background:linear-gradient(90deg,#facd69,#f0a54e);color:#261600}.atmWalletBtn.danger{border-color:rgba(255,112,132,.3);color:#ffadb9}.atmWalletBtn:disabled{opacity:.45}.atmWalletInput{width:100%;margin-top:8px;background:#041018;border:1px solid rgba(88,241,230,.2);border-radius:11px;color:#fff;padding:11px 12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;box-sizing:border-box}.atmWalletRecovery{word-break:break-all;background:#031018;padding:10px;border-radius:10px;border:1px dashed rgba(255,209,102,.4);color:#ffe2a0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;margin-top:8px}.atmWalletLabel{display:block;margin-top:10px;color:#8fb1bf;font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.atmWalletTxGrid{display:grid;grid-template-columns:minmax(90px,.7fr) minmax(0,1.3fr);gap:7px 10px;margin-top:10px;font-size:11px}.atmWalletTxGrid span{color:#88a8b5}.atmWalletTxGrid b{overflow-wrap:anywhere;text-align:right}.atmWalletTxActions{margin-top:10px}.atmWalletTxStatus{font-size:16px;font-weight:1000;margin-top:7px}.atmWalletTxResult.ok{border-color:rgba(112,249,200,.32)}.atmWalletTxResult.error{border-color:rgba(255,112,132,.38)}.atmWalletTxResult.pending{border-color:rgba(255,209,102,.38)}.atmWalletLink{display:inline-flex;margin-top:9px;color:#70f9c8;font-size:11px;font-weight:900;text-decoration:none}.atmWalletWarning{color:#ffd166!important}.atmWalletMsg{min-height:18px;font-size:11px;line-height:1.45;color:#9fc3cc}.atmWalletMsg.ok{color:#70f9c8}.atmWalletMsg.error{color:#ff9eae}.atmWalletSpinner{opacity:.7}
@media(max-width:560px){.atmWalletCard{padding:14px;border-radius:17px}.atmWalletActions{grid-template-columns:1fr}.atmWalletActions .wide{grid-column:auto}.atmWalletBalance{font-size:24px}}
`;
    document.head.appendChild(style);
    const modal=document.createElement('div'); modal.id='atmEmbeddedWalletModal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','atmWalletTitle');
    modal.innerHTML=`<div class="atmWalletCard"><div class="atmWalletHead"><div><h3 id="atmWalletTitle">ATM Embedded Wallet</h3><small>Non-custodial XRPL wallet. Keys are generated and decrypted only on this device.</small><span class="atmWalletTestnet">XRPL TESTNET ONLY</span></div><button class="atmWalletClose" id="atmWalletClose" type="button" aria-label="Close">×</button></div><div class="atmWalletBody" id="atmWalletBody"></div><div class="atmWalletMsg" id="atmWalletMsg" aria-live="polite"></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('atmWalletClose')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
  }
  function setMessage(message,tone='info'){
    const el=document.getElementById('atmWalletMsg'); if(!el)return; el.textContent=message||''; el.className='atmWalletMsg'+(tone==='ok'?' ok':tone==='error'?' error':'');
  }
  function setBusy(busy,message){state.busy=!!busy;document.querySelectorAll('#atmEmbeddedWalletModal button').forEach(btn=>{if(btn.id!=='atmWalletClose')btn.disabled=!!busy;});if(message)setMessage(message);}

  function transactionResultHtml(){
    const tx=state.lastTransaction; if(!tx?.hash)return '';
    const explorerBase=String(CONFIG.explorerTxBase||'https://testnet.xrpl.org/transactions/');
    const status=tx.result||'STATUS UNKNOWN'; const validated=tx.validated===true;
    const detail=validated?(status==='tesSUCCESS'?'Validated successfully on XRPL Testnet.':`Validated with result ${status}.`):'Submission status is not confirmed. Check the Testnet explorer before trying another payment.';
    return `<div class="atmWalletPanel atmWalletTxResult ${validated&&status==='tesSUCCESS'?'ok':validated?'error':'pending'}"><strong>Last locally signed transaction</strong><div class="atmWalletTxStatus">${escapeHtml(status)}${validated?' · VALIDATED':''}</div><p>${escapeHtml(detail)}</p><div class="atmWalletAddress">${escapeHtml(tx.hash)}</div><p>${escapeHtml(tx.amountXrp||'—')} XRP → ${escapeHtml(shortAddress(tx.destination||''))}${tx.ledgerIndex?` · ledger ${escapeHtml(tx.ledgerIndex)}`:''}</p><a class="atmWalletLink" href="${escapeHtml(explorerBase+encodeURIComponent(tx.hash))}" target="_blank" rel="noopener noreferrer">View Testnet transaction ↗</a></div>`;
  }
  function paymentPanelHtml(){
    const prepared=state.preparedPayment;
    if(prepared){
      return `<div class="atmWalletPanel atmWalletTxPreview"><strong>Review Testnet payment before signing</strong><div class="atmWalletTxGrid"><span>Send</span><b>${escapeHtml(prepared.amountXrp)} XRP</b><span>To</span><b title="${escapeHtml(prepared.destination)}">${escapeHtml(shortAddress(prepared.destination))}</b><span>Network fee</span><b>${escapeHtml(prepared.feeXrp)} XRP</b><span>Sequence</span><b>${escapeHtml(prepared.sequence)}</b><span>Expires after ledger</span><b>${escapeHtml(prepared.lastLedgerSequence)}</b></div><p class="atmWalletWarning">Your XRPL seed stays in browser memory. Pressing Sign & Send signs locally, then sends only the signed transaction blob directly to XRPL Testnet over WebSocket.</p><div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn primary" id="atmWalletSignPayment" type="button">Sign & Send Testnet</button><button class="atmWalletBtn" id="atmWalletCancelPayment" type="button">Cancel</button></div></div>`;
    }
    return `<div class="atmWalletPanel"><strong>Send Testnet XRP · Phase 2</strong><p>Prepare first so the exact amount, destination, network fee, sequence and expiration ledger are visible before anything is signed.</p><label class="atmWalletLabel" for="atmWalletPaymentDestination">Destination</label><input class="atmWalletInput" id="atmWalletPaymentDestination" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="r… Testnet classic address"><label class="atmWalletLabel" for="atmWalletPaymentAmount">Amount · max 10 Testnet XRP</label><input class="atmWalletInput" id="atmWalletPaymentAmount" type="text" inputmode="decimal" autocomplete="off" value="1.000000"><div class="atmWalletActions atmWalletTxActions"><button class="atmWalletBtn primary wide" id="atmWalletPreparePayment" type="button">Prepare Testnet Payment</button></div></div>`;
  }
  function bindPaymentUi(){
    document.getElementById('atmWalletPreparePayment')?.addEventListener('click',prepareTestnetPayment);
    document.getElementById('atmWalletSignPayment')?.addEventListener('click',signAndSubmitTestnetPayment);
    document.getElementById('atmWalletCancelPayment')?.addEventListener('click',()=>{state.preparedPayment=null;render();setMessage('Prepared Testnet payment cancelled.');});
  }

  function render(){
    ensureUi(); const body=document.getElementById('atmWalletBody'); if(!body)return;
    const record=state.record, unlocked=!!state.wallet;
    if(!record){
      body.innerHTML=`<div class="atmWalletPanel"><strong>Create your ATM Wallet</strong><p>A new XRPL keypair will be generated here in your browser. ATM Town will receive only the public address and encrypted backup.</p><p class="atmWalletWarning">This v234 wallet is Testnet only. Never import or send Mainnet funds to it.</p></div><div class="atmWalletActions"><button class="atmWalletBtn primary wide" id="atmWalletCreate" type="button">Create Testnet Wallet</button><button class="atmWalletBtn wide" id="atmWalletRestoreFile" type="button">Restore encrypted backup</button><input id="atmWalletRestoreInput" type="file" accept="application/json,.json" hidden></div>`;
      document.getElementById('atmWalletCreate')?.addEventListener('click',createWallet);
      document.getElementById('atmWalletRestoreFile')?.addEventListener('click',()=>document.getElementById('atmWalletRestoreInput')?.click());
      document.getElementById('atmWalletRestoreInput')?.addEventListener('change',restoreEncryptedBackupFile);
      return;
    }
    const passkey=!!record.encrypted_backup?.passkey;
    if(state.recoveryKey){renderCreationSuccess(passkey);return;}
    body.innerHTML=`<div class="atmWalletPanel"><strong>XRPL Testnet address</strong><div class="atmWalletAddress" title="${escapeHtml(record.address)}">${escapeHtml(record.address)}</div><div class="atmWalletBalance" id="atmWalletBalance">— XRP</div><p id="atmWalletFunded">Validated Testnet balance.</p></div>${transactionResultHtml()}${unlocked?paymentPanelHtml():''}${unlocked?`<div class="atmWalletPanel"><strong>Wallet unlocked on this device</strong><p>The seed is held in memory only and will auto-lock after five minutes.</p></div><div class="atmWalletActions"><button class="atmWalletBtn" id="atmWalletRefreshBalance" type="button">Refresh balance</button>${passkey?'':'<button class="atmWalletBtn" id="atmWalletAddPasskey" type="button">Add wallet passkey</button>'}<button class="atmWalletBtn gold" id="atmWalletExportBackup" type="button">Download encrypted backup</button><button class="atmWalletBtn danger" id="atmWalletRevealSeed" type="button">Reveal Testnet seed</button><button class="atmWalletBtn wide" id="atmWalletLock" type="button">Lock wallet now</button></div>`:`<div class="atmWalletPanel"><strong>Unlock wallet</strong><p>${passkey?'Use the wallet passkey on this device, or use the recovery key on any compatible browser.':'This authenticator did not provide a wallet PRF when the backup was created. Use your recovery key to unlock.'}</p><input class="atmWalletInput" id="atmWalletRecoveryInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ATM1-… recovery key"></div><div class="atmWalletActions">${passkey?'<button class="atmWalletBtn primary" id="atmWalletUnlockPasskey" type="button">Unlock with passkey</button>':''}<button class="atmWalletBtn ${passkey?'':'primary'}" id="atmWalletUnlockRecovery" type="button">Unlock with recovery key</button><button class="atmWalletBtn" id="atmWalletRefreshBalance" type="button">Refresh balance</button><button class="atmWalletBtn gold" id="atmWalletExportBackup" type="button">Download encrypted backup</button></div>`}`;
    document.getElementById('atmWalletRefreshBalance')?.addEventListener('click',refreshBalance);
    document.getElementById('atmWalletExportBackup')?.addEventListener('click',downloadEncryptedBackup);
    document.getElementById('atmWalletUnlockPasskey')?.addEventListener('click',unlockWithPasskey);
    document.getElementById('atmWalletUnlockRecovery')?.addEventListener('click',unlockWithRecovery);
    document.getElementById('atmWalletAddPasskey')?.addEventListener('click',addPasskeyWrapper);
    document.getElementById('atmWalletRevealSeed')?.addEventListener('click',revealSeed);
    document.getElementById('atmWalletLock')?.addEventListener('click',()=>{lock();setMessage('Wallet locked.');});
    bindPaymentUi();
    refreshBalance({silent:true});
  }

  async function open(){
    ensureUi(); document.getElementById('atmEmbeddedWalletModal')?.classList.add('open'); setMessage('');
    try{setBusy(true,'Loading encrypted wallet status…');await fetchRecord();render();setMessage(state.record?'Encrypted Testnet wallet backup loaded.':'No embedded wallet exists yet.');}
    catch(error){render();setMessage(error.message||'Could not load embedded wallet.','error');}
    finally{setBusy(false);}
  }
  function close(){document.getElementById('atmEmbeddedWalletModal')?.classList.remove('open');}

  async function createWallet(){
    if(state.record)return;
    if(!window.crypto?.subtle){setMessage('Web Crypto is unavailable in this browser. Wallet creation is blocked.','error');return;}
    setBusy(true,'Generating XRPL Testnet wallet locally…');
    let recoveryBytes=null,vaultKey=null;
    try{
      const xrpl=await loadXrpl(); const wallet=xrpl.Wallet.generate();
      const address=wallet.classicAddress, seed=wallet.seed;
      if(!address||!seed)throw new Error('XRPL wallet generation did not return a usable keypair.');
      vaultKey=randomBytes(32); recoveryBytes=randomBytes(32);
      const payloadIv=randomBytes(12);
      const payloadPlain=textEncoder.encode(JSON.stringify({version:1,network:NETWORK,address,seed}));
      const payloadCipher=await encryptBytes(vaultKey,payloadPlain,payloadIv,aad('wallet-payload',address)); payloadPlain.fill(0);
      const recovery=await wrapVaultKey(vaultKey,recoveryBytes,'recovery',address);
      setMessage('Secure the wallet with your device passkey if supported…');
      let passkey=null; try{passkey=await createWalletPasskey(address,vaultKey);}catch(_error){passkey=null;}
      const backup={version:1,network:NETWORK,address,payload:{alg:'AES-GCM',iv:bytesToB64u(payloadIv),ciphertext:bytesToB64u(payloadCipher)},recovery,passkey,created_at:new Date().toISOString()};
      await saveBackup(backup);
      state.wallet=wallet; state.seed=seed; state.recoveryKey=recoveryBytes; recoveryBytes=null; scheduleAutoLock();
      renderCreationSuccess(passkey);
    }catch(error){clearUnlocked(true);render();setMessage(error.message||'Wallet creation failed. No wallet secret was uploaded.','error');}
    finally{if(vaultKey)vaultKey.fill(0);if(recoveryBytes)recoveryBytes.fill(0);setBusy(false);}
  }
  function renderCreationSuccess(passkey){
    const body=document.getElementById('atmWalletBody'); if(!body||!state.record||!state.recoveryKey)return;
    const recoveryText=formatRecoveryKey(state.recoveryKey);
    body.innerHTML=`<div class="atmWalletPanel"><strong>Wallet created</strong><div class="atmWalletAddress">${escapeHtml(state.record.address)}</div><p>${passkey?'Wallet passkey protection is active.':'This device did not expose WebAuthn PRF, so recovery-key unlock is active.'}</p></div><div class="atmWalletPanel"><strong>Save this recovery key now</strong><p class="atmWalletWarning">ATM Town does not know this key and cannot recreate it. It unlocks the encrypted backup.</p><div class="atmWalletRecovery" id="atmWalletRecoveryDisplay">${escapeHtml(recoveryText)}</div></div><div class="atmWalletActions"><button class="atmWalletBtn gold" id="atmWalletCopyRecovery" type="button">Copy recovery key</button><button class="atmWalletBtn gold" id="atmWalletExportBackup" type="button">Download encrypted backup</button><button class="atmWalletBtn primary wide" id="atmWalletRecoverySaved" type="button">I saved my recovery key</button></div>`;
    document.getElementById('atmWalletCopyRecovery')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(recoveryText);setMessage('Recovery key copied. Store it somewhere private.','ok');}catch(_error){setMessage('Copy was blocked. Select and save the recovery key manually.','error');}});
    document.getElementById('atmWalletExportBackup')?.addEventListener('click',downloadEncryptedBackup);
    document.getElementById('atmWalletRecoverySaved')?.addEventListener('click',()=>{state.recoveryKey.fill(0);state.recoveryKey=null;render();setMessage('Recovery step completed. Wallet remains unlocked on this device.','ok');});
    setMessage('Wallet created. Save the recovery key before continuing.','ok');
  }

  async function unlockWithRecovery(){
    const input=document.getElementById('atmWalletRecoveryInput'); let recovery=null,vault=null;
    try{
      setBusy(true,'Decrypting locally with your recovery key…'); recovery=parseRecoveryKey(input?.value||'');
      vault=await unwrapVaultKey(state.record.encrypted_backup.recovery,recovery,'recovery',state.record.address);
      await decryptPayload(state.record,vault); if(input)input.value=''; render();setMessage('Wallet unlocked locally.','ok');
    }catch(error){setMessage(error?.name==='OperationError'?'Recovery key did not unlock this backup.':(error.message||'Recovery unlock failed.'),'error');}
    finally{recovery?.fill(0);vault?.fill(0);setBusy(false);}
  }
  async function unlockWithPasskey(){
    let vault=null;
    try{setBusy(true,'Waiting for wallet passkey…');vault=await unlockVaultWithPasskey(state.record);await decryptPayload(state.record,vault);render();setMessage('Wallet unlocked with passkey.','ok');}
    catch(error){setMessage(error.message||'Passkey unlock failed. Use the recovery key if needed.','error');}
    finally{vault?.fill(0);setBusy(false);}
  }
  async function addPasskeyWrapper(){
    if(!state.wallet||!state.seed){setMessage('Unlock the wallet first.','error');return;}
    let vaultKey=null;
    try{
      setBusy(true,'Adding a wallet passkey…');
      const recoveryInput=window.prompt('Enter your ATM1 recovery key to authorize adding a new wallet passkey.');
      if(!recoveryInput){setMessage('Passkey setup cancelled.');return;}
      const recovery=parseRecoveryKey(recoveryInput);
      try{vaultKey=await unwrapVaultKey(state.record.encrypted_backup.recovery,recovery,'recovery',state.record.address);}finally{recovery.fill(0);}
      const passkey=await createWalletPasskey(state.record.address,vaultKey);
      if(!passkey)throw new Error('This authenticator does not support the WebAuthn PRF required for wallet unlock. Recovery-key unlock remains available.');
      const backup={...state.record.encrypted_backup,passkey,updated_at:new Date().toISOString()}; await saveBackup(backup);render();setMessage('Wallet passkey added.','ok');
    }catch(error){setMessage(error.message||'Could not add wallet passkey.','error');}
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
      state.lastTransaction=null;
      state.record=candidate;
      await decryptPayload(candidate,vault);
      await saveBackup(backup);
      render(); setMessage('Encrypted backup restored and verified locally.','ok');
    }catch(error){
      clearUnlocked(true); state.record=null; render();
      setMessage(error?.name==='OperationError'?'Recovery key did not unlock that backup.':(error.message||'Encrypted backup restore failed.'),'error');
    }finally{recovery?.fill(0);vault?.fill(0);setBusy(false);}
  }

  async function prepareTestnetPayment(){
    if(!state.record||!state.wallet||!state.seed){setMessage('Unlock the ATM Testnet wallet before preparing a payment.','error');return;}
    const destination=String(document.getElementById('atmWalletPaymentDestination')?.value||'').trim();
    const amountInput=document.getElementById('atmWalletPaymentAmount')?.value||'';
    try{
      setBusy(true,'Preparing transaction from the validated XRPL Testnet ledger…');
      const xrpl=await loadXrpl();
      const validAddress=typeof xrpl.isValidClassicAddress==='function'?xrpl.isValidClassicAddress(destination):CLASSIC_ADDRESS_RE.test(destination);
      if(!validAddress)throw new Error('Enter a valid XRPL classic destination address beginning with r.');
      if(destination===state.record.address)throw new Error('XRPL direct XRP payments cannot use the same sending and destination address.');
      const amount=parseTestXrpAmount(amountInput);
      const prepared=await withTestnetClient(async(client)=>{
        const tx=await client.autofill({TransactionType:'Payment',Account:state.record.address,Destination:destination,Amount:amount.drops});
        const ledgerIndex=await client.getLedgerIndex();
        return {tx,ledgerIndex};
      });
      const tx=prepared.tx||{};
      if(tx.TransactionType!=='Payment'||tx.Account!==state.record.address||tx.Destination!==destination||String(tx.Amount||'')!==amount.drops){
        throw new Error('Prepared XRPL transaction did not match the requested payment. Nothing was signed.');
      }
      const feeDrops=BigInt(String(tx.Fee||'0'));
      if(feeDrops<=0n||feeDrops>MAX_TEST_FEE_DROPS)throw new Error(`XRPL Testnet fee safety check blocked ${dropsToXrpText(feeDrops)} XRP.`);
      const sequence=Number(tx.Sequence),lastLedgerSequence=Number(tx.LastLedgerSequence),ledgerIndex=Number(prepared.ledgerIndex);
      if(!Number.isSafeInteger(sequence)||sequence<=0)throw new Error('Prepared transaction is missing a valid XRPL account sequence.');
      if(!Number.isSafeInteger(lastLedgerSequence)||lastLedgerSequence<=0)throw new Error('Prepared transaction is missing LastLedgerSequence.');
      if(!Number.isSafeInteger(ledgerIndex)||lastLedgerSequence<=ledgerIndex)throw new Error('Prepared transaction expiration is already invalid.');
      state.preparedPayment={tx,destination,amountDrops:amount.drops,amountXrp:amount.xrp,feeDrops:feeDrops.toString(),feeXrp:dropsToXrpText(feeDrops),sequence,lastLedgerSequence,ledgerIndex,preparedAt:Date.now()};
      scheduleAutoLock(); render(); setMessage('Payment prepared from XRPL Testnet. Review every field before signing.','ok');
    }catch(error){state.preparedPayment=null;setMessage(error.message||'Could not prepare the Testnet payment. Nothing was signed.','error');}
    finally{setBusy(false);}
  }

  function assertPreparedPaymentStillSafe(prepared){
    if(!prepared||!state.record||!state.wallet||!state.seed)throw new Error('Unlock and prepare the Testnet payment again.');
    if(Date.now()-Number(prepared.preparedAt||0)>PAYMENT_PREVIEW_TTL_MS)throw new Error('That payment preview expired. Prepare it again with current ledger values.');
    const tx=prepared.tx||{};
    if(tx.TransactionType!=='Payment'||tx.Account!==state.record.address||tx.Destination!==prepared.destination||String(tx.Amount||'')!==prepared.amountDrops)throw new Error('Prepared payment changed before signing. Nothing was signed.');
    if(Number(tx.Sequence)!==prepared.sequence||Number(tx.LastLedgerSequence)!==prepared.lastLedgerSequence)throw new Error('Prepared sequence or ledger expiration changed. Nothing was signed.');
    const feeDrops=BigInt(String(tx.Fee||'0'));
    if(feeDrops!==BigInt(prepared.feeDrops)||feeDrops<=0n||feeDrops>MAX_TEST_FEE_DROPS)throw new Error('Prepared network fee failed the signing safety check.');
    if(BigInt(prepared.amountDrops)<=0n||BigInt(prepared.amountDrops)>MAX_TEST_PAYMENT_DROPS)throw new Error('Prepared amount failed the Phase 2 safety cap.');
    return tx;
  }

  async function signAndSubmitTestnetPayment(){
    const prepared=state.preparedPayment;
    let signed=null;
    try{
      const tx=assertPreparedPaymentStillSafe(prepared);
      const approved=window.confirm(`SIGN XRPL TESTNET PAYMENT?\n\nSend: ${prepared.amountXrp} XRP\nTo: ${prepared.destination}\nFee: ${prepared.feeXrp} XRP\n\nThis is Testnet only. The transaction will be signed locally on this device.`);
      if(!approved){setMessage('Testnet signing cancelled. Nothing was submitted.');return;}
      setBusy(true,'Signing locally on this device…');
      signed=state.wallet.sign(tx);
      if(!signed?.tx_blob||!signed?.hash||!/^[A-F0-9]{64}$/i.test(String(signed.hash)))throw new Error('Local XRPL signing did not return a valid signed transaction.');
      state.lastTransaction={hash:String(signed.hash),destination:prepared.destination,amountXrp:prepared.amountXrp,result:'SUBMISSION PENDING',validated:false,ledgerIndex:null};
      setMessage('Signed locally. Submitting only the signed blob directly to XRPL Testnet…');
      const response=await withTestnetClient(async(client)=>client.submitAndWait(signed.tx_blob));
      const result=response?.result||{}; const hash=transactionHash(result,signed.hash); const code=paymentResultCode(result)||'UNKNOWN';
      if(hash&&hash.toUpperCase()!==String(signed.hash).toUpperCase())throw new Error('XRPL returned a different transaction hash than the locally signed transaction.');
      const validated=result.validated===true;
      state.lastTransaction={hash:String(signed.hash),destination:prepared.destination,amountXrp:prepared.amountXrp,result:code,validated,ledgerIndex:result.ledger_index||result.ledgerIndex||null};
      state.preparedPayment=null;
      clearUnlocked(false); render();
      await refreshBalance({silent:true});
      if(validated&&code==='tesSUCCESS')setMessage('Testnet payment signed locally and validated successfully. Wallet locked after signing.','ok');
      else if(validated)setMessage(`Testnet transaction validated with ${code}. The fee may have been consumed. Wallet locked after signing.`,'error');
      else setMessage('XRPL submission returned without validated finality. Check the transaction hash before sending anything else. Wallet locked.','error');
    }catch(error){
      if(signed?.hash){state.lastTransaction={...(state.lastTransaction||{}),hash:String(signed.hash),destination:prepared?.destination||'',amountXrp:prepared?.amountXrp||'',result:'STATUS UNKNOWN',validated:false};clearUnlocked(false);render();}
      setMessage(error.message||'Testnet transaction failed. If signing occurred, check the displayed hash before trying again.','error');
    }finally{setBusy(false);}
  }

  async function refreshBalance(options={}){
    if(!state.record)return;
    const el=document.getElementById('atmWalletBalance'),note=document.getElementById('atmWalletFunded'); if(el&&!options.silent)el.textContent='… XRP';
    try{
      const data=await walletApi()('/api/embedded-wallet?action=balance',{method:'GET'});
      if(el)el.textContent=`${data.balance_xrp} XRP`; if(note)note.textContent=data.funded?'Validated XRPL Testnet balance.':'Account is not funded on Testnet yet.';
      if(!options.silent)setMessage('Testnet balance refreshed.','ok');
    }catch(error){if(el)el.textContent='— XRP';if(note)note.textContent='Balance unavailable.';if(!options.silent)setMessage(error.message||'Could not read Testnet balance.','error');}
  }
  function downloadEncryptedBackup(){
    if(!state.record?.encrypted_backup)return;
    const exportData={type:'ATM-TOWN-ENCRYPTED-XRPL-WALLET',warning:'TESTNET ONLY',exported_at:new Date().toISOString(),backup:state.record.encrypted_backup};
    const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`atm-town-testnet-wallet-${state.record.address}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Encrypted backup downloaded. It still requires your recovery key or wallet passkey.','ok');
  }
  function revealSeed(){
    if(!state.seed){setMessage('Unlock the wallet before exporting its seed.','error');return;}
    if(!window.confirm('Reveal the XRPL TESTNET seed? Anyone with this seed can control this Testnet wallet. Never paste a Mainnet seed here.'))return;
    const body=document.getElementById('atmWalletBody'); if(!body)return;
    const panel=document.createElement('div'); panel.className='atmWalletPanel'; panel.innerHTML=`<strong>XRPL Testnet seed — keep private</strong><p class="atmWalletWarning">This is the only plaintext export. ATM Town has not uploaded it.</p><div class="atmWalletRecovery">${escapeHtml(state.seed)}</div>`; body.prepend(panel); setMessage('Testnet seed revealed locally. Close or lock the wallet when finished.');
  }

  function bindButton(){
    const button=document.getElementById('embeddedWalletBtn'); if(!button||button.dataset.atmWalletBound)return; button.dataset.atmWalletBound='1'; button.addEventListener('click',open);
  }
  function refreshButton(){const button=document.getElementById('embeddedWalletBtn');if(button)button.innerHTML='<span class="identityBtnIcon">◇</span>ATM WALLET · TESTNET';}

  window.ATMEmbeddedWallet={open,close,lock,resetForAuthChange:()=>{clearUnlocked(true);state.record=null;state.lastTransaction=null;close();render();},refresh:async()=>{try{await fetchRecord();refreshButton();}catch(_error){}}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();bindButton();refreshButton();});else{ensureUi();bindButton();refreshButton();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)lock({clearRecovery:false});});
  window.addEventListener('pagehide',()=>lock({clearRecovery:true}));
})();
