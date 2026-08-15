(function initializeATMWorldEvents(global) {
  'use strict';

  const POLL_MS = 1400;
  const HIDDEN_POLL_MS = 7000;
  const CLAIM_SCAN_MS = 32;
  const PICKUP_RADIUS = 54;
  const MAX_PICKUPS_PER_CLAIM = 8;
  const PICKUP_FX_MS = 620;
  // v235.1.2: decorative sky-rain is intentionally separate from the 84 server-authoritative collectibles.
  // This triples the apparent Money Rain volume to 250+ bills without increasing reward claims or the 1,000-point pool.
  const ATMOSPHERIC_RAIN_OBJECTS = 168;
  const PAYLOAD_DRAFT_STORAGE_KEY = 'atm_payload_money_rain_draft_v1';
  const FUNDING_STATUS_POLL_MS = 1600;
  const FUNDING_STATUS_WAIT_MS = 45_000;
  const state = {
    event: null,
    serverOffsetMs: 0,
    claimed: new Set(),
    claiming: new Set(),
    myScore: 0,
    myPickups: 0,
    lastEventId: '',
    lastPhase: 'none',
    pollTimer: null,
    pollBusy: false,
    lastClaimScan: 0,
    lastAuthWarning: 0,
    controlContext: null,
    sponsorMode: 'player',
    sponsorLabel: '',
    poolXrp: '0.100',
    fundingDraft: null,
    fundingBusy: false,
    panelStatus: '',
    panelStatusColor: '#9fc3cc',
    pickupFx: [],
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function nowMs() { return Date.now() + state.serverOffsetMs; }
  function eventPhase(event = state.event) {
    if (!event) return 'none';
    const now = nowMs(), starts = Date.parse(event.starts_at), ends = Date.parse(event.ends_at);
    if (now < starts) return 'announced';
    if (now < ends) return 'active';
    return 'completed';
  }
  function secondsLabel(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`;
  }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function loadFundingDraft() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PAYLOAD_DRAFT_STORAGE_KEY) || 'null');
      if (parsed && typeof parsed === 'object' && parsed.draft_token && parsed.integration_campaign_id) state.fundingDraft = parsed;
    } catch (_error) { state.fundingDraft = null; }
  }
  function saveFundingDraft() {
    if (state.fundingDraft) localStorage.setItem(PAYLOAD_DRAFT_STORAGE_KEY, JSON.stringify(state.fundingDraft));
    else localStorage.removeItem(PAYLOAD_DRAFT_STORAGE_KEY);
  }
  function clearFundingDraft() { state.fundingDraft = null; saveFundingDraft(); }
  function rewardForPoints(points, event = state.event) {
    if (!event?.reward_settlement || !event.reward_point_value_xrp) return '';
    const text = String(event.reward_point_value_xrp || '0');
    const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(text); if (!match) return '';
    const drops = BigInt(match[1]) * 1_000_000n + BigInt(((match[2] || '') + '000000').slice(0, 6));
    const total = drops * BigInt(Math.max(0, Number(points || 0)));
    const whole = total / 1_000_000n, fraction = (total % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : `${whole}`;
  }
  function sponsorLabel(event) {
    const configured = String(event?.sponsor?.label || '').trim();
    if (configured) return configured;
    const handle = String(event?.sponsor?.handle || '');
    return handle ? `@${handle}` : String(event?.sponsor?.display_name || 'An ATM Town player');
  }
  function optimisticPoints() {
    if (!state.event || !state.claiming.size) return 0;
    const byId = new Map((state.event.pickups || []).map((pickup) => [Number(pickup.id), pickup]));
    let total = 0;
    for (const id of state.claiming) total += Number(byId.get(Number(id))?.points || 0);
    return total;
  }

  function installUi() {
    if (document.getElementById('atmWorldEventHud')) return;
    const style = document.createElement('style');
    style.textContent = `
      .atmWorldEventHud{position:fixed;z-index:86;top:max(74px,calc(env(safe-area-inset-top,0px) + 58px));left:50%;transform:translateX(-50%) translateY(-8px);width:min(560px,calc(100vw - 24px));pointer-events:none;opacity:0;transition:.2s ease;filter:drop-shadow(0 12px 28px rgba(0,0,0,.38));font-family:system-ui,-apple-system,sans-serif}
      .atmWorldEventHud.show{opacity:1;transform:translateX(-50%) translateY(0)}
      .atmWorldEventHudCard{background:rgba(5,25,34,.94);border:1px solid rgba(88,241,230,.6);border-radius:16px;padding:10px 14px;color:#eefcff;backdrop-filter:blur(12px);display:flex;align-items:center;gap:11px}
      .atmWorldEventHudIcon{font-size:27px;line-height:1}.atmWorldEventHudMain{min-width:0;flex:1}.atmWorldEventHudTitle{font-weight:950;letter-spacing:.05em;font-size:14px}.atmWorldEventHudMeta{font-size:12px;color:#a9c8d0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atmWorldEventHudScore{font-weight:950;color:#66f7bd;font-size:13px;text-align:right;white-space:nowrap}
      .atmWorldEventOverlay{position:fixed;inset:0;z-index:220;background:rgba(1,10,15,.78);display:none;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(8px);font-family:system-ui,-apple-system,sans-serif;overscroll-behavior:none}.atmWorldEventOverlay.open{display:flex}
      .atmWorldEventPanel{width:min(620px,100%);max-height:min(760px,calc(var(--vv-height,100dvh) - 36px));overflow:auto;overscroll-behavior:contain;background:#08202b;border:1px solid rgba(88,241,230,.65);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.55);color:#effcff;padding:22px;position:relative}
      .atmWorldEventClose{position:absolute;right:14px;top:14px;width:44px;height:44px;border:0;border-radius:13px;background:#102f3d;color:#fff;font-size:25px;font-weight:900}.atmWorldEventEyebrow{color:#66f7bd;font-size:12px;font-weight:900;letter-spacing:.12em}.atmWorldEventPanel h2{margin:5px 52px 8px 0;font-size:27px}.atmWorldEventPanel p{color:#afcbd2;line-height:1.5}.atmWorldEventPreview{border:1px solid rgba(255,214,102,.36);background:rgba(255,214,102,.07);border-radius:16px;padding:15px;margin:16px 0}.atmWorldEventPreview strong{display:block;color:#ffd978;font-size:18px;margin-bottom:6px}.atmWorldEventFacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0}.atmWorldEventFact{background:#0d2a36;border:1px solid rgba(151,203,214,.14);border-radius:12px;padding:11px}.atmWorldEventFact b{display:block;color:#fff;font-size:14px}.atmWorldEventFact span{font-size:11px;color:#91b8c2}.atmWorldEventBtn{width:100%;border:0;border-radius:14px;padding:15px 16px;font-weight:950;font-size:14px;background:linear-gradient(90deg,#4ce7dd,#69f6bd);color:#062029}.atmWorldEventBtn:disabled{opacity:.45}.atmWorldEventStatus{margin-top:12px;min-height:20px;color:#ff9fb1;font-size:13px}.atmWorldEventLeader{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07)}.atmWorldEventSponsorBox{margin:14px 0;padding:13px;border-radius:14px;background:#0d2a36;border:1px solid rgba(151,203,214,.16)}.atmWorldEventSponsorBox label{display:block;font-size:11px;font-weight:900;letter-spacing:.08em;color:#91b8c2;margin-bottom:7px}.atmWorldEventSponsorRow{display:grid;grid-template-columns:1fr 1fr;gap:8px}.atmWorldEventSponsorChoice{border:1px solid rgba(151,203,214,.2);border-radius:11px;padding:10px;background:#08202b;color:#dff7fb;font-weight:850;font-size:12px;text-align:center}.atmWorldEventSponsorChoice.active{border-color:#66f7bd;color:#66f7bd;background:rgba(102,247,189,.08)}.atmWorldEventSponsorInput,.atmWorldEventPoolInput{width:100%;margin-top:9px;border:1px solid rgba(151,203,214,.22);border-radius:11px;padding:11px 12px;background:#041820;color:#fff;font:750 16px system-ui;touch-action:manipulation;-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}.atmWorldEventSponsorHint{margin-top:8px;color:#91b8c2;font-size:11px;line-height:1.4}.atmWorldEventFunding{border:1px solid rgba(102,247,189,.35);background:rgba(102,247,189,.06);border-radius:15px;padding:14px;margin:14px 0}.atmWorldEventFundingRow{display:flex;justify-content:space-between;gap:14px;padding:5px 0;font-size:12px;color:#a9c8d0}.atmWorldEventFundingRow b{color:#fff}.atmWorldEventFundingNote{font-size:11px;color:#91b8c2;line-height:1.45;margin-top:8px}
      .atmWorldEventToast{position:fixed;z-index:230;left:50%;bottom:max(92px,calc(env(safe-area-inset-bottom,0px) + 74px));transform:translate(-50%,12px);background:rgba(4,24,32,.96);border:1px solid rgba(88,241,230,.65);border-radius:999px;color:#fff;padding:10px 16px;font:850 13px system-ui,-apple-system,sans-serif;opacity:0;pointer-events:none;transition:.2s ease;box-shadow:0 12px 30px rgba(0,0,0,.4)}.atmWorldEventToast.show{opacity:1;transform:translate(-50%,0)}
      @media(max-width:520px){.atmWorldEventPanel{padding:18px}.atmWorldEventFacts{grid-template-columns:1fr 1fr}.atmWorldEventHudCard{padding:9px 11px}.atmWorldEventHudMeta{font-size:11px}}
    `;
    document.head.appendChild(style);
    const hud = document.createElement('div');
    hud.id = 'atmWorldEventHud'; hud.className = 'atmWorldEventHud';
    hud.innerHTML = '<div class="atmWorldEventHudCard"><div class="atmWorldEventHudIcon">💸</div><div class="atmWorldEventHudMain"><div class="atmWorldEventHudTitle"></div><div class="atmWorldEventHudMeta"></div></div><div class="atmWorldEventHudScore"></div></div>';
    document.body.appendChild(hud);
    const overlay = document.createElement('div'); overlay.id = 'atmWorldEventOverlay'; overlay.className = 'atmWorldEventOverlay';
    overlay.innerHTML = '<section class="atmWorldEventPanel" role="dialog" aria-modal="true" aria-label="ATM Town World Event Control"><button class="atmWorldEventClose" type="button" aria-label="Close">×</button><div id="atmWorldEventPanelBody"></div></section>';
    document.body.appendChild(overlay);
    overlay.querySelector('.atmWorldEventClose').addEventListener('click', closeControlPanel);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeControlPanel(); });
    const toast = document.createElement('div'); toast.id = 'atmWorldEventToast'; toast.className = 'atmWorldEventToast'; document.body.appendChild(toast);
  }

  let toastTimer = null;
  function toast(message, duration = 3200) {
    installUi(); const el = document.getElementById('atmWorldEventToast');
    el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  async function fetchPublicState() {
    const response = await fetch('/api/world-time?action=event', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'World Event state could not be loaded.');
    return data;
  }
  async function fetchState() {
    if (typeof global.atmApiWithAuth === 'function') {
      try { return await global.atmApiWithAuth('/api/world-time?action=event', { method: 'GET' }); }
      catch (error) { if (!/sign in/i.test(String(error?.message || ''))) console.warn('Authenticated World Event poll fell back to public state.', error); }
    }
    return fetchPublicState();
  }
  function applyState(data) {
    if (Number.isFinite(Number(data?.server_time_ms))) state.serverOffsetMs = Number(data.server_time_ms) - Date.now();
    const incoming = data?.event || null;
    const oldId = state.event?.id || '';
    const oldPhase = eventPhase(state.event);
    state.event = incoming;
    if (!incoming) {
      state.claimed.clear(); state.claiming.clear(); state.myScore = 0; state.myPickups = 0; state.lastEventId = ''; state.lastPhase = 'none'; renderHud(); renderControlPanel(); return;
    }
    const hasPersonalScore = incoming.personal_score_available !== false;
    if (incoming.id !== oldId) {
      state.claimed = new Set((incoming.claimed_pickup_ids || []).map(Number)); state.claiming.clear();
      if (hasPersonalScore) { state.myScore = Number(incoming.my_score || 0); state.myPickups = Number(incoming.my_pickups || 0); }
      else if (!oldId) { state.myScore = 0; state.myPickups = 0; }
      state.lastEventId = incoming.id;
      toast(`💸 Money Rain provided by ${sponsorLabel(incoming)}!`);
    } else {
      state.claimed = new Set((incoming.claimed_pickup_ids || []).map(Number));
      // Public fallback state can keep the event synchronized, but it must never wipe
      // an authenticated player's already-earned total back to zero.
      if (hasPersonalScore && Number.isFinite(Number(incoming.my_score))) state.myScore = Number(incoming.my_score);
      if (hasPersonalScore && Number.isFinite(Number(incoming.my_pickups))) state.myPickups = Number(incoming.my_pickups);
    }
    const phase = eventPhase(incoming);
    if (phase !== oldPhase && incoming.id === oldId) {
      if (phase === 'active') toast(`💸 MONEY RAIN provided by ${sponsorLabel(incoming)}!`, 4200);
      if (phase === 'completed') {
        const winner = incoming.leaders?.[0];
        const mine = incoming.personal_score_available !== false ? Number(incoming.my_score || state.myScore || 0) : state.myScore;
        const myReward = incoming.reward_settlement ? (incoming.my_reward_xrp || rewardForPoints(mine, incoming)) : '';
        const winnerValue = incoming.reward_settlement ? `${winner?.reward_amount_xrp || rewardForPoints(winner?.points || 0, incoming)} XRP` : `${winner?.points || 0}`;
        const mineValue = incoming.reward_settlement ? `${myReward || '0'} XRP` : `${mine}`;
        toast(winner ? `💸 Money Rain complete · You collected ${mineValue} · #1 ${winner.display_name} ${winnerValue}` : `💸 Money Rain complete · You collected ${mineValue}`, 5200);
      }
    }
    state.lastPhase = phase;
    renderHud(); renderControlPanel();
  }
  async function poll() {
    if (state.pollBusy) return;
    state.pollBusy = true;
    try { applyState(await fetchState()); }
    catch (error) { console.warn('ATM World Event poll failed.', error); }
    finally {
      state.pollBusy = false; clearTimeout(state.pollTimer); state.pollTimer = setTimeout(poll, document.hidden ? HIDDEN_POLL_MS : POLL_MS);
    }
  }

  function renderHud() {
    installUi();
    const hud = document.getElementById('atmWorldEventHud'); const event = state.event;
    if (!event) { hud.classList.remove('show'); return; }
    const phase = eventPhase(event), now = nowMs(), starts = Date.parse(event.starts_at), ends = Date.parse(event.ends_at);
    const title = hud.querySelector('.atmWorldEventHudTitle'), meta = hud.querySelector('.atmWorldEventHudMeta'), score = hud.querySelector('.atmWorldEventHudScore');
    const providedBy = sponsorLabel(event);
    if (phase === 'announced') {
      title.textContent = `💸 MONEY RAIN IN ${secondsLabel(starts - now)}`;
      meta.textContent = event.reward_settlement
        ? `Provided by ${providedBy} · ${event.reward_pool_xrp} Testnet XRP prize pool`
        : `Provided by ${providedBy} · preview event`;
      score.textContent = 'GET READY';
    } else if (phase === 'active') {
      title.textContent = `💸 MONEY RAIN · ${secondsLabel(ends - now)} LEFT`;
      meta.textContent = `Provided by ${providedBy} · ${Number(event.claimed_points || 0).toLocaleString()} / ${Number(event.pool_points || 1000).toLocaleString()} points claimed`;
      const optimistic = state.myScore + optimisticPoints();
      score.textContent = event.reward_settlement ? `YOU ${rewardForPoints(optimistic, event) || '0'} XRP` : `YOU ${optimistic}`;
    } else {
      title.textContent = '💸 MONEY RAIN COMPLETE';
      const count = Number(event.participant_count || event.leaders?.length || 0);
      const settlement = String(event.settlement_status || '');
      const settlementText = event.reward_settlement
        ? (settlement === 'completed' ? 'Payload payout complete' : settlement === 'cancelled' ? 'unused pool refunded' : settlement === 'blocked' ? 'payout needs attention' : 'Payload settlement processing')
        : 'preview complete';
      meta.textContent = `${count} participant${count === 1 ? '' : 's'} · ${settlementText} · provided by ${providedBy}`;
      const rank = Number(event.my_rank || 0);
      const mine = event.reward_settlement ? `${event.my_reward_xrp || rewardForPoints(state.myScore, event) || '0'} XRP` : `${state.myScore} COLLECTED`;
      score.textContent = `YOU${rank ? ` #${rank}` : ''} · ${mine}`;
    }
    hud.classList.add('show');
  }
  setInterval(renderHud, 250);

  function setPanelStatus(message, color = '#9fc3cc') {
    state.panelStatus = String(message || '');
    state.panelStatusColor = color;
    const status = document.getElementById('atmWorldEventStatus');
    if (!status) return;
    status.textContent = state.panelStatus;
    status.style.color = color;
  }

  function currentLaunchPayload() {
    if (!state.controlContext) throw new Error('Open the ATM Command Core again before starting Money Rain.');
    const sponsorLabelValue = String(state.sponsorLabel || '').trim();
    if (state.sponsorMode === 'brand' && sponsorLabelValue.length < 2) throw new Error('Enter the project or brand name to display.');
    return { ...state.controlContext, sponsor_mode: state.sponsorMode, sponsor_label: sponsorLabelValue };
  }

  function renderControlPanel() {
    const currentSponsorInput = document.getElementById('atmWorldEventSponsorInput');
    const currentPoolInput = document.getElementById('atmWorldEventPoolInput');
    // v235.1.1: background event polling must never replace a focused iOS input; v235.3 protects the XRP pool field too.
    if ((currentSponsorInput && document.activeElement === currentSponsorInput) || (currentPoolInput && document.activeElement === currentPoolInput)) return;
    const body = document.getElementById('atmWorldEventPanelBody'); if (!body) return;
    const event = state.event, phase = eventPhase(event);
    let activeBlock = '';
    if (event && phase !== 'completed') {
      const reward = event.reward_settlement ? `<div style="margin-top:7px;color:#66f7bd;font-weight:850">Prize pool: ${escapeHtml(event.reward_pool_xrp)} Testnet XRP · you keep exactly what you collect.</div>` : '';
      activeBlock = `<div class="atmWorldEventPreview"><strong>💸 Money Rain is ${phase === 'announced' ? 'starting' : 'live'}</strong><div>Money Rain provided by <b>${escapeHtml(sponsorLabel(event))}</b>.</div>${reward}<div style="margin-top:7px;color:#afcbd2">${phase === 'announced' ? `${secondsLabel(Date.parse(event.starts_at) - nowMs())} until drops begin.` : `${secondsLabel(Date.parse(event.ends_at) - nowMs())} remaining.`}</div></div>`;
    } else if (event && phase === 'completed' && event.leaders?.length) {
      const rewardEvent = Boolean(event.reward_settlement);
      const settlement = String(event.settlement_status || '');
      const settlementLine = rewardEvent
        ? `<div style="color:${settlement === 'completed' ? '#66f7bd' : settlement === 'blocked' ? '#ff9fb1' : '#ffd978'};font-weight:850;margin:8px 0">${settlement === 'completed' ? '✓ Payload payout complete' : settlement === 'cancelled' ? '✓ Unused pool refunded' : settlement === 'blocked' ? `Payload payout needs attention${event.settlement_error ? `: ${escapeHtml(event.settlement_error)}` : ''}` : 'Payload settlement is processing automatically…'}</div>`
        : '';
      activeBlock = `<div class="atmWorldEventPreview"><strong>Last Money Rain results</strong><div style="color:#afcbd2;margin-bottom:7px">Provided by ${escapeHtml(sponsorLabel(event))} · every participant keeps the amount they collected</div>${settlementLine}${event.leaders.slice(0,12).map((leader) => `<div class="atmWorldEventLeader"><span>#${leader.rank} ${escapeHtml(leader.display_name)}${leader.handle ? ` · @${escapeHtml(leader.handle)}` : ''}</span><b>${rewardEvent ? `${escapeHtml(leader.reward_amount_xrp || rewardForPoints(leader.points, event) || '0')} XRP` : `${leader.points} collected`}</b></div>`).join('')}<div style="margin-top:8px;color:#9fc3cc;font-size:11px">${Number(event.unclaimed_points || 0)} of ${Number(event.pool_points || 1000)} points were not collected${rewardEvent ? ' and remain refundable to the sponsor through Payload.' : '.'}</div></div>`;
    }
    const sponsorDisabled = Boolean(event && phase !== 'completed');
    const brandActive = state.sponsorMode === 'brand';
    const draft = state.fundingDraft;
    const pendingFunding = draft ? `<div class="atmWorldEventFunding"><div class="atmWorldEventEyebrow">PAYLOAD · TESTNET FUNDING</div><div class="atmWorldEventFundingRow"><span>Prize pool</span><b>${escapeHtml(draft.pool_xrp)} XRP</b></div><div class="atmWorldEventFundingRow"><span>Total funding required</span><b>${escapeHtml(draft.funding_required_xrp)} XRP</b></div><div class="atmWorldEventFundingRow"><span>Status</span><b>${draft.tx_hash ? 'SIGNED / CHECKING XRPL' : 'AWAITING AUTHORIZATION'}</b></div><div class="atmWorldEventFundingNote">The extra funding above the prize pool covers the campaign wallet reserve, worst-case payout fees and safety buffer. Payload automatically returns unused campaign XRP to your ATM Town Testnet wallet after settlement. The campaign address stays hidden from the normal game flow.</div></div>` : '';
    const primaryText = draft ? (draft.tx_hash ? 'CHECK FUNDING & START' : `AUTHORIZE & FUND ${escapeHtml(draft.funding_required_xrp)} XRP`) : 'PREPARE PAYLOAD MONEY RAIN';
    body.innerHTML = `<div class="atmWorldEventEyebrow">ATM HQ · WORLD EVENT ENGINE</div><h2>World Event Control</h2><p>Fund a Testnet XRP Money Rain through Payload, then let ATM Town lock the exact amount each player collected for automatic settlement.</p>${activeBlock}<div class="atmWorldEventPreview"><strong>💸 PAYLOAD MONEY RAIN · TESTNET</strong><div>Choose the prize pool before the event. The 1,000 game points divide that pool exactly, so every collectible has a deterministic XRP value. First place is only a rank — every collector receives what they actually picked up.</div><div class="atmWorldEventFacts"><div class="atmWorldEventFact"><b>10 sec</b><span>global countdown</span></div><div class="atmWorldEventFact"><b>45 sec</b><span>live event</span></div><div class="atmWorldEventFact"><b>1,000 pts</b><span>exact reward basis</span></div><div class="atmWorldEventFact"><b>Testnet XRP</b><span>Payload v0.2.1</span></div></div><div class="atmWorldEventSponsorBox"><label>DISPLAY THIS MONEY RAIN AS PROVIDED BY</label><div class="atmWorldEventSponsorRow"><button class="atmWorldEventSponsorChoice ${!brandActive ? 'active' : ''}" id="atmWorldEventSponsorPlayer" type="button" ${sponsorDisabled || draft ? 'disabled' : ''}>MY PLAYER NAME</button><button class="atmWorldEventSponsorChoice ${brandActive ? 'active' : ''}" id="atmWorldEventSponsorBrand" type="button" ${sponsorDisabled || draft ? 'disabled' : ''}>PROJECT / BRAND</button></div><input class="atmWorldEventSponsorInput" id="atmWorldEventSponsorInput" type="text" maxlength="32" placeholder="ATM, ChillGuy, etc." value="${escapeHtml(state.sponsorLabel)}" ${brandActive && !sponsorDisabled && !draft ? '' : 'disabled'}><div class="atmWorldEventSponsorHint">${brandActive ? `Players will see “Money Rain provided by ${escapeHtml(state.sponsorLabel || 'your project')}.”` : 'Players will see your ATM Town name / @handle as the provider.'}</div><label style="display:block;margin-top:13px;font-size:11px;font-weight:900;letter-spacing:.08em;color:#91b8c2">TESTNET XRP PRIZE POOL</label><input class="atmWorldEventPoolInput" id="atmWorldEventPoolInput" type="text" inputmode="decimal" maxlength="10" placeholder="0.100" value="${escapeHtml(state.poolXrp)}" ${sponsorDisabled || draft ? 'disabled' : ''}><div class="atmWorldEventSponsorHint">0.001–5 XRP in 0.001 XRP increments. For the first live test, 0.100 XRP is plenty.</div></div>${pendingFunding}<div style="font-size:12px;color:#66f7bd;font-weight:850">ONE PASSKEY / RECOVERY AUTHORIZATION FUNDS THE CAMPAIGN. ATM TOWN NEVER SENDS YOUR WALLET SEED TO PAYLOAD.</div></div><button class="atmWorldEventBtn" id="atmWorldEventPayloadAction" type="button" ${sponsorDisabled || state.fundingBusy ? 'disabled' : ''}>${sponsorDisabled ? 'WORLD EVENT IN PROGRESS' : primaryText}</button>${!draft ? `<button class="atmWorldEventBtn" id="atmWorldEventPreviewStart" type="button" style="margin-top:9px;background:#173746;color:#dff7fb" ${sponsorDisabled || state.fundingBusy ? 'disabled' : ''}>START PREVIEW · NO XRP</button>` : ''}<div class="atmWorldEventStatus" id="atmWorldEventStatus" style="color:${escapeHtml(state.panelStatusColor)}">${escapeHtml(state.panelStatus)}</div>`;

    body.querySelector('#atmWorldEventPayloadAction')?.addEventListener('click', () => {
      if (!state.fundingDraft) preparePayloadMoneyRain();
      else if (state.fundingDraft.tx_hash) checkPayloadFundingAndStart({ wait: true });
      else fundPayloadMoneyRain();
    });
    body.querySelector('#atmWorldEventPreviewStart')?.addEventListener('click', startMoneyRainPreview);
    const playerButton = body.querySelector('#atmWorldEventSponsorPlayer');
    const brandButton = body.querySelector('#atmWorldEventSponsorBrand');
    const sponsorInput = body.querySelector('#atmWorldEventSponsorInput');
    const poolInput = body.querySelector('#atmWorldEventPoolInput');
    playerButton?.addEventListener('click', () => { state.sponsorMode = 'player'; renderControlPanel(); });
    brandButton?.addEventListener('click', () => { state.sponsorMode = 'brand'; renderControlPanel(); setTimeout(() => document.getElementById('atmWorldEventSponsorInput')?.focus(), 0); });
    sponsorInput?.addEventListener('input', (event) => { state.sponsorLabel = String(event.target.value || '').slice(0, 32); });
    poolInput?.addEventListener('input', (event) => { state.poolXrp = String(event.target.value || '').replace(/[^0-9.]/g, '').slice(0, 10); });
  }

  function openControlPanel(context = {}) {
    installUi();
    loadFundingDraft();
    state.controlContext = { map: String(context.map || ''), x: Number(context.x), y: Number(context.y) };
    renderControlPanel();
    document.getElementById('atmWorldEventOverlay').classList.add('open');
  }
  function closeControlPanel() { document.getElementById('atmWorldEventOverlay')?.classList.remove('open'); }

  async function preparePayloadMoneyRain() {
    if (state.fundingBusy) return;
    try {
      state.fundingBusy = true; renderControlPanel(); setPanelStatus('Creating a Payload Testnet campaign…');
      if (typeof global.atmApiWithAuth !== 'function') throw new Error('Sign in to prepare a Payload Money Rain.');
      const launch = currentLaunchPayload();
      const pool = String(state.poolXrp || '').trim();
      if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(pool)) throw new Error('Enter a valid Testnet XRP prize pool.');
      const data = await global.atmApiWithAuth('/api/world-time?action=payload-create-money-rain', {
        method: 'POST',
        body: JSON.stringify({ ...launch, pool_xrp: pool }),
      });
      state.fundingDraft = {
        ...data,
        sponsor_mode: launch.sponsor_mode,
        sponsor_label: launch.sponsor_label,
        tx_hash: null,
        signed_tx_blob: null,
        created_at: Date.now(),
      };
      state.poolXrp = String(data.pool_xrp || pool);
      saveFundingDraft();
      renderControlPanel();
      setPanelStatus(`Payload campaign ready. Review the ${data.funding_required_xrp} XRP total funding requirement, then authorize once.`, '#66f7bd');
    } catch (error) {
      setPanelStatus(error?.message || 'Payload Money Rain could not be prepared.', '#ff9fb1');
    } finally {
      state.fundingBusy = false; renderControlPanel();
    }
  }

  async function fundPayloadMoneyRain() {
    if (state.fundingBusy || !state.fundingDraft) return;
    const draft = state.fundingDraft;
    // Never generate a second signature once an exact funding transaction exists.
    if (draft.tx_hash) return checkPayloadFundingAndStart({ wait: true });
    try {
      state.fundingBusy = true; renderControlPanel(); setPanelStatus('Preparing the exact XRPL Testnet funding transaction…');
      if (typeof global.atmApiWithAuth !== 'function') throw new Error('Sign in to fund Money Rain.');
      if (typeof global.ATMEmbeddedWallet?.signPayloadMoneyRainFunding !== 'function') throw new Error('ATM Pay wallet signing is unavailable. Refresh ATM Town and try again.');
      const prepared = await global.atmApiWithAuth('/api/world-time?action=payload-funding-prepare', {
        method: 'POST', body: JSON.stringify({ draft_token: draft.draft_token }),
      });
      if (prepared?.funded) return checkPayloadFundingAndStart({ wait: false });
      const approved = global.confirm(`PAYLOAD MONEY RAIN · XRPL TESTNET\n\nPrize pool: ${draft.pool_xrp} XRP\nTotal funding: ${draft.funding_required_xrp} XRP\n\nThe difference covers the temporary campaign wallet reserve, payout fees and safety buffer. Unused XRP is returned to your ATM Town Testnet wallet after settlement.\n\nAuthorize this one funding transaction?`);
      if (!approved) throw new Error('Money Rain funding authorization was cancelled.');
      setPanelStatus('Waiting for your ATM wallet authorization…');
      const signed = await global.ATMEmbeddedWallet.signPayloadMoneyRainFunding(prepared, draft.draft_token);
      // Persist the immutable signed transaction BEFORE network relay. If the browser/network
      // drops afterward, Check Funding can re-submit this exact blob without another signature.
      state.fundingDraft = { ...draft, tx_hash: signed.hash, signed_tx_blob: signed.tx_blob, signed_at: Date.now() };
      saveFundingDraft();
      renderControlPanel();
      setPanelStatus('Funding signed locally. Relaying the exact signed transaction to XRPL Testnet…');
      try {
        await global.atmApiWithAuth('/api/world-time?action=payload-funding-relay', {
          method: 'POST',
          body: JSON.stringify({ draft_token: draft.draft_token, tx_hash: signed.hash, tx_blob: signed.tx_blob }),
        });
      } catch (relayError) {
        console.warn('Money Rain funding relay was uncertain; the signed transaction is preserved for safe retry.', relayError);
      }
      await checkPayloadFundingAndStart({ wait: true, alreadyBusy: true });
    } catch (error) {
      setPanelStatus(error?.message || 'Money Rain funding could not be completed.', '#ff9fb1');
    } finally {
      state.fundingBusy = false; renderControlPanel();
    }
  }

  async function checkPayloadFundingAndStart({ wait = true, alreadyBusy = false } = {}) {
    if (!state.fundingDraft || (state.fundingBusy && !alreadyBusy)) return;
    const ownBusy = !alreadyBusy;
    if (ownBusy) { state.fundingBusy = true; renderControlPanel(); }
    const draft = state.fundingDraft;
    try {
      if (typeof global.atmApiWithAuth !== 'function') throw new Error('Sign in to check Money Rain funding.');
      // Re-submit only the SAME signed blob. This can never authorize a different destination/amount.
      if (draft.tx_hash && draft.signed_tx_blob) {
        try {
          await global.atmApiWithAuth('/api/world-time?action=payload-funding-relay', {
            method: 'POST',
            body: JSON.stringify({ draft_token: draft.draft_token, tx_hash: draft.tx_hash, tx_blob: draft.signed_tx_blob }),
          });
        } catch (_error) {}
      }
      if (draft.tx_hash) {
        try {
          const verification = await global.atmApiWithAuth('/api/world-time?action=payload-funding-verify', {
            method: 'POST', body: JSON.stringify({ draft_token: draft.draft_token, tx_hash: draft.tx_hash }),
          });
          if (verification?.validated && verification?.success === false) throw new Error(`XRPL rejected the funding transaction (${verification.result || 'unknown result'}).`);
        } catch (error) {
          if (/rejected/i.test(String(error?.message || ''))) throw error;
        }
      }
      const deadline = Date.now() + (wait ? FUNDING_STATUS_WAIT_MS : 1);
      let last = null;
      do {
        setPanelStatus('Waiting for Payload to confirm the full Testnet funding amount…');
        last = await global.atmApiWithAuth('/api/world-time?action=payload-funding-status', {
          method: 'POST', body: JSON.stringify({ draft_token: draft.draft_token }),
        });
        if (last?.funded) {
          setPanelStatus('Funding confirmed. Starting synchronized Money Rain…', '#66f7bd');
          const data = await global.atmApiWithAuth('/api/world-time?action=start-funded-money-rain', {
            method: 'POST',
            body: JSON.stringify({ ...currentLaunchPayload(), draft_token: draft.draft_token, tx_hash: draft.tx_hash || null }),
          });
          applyState(data);
          clearFundingDraft();
          closeControlPanel();
          toast(`💸 ${draft.pool_xrp} Testnet XRP Money Rain provided by ${sponsorLabel(data.event)}!`, 4800);
          return;
        }
        if (!wait || Date.now() >= deadline) break;
        await sleep(FUNDING_STATUS_POLL_MS);
      } while (Date.now() < deadline);
      setPanelStatus(draft.tx_hash
        ? 'Funding is still confirming. Do NOT authorize another payment. Use CHECK FUNDING & START again.'
        : 'Payload has not received the required funding yet.', '#ffd978');
    } catch (error) {
      setPanelStatus(error?.message || 'Payload funding status could not be confirmed.', '#ff9fb1');
    } finally {
      if (ownBusy) { state.fundingBusy = false; renderControlPanel(); }
    }
  }

  async function startMoneyRainPreview() {
    const button = document.getElementById('atmWorldEventPreviewStart');
    try {
      if (button) button.disabled = true; setPanelStatus('Starting synchronized preview event…');
      if (typeof global.atmApiWithAuth !== 'function') throw new Error('Sign in to start a World Event.');
      const data = await global.atmApiWithAuth('/api/world-time?action=start-money-rain', { method: 'POST', body: JSON.stringify(currentLaunchPayload()) });
      applyState(data); closeControlPanel(); toast(`💸 Preview Money Rain provided by ${sponsorLabel(data.event)}!`, 4200);
    } catch (error) {
      setPanelStatus(error?.message || 'Money Rain preview could not start.', '#ff9fb1');
      if (button) button.disabled = false;
    }
  }

  function pickupFrame(pickup, event = state.event) {
    if (!event || eventPhase(event) !== 'active') return null;
    const now = nowMs(), spawnAt = Date.parse(event.starts_at) + Number(pickup.spawn_offset_ms || 0), fallMs = Math.max(1, Number(pickup.fall_ms || 1200));
    if (now < spawnAt || now >= Date.parse(event.ends_at)) return null;
    const landedAt = spawnAt + fallMs;
    if (now < landedAt) {
      const p = Math.max(0, Math.min(1, (now - spawnAt) / fallMs));
      // v235.1.1: start the visual rain far above the landing point and let bills
      // visibly flutter through the air instead of appearing just above ground.
      const eased = 0.16 * p + 0.84 * Math.pow(p, 1.38);
      const drift = Number(pickup.drift_px || 28);
      const flutter = Math.sin((now + pickup.id * 97) / 245) * drift + Math.sin((now + pickup.id * 211) / 510) * drift * .34;
      return {
        falling: true,
        landed: false,
        x: Number(pickup.x) + flutter * (1 - p * .72),
        y: Number(pickup.y) - Number(pickup.fall_height || 1100) * (1 - eased),
        progress: p,
      };
    }
    return { falling: false, landed: true, x: Number(pickup.x), y: Number(pickup.y) + Math.sin((now + pickup.id * 113) / 260) * 2, progress: 1 };
  }
  function pickupStyle(points) {
    if (points >= 100) return { fill: '#ffd96a', stroke: '#fff1a6', text: '#563800', scale: 1.3, glow: 'rgba(255,217,106,.8)' };
    if (points >= 50) return { fill: '#80f2bc', stroke: '#d9ffe8', text: '#063b28', scale: 1.16, glow: 'rgba(128,242,188,.65)' };
    if (points >= 25) return { fill: '#62ddf2', stroke: '#d8f9ff', text: '#06343d', scale: 1.08, glow: 'rgba(98,221,242,.55)' };
    return { fill: '#d8f5e8', stroke: '#ffffff', text: '#153b31', scale: 1, glow: 'rgba(88,241,230,.42)' };
  }
  function drawBillShape(ctx, w, h, style, label = '$') {
    ctx.fillStyle = style.fill; ctx.strokeStyle = style.stroke; ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = style.text; ctx.font = `950 ${Math.round(10 * style.scale)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0);
  }
  function drawPickup(ctx, x, y, pickup, alpha = 1) {
    const style = pickupStyle(Number(pickup.points || 0)), w = 36 * style.scale, h = 20 * style.scale;
    const rotation = Number(pickup.rotation || 0) + Math.sin((nowMs() + pickup.id * 53) / 190) * .055;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rotation);
    ctx.shadowColor = style.glow; ctx.shadowBlur = pickup.rarity === 'jackpot' ? 18 : 10;
    if (pickup.kind === 'bag') {
      ctx.fillStyle = style.fill; ctx.strokeStyle = style.stroke; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-7, -13); ctx.quadraticCurveTo(0, -18, 7, -13); ctx.lineTo(4, -7); ctx.quadraticCurveTo(17, 1, 14, 14); ctx.quadraticCurveTo(0, 22, -14, 14); ctx.quadraticCurveTo(-17, 1, -4, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = style.text; ctx.font = '950 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 6);
    } else if (pickup.kind === 'bundle') {
      ctx.save(); ctx.translate(-5, 4); drawBillShape(ctx, w, h, style, '$'); ctx.restore();
      ctx.save(); ctx.translate(5, -4); drawBillShape(ctx, w, h, style, '$'); ctx.restore();
      ctx.shadowBlur = 0; ctx.fillStyle = style.text; ctx.fillRect(-3, -h * .66, 6, h * 1.32);
    } else {
      drawBillShape(ctx, w, h, style, '$');
    }
    ctx.restore();
  }
  function beginPickupFx(pickup) {
    state.pickupFx.push({ id: Number(pickup.id), x: Number(pickup.x), y: Number(pickup.y), points: Number(pickup.points || 0), startedAt: nowMs() });
    if (state.pickupFx.length > 18) state.pickupFx.splice(0, state.pickupFx.length - 18);
    try { navigator.vibrate?.(18); } catch (_error) {}
  }
  function drawPickupFx(ctx) {
    const now = nowMs();
    state.pickupFx = state.pickupFx.filter((fx) => now - fx.startedAt < PICKUP_FX_MS);
    for (const fx of state.pickupFx) {
      const p = Math.max(0, Math.min(1, (now - fx.startedAt) / PICKUP_FX_MS));
      const alpha = 1 - p;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#7fffd4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.x, fx.y - 4, 10 + p * 28, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '950 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`+${fx.points}`, fx.x, fx.y - 24 - p * 26);
      ctx.restore();
    }
  }
  function hash01(seed, a, b = 0) {
    let x = ((Number(seed) >>> 0) ^ Math.imul((a + 1) >>> 0, 0x9e3779b1) ^ Math.imul((b + 11) >>> 0, 0x85ebca6b)) >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function drawAtmosphericMoneyRain(ctx, args = {}) {
    if (!state.event || eventPhase() !== 'active' || args.map !== 'town') return;
    const viewX = Number(args.cameraX), viewY = Number(args.cameraY), viewW = Number(args.viewportWidth), viewH = Number(args.viewportHeight);
    if (![viewX, viewY, viewW, viewH].every(Number.isFinite) || viewW <= 0 || viewH <= 0) return;
    const now = nowMs(), start = Date.parse(state.event.starts_at), elapsed = Math.max(0, now - start), seed = Number(state.event.seed || 1) >>> 0;
    const marginX = Math.max(70, viewW * .12), topLift = Math.max(360, viewH * .82), bottomPad = Math.max(100, viewH * .16);
    ctx.save();
    for (let i = 0; i < ATMOSPHERIC_RAIN_OBJECTS; i += 1) {
      // Each decorative bill repeats on its own irregular cycle. Roughly 65–75% are
      // airborne at once, so Money Rain reads as a continuous storm on every screen.
      const cycleMs = 9200 + Math.floor(hash01(seed, i, 2) * 5000);
      const activeFraction = .72 + hash01(seed, i, 3) * .08;
      const offset = Math.floor(hash01(seed, i, 4) * cycleMs);
      const cycleNumber = Math.floor((elapsed + offset) / cycleMs);
      const phase = ((elapsed + offset) % cycleMs) / cycleMs;
      if (phase > activeFraction) continue;
      const p = phase / activeFraction;
      const xSeed = hash01(seed ^ cycleNumber, i, 5);
      const ySeed = hash01(seed ^ cycleNumber, i, 6);
      const scale = .48 + hash01(seed, i, 7) * .48;
      const xBase = viewX - marginX + xSeed * (viewW + marginX * 2);
      const startY = viewY - topLift * (.62 + ySeed * .72);
      const endY = viewY + viewH + bottomPad;
      const eased = .08 * p + .92 * Math.pow(p, 1.12);
      const sway = Math.sin((elapsed / (520 + hash01(seed, i, 8) * 480)) + i * 1.77) * (18 + 36 * hash01(seed, i, 9));
      const x = xBase + sway;
      const y = startY + (endY - startY) * eased;
      if (x < viewX - 100 || x > viewX + viewW + 100 || y < viewY - topLift - 80 || y > viewY + viewH + 120) continue;
      const alpha = .42 + .42 * Math.sin(Math.min(1, p) * Math.PI);
      const w = 27 * scale, h = 14 * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate((hash01(seed, i, 10) - .5) * 1.05 + Math.sin(elapsed / 520 + i) * .08);
      ctx.fillStyle = i % 13 === 0 ? '#8ff4c7' : '#d8f5e8';
      ctx.strokeStyle = 'rgba(255,255,255,.82)';
      ctx.lineWidth = Math.max(1, 1.2 * scale);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      if (scale > .7) {
        ctx.fillStyle = '#174236';
        ctx.font = `900 ${Math.max(7, Math.round(8 * scale))}px system-ui`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 0);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawGround(ctx, args = {}) {
    if (args.map !== 'town' || !state.event || eventPhase() !== 'active') return;
    for (const pickup of state.event.pickups || []) {
      const id = Number(pickup.id);
      if (state.claimed.has(id) || state.claiming.has(id)) continue;
      const frame = pickupFrame(pickup); if (!frame?.landed) continue;
      const style = pickupStyle(Number(pickup.points || 0));
      ctx.save(); ctx.globalAlpha = pickup.rarity === 'jackpot' ? .34 : .18; ctx.fillStyle = style.glow; ctx.beginPath(); ctx.ellipse(Number(pickup.x), Number(pickup.y) + 7, pickup.kind === 'bag' ? 23 : 18, pickup.kind === 'bag' ? 8 : 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      drawPickup(ctx, frame.x, frame.y - 9, pickup, .97);
    }
  }
  function drawAir(ctx, args = {}) {
    if (args.map !== 'town' || !state.event || eventPhase() !== 'active') return;
    drawAtmosphericMoneyRain(ctx, args);
    for (const pickup of state.event.pickups || []) {
      const id = Number(pickup.id);
      if (state.claimed.has(id) || state.claiming.has(id)) continue;
      const frame = pickupFrame(pickup); if (!frame?.falling) continue;
      drawPickup(ctx, frame.x, frame.y - 12, pickup, .82 + frame.progress * .18);
    }
    drawPickupFx(ctx);
  }

  async function claimPickups(pickups, player) {
    const candidates = (pickups || []).filter((pickup) => {
      const id = Number(pickup.id);
      return Number.isInteger(id) && !state.claiming.has(id) && !state.claimed.has(id);
    }).slice(0, MAX_PICKUPS_PER_CLAIM);
    if (!candidates.length || !state.event) return;
    if (typeof global.atmApiWithAuth !== 'function') {
      if (Date.now() - state.lastAuthWarning > 4000) { state.lastAuthWarning = Date.now(); toast('Sign in to collect World Event points.'); }
      return;
    }
    const ids = candidates.map((pickup) => Number(pickup.id));
    for (const pickup of candidates) {
      state.claiming.add(Number(pickup.id));
      beginPickupFx(pickup);
    }
    try {
      const data = await global.atmApiWithAuth('/api/world-time?action=claim-money-rain', {
        method: 'POST',
        body: JSON.stringify({ event_id: state.event.id, pickup_ids: ids, map: player.map, x: player.x, y: player.y }),
      });
      applyState(data);
      const accepted = new Set((data.claimed_pickup_ids_now || []).map(Number));
      for (const id of accepted) state.claimed.add(id);
      const awarded = Number(data.points || 0);
      if (accepted.size && awarded > 0) {
        const reward = state.event?.reward_settlement ? rewardForPoints(awarded, state.event) : '';
        toast(reward ? `+${reward} Testnet XRP` : `+${awarded} Money Rain point${awarded === 1 ? '' : 's'}`, 1250);
      }
    } catch (error) {
      const message = String(error?.message || '');
      if (/no longer|ended|not currently active/i.test(message)) for (const id of ids) state.claimed.add(id);
      else if (/sign in/i.test(message) && Date.now() - state.lastAuthWarning > 4000) { state.lastAuthWarning = Date.now(); toast('Sign in to collect World Event points.'); }
      else console.warn('Money Rain pickup claim failed.', error);
    } finally {
      for (const id of ids) state.claiming.delete(id);
    }
  }
  function updateGameplay(player = {}) {
    if (!state.event || eventPhase() !== 'active' || player.map !== 'town') return;
    const now = Date.now(); if (now - state.lastClaimScan < CLAIM_SCAN_MS) return; state.lastClaimScan = now;
    const px = Number(player.x), py = Number(player.y); if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    const nearby = [];
    for (const pickup of state.event.pickups || []) {
      const id = Number(pickup.id); if (state.claimed.has(id) || state.claiming.has(id)) continue;
      const frame = pickupFrame(pickup); if (!frame?.landed) continue;
      if (Math.hypot(px - Number(pickup.x), py - Number(pickup.y)) <= PICKUP_RADIUS) nearby.push(pickup);
      if (nearby.length >= MAX_PICKUPS_PER_CLAIM) break;
    }
    if (nearby.length) claimPickups(nearby, { map: 'town', x: px, y: py });
  }

  loadFundingDraft();
  installUi();
  document.addEventListener('visibilitychange', () => { clearTimeout(state.pollTimer); state.pollTimer = setTimeout(poll, 150); });
  setTimeout(poll, 250);

  global.ATMWorldEvents = Object.freeze({
    openControlPanel,
    closeControlPanel,
    refresh: poll,
    updateGameplay,
    drawGround,
    drawAir,
    getState: () => ({ event: state.event, phase: eventPhase(), myScore: state.myScore, myPickups: state.myPickups }),
  });
})(window);
