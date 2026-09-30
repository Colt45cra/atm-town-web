(function ATMNftIssuerSetup(){
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('nft_setup') !== '1') return;

  const ISSUER = 'rnCv6dCu3r1ANVD6vYuHikxV8TYphecdff';
  const MINTER = 'rM5oXXzDLJxLqKp6ZwZjjesPvNvh669uCc';
  const AUTH_KEY = 'atm_nft_minter_auth_payload';
  const MINT_KEY = 'atm_astronaut_mint_payload';
  const OFFER_KEY = 'atm_astronaut_offer_payload';
  const ACCEPT_KEY = 'atm_astronaut_accept_payload';
  let authorized = false;
  let authTimer = null, mintTimer = null, offerTimer = null, acceptTimer = null;
  let authAttempts = 0, mintAttempts = 0, offerAttempts = 0, acceptAttempts = 0;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }
  function shortAddress(value) {
    const text = String(value || '');
    return text.length > 18 ? text.slice(0,10) + '…' + text.slice(-8) : text;
  }
  async function api(path, options = {}) {
    if (typeof window.atmApiWithAuth !== 'function') throw new Error('ATM Town account services are still loading.');
    return window.atmApiWithAuth(path, options);
  }
  function uuidParam(name) {
    const value = params.get(name);
    return /^[0-9a-f-]{36}$/i.test(String(value || '')) ? value : '';
  }

  function createUi() {
    const style = document.createElement('style');
    style.textContent = `
#atmNftSetup{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));background:rgba(2,8,13,.94);backdrop-filter:blur(12px);overflow:auto}
#atmNftSetupCard{width:min(680px,100%);max-height:94dvh;overflow:auto;background:linear-gradient(180deg,#102d3a,#07151e);border:1px solid rgba(88,241,230,.42);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.7);padding:18px;color:#eafcff}
.atmNftSetupHeader{display:flex;align-items:flex-start;gap:12px}.atmNftSetupHeader>div{min-width:0;flex:1}.atmNftSetupHeader h1{margin:0;color:#58f1e6;font-size:22px;line-height:1.1}.atmNftSetupHeader p{margin:7px 0 0;color:#a8cbd3;font-size:12px;line-height:1.45}.atmNftSetupClose{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#233a46;color:#fff;font-size:22px}
.atmNftSetupNetwork{display:inline-flex;margin-top:12px;padding:5px 9px;border-radius:999px;border:1px solid rgba(255,209,102,.34);background:rgba(255,209,102,.09);color:#ffd166;font-size:10px;font-weight:1000;letter-spacing:.08em}
.atmNftSetupWallets{display:grid;gap:9px;margin-top:14px}.atmNftWallet{padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035)}.atmNftWalletLabel{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#9fc1cb;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.atmNftWalletAddress{margin-top:6px;font:700 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#eafcff;overflow-wrap:anywhere}.atmNftWalletState{font-size:10px;color:#a9c9d2}
.atmNftSetupStatus{margin-top:14px;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#081923;color:#b6d4dc;font-size:12px;line-height:1.5}.atmNftSetupStatus.success{border-color:rgba(112,249,200,.36);color:#70f9c8;background:rgba(38,116,91,.13)}.atmNftSetupStatus.error{border-color:rgba(255,96,123,.38);color:#ff9aad;background:rgba(128,36,53,.14)}.atmNftSetupStatus.waiting{border-color:rgba(255,209,102,.28);color:#ffd166;background:rgba(120,87,22,.12)}
.atmNftSetupActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.atmNftSetupBtn{border:1px solid rgba(88,241,230,.18);border-radius:13px;padding:12px 13px;background:#183140;color:#eafcff;font-size:10px;font-weight:1000;letter-spacing:.04em;text-transform:uppercase}.atmNftSetupBtn.primary{background:linear-gradient(90deg,#58f1e6,#70f9c8);color:#06212b;border:0}.atmNftSetupBtn.gold{background:linear-gradient(90deg,#ffd166,#ffb347);color:#211600;border:0}.atmNftSetupBtn:disabled{opacity:.48}
.atmNftTest{margin-top:16px;padding:14px;border:1px solid rgba(88,241,230,.18);border-radius:16px;background:rgba(0,0,0,.18)}.atmNftTestHeader{display:flex;gap:12px;align-items:center}.atmNftTestImg{width:78px;height:98px;object-fit:contain;background:#f5f5f2;border-radius:12px;border:1px solid rgba(255,255,255,.12)}.atmNftTestTitle{font-size:16px;font-weight:1000;color:#eafcff}.atmNftTestSub{font-size:11px;color:#9fc1cb;margin-top:4px;line-height:1.4}.atmNftStats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.atmNftStat{padding:8px;border-radius:10px;background:#102936;border:1px solid rgba(255,255,255,.07);text-align:center}.atmNftStat b{display:block;color:#58f1e6;font-size:13px}.atmNftStat span{display:block;color:#8facb5;font-size:9px;margin-top:2px}.atmNftTestStatus{margin-top:10px;font-size:11px;line-height:1.45;color:#a8cbd3}.atmNftTestStatus.success{color:#70f9c8}.atmNftTestStatus.error{color:#ff9aad}.atmNftTestActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.atmNftToken{margin-top:8px;font:700 9px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#789aa5;overflow-wrap:anywhere}
.atmNftSetupNext{margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(0,0,0,.16)}.atmNftSetupNext b{display:block;color:#ffd166;font-size:11px}.atmNftSetupNext span{display:block;margin-top:5px;color:#9fbfc8;font-size:11px;line-height:1.45}
@media(max-width:560px){#atmNftSetup{padding:0;align-items:stretch}#atmNftSetupCard{width:100vw;max-height:none;min-height:100dvh;border-radius:0;border-left:0;border-right:0;padding:max(15px,env(safe-area-inset-top)) 14px max(16px,env(safe-area-inset-bottom))}.atmNftSetupActions,.atmNftTestActions{grid-template-columns:1fr}.atmNftStats{grid-template-columns:repeat(2,1fr)}}
`;
    document.head.appendChild(style);
    const root = document.createElement('div');
    root.id = 'atmNftSetup';
    root.innerHTML = `
      <section id="atmNftSetupCard" role="dialog" aria-modal="true" aria-labelledby="atmNftSetupTitle">
        <header class="atmNftSetupHeader">
          <div>
            <h1 id="atmNftSetupTitle">ATM Town NFT Setup</h1>
            <p>Dedicated issuer + operational minter for official ATM Town Attribute NFTs. Wallet seeds never enter ATM Town.</p>
            <span class="atmNftSetupNetwork">XRPL MAINNET · TAXON 321 · 10% ROYALTY</span>
          </div>
          <button type="button" class="atmNftSetupClose" id="atmNftSetupClose" aria-label="Close">×</button>
        </header>
        <div class="atmNftSetupWallets">
          <div class="atmNftWallet"><div class="atmNftWalletLabel"><span>Issuer / collection identity</span><span class="atmNftWalletState" id="atmNftIssuerState">Checking…</span></div><div class="atmNftWalletAddress">${escapeHtml(ISSUER)}</div></div>
          <div class="atmNftWallet"><div class="atmNftWalletLabel"><span>Operational / authorized minter</span><span class="atmNftWalletState" id="atmNftMinterState">Checking…</span></div><div class="atmNftWalletAddress">${escapeHtml(MINTER)}</div></div>
        </div>
        <div class="atmNftSetupStatus waiting" id="atmNftSetupStatus" aria-live="polite">Checking XRPL Mainnet configuration…</div>
        <div class="atmNftSetupActions">
          <button type="button" class="atmNftSetupBtn" id="atmNftCheckLedger">CHECK LEDGER</button>
          <button type="button" class="atmNftSetupBtn primary" id="atmNftAuthorize">AUTHORIZE MINTER IN XAMAN</button>
        </div>
        <div class="atmNftTest">
          <div class="atmNftTestHeader">
            <img class="atmNftTestImg" src="/assets/characters/thumbnails/body-astronaut.webp" alt="Astronaut Body">
            <div><div class="atmNftTestTitle">FIRST TEST · ASTRONAUT BODY</div><div class="atmNftTestSub">ATM character · Body slot · immutable metadata v1 · transferable</div></div>
          </div>
          <div class="atmNftStats">
            <div class="atmNftStat"><b>4×</b><span>JUMP HEIGHT</span></div>
            <div class="atmNftStat"><b>2.7×</b><span>JUMP DURATION</span></div>
            <div class="atmNftStat"><b>1×</b><span>SPEED</span></div>
            <div class="atmNftStat"><b>10%</b><span>ROYALTY</span></div>
          </div>
          <div class="atmNftTestStatus" id="atmAstronautStatus">Checking whether the test NFT already exists…</div>
          <div class="atmNftToken" id="atmAstronautToken"></div>
          <div class="atmNftTestActions">
            <button type="button" class="atmNftSetupBtn gold" id="atmAstronautMint">MINT ASTRONAUT BODY</button>
            <button type="button" class="atmNftSetupBtn" id="atmAstronautOffer" hidden>CREATE TRANSFER OFFER</button>
            <button type="button" class="atmNftSetupBtn primary" id="atmAstronautAccept" hidden>ACCEPT INTO GAME WALLET</button>
          </div>
        </div>
        <div class="atmNftSetupNext"><b>TEST FLOW</b><span>1) Operational wallet mints the NFT. 2) Operational wallet creates a restricted 0-XRP sell offer to your verified game wallet. 3) Your game wallet accepts it. The Locker then verifies actual XRPL ownership.</span></div>
      </section>`;
    document.body.appendChild(root);
    document.getElementById('atmNftSetupClose')?.addEventListener('click', closeSetup);
    document.getElementById('atmNftCheckLedger')?.addEventListener('click', () => checkLedger(false));
    document.getElementById('atmNftAuthorize')?.addEventListener('click', startAuthorization);
    document.getElementById('atmAstronautMint')?.addEventListener('click', startMint);
    document.getElementById('atmAstronautOffer')?.addEventListener('click', startOffer);
    document.getElementById('atmAstronautAccept')?.addEventListener('click', startAccept);
  }

  function setStatus(message, tone='waiting') {
    const el=document.getElementById('atmNftSetupStatus'); if(!el)return;
    el.textContent=message; el.className='atmNftSetupStatus '+tone;
  }
  function setAstronautStatus(message,tone='') {
    const el=document.getElementById('atmAstronautStatus'); if(!el)return;
    el.textContent=message; el.className='atmNftTestStatus '+tone;
  }
  function setWalletState(id,message){const el=document.getElementById(id);if(el)el.textContent=message;}
  function setToken(id){
    const el=document.getElementById('atmAstronautToken');
    if(el)el.textContent=id?'NFTokenID: '+id:'';
  }
  function closeSetup(){
    clearTimeout(authTimer);clearTimeout(mintTimer);clearTimeout(offerTimer);clearTimeout(acceptTimer);
    const url=new URL(location.href);
    ['nft_setup','nft_auth_return','payload','astronaut_mint_return','mint_payload','astronaut_offer_return','offer_payload','astronaut_accept_return','accept_payload'].forEach(k=>url.searchParams.delete(k));
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
    document.getElementById('atmNftSetup')?.remove();
  }
  function syncMintButton(){
    const btn=document.getElementById('atmAstronautMint');
    if(btn&&!btn.dataset.locked)btn.disabled=!authorized;
  }

  async function checkLedger(silent=false){
    const button=document.getElementById('atmNftCheckLedger');if(button)button.disabled=true;
    if(!silent)setStatus('Reading the validated XRPL Mainnet ledger…','waiting');
    try{
      const data=await api('/api/xaman-link?action=nft-ledger-status');
      setWalletState('atmNftIssuerState',data.issuer?.exists?'ACTIVE':'NOT FUNDED');
      setWalletState('atmNftMinterState',data.minter?.exists?'ACTIVE':'NOT FUNDED');
      const auth=document.getElementById('atmNftAuthorize');
      authorized=Boolean(data.authorized);
      if(!data.issuer?.exists||!data.minter?.exists){
        if(auth)auth.disabled=true;authorized=false;
        setStatus('Both issuer and operational wallets must be funded on XRPL Mainnet.','error');
      }else if(data.authorized){
        if(auth){auth.disabled=true;auth.textContent='MINTER AUTHORIZED ✓';}
        setWalletState('atmNftIssuerState','ACTIVE · MINTER SET');
        setStatus(`Authorized. ${shortAddress(MINTER)} is the issuer's NFToken minter.`,'success');
        localStorage.removeItem(AUTH_KEY);
      }else{
        if(auth){auth.disabled=false;auth.textContent='AUTHORIZE MINTER IN XAMAN';}
        setStatus('Both wallets are active. Minter authorization is still required.','waiting');
      }
      syncMintButton();
      return data;
    }catch(error){if(!silent)setStatus(error.message||'Could not read XRPL setup status.','error');throw error;}
    finally{if(button)button.disabled=false;}
  }

  async function startAuthorization(){
    const button=document.getElementById('atmNftAuthorize');if(button)button.disabled=true;
    setStatus('Building the issuer authorization transaction…','waiting');
    try{
      const data=await api('/api/xaman-link?action=nft-authorize-start',{method:'POST',body:'{}'});
      if(data.already_authorized){await checkLedger(false);return;}
      localStorage.setItem(AUTH_KEY,data.payload_uuid);
      setStatus('Opening Xaman. Sign with the ATM Town issuer wallet only.','waiting');
      location.assign(data.deeplink);
    }catch(error){setStatus(error.message||'Could not start authorization.','error');if(button)button.disabled=false;}
  }

  function pollAuthorization(payloadUuid){
    if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;
    clearTimeout(authTimer);authAttempts=0;
    const check=async()=>{
      if(document.hidden){authTimer=setTimeout(check,1500);return;}
      authAttempts++;
      try{
        const data=await api('/api/xaman-link?action=nft-authorize-status&payload_uuid='+encodeURIComponent(payloadUuid));
        if(data.status==='authorized'){clearTimeout(authTimer);localStorage.removeItem(AUTH_KEY);await checkLedger(true);await checkAstronautState();return;}
        if(['rejected','failed','expired'].includes(data.status)){clearTimeout(authTimer);localStorage.removeItem(AUTH_KEY);setStatus(data.error||'Authorization was not completed.','error');return;}
        setStatus(data.phase==='opened'?'Xaman opened. Waiting for issuer signature…':'Waiting for XRPL validation…','waiting');
      }catch(error){setStatus(error.message||'Authorization is still being checked.','waiting');}
      if(authAttempts<40)authTimer=setTimeout(check,2500);
    };check();
  }

  async function checkAstronautState(){
    const mint=document.getElementById('atmAstronautMint');
    const offer=document.getElementById('atmAstronautOffer');
    const accept=document.getElementById('atmAstronautAccept');
    try{
      const data=await api('/api/xaman-link?action=nft-astronaut-state');
      setToken(data.nftoken_id||'');
      if(data.status==='owned_by_player'){
        if(mint){mint.disabled=true;mint.dataset.locked='1';mint.textContent='ASTRONAUT MINTED ✓';}
        if(offer)offer.hidden=true;
        if(accept)accept.hidden=true;
        setAstronautStatus(`Test complete. Astronaut Body is owned by your verified game wallet ${shortAddress(data.player_wallet)}.`,'success');
      }else if(data.status==='offer_ready'){
        if(mint){mint.disabled=true;mint.dataset.locked='1';mint.textContent='ASTRONAUT MINTED ✓';}
        if(offer)offer.hidden=true;
        if(accept){accept.hidden=false;accept.disabled=false;}
        setAstronautStatus(`Restricted 0-XRP transfer offer is ready for ${shortAddress(data.player_wallet)}. Accept it with that game wallet.`);
      }else if(data.status==='minted_needs_offer'){
        if(mint){mint.disabled=true;mint.dataset.locked='1';mint.textContent='ASTRONAUT MINTED ✓';}
        if(offer){offer.hidden=false;offer.disabled=false;}
        if(accept)accept.hidden=true;
        setAstronautStatus(`Mint validated. Next create the restricted 0-XRP transfer offer to ${shortAddress(data.player_wallet)}.`);
      }else{
        if(mint){delete mint.dataset.locked;mint.textContent='MINT ASTRONAUT BODY';mint.disabled=!authorized;}
        if(offer)offer.hidden=true;
        if(accept)accept.hidden=true;
        setAstronautStatus(`Ready to mint one test NFT. The operational wallet will mint it first, then offer it to ${shortAddress(data.player_wallet)} for 0 XRP.`);
      }
      return data;
    }catch(error){
      if(mint)mint.disabled=true;
      if(offer)offer.disabled=true;
      setAstronautStatus(error.message||'Could not read Astronaut NFT test state.','error');
      throw error;
    }
  }

  async function startMint(){
    const button=document.getElementById('atmAstronautMint');if(button)button.disabled=true;
    setAstronautStatus('Building the locked Mainnet Astronaut mint…');
    try{
      const data=await api('/api/xaman-link?action=nft-astronaut-mint-start',{method:'POST',body:'{}'});
      if(data.already_owned||data.already_minted){await checkAstronautState();return;}
      localStorage.setItem(MINT_KEY,data.payload_uuid);
      setAstronautStatus('Opening Xaman. Sign with the operational/minter wallet only. This transaction mints Astronaut Body to the minter. Verify Taxon 321, TransferFee 10000, Flags 8, and the ATM Town issuer.');
      location.assign(data.deeplink);
    }catch(error){setAstronautStatus(error.message||'Could not start the Astronaut mint.','error');if(button)button.disabled=!authorized;}
  }

  function pollMint(payloadUuid){
    if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;
    clearTimeout(mintTimer);mintAttempts=0;
    const check=async()=>{
      if(document.hidden){mintTimer=setTimeout(check,1500);return;}
      mintAttempts++;
      try{
        const data=await api('/api/xaman-link?action=nft-astronaut-mint-status&payload_uuid='+encodeURIComponent(payloadUuid));
        if(['minted','owned_by_player'].includes(data.status)){
          clearTimeout(mintTimer);localStorage.removeItem(MINT_KEY);setToken(data.nftoken_id||'');
          setAstronautStatus(data.status==='owned_by_player'?'Astronaut Body is now in your game wallet.':'Astronaut Body mint validated. Next create the restricted 0-XRP transfer offer.','success');
          await checkAstronautState();return;
        }
        if(['rejected','failed','expired'].includes(data.status)){clearTimeout(mintTimer);localStorage.removeItem(MINT_KEY);setAstronautStatus(data.error||'The mint was not completed.','error');await checkAstronautState().catch(()=>{});return;}
        setAstronautStatus(data.phase==='opened'?'Xaman opened. Waiting for operational wallet signature…':'Mint signed. Waiting for XRPL validation…');
      }catch(error){setAstronautStatus(error.message||'Mint validation is still pending.');}
      if(mintAttempts<50)mintTimer=setTimeout(check,2500);
    };check();
  }

  async function startOffer(){
    const button=document.getElementById('atmAstronautOffer');if(button)button.disabled=true;
    setAstronautStatus('Building the restricted 0-XRP transfer offer…');
    try{
      const data=await api('/api/xaman-link?action=nft-astronaut-offer-start',{method:'POST',body:'{}'});
      if(data.already_owned||data.not_needed||data.already_created){await checkAstronautState();return;}
      localStorage.setItem(OFFER_KEY,data.payload_uuid);
      setAstronautStatus('Opening Xaman. Sign this transfer-offer transaction with the operational/minter wallet only.');
      location.assign(data.deeplink);
    }catch(error){setAstronautStatus(error.message||'Could not create the Astronaut transfer offer.','error');if(button)button.disabled=false;}
  }

  function pollOffer(payloadUuid){
    if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;
    clearTimeout(offerTimer);offerAttempts=0;
    const check=async()=>{
      if(document.hidden){offerTimer=setTimeout(check,1500);return;}
      offerAttempts++;
      try{
        const data=await api('/api/xaman-link?action=nft-astronaut-offer-status&payload_uuid='+encodeURIComponent(payloadUuid));
        if(data.status==='offer_ready'){
          clearTimeout(offerTimer);localStorage.removeItem(OFFER_KEY);
          setAstronautStatus('Restricted 0-XRP offer validated. Now accept it with your verified game wallet.','success');
          await checkAstronautState();return;
        }
        if(['rejected','failed','expired'].includes(data.status)){
          clearTimeout(offerTimer);localStorage.removeItem(OFFER_KEY);
          setAstronautStatus(data.error||'The transfer offer was not completed.','error');
          await checkAstronautState().catch(()=>{});return;
        }
        setAstronautStatus(data.phase==='opened'?'Xaman opened. Waiting for operational wallet signature…':'Transfer offer signed. Waiting for XRPL validation…');
      }catch(error){setAstronautStatus(error.message||'Transfer-offer validation is still pending.');}
      if(offerAttempts<50)offerTimer=setTimeout(check,2500);
    };check();
  }

  async function startAccept(){
    const button=document.getElementById('atmAstronautAccept');if(button)button.disabled=true;
    setAstronautStatus('Building the zero-XRP transfer acceptance for your game wallet…');
    try{
      const data=await api('/api/xaman-link?action=nft-astronaut-accept-start',{method:'POST',body:'{}'});
      if(data.already_owned){await checkAstronautState();return;}
      localStorage.setItem(ACCEPT_KEY,data.payload_uuid);
      setAstronautStatus('Opening Xaman. Switch to your verified ATM Town game wallet and accept the zero-XRP NFT offer.');
      location.assign(data.deeplink);
    }catch(error){setAstronautStatus(error.message||'Could not start the Astronaut transfer.','error');if(button)button.disabled=false;}
  }

  function pollAccept(payloadUuid){
    if(!/^[0-9a-f-]{36}$/i.test(String(payloadUuid||'')))return;
    clearTimeout(acceptTimer);acceptAttempts=0;
    const check=async()=>{
      if(document.hidden){acceptTimer=setTimeout(check,1500);return;}
      acceptAttempts++;
      try{
        const data=await api('/api/xaman-link?action=nft-astronaut-accept-status&payload_uuid='+encodeURIComponent(payloadUuid));
        if(data.status==='owned_by_player'){
          clearTimeout(acceptTimer);localStorage.removeItem(ACCEPT_KEY);setToken(data.nftoken_id||'');
          setAstronautStatus('End-to-end test complete. Your game wallet owns Astronaut Body on XRPL Mainnet.','success');
          await checkAstronautState();return;
        }
        if(['rejected','failed','expired'].includes(data.status)){clearTimeout(acceptTimer);localStorage.removeItem(ACCEPT_KEY);setAstronautStatus(data.error||'The transfer acceptance was not completed.','error');await checkAstronautState().catch(()=>{});return;}
        setAstronautStatus(data.phase==='opened'?'Xaman opened. Waiting for your game wallet signature…':'Transfer signed. Waiting for XRPL ownership validation…');
      }catch(error){setAstronautStatus(error.message||'Transfer validation is still pending.');}
      if(acceptAttempts<50)acceptTimer=setTimeout(check,2500);
    };check();
  }

  function resumeFlows(){
    const auth=uuidParam('payload')||localStorage.getItem(AUTH_KEY)||'';
    const mint=uuidParam('mint_payload')||localStorage.getItem(MINT_KEY)||'';
    const offer=uuidParam('offer_payload')||localStorage.getItem(OFFER_KEY)||'';
    const accept=uuidParam('accept_payload')||localStorage.getItem(ACCEPT_KEY)||'';
    if(auth)pollAuthorization(auth);
    if(mint)pollMint(mint);
    if(offer)pollOffer(offer);
    if(accept)pollAccept(accept);
  }

  createUi();
  let bootAttempts=0;
  const boot=async()=>{
    bootAttempts++;
    if(typeof window.atmApiWithAuth!=='function'){if(bootAttempts<50)return setTimeout(boot,100);setStatus('ATM Town account services did not finish loading.','error');return;}
    try{
      await checkLedger(true);
      await checkAstronautState().catch(()=>{});
      resumeFlows();
    }catch(error){
      const message=String(error?.message||'');
      if(/sign in first/i.test(message)&&bootAttempts<25)return setTimeout(boot,300);
      setWalletState('atmNftIssuerState','UNKNOWN');setWalletState('atmNftMinterState','UNKNOWN');
      setStatus(/sign in first/i.test(message)?'Sign in to your ATM Town account first, then reopen this setup screen.':(message||'Could not load NFT setup status.'),'error');
    }
  };
  boot();
  addEventListener('pageshow',resumeFlows);
  addEventListener('focus',resumeFlows);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeFlows();});
})(window);
