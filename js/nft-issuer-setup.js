(function ATMNftIssuerSetup(){
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('nft_setup') !== '1') return;

  const ISSUER = 'rnCv6dCu3r1ANVD6vYuHikxV8TYphecdff';
  const MINTER = 'rM5oXXzDLJxLqKp6ZwZjjesPvNvh669uCc';
  const STORAGE_KEY = 'atm_nft_minter_auth_payload';
  let pollTimer = null;
  let pollAttempts = 0;

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

  function createUi() {
    const style = document.createElement('style');
    style.textContent = `
#atmNftSetup{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));background:rgba(2,8,13,.94);backdrop-filter:blur(12px);overflow:auto}
#atmNftSetupCard{width:min(680px,100%);max-height:94dvh;overflow:auto;background:linear-gradient(180deg,#102d3a,#07151e);border:1px solid rgba(88,241,230,.42);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.7);padding:18px;color:#eafcff}
.atmNftSetupHeader{display:flex;align-items:flex-start;gap:12px}.atmNftSetupHeader>div{min-width:0;flex:1}.atmNftSetupHeader h1{margin:0;color:#58f1e6;font-size:22px;line-height:1.1}.atmNftSetupHeader p{margin:7px 0 0;color:#a8cbd3;font-size:12px;line-height:1.45}.atmNftSetupClose{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:#233a46;color:#fff;font-size:22px}
.atmNftSetupNetwork{display:inline-flex;margin-top:12px;padding:5px 9px;border-radius:999px;border:1px solid rgba(255,209,102,.34);background:rgba(255,209,102,.09);color:#ffd166;font-size:10px;font-weight:1000;letter-spacing:.08em}
.atmNftSetupWallets{display:grid;gap:9px;margin-top:14px}.atmNftWallet{padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035)}.atmNftWalletLabel{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#9fc1cb;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.atmNftWalletAddress{margin-top:6px;font:700 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#eafcff;overflow-wrap:anywhere}.atmNftWalletState{font-size:10px;color:#a9c9d2}
.atmNftSetupStatus{margin-top:14px;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#081923;color:#b6d4dc;font-size:12px;line-height:1.5}.atmNftSetupStatus.success{border-color:rgba(112,249,200,.36);color:#70f9c8;background:rgba(38,116,91,.13)}.atmNftSetupStatus.error{border-color:rgba(255,96,123,.38);color:#ff9aad;background:rgba(128,36,53,.14)}.atmNftSetupStatus.waiting{border-color:rgba(255,209,102,.28);color:#ffd166;background:rgba(120,87,22,.12)}
.atmNftSetupActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.atmNftSetupBtn{border:1px solid rgba(88,241,230,.18);border-radius:13px;padding:12px 13px;background:#183140;color:#eafcff;font-size:10px;font-weight:1000;letter-spacing:.04em;text-transform:uppercase}.atmNftSetupBtn.primary{background:linear-gradient(90deg,#58f1e6,#70f9c8);color:#06212b;border:0}.atmNftSetupBtn:disabled{opacity:.48}.atmNftSetupNext{margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(0,0,0,.16)}.atmNftSetupNext b{display:block;color:#ffd166;font-size:11px}.atmNftSetupNext span{display:block;margin-top:5px;color:#9fbfc8;font-size:11px;line-height:1.45}
@media(max-width:560px){#atmNftSetup{padding:0;align-items:stretch}#atmNftSetupCard{width:100vw;max-height:none;min-height:100dvh;border-radius:0;border-left:0;border-right:0;padding:max(15px,env(safe-area-inset-top)) 14px max(16px,env(safe-area-inset-bottom))}.atmNftSetupActions{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'atmNftSetup';
    root.innerHTML = `
      <section id="atmNftSetupCard" role="dialog" aria-modal="true" aria-labelledby="atmNftSetupTitle">
        <header class="atmNftSetupHeader">
          <div>
            <h1 id="atmNftSetupTitle">ATM Town NFT Setup</h1>
            <p>Authorize the operational wallet to mint official ATM Town Attribute NFTs for the dedicated issuer. The issuer seed never enters ATM Town.</p>
            <span class="atmNftSetupNetwork">XRPL MAINNET</span>
          </div>
          <button type="button" class="atmNftSetupClose" id="atmNftSetupClose" aria-label="Close">×</button>
        </header>
        <div class="atmNftSetupWallets">
          <div class="atmNftWallet">
            <div class="atmNftWalletLabel"><span>Issuer / collection identity</span><span class="atmNftWalletState" id="atmNftIssuerState">Checking…</span></div>
            <div class="atmNftWalletAddress">${escapeHtml(ISSUER)}</div>
          </div>
          <div class="atmNftWallet">
            <div class="atmNftWalletLabel"><span>Operational / authorized minter</span><span class="atmNftWalletState" id="atmNftMinterState">Checking…</span></div>
            <div class="atmNftWalletAddress">${escapeHtml(MINTER)}</div>
          </div>
        </div>
        <div class="atmNftSetupStatus waiting" id="atmNftSetupStatus" aria-live="polite">Checking XRPL Mainnet configuration…</div>
        <div class="atmNftSetupActions">
          <button type="button" class="atmNftSetupBtn" id="atmNftCheckLedger">CHECK LEDGER</button>
          <button type="button" class="atmNftSetupBtn primary" id="atmNftAuthorize">AUTHORIZE MINTER IN XAMAN</button>
        </div>
        <div class="atmNftSetupNext"><b>NEXT AFTER AUTHORIZATION</b><span>Lock the collection taxon and secondary-sale royalty, then mint one test attribute from the operational wallet before enabling the full 61-item catalog.</span></div>
      </section>
    `;
    document.body.appendChild(root);

    document.getElementById('atmNftSetupClose')?.addEventListener('click', closeSetup);
    document.getElementById('atmNftCheckLedger')?.addEventListener('click', () => checkLedger(false));
    document.getElementById('atmNftAuthorize')?.addEventListener('click', startAuthorization);
  }

  function setStatus(message, tone = 'waiting') {
    const el = document.getElementById('atmNftSetupStatus');
    if (!el) return;
    el.textContent = message;
    el.className = 'atmNftSetupStatus ' + tone;
  }

  function setWalletState(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message;
  }

  function closeSetup() {
    clearTimeout(pollTimer);
    const url = new URL(location.href);
    ['nft_setup','nft_auth_return','payload'].forEach(key => url.searchParams.delete(key));
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    document.getElementById('atmNftSetup')?.remove();
  }

  async function checkLedger(silent = false) {
    const button = document.getElementById('atmNftCheckLedger');
    if (button) button.disabled = true;
    if (!silent) setStatus('Reading the validated XRPL Mainnet ledger…', 'waiting');
    try {
      const data = await api('/api/xaman-link?action=nft-ledger-status');
      setWalletState('atmNftIssuerState', data.issuer?.exists ? 'ACTIVE' : 'NOT FUNDED');
      setWalletState('atmNftMinterState', data.minter?.exists ? 'ACTIVE' : 'NOT FUNDED');
      const authorize = document.getElementById('atmNftAuthorize');

      if (!data.issuer?.exists || !data.minter?.exists) {
        if (authorize) authorize.disabled = true;
        const missing = [!data.issuer?.exists ? 'issuer' : '', !data.minter?.exists ? 'operational/minter' : ''].filter(Boolean).join(' and ');
        setStatus(`The ${missing} wallet must be activated on XRPL Mainnet with XRP before authorization can be submitted.`, 'error');
        return data;
      }

      if (data.authorized) {
        if (authorize) {
          authorize.disabled = true;
          authorize.textContent = 'MINTER AUTHORIZED ✓';
        }
        setWalletState('atmNftIssuerState', 'ACTIVE · MINTER SET');
        setStatus(`Authorized. ${shortAddress(MINTER)} is now the NFToken minter for the ATM Town issuer.`, 'success');
        localStorage.removeItem(STORAGE_KEY);
      } else {
        if (authorize) {
          authorize.disabled = false;
          authorize.textContent = 'AUTHORIZE MINTER IN XAMAN';
        }
        setStatus('Both wallets are active. The issuer still needs to authorize the operational wallet as its NFToken minter.', 'waiting');
      }
      return data;
    } catch (error) {
      if (!silent) setStatus(error.message || 'Could not read XRPL setup status.', 'error');
      throw error;
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function startAuthorization() {
    const button = document.getElementById('atmNftAuthorize');
    if (button) button.disabled = true;
    setStatus('Building the exact issuer authorization transaction…', 'waiting');
    try {
      const data = await api('/api/xaman-link?action=nft-authorize-start', { method:'POST', body:'{}' });
      if (data.already_authorized) {
        await checkLedger(false);
        return;
      }
      localStorage.setItem(STORAGE_KEY, data.payload_uuid);
      setStatus('Opening Xaman. Confirm that the signing account is the ATM Town issuer and verify the operational wallet address before signing.', 'waiting');
      location.assign(data.deeplink);
    } catch (error) {
      setStatus(error.message || 'Could not start the Xaman authorization.', 'error');
      if (button) button.disabled = false;
    }
  }

  function payloadFromReturn() {
    const value = params.get('payload');
    return /^[0-9a-f-]{36}$/i.test(String(value || '')) ? value : '';
  }

  function stopPolling() {
    clearTimeout(pollTimer);
    pollTimer = null;
    pollAttempts = 0;
  }

  async function pollAuthorization(payloadUuid) {
    if (!/^[0-9a-f-]{36}$/i.test(String(payloadUuid || ''))) return;
    stopPolling();
    const check = async () => {
      if (document.hidden) {
        pollTimer = setTimeout(check, 1500);
        return;
      }
      pollAttempts += 1;
      try {
        const data = await api('/api/xaman-link?action=nft-authorize-status&payload_uuid=' + encodeURIComponent(payloadUuid));
        if (data.status === 'authorized') {
          stopPolling();
          localStorage.removeItem(STORAGE_KEY);
          setStatus('XRPL validated the authorization. The ATM Town operational wallet is now the authorized NFToken minter.', 'success');
          await checkLedger(true).catch(() => {});
          return;
        }
        if (data.status === 'rejected' || data.status === 'failed') {
          stopPolling();
          localStorage.removeItem(STORAGE_KEY);
          setStatus(data.error || 'The Xaman authorization was not completed.', 'error');
          const button = document.getElementById('atmNftAuthorize');
          if (button) button.disabled = false;
          return;
        }
        if (data.status === 'expired') {
          setStatus('The Xaman request expired. You can create a fresh authorization request.', 'error');
          stopPolling();
          localStorage.removeItem(STORAGE_KEY);
          const button = document.getElementById('atmNftAuthorize');
          if (button) button.disabled = false;
          return;
        }
        setStatus(data.phase === 'opened' ? 'Xaman opened. Waiting for the issuer signature…' : 'Signed request received. Waiting for XRPL validation…', 'waiting');
      } catch (error) {
        setStatus(error.message || 'Authorization is still being checked.', 'waiting');
      }
      if (pollAttempts < 40) pollTimer = setTimeout(check, 2500);
      else setStatus('The ledger has not confirmed the authorization yet. Tap CHECK LEDGER to recheck.', 'waiting');
    };
    check();
  }

  function resumeAuthorization() {
    const payloadUuid = payloadFromReturn() || localStorage.getItem(STORAGE_KEY) || '';
    if (payloadUuid) pollAuthorization(payloadUuid);
  }

  createUi();

  let bootAttempts = 0;
  const boot = async () => {
    bootAttempts += 1;
    if (typeof window.atmApiWithAuth !== 'function') {
      if (bootAttempts < 50) return setTimeout(boot, 100);
      setStatus('ATM Town account services did not finish loading.', 'error');
      return;
    }
    try {
      await checkLedger(true);
      resumeAuthorization();
    } catch (error) {
      const message = String(error?.message || '');
      if (/sign in first/i.test(message) && bootAttempts < 25) {
        return setTimeout(boot, 300);
      }
      setWalletState('atmNftIssuerState', 'UNKNOWN');
      setWalletState('atmNftMinterState', 'UNKNOWN');
      setStatus(/sign in first/i.test(message)
        ? 'Sign in to your ATM Town account first, then reopen this setup screen.'
        : (message || 'Could not load NFT setup status.'), 'error');
    }
  };
  boot();

  addEventListener('pageshow', resumeAuthorization);
  addEventListener('focus', resumeAuthorization);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeAuthorization(); });
})(window);
