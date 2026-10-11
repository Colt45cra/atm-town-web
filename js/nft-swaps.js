/* Atomic NFT-for-NFT trading. Wallet secrets stay in the chosen wallet. */
(function () {
  'use strict';
  const active = new Set(['offered', 'preparing', 'signing', 'ready', 'finalizing', 'settling']);
  const seen = new Set();
  const completedRefresh = new Set();
  let list = [], busy = false, opened = false, currentUser = '', selectedId = '', generation = 0, lastFocus = null;
  let invitation = null, previousDialog = false;
  const invitedAt = new Map();
  const panel = document.createElement('dialog'); panel.id = 'nftSwapPanel'; panel.setAttribute('aria-labelledby', 'nftSwapTitle');
  panel.innerHTML = '<div class="nftSwapHeader"><h2 id="nftSwapTitle">NFT trades</h2><button type="button" aria-label="Close NFT trades">×</button></div><p class="nftSwapSafety">Both NFTs exchange together, or neither moves. Approve with ATM Pay or compatible Xaman (5.4.0 or newer). Review both token IDs in your wallet. The proposing player pays the network fee, including if the exchange fails.</p><div id="nftSwapContent"></div><p id="nftSwapStatus" role="status"></p>';
  document.body.appendChild(panel);
  const content = panel.querySelector('#nftSwapContent'), status = panel.querySelector('#nftSwapStatus');
  const toolbar = document.getElementById('lockerNftSort')?.parentElement;
  const inbox = document.createElement('button'); inbox.type = 'button'; inbox.className = 'lockerIconButton primary'; inbox.textContent = 'NFT TRADES'; inbox.addEventListener('click', () => openInbox()); toolbar?.appendChild(inbox);
  function node(tag, text, cls) { const el = document.createElement(tag); if (text != null) el.textContent = text; if (cls) el.className = cls; return el; }
  function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
  function button(text, fn) { const el = node('button', text); el.type = 'button'; el.addEventListener('click', async () => { if (busy) return; busy = true; el.disabled = true; try { await fn(); } catch (e) { message(e.message || 'Trade request failed.', true); } finally { busy = false; if (el.isConnected) el.disabled = false; } }); return el; }
  function close() { opened = false; invitation = null; generation++; panel.close(); dialogOpen = previousDialog; lastFocus?.focus?.(); }
  panel.querySelector('.nftSwapHeader button').addEventListener('click', close);
  panel.addEventListener('cancel', e => { e.preventDefault(); close(); });
  panel.addEventListener('keydown', e => e.stopPropagation());
  function show() {
    if (!opened) {
      lastFocus = document.activeElement;
      if (document.getElementById('tradeNftPanel')?.classList.contains('open')) tradeNftClose();
      previousDialog = dialogOpen;
      panel.showModal();
    }
    opened = true; dialogOpen = true; joy.x = joy.y = 0; knob.style.transform = 'translate(0,0)';
  }
  function announce(target, type, id = '') {
    if (!realtimeChannel || !onlineMode || !target?.remoteId) return;
    realtimeChannel.send({ type: 'broadcast', event: 'nft_swap_ui', payload: { type, id, senderId: playerId, targetId: target.remoteId, tokenId: target.beacon.tokenId } });
  }
  async function receiveNotice(payload) {
    if (!payload || payload.targetId !== playerId || payload.senderId === playerId || !authSession?.user || !lockerWalletAddress()) return;
    const remote = remotePlayers.get(payload.senderId), own = tradeBeaconBroadcastPayload();
    if (!remote || remote.map !== currentMap || Date.now() - (remote.lastSeen || 0) > 12000) return;
    if (payload.type === 'invite') {
      if (opened || dialogOpen || vendingOpen || !own || own.mode !== 'open_to_trade' || own.tokenId !== payload.tokenId || Math.hypot(player.x - remote.x, player.y - remote.y) > 150) return;
      if (Date.now() - (invitedAt.get(payload.senderId) || 0) < 60000) return;
      invitedAt.set(payload.senderId, Date.now());
      show(); generation++; selectedId = ''; invitation = payload.senderId; content.textContent = '';
      content.append(node('h3', (remote.name || 'A player') + ' wants to trade'), node('p', 'Your trade beacon: ' + own.name));
      message('Waiting for the other player to choose their NFT. You will review both NFTs before signing in Xaman.');
    } else if (payload.type === 'proposal' && /^[0-9a-f-]{36}$/i.test(payload.id || '')) {
      // Broadcasts only hint at a trade. The authenticated API supplies its terms
      // and verifies that this wallet is the intended recipient.
      try {
        const data = await apiWithAuth('/api/xrpl-nft-trade?action=swap-status&id=' + encodeURIComponent(payload.id));
        if (data.role !== 'recipient' || data.wallet_b !== lockerWalletAddress() || data.status !== 'offered') return;
        if ((opened && (invitation !== payload.senderId || selectedId)) || (!opened && (dialogOpen || vendingOpen))) {
          showXrplPaymentToast('Incoming NFT trade. Open NFT TRADES to review.', '', 10000); return;
        }
        show(); generation++; invitation = null; renderTrade(data);
      } catch (_) { /* Ignore unverified or stale hints. Inbox polling recovers missed hints. */ }
    }
  }
  async function request(action, body = null) {
    return apiWithAuth('/api/xrpl-nft-trade?action=swap-' + action, body ? { method: 'POST', body: JSON.stringify(body) } : {});
  }
  function requireWallet() { if (!authSession?.user || !lockerWalletAddress()) throw new Error('Sign in and connect ATM Pay or a verified Xaman wallet before trading NFTs.'); }
  function terms(s) {
    const a = s.role === 'proposer';
    const box = node('div', null, 'nftSwapTerms');
    for (const item of [
      { label: 'YOU GIVE', name: a ? s.offered_name : s.requested_name, id: a ? s.offered_token_id : s.requested_token_id },
      { label: 'YOU RECEIVE', name: a ? s.requested_name : s.offered_name, id: a ? s.requested_token_id : s.offered_token_id }
    ]) { const card = node('div', null, 'nftSwapAsset'); card.append(node('small', item.label), node('strong', item.name), node('code', item.id)); box.appendChild(card); }
    return box;
  }
  function signLink(s) {
    const sign = s.sign_request; if (!sign?.deeplink) return;
    const url = new URL(sign.deeplink); if (url.protocol !== 'https:' || !['xumm.app', 'xaman.app', 'atm-pay-two.vercel.app'].includes(url.hostname)) throw new Error('Invalid Xaman signing link.');
    message('Review BOTH NFTs in your wallet. Approve, then return to ATM Town.');
    if (sign.qr_png && /^https:\/\//.test(sign.qr_png)) { const qr = document.createElement('img'); qr.src = sign.qr_png; qr.alt = 'Scan with Xaman to review this trade'; qr.className = 'nftSwapQR'; content.appendChild(qr); }
    const link = node('a', sign.provider === 'atm_pay' ? 'OPEN ATM PAY' : 'OPEN XAMAN', 'nftSwapSignLink'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener'; content.appendChild(link);
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) window.location.assign(url.href);
  }
  function renderList() {
    content.textContent = ''; selectedId = '';
    const rows = [...list.filter(s => active.has(s.status)), ...list.filter(s => !active.has(s.status))];
    if (!rows.length) content.appendChild(node('p', 'No NFT trades yet. Approach a player’s OPEN TO TRADE beacon and press the action button.'));
    for (const swap of rows) {
      const row = node('div', null, 'nftSwapRow');
      row.append(node('strong', (swap.role === 'recipient' ? 'Incoming: ' : 'Sent: ') + swap.offered_name + ' ↔ ' + swap.requested_name), node('small', swap.status.toUpperCase()));
      row.appendChild(button('REVIEW', () => showTrade(swap.id))); content.appendChild(row);
    }
    content.appendChild(button('REFRESH TRADES', async () => { await refreshList(); renderList(); }));
  }
  async function refreshList() {
    requireWallet(); const data = await request('list'); list = data.swaps || [];
    const incoming = list.filter(s => s.role === 'recipient' && active.has(s.status)).length;
    inbox.textContent = 'NFT TRADES' + (incoming ? ' (' + incoming + ')' : '');
    for (const s of list) {
      if (s.role === 'recipient' && s.status === 'offered' && !seen.has(s.id)) {
        seen.add(s.id);
        if (!opened && !dialogOpen && !vendingOpen) { show(); generation++; renderTrade(s); }
        else showXrplPaymentToast('Incoming NFT trade. Open NFT TRADES to review.', '', 10000);
      }
    }
  }
  async function openInbox() {
    show(); generation++; selectedId = ''; invitation = null; content.textContent = ''; message('Loading your trades…');
    try { await refreshList(); renderList(); message('Select a trade to inspect both NFTs and wallet addresses.'); } catch (e) { message(e.message, true); }
  }
  function renderTrade(s) {
    content.textContent = ''; selectedId = s.id;
    content.appendChild(terms(s));
    content.append(node('p', 'Other wallet: ' + (s.role === 'proposer' ? s.wallet_b : s.wallet_a), 'nftSwapWallet'));
    content.appendChild(node('p', 'Status: ' + s.status.toUpperCase() + (s.fee_drops ? ' · Network fee: ' + Number(s.fee_drops) / 1000000 + ' XRP' : '')));
    if (s.error) message(s.error, true);
    else message(({ offered: s.role === 'recipient' ? 'Review both NFTs before approving. Signing approves the entire exchange.' : 'Waiting for the other player to review and sign.', signing: 'Waiting for the receiving player’s wallet approval.', ready: s.role === 'proposer' ? 'The other player approved. Review and sign the final exchange in your wallet.' : 'You approved. Waiting for the proposing player to sign.', settling: 'Awaiting the final wallet signature and validation of all four XRPL transactions.', completed: 'Trade complete. Both NFT transfers were verified on XRPL.', expired: 'This proposal expired. Start a new trade.', cancelled: 'This proposal was cancelled.', rejected: 'The wallet request was rejected.', failed: 'This trade did not complete. Check its ledger result before making a new proposal.' })[s.status] || 'Preparing the secure sign request…');
    if (s.role === 'recipient' && s.status === 'offered') content.appendChild(button(s.wallet_provider === 'atm_pay' ? 'REVIEW & SIGN WITH ATM PAY' : 'REVIEW & SIGN WITH XAMAN', async () => { const next = await request('sign', { id: s.id }); renderTrade(next); signLink(next); }));
    if (s.role === 'proposer' && s.status === 'ready') content.appendChild(button('SIGN & EXCHANGE BOTH NFTS', async () => { const next = await request('finalize', { id: s.id }); renderTrade(next); signLink(next); }));
    if (s.sign_request) content.appendChild(button(s.wallet_provider === 'atm_pay' ? 'OPEN ATM PAY REQUEST' : 'OPEN XAMAN REQUEST', () => signLink(s)));
    if (['offered', 'signing', 'ready'].includes(s.status)) content.appendChild(button(s.role === 'recipient' ? 'DECLINE / CANCEL' : 'CANCEL PROPOSAL', async () => renderTrade(await request('cancel', { id: s.id }))));
    if (s.tx_hash) { const link = node('a', 'VIEW XRPL TRANSACTION'); link.href = 'https://livenet.xrpl.org/transactions/' + s.tx_hash; link.target = '_blank'; link.rel = 'noopener'; content.appendChild(link); }
    content.appendChild(button('ALL TRADES', () => openInbox()));
  }
  async function showTrade(id) {
    const gen = ++generation; selectedId = id; const data = await apiWithAuth('/api/xrpl-nft-trade?action=swap-status&id=' + encodeURIComponent(id));
    if (!opened || gen !== generation) return;
    renderTrade(data);
    if (data.status === 'completed' && !completedRefresh.has(id)) { completedRefresh.add(id); await lockerRefreshXrpl(true); tradeBeaconValidateOwnership(); }
  }
  async function openProposal(target) {
    if (opened && busy) return;
    show(); const gen = ++generation; selectedId = ''; invitation = null; content.textContent = ''; message('Loading your transferable NFTs…');
    try {
      requireWallet();
      const beacon = target?.beacon;
      if (!beacon || beacon.mode !== 'open_to_trade' || beacon.transferable === false) throw new Error('This NFT is not open to trade.');
      announce(target, 'invite');
      const capability = await fetch('/api/xrpl-nft-trade?action=swap-capability', { cache: 'no-store' }).then(r => r.json());
      if (!capability.enabled) throw new Error('XRPL atomic trades are currently unavailable.');
      await lockerRefreshXrpl(true);
      if (!opened || gen !== generation) return;
      const eligible = lockerState.nfts.filter(n => n.transferable !== false && (Number(n.Flags || 0) & 8) !== 0);
      if (!eligible.length) throw new Error('Your verified wallet has no transferable NFTs available.');
      const select = document.createElement('select'); select.setAttribute('aria-label', 'NFT you offer');
      select.appendChild(node('option', 'Choose an NFT…')); select.firstChild.value = '';
      eligible.forEach(n => { const option = node('option', lockerNftDisplayName(n) + ' · ' + lockerNftShortToken(n)); option.value = lockerNftTokenId(n); select.appendChild(option); });
      const localBeacon = tradeBeaconBroadcastPayload();
      const beaconNft = localBeacon?.mode === 'open_to_trade' && eligible.find(n => lockerNftTokenId(n) === localBeacon.tokenId);
      select.value = beaconNft ? lockerNftTokenId(beaconNft) : '';
      const preview = node('div');
      async function propose() {
        const nft = eligible.find(n => lockerNftTokenId(n) === select.value);
        if (!nft) throw new Error('Choose the NFT you want to trade.');
        const data = await request('propose', { counterparty_wallet: beacon.wallet, offered_token_id: select.value, requested_token_id: beacon.tokenId, offered_name: lockerNftDisplayName(nft), requested_name: beacon.name });
        announce(target, 'proposal', data.id);
        await showTrade(data.id);
      }
      const send = button('SEND TRADE PROPOSAL', propose);
      function update() { const nft = eligible.find(n => lockerNftTokenId(n) === select.value); preview.textContent = ''; send.disabled = !nft; if (!nft) return; const art = lockerNftImageNode(nft); art.classList.add('nftSwapPreview'); preview.append(art, terms({ role: 'proposer', offered_name: lockerNftDisplayName(nft), offered_token_id: select.value, requested_name: beacon.name, requested_token_id: beacon.tokenId })); }
      select.addEventListener('change', update); content.append(node('label', 'CHOOSE THE NFT YOU OFFER'), select, preview, send); update();
      message('Sending a proposal moves no assets. The other player signs first, then you sign the exchange. Keep both wallets free of other transactions while signing.');
      if (beaconNft) { busy = true; try { message('Opening a trade using your beacon NFT…'); await propose(); } finally { busy = false; } }
    } catch (e) { message(e.message, true); }
  }
  // Only database reads run in the background. Ledger verification runs while a
  // particular trade is open, with no writes triggered by player broadcasts.
  async function pollInbox() {
    if (!document.hidden && authSession?.user && lockerWalletAddress() && !busy) {
      if (currentUser !== authSession.user.id) { currentUser = authSession.user.id; seen.clear(); list = []; }
      try { await refreshList(); } catch (_) {}
    }
    setTimeout(pollInbox, 30000);
  }
  window.addEventListener('focus', () => { if (opened && selectedId) showTrade(selectedId).catch(e => message(e.message, true)); });
  window.atmNftSwaps = Object.freeze({ openInbox, openProposal, receiveNotice });
  setTimeout(pollInbox, 15000);
  setInterval(() => { if (opened && selectedId && !busy && !document.hidden) showTrade(selectedId).catch(e => message(e.message, true)); }, 5000);
})();
