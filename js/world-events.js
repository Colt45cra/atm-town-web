(function initializeATMWorldEvents(global) {
  'use strict';

  const POLL_MS = 1400;
  const HIDDEN_POLL_MS = 7000;
  const CLAIM_SCAN_MS = 90;
  const PICKUP_RADIUS = 40;
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
  function sponsorLabel(event) {
    const handle = String(event?.sponsor?.handle || '');
    return handle ? `@${handle}` : String(event?.sponsor?.display_name || 'An ATM Town player');
  }

  function installUi() {
    if (document.getElementById('atmWorldEventHud')) return;
    const style = document.createElement('style');
    style.textContent = `
      .atmWorldEventHud{position:fixed;z-index:86;top:max(74px,calc(env(safe-area-inset-top,0px) + 58px));left:50%;transform:translateX(-50%) translateY(-8px);width:min(560px,calc(100vw - 24px));pointer-events:none;opacity:0;transition:.2s ease;filter:drop-shadow(0 12px 28px rgba(0,0,0,.38));font-family:system-ui,-apple-system,sans-serif}
      .atmWorldEventHud.show{opacity:1;transform:translateX(-50%) translateY(0)}
      .atmWorldEventHudCard{background:rgba(5,25,34,.94);border:1px solid rgba(88,241,230,.6);border-radius:16px;padding:10px 14px;color:#eefcff;backdrop-filter:blur(12px);display:flex;align-items:center;gap:11px}
      .atmWorldEventHudIcon{font-size:27px;line-height:1}.atmWorldEventHudMain{min-width:0;flex:1}.atmWorldEventHudTitle{font-weight:950;letter-spacing:.05em;font-size:14px}.atmWorldEventHudMeta{font-size:12px;color:#a9c8d0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atmWorldEventHudScore{font-weight:950;color:#66f7bd;font-size:13px;text-align:right;white-space:nowrap}
      .atmWorldEventOverlay{position:fixed;inset:0;z-index:220;background:rgba(1,10,15,.78);display:none;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(8px);font-family:system-ui,-apple-system,sans-serif}.atmWorldEventOverlay.open{display:flex}
      .atmWorldEventPanel{width:min(620px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;background:#08202b;border:1px solid rgba(88,241,230,.65);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.55);color:#effcff;padding:22px;position:relative}
      .atmWorldEventClose{position:absolute;right:14px;top:14px;width:44px;height:44px;border:0;border-radius:13px;background:#102f3d;color:#fff;font-size:25px;font-weight:900}.atmWorldEventEyebrow{color:#66f7bd;font-size:12px;font-weight:900;letter-spacing:.12em}.atmWorldEventPanel h2{margin:5px 52px 8px 0;font-size:27px}.atmWorldEventPanel p{color:#afcbd2;line-height:1.5}.atmWorldEventPreview{border:1px solid rgba(255,214,102,.36);background:rgba(255,214,102,.07);border-radius:16px;padding:15px;margin:16px 0}.atmWorldEventPreview strong{display:block;color:#ffd978;font-size:18px;margin-bottom:6px}.atmWorldEventFacts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0}.atmWorldEventFact{background:#0d2a36;border:1px solid rgba(151,203,214,.14);border-radius:12px;padding:11px}.atmWorldEventFact b{display:block;color:#fff;font-size:14px}.atmWorldEventFact span{font-size:11px;color:#91b8c2}.atmWorldEventBtn{width:100%;border:0;border-radius:14px;padding:15px 16px;font-weight:950;font-size:14px;background:linear-gradient(90deg,#4ce7dd,#69f6bd);color:#062029}.atmWorldEventBtn:disabled{opacity:.45}.atmWorldEventStatus{margin-top:12px;min-height:20px;color:#ff9fb1;font-size:13px}.atmWorldEventLeader{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07)}
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
    if (incoming.id !== oldId) {
      state.claimed = new Set((incoming.claimed_pickup_ids || []).map(Number)); state.claiming.clear(); state.myScore = Number(incoming.my_score || 0); state.myPickups = Number(incoming.my_pickups || 0); state.lastEventId = incoming.id;
      toast(`💸 ${sponsorLabel(incoming)} started Money Rain!`);
    } else {
      state.claimed = new Set((incoming.claimed_pickup_ids || []).map(Number));
      if (Number.isFinite(Number(incoming.my_score))) state.myScore = Number(incoming.my_score);
      if (Number.isFinite(Number(incoming.my_pickups))) state.myPickups = Number(incoming.my_pickups);
    }
    const phase = eventPhase(incoming);
    if (phase !== oldPhase && incoming.id === oldId) {
      if (phase === 'active') toast('💸 MONEY RAIN! Get outside and grab the drops!', 4200);
      if (phase === 'completed') {
        const winner = incoming.leaders?.[0];
        toast(winner ? `🏆 Money Rain complete · ${winner.display_name} won with ${winner.points} points` : 'Money Rain complete!', 5200);
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
    if (phase === 'announced') {
      title.textContent = `💸 MONEY RAIN IN ${secondsLabel(starts - now)}`;
      meta.textContent = `${sponsorLabel(event)} started a 1,000-point town-wide event`;
      score.textContent = 'GET READY';
    } else if (phase === 'active') {
      title.textContent = `💸 MONEY RAIN · ${secondsLabel(ends - now)} LEFT`;
      meta.textContent = `${Number(event.claimed_points || 0).toLocaleString()} / ${Number(event.pool_points || 1000).toLocaleString()} points collected`;
      score.textContent = `YOU ${state.myScore}`;
    } else {
      const winner = event.leaders?.[0];
      title.textContent = '💸 MONEY RAIN COMPLETE';
      meta.textContent = winner ? `${winner.display_name} · ${winner.points} points` : 'Event results are final';
      score.textContent = `YOU ${state.myScore}`;
    }
    hud.classList.add('show');
  }
  setInterval(renderHud, 250);

  function renderControlPanel() {
    const body = document.getElementById('atmWorldEventPanelBody'); if (!body) return;
    const event = state.event, phase = eventPhase(event);
    let activeBlock = '';
    if (event && phase !== 'completed') {
      activeBlock = `<div class="atmWorldEventPreview"><strong>💸 Money Rain is ${phase === 'announced' ? 'starting' : 'live'}</strong><div>${escapeHtml(sponsorLabel(event))} started this event.</div><div style="margin-top:7px;color:#afcbd2">${phase === 'announced' ? `${secondsLabel(Date.parse(event.starts_at) - nowMs())} until drops begin.` : `${secondsLabel(Date.parse(event.ends_at) - nowMs())} remaining.`}</div></div>`;
    } else if (event && phase === 'completed' && event.leaders?.length) {
      activeBlock = `<div class="atmWorldEventPreview"><strong>Last Money Rain results</strong>${event.leaders.slice(0,3).map((leader) => `<div class="atmWorldEventLeader"><span>#${leader.rank} ${escapeHtml(leader.display_name)}${leader.handle ? ` · @${escapeHtml(leader.handle)}` : ''}</span><b>${leader.points}</b></div>`).join('')}</div>`;
    }
    body.innerHTML = `<div class="atmWorldEventEyebrow">ATM HQ · WORLD EVENT ENGINE</div><h2>World Event Control</h2><p>Launch a synchronized event across the live multiplayer world. This first prototype proves event timing, spawning, collection, scoring and cleanup before real rewards are attached.</p>${activeBlock}<div class="atmWorldEventPreview"><strong>💸 MONEY RAIN · PREVIEW</strong><div>Money drops across ATM Town and players race to collect it.</div><div class="atmWorldEventFacts"><div class="atmWorldEventFact"><b>10 sec</b><span>global countdown</span></div><div class="atmWorldEventFact"><b>45 sec</b><span>live event</span></div><div class="atmWorldEventFact"><b>60 drops</b><span>server-owned pickups</span></div><div class="atmWorldEventFact"><b>1,000 pts</b><span>preview pool</span></div></div><div style="font-size:12px;color:#ffd978;font-weight:800">REAL ATM / XRP REWARD SETTLEMENT IS OFF IN v235.</div></div><button class="atmWorldEventBtn" id="atmWorldEventStart" type="button" ${event && phase !== 'completed' ? 'disabled' : ''}>${event && phase !== 'completed' ? 'WORLD EVENT IN PROGRESS' : 'START MONEY RAIN PREVIEW'}</button><div class="atmWorldEventStatus" id="atmWorldEventStatus"></div>`;
    body.querySelector('#atmWorldEventStart')?.addEventListener('click', startMoneyRain);
  }
  function openControlPanel(context = {}) {
    installUi(); state.controlContext = { map: String(context.map || ''), x: Number(context.x), y: Number(context.y) };
    renderControlPanel(); document.getElementById('atmWorldEventOverlay').classList.add('open');
  }
  function closeControlPanel() { document.getElementById('atmWorldEventOverlay')?.classList.remove('open'); }
  async function startMoneyRain() {
    const status = document.getElementById('atmWorldEventStatus'), button = document.getElementById('atmWorldEventStart');
    if (!state.controlContext) return;
    try {
      if (button) button.disabled = true; if (status) { status.textContent = 'Starting synchronized event…'; status.style.color = '#9fc3cc'; }
      if (typeof global.atmApiWithAuth !== 'function') throw new Error('Sign in to start a World Event.');
      const data = await global.atmApiWithAuth('/api/world-time?action=start-money-rain', { method: 'POST', body: JSON.stringify(state.controlContext) });
      applyState(data); closeControlPanel(); toast('💸 Money Rain announced to ATM Town!', 4200);
    } catch (error) {
      if (status) { status.textContent = error?.message || 'Money Rain could not start.'; status.style.color = '#ff9fb1'; }
      if (button) button.disabled = false;
    }
  }

  function pickupFrame(pickup, event = state.event) {
    if (!event || eventPhase(event) !== 'active') return null;
    const now = nowMs(), spawnAt = Date.parse(event.starts_at) + Number(pickup.spawn_offset_ms || 0), fallMs = Math.max(1, Number(pickup.fall_ms || 1400));
    if (now < spawnAt || now >= Date.parse(event.ends_at)) return null;
    const landedAt = spawnAt + fallMs;
    if (now < landedAt) {
      const p = Math.max(0, Math.min(1, (now - spawnAt) / fallMs)); const eased = 1 - Math.pow(1 - p, 3);
      return { falling: true, landed: false, x: Number(pickup.x) + Math.sin((now + pickup.id * 97) / 180) * 8 * (1 - p), y: Number(pickup.y) - 280 * (1 - eased), progress: p };
    }
    return { falling: false, landed: true, x: Number(pickup.x), y: Number(pickup.y) + Math.sin((now + pickup.id * 113) / 260) * 2, progress: 1 };
  }
  function pickupStyle(points) {
    if (points >= 100) return { fill: '#ffd96a', stroke: '#fff1a6', text: '#563800', scale: 1.35 };
    if (points >= 50) return { fill: '#80f2bc', stroke: '#d9ffe8', text: '#063b28', scale: 1.18 };
    if (points >= 25) return { fill: '#62ddf2', stroke: '#d8f9ff', text: '#06343d', scale: 1.08 };
    return { fill: '#d8f5e8', stroke: '#ffffff', text: '#153b31', scale: 1 };
  }
  function drawBill(ctx, x, y, pickup, alpha = 1) {
    const style = pickupStyle(Number(pickup.points || 0)), w = 36 * style.scale, h = 20 * style.scale;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(Math.sin((nowMs() + pickup.id * 53) / 190) * .08);
    ctx.shadowColor = 'rgba(88,241,230,.45)'; ctx.shadowBlur = 10; ctx.fillStyle = style.fill; ctx.strokeStyle = style.stroke; ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.shadowBlur = 0;
    ctx.fillStyle = style.text; ctx.font = `950 ${Math.round(10 * style.scale)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pickup.points >= 100 ? 'ATM!' : '$', 0, 0);
    ctx.restore();
  }
  function drawGround(ctx, args = {}) {
    if (args.map !== 'town' || !state.event || eventPhase() !== 'active') return;
    for (const pickup of state.event.pickups || []) {
      if (state.claimed.has(Number(pickup.id))) continue;
      const frame = pickupFrame(pickup); if (!frame?.landed) continue;
      ctx.save(); ctx.globalAlpha = .20; ctx.fillStyle = '#4ff1d8'; ctx.beginPath(); ctx.ellipse(Number(pickup.x), Number(pickup.y) + 7, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      drawBill(ctx, frame.x, frame.y - 9, pickup, .96);
    }
  }
  function drawAir(ctx, args = {}) {
    if (args.map !== 'town' || !state.event || eventPhase() !== 'active') return;
    for (const pickup of state.event.pickups || []) {
      if (state.claimed.has(Number(pickup.id))) continue;
      const frame = pickupFrame(pickup); if (!frame?.falling) continue;
      drawBill(ctx, frame.x, frame.y - 12, pickup, .82 + frame.progress * .18);
    }
  }

  async function claimPickup(pickup, player) {
    const id = Number(pickup.id); if (state.claiming.has(id) || state.claimed.has(id) || !state.event) return;
    if (typeof global.atmApiWithAuth !== 'function') {
      if (Date.now() - state.lastAuthWarning > 4000) { state.lastAuthWarning = Date.now(); toast('Sign in to collect World Event points.'); }
      return;
    }
    state.claiming.add(id);
    try {
      const data = await global.atmApiWithAuth('/api/world-time?action=claim-money-rain', { method: 'POST', body: JSON.stringify({ event_id: state.event.id, pickup_id: id, map: player.map, x: player.x, y: player.y }) });
      applyState(data); state.claimed.add(id);
      if (data.claimed) { state.myScore = Number(data.event?.my_score ?? state.myScore + Number(data.points || 0)); state.myPickups = Number(data.event?.my_pickups ?? state.myPickups + 1); toast(`+${Number(data.points || pickup.points || 0)} Money Rain points`, 1500); try { navigator.vibrate?.(25); } catch (_error) {} }
    } catch (error) {
      const message = String(error?.message || '');
      if (/already|no longer|ended|not currently active/i.test(message)) state.claimed.add(id);
      else if (/sign in/i.test(message) && Date.now() - state.lastAuthWarning > 4000) { state.lastAuthWarning = Date.now(); toast('Sign in to collect World Event points.'); }
      else console.warn('Money Rain pickup claim failed.', error);
    } finally { state.claiming.delete(id); }
  }
  function updateGameplay(player = {}) {
    if (!state.event || eventPhase() !== 'active' || player.map !== 'town') return;
    const now = Date.now(); if (now - state.lastClaimScan < CLAIM_SCAN_MS) return; state.lastClaimScan = now;
    const px = Number(player.x), py = Number(player.y); if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    for (const pickup of state.event.pickups || []) {
      const id = Number(pickup.id); if (state.claimed.has(id) || state.claiming.has(id)) continue;
      const frame = pickupFrame(pickup); if (!frame?.landed) continue;
      if (Math.hypot(px - Number(pickup.x), py - Number(pickup.y)) <= PICKUP_RADIUS) { claimPickup(pickup, { map: 'town', x: px, y: py }); break; }
    }
  }

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
