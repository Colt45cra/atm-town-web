(function initializeATMPropHunt(global) {
  'use strict';

  const EVENT_TYPE = 'prop_hunt';
  const TAG_RADIUS = 86;
  const TARGET_FRESH_MS = 3500;
  const UI_REFRESH_MS = 250;
  const state = {
    event: null,
    phase: 'none',
    localId: '',
    localName: '',
    localMap: '',
    localX: 0,
    localY: 0,
    remotePlayers: null,
    tagBusy: false,
    lastRoleKey: '',
    lastPhaseKey: '',
    lastWinnerId: '',
  };

  const PROPS = Object.freeze({
    town_directory: { id: 'town_directory', label: 'Town Directory Kiosk', src: 'assets/maps/town/foreground/day/assets_05_00.webp', scale: 1.0, shadow: 20, anchorX: 0.5 },
    token_market_board: { id: 'token_market_board', label: 'Token Market Board', src: 'assets/maps/town/foreground/day/assets_06_00.webp', scale: 1.0, shadow: 20, anchorX: 0.5 },
    atm_vend_blue: { id: 'atm_vend_blue', label: 'ATM Vend Machine', src: 'assets/maps/town/foreground/day/assets_08_00.webp', scale: 1.0, shadow: 18, anchorX: 0.5 },
    atm_vend_green: { id: 'atm_vend_green', label: 'ATM Vend Machine', src: 'assets/maps/town/foreground/day/assets_09_00.webp', scale: 1.0, shadow: 18, anchorX: 0.5 },
    street_lamp: { id: 'street_lamp', label: 'Street Lamp', src: 'assets/maps/town/foreground/day/assets_11_00.webp', scale: 1.0, shadow: 20, anchorX: 0.34 },
    bench: { id: 'bench', label: 'Bench', src: 'assets/maps/town/foreground/day/assets_18_00.webp', scale: 1.0, shadow: 26, anchorX: 0.5 },
  });
  const PROP_IDS = Object.freeze(Object.keys(PROPS));
  const propImageCache = new Map();

  function ensurePropImage(propId) {
    const definition = PROPS[propId];
    if (!definition) return null;
    if (propImageCache.has(propId)) return propImageCache.get(propId);
    const image = new Image();
    image.decoding = 'async';
    image.src = definition.src;
    propImageCache.set(propId, image);
    return image;
  }
  for (const id of PROP_IDS) ensurePropImage(id);



  function nowMs() {
    return Date.now() + Number(global.ATMWorldEvents?.getState?.().serverOffsetMs || 0);
  }
  function isPropHuntEvent(event = state.event) {
    return event?.type === EVENT_TYPE;
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function uniqueParticipants(list) {
    const out = [];
    const seen = new Set();
    for (const row of Array.isArray(list) ? list : []) {
      const sessionId = String(row?.session_id || '');
      if (!sessionId || seen.has(sessionId)) continue;
      seen.add(sessionId);
      out.push({
        session_id: sessionId,
        name: String(row?.name || 'ATM Player').slice(0, 30),
        character_id: String(row?.character_id || 'classic').slice(0, 40),
      });
    }
    return out;
  }
  function participants() {
    return uniqueParticipants(state.event?.participants);
  }
  function hunterId() {
    return String(state.event?.hunter_session_id || '');
  }
  function hideEndsAtMs() {
    const value = Date.parse(state.event?.hide_ends_at || '');
    return Number.isFinite(value) ? value : 0;
  }
  function roundPhase() {
    if (!isPropHuntEvent()) return 'none';
    if (state.phase !== 'active') return state.phase;
    return nowMs() < hideEndsAtMs() ? 'hide' : 'hunt';
  }
  function foundIds() {
    return new Set((Array.isArray(state.event?.found_session_ids) ? state.event.found_session_ids : []).map((value) => String(value || '')));
  }
  function participantEntry(sessionId) {
    return participants().find((row) => String(row.session_id) === String(sessionId)) || null;
  }
  function isParticipant(sessionId) {
    return !!participantEntry(sessionId);
  }
  function isHunter(sessionId) {
    return String(sessionId || '') && String(sessionId) === hunterId();
  }
  function isFound(sessionId) {
    return foundIds().has(String(sessionId || ''));
  }
  function isHider(sessionId) {
    return isParticipant(sessionId) && !isHunter(sessionId);
  }
  function isDisguisedProp(sessionId) {
    return isPropHuntEvent() && state.phase === 'active' && state.localMap === 'town' && isHider(sessionId) && !isFound(sessionId);
  }
  function remainingHiders() {
    const found = foundIds();
    return participants().filter((row) => row.session_id !== hunterId() && !found.has(String(row.session_id)));
  }
  function localRole() {
    if (!isPropHuntEvent() || !state.localId || !isParticipant(state.localId)) return 'spectator';
    if (isHunter(state.localId)) return 'hunter';
    if (isFound(state.localId)) return 'seeker';
    return 'prop';
  }
  function isSeeker(sessionId) {
    return isHunter(sessionId) || isFound(sessionId);
  }
  function assignedPropId(sessionId) {
    const raw = String(state.event?.prop_assignments?.[String(sessionId || '')] || '');
    return PROPS[raw] ? raw : PROP_IDS[Math.abs(hashCode(String(sessionId || ''))) % PROP_IDS.length];
  }
  function resolvedActorPropId(sessionId, networkState = null) {
    const remoteEventId = String(networkState?.eventId || '');
    const remotePropId = String(networkState?.propId || '');
    // The server assignment remains authoritative, but each player also sends
    // the exact disguise they are rendering. Preferring that matching-event
    // value guarantees remote clients cannot accidentally display a different
    // prop for the same player because of a stale roster/session-id race.
    if (remoteEventId && remoteEventId === String(state.event?.id || '') && PROPS[remotePropId]) return remotePropId;
    return assignedPropId(sessionId);
  }
  function hashCode(text) {
    let out = 0;
    for (let index = 0; index < text.length; index += 1) out = ((out << 5) - out + text.charCodeAt(index)) | 0;
    return out;
  }
  function winnerEntry() {
    const id = String(state.event?.winner_session_id || '');
    return id ? participantEntry(id) : null;
  }
  function hideRemainingMs() {
    return Math.max(0, hideEndsAtMs() - nowMs());
  }
  function huntRemainingMs() {
    const ends = Date.parse(state.event?.ends_at || '');
    return Math.max(0, (Number.isFinite(ends) ? ends : nowMs()) - nowMs());
  }
  function secondsLabel(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`;
  }
  function roleDescription() {
    const role = localRole();
    const phase = roundPhase();
    if (role === 'hunter') {
      if (phase === 'hide') return 'You are the Hunter. Give the props a moment to hide.';
      if (phase === 'hunt') return 'You are the Hunter. Tag disguised players in town.';
      return 'You are the Hunter.';
    }
    if (role === 'prop') {
      if (phase === 'hide') return 'You are disguised as a map prop. Hide before the hunt begins.';
      if (phase === 'hunt') return 'Stay hidden. If you are the last prop left, you win.';
      return 'You are a disguised prop.';
    }
    if (role === 'seeker') {
      if (phase === 'hunt') return 'You were found. You are now a Seeker — help tag the remaining props.';
      return 'You were found and joined the Seeker team.';
    }
    return 'You are spectating this Prop Hunt round.';
  }

  function installUi() {
    if (document.getElementById('atmPropHuntHud')) return;
    const style = document.createElement('style');
    style.textContent = `
      #atmPropHuntHud{position:fixed;z-index:88;right:max(12px,env(safe-area-inset-right));top:max(86px,calc(env(safe-area-inset-top) + 76px));width:min(220px,calc(100vw - 24px));display:none;font-family:system-ui,-apple-system,sans-serif;pointer-events:none;filter:drop-shadow(0 10px 20px rgba(0,0,0,.32))}
      #atmPropHuntHud.visible{display:block}
      #atmPropHuntHud .card{background:rgba(5,18,26,.92);border:1px solid rgba(255,214,102,.35);border-radius:14px;padding:10px 12px;color:#f7fbff;backdrop-filter:blur(10px)}
      #atmPropHuntHud .eyebrow{font-size:10px;font-weight:950;letter-spacing:.12em;color:#ffd166}
      #atmPropHuntHud .title{font-size:14px;font-weight:1000;margin-top:2px;line-height:1.25}
      #atmPropHuntHud .desc{font-size:11px;line-height:1.4;color:#c8d8df;margin-top:5px}
      @media(max-width:720px){#atmPropHuntHud{top:max(72px,calc(env(safe-area-inset-top) + 60px));width:min(196px,calc(100vw - 18px))}}
    `;
    document.head.appendChild(style);
    const hud = document.createElement('div');
    hud.id = 'atmPropHuntHud';
    hud.innerHTML = '<div class="card"><div class="eyebrow">PROP HUNT RESULT</div><div class="title"></div><div class="desc"></div></div>';
    document.body.appendChild(hud);
  }

  function renderUi() {
    installUi();
    const hud = document.getElementById('atmPropHuntHud');
    if (!hud) return;
    if (!isPropHuntEvent() || state.phase !== 'completed') { hud.classList.remove('visible'); return; }
    const title = hud.querySelector('.title');
    const desc = hud.querySelector('.desc');
    const winner = winnerEntry();
    if (title) title.textContent = winner ? `${winner.name} wins Prop Hunt` : 'Prop Hunt complete';
    if (desc) desc.textContent = winner ? `${winner.name} was the final prop found and wins the round.` : 'The Prop Hunt round has ended.';
    hud.classList.add('visible');
  }

  function maybeToastRoleChange() {
    if (!isPropHuntEvent()) return;
    const roleKey = `${state.event.id}:${localRole()}:${roundPhase()}`;
    if (roleKey === state.lastRoleKey) return;
    state.lastRoleKey = roleKey;
    const role = localRole();
    if (role === 'hunter') global.ATMWorldEvents?.toast?.('🕵️ YOU ARE THE HUNTER', 3200);
    else if (role === 'prop') global.ATMWorldEvents?.toast?.(`📦 YOU ARE A ${String(PROPS[assignedPropId(state.localId)]?.label || 'PROP').toUpperCase()}`, 3400);
    else if (role === 'seeker') global.ATMWorldEvents?.toast?.('🕵️ YOU WERE FOUND · NOW YOU ARE A SEEKER', 3000);
  }
  function maybeToastPhaseChange() {
    if (!isPropHuntEvent()) return;
    const phaseKey = `${state.event.id}:${state.phase}:${roundPhase()}`;
    if (phaseKey === state.lastPhaseKey) return;
    state.lastPhaseKey = phaseKey;
    const phase = roundPhase();
    if (state.phase === 'announced') global.ATMWorldEvents?.toast?.('📦 PROP HUNT STARTING · GET READY', 3200);
    else if (phase === 'hide') global.ATMWorldEvents?.toast?.('📦 PROP HUNT · HIDE NOW', 3200);
    else if (phase === 'hunt') global.ATMWorldEvents?.toast?.('🕵️ THE HUNT IS LIVE', 3200);
    else if (state.phase === 'completed') {
      const winner = winnerEntry();
      if (winner?.session_id && winner.session_id !== state.lastWinnerId) {
        state.lastWinnerId = winner.session_id;
        global.ATMWorldEvents?.toast?.(`🏆 PROP HUNT WINNER · ${winner.name}`, 4200);
      }
    }
  }

  function syncEvent(event, phase) {
    state.event = isPropHuntEvent(event) ? event : null;
    state.phase = state.event ? String(phase || event?.phase || 'none') : 'none';
    if (!state.event) {
      state.lastRoleKey = '';
      state.lastPhaseKey = '';
      state.lastWinnerId = '';
    }
    renderUi();
    maybeToastRoleChange();
    maybeToastPhaseChange();
  }

  function updateContext(context = {}) {
    state.localId = String(context.localId || state.localId || '');
    state.localName = String(context.localName || state.localName || '');
    state.localMap = String(context.localMap || state.localMap || '');
    state.localX = Number(context.localX ?? state.localX ?? 0);
    state.localY = Number(context.localY ?? state.localY ?? 0);
    state.remotePlayers = context.remotePlayers || state.remotePlayers;
    renderUi();
    maybeToastRoleChange();
    maybeToastPhaseChange();
  }

  function nearestTarget() {
    if (!isPropHuntEvent() || state.phase !== 'active' || roundPhase() !== 'hunt' || !isSeeker(state.localId) || state.localMap !== 'town') return null;
    let best = null;
    let bestDistance = TAG_RADIUS;
    const now = Date.now();
    const found = foundIds();
    for (const row of participants()) {
      const sessionId = String(row.session_id || '');
      if (!sessionId || sessionId === state.localId || sessionId === hunterId() || found.has(sessionId)) continue;
      const remote = state.remotePlayers?.get?.(sessionId) || null;
      if (!remote || String(remote.map || '') !== 'town' || now - Number(remote.lastSeen || 0) > TARGET_FRESH_MS) continue;
      const x = Number(remote.drawX ?? remote.x);
      const y = Number(remote.drawY ?? remote.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const distance = Math.hypot(state.localX - x, state.localY - y);
      if (distance >= bestDistance) continue;
      bestDistance = distance;
      best = {
        id: `prop-hunt:${sessionId}`,
        type: 'prop-hunt-target',
        name: row.name || 'Prop',
        text: `Tag ${row.name || 'this prop'} to reveal them.`,
        remoteId: sessionId,
        x,
        y,
        radius: TAG_RADIUS,
        propId: assignedPropId(sessionId),
      };
    }
    return best;
  }

  async function tagTarget(target) {
    if (!target || state.tagBusy || typeof global.atmApiWithAuth !== 'function' || !isPropHuntEvent()) return false;
    state.tagBusy = true;
    try {
      const data = await global.atmApiWithAuth('/api/world-time?action=tag-prop-hunt', {
        method: 'POST',
        body: JSON.stringify({
          event_id: state.event.id,
          seeker_session_id: state.localId,
          target_session_id: target.remoteId,
          map: state.localMap,
          x: state.localX,
          y: state.localY,
        }),
      });
      global.ATMWorldEvents?.applyExternalState?.(data, 'prop-hunt-tag');
      global.ATMWorldEvents?.toast?.(`✅ TAGGED ${String(target.name || 'PROP').toUpperCase()}`, 1800);
      return true;
    } catch (error) {
      global.ATMWorldEvents?.toast?.(`⚠️ ${error?.message || 'Tag failed.'}`, 2200);
      return false;
    } finally {
      state.tagBusy = false;
    }
  }

  function fallbackPropShape(ctx, x, y, alpha = 1, isLocal = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(3,10,14,.23)';
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y + 35), isLocal ? 18 : 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5de7dc';
    ctx.fillRect(Math.round(x - 16), Math.round(y - 8), 32, 32);
    ctx.restore();
  }

  function drawPropShape(ctx, propId, x, y, jumpAmount = 0, alpha = 1, isLocal = false) {
    const definition = PROPS[propId];
    const image = ensurePropImage(propId);
    const baseY = Math.round(y + 34 - Math.max(0, Number(jumpAmount) || 0));
    if (!definition || !image || !image.complete || !image.naturalWidth || !image.naturalHeight) {
      fallbackPropShape(ctx, x, baseY - 34, alpha, isLocal);
      return;
    }
    const scale = Number(definition.scale || 1);
    const drawW = Math.max(12, Math.round(image.naturalWidth * scale));
    const drawH = Math.max(12, Math.round(image.naturalHeight * scale));
    const anchorX = Number(definition.anchorX ?? 0.5);
    const drawX = Math.round(x - drawW * anchorX);
    const drawY = Math.round(baseY - drawH);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(3,10,14,.20)';
    ctx.beginPath();
    ctx.ellipse(Math.round(x), baseY + 1, Math.max(12, Math.round(Number(definition.shadow || 18))), 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (isLocal) {
      ctx.strokeStyle = 'rgba(102,247,189,.42)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(Math.round(x), Math.round(baseY - 12), Math.max(16, Math.round(Math.max(drawW * 0.22, 14))), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  function drawPlayerOverride(ctx, actor = {}) {
    const sessionId = String(actor.sessionId || '');
    if (!sessionId || !isPropHuntEvent() || state.phase !== 'active' || String(actor.map || '') !== 'town') return false;
    if (!isHider(sessionId) || isFound(sessionId)) return false;
    drawPropShape(ctx, resolvedActorPropId(sessionId, actor.propHunt), Number(actor.x || 0), Number(actor.y || 0), Number(actor.jumpAmount || 0), Number(actor.alpha ?? 1), !!actor.isLocal);
    return true;
  }

  function getBroadcastState() {
    if (!isPropHuntEvent() || state.phase !== 'active' || !state.localId || !isParticipant(state.localId)) return null;
    const role = localRole();
    return {
      eventId: String(state.event?.id || ''),
      role,
      propId: role === 'prop' ? assignedPropId(state.localId) : '',
    };
  }

  function getHudState() {
    if (!isPropHuntEvent()) return null;
    const phase = roundPhase();
    return {
      role: localRole(),
      remainingCount: remainingHiders().length,
      hunterName: participantEntry(hunterId())?.name || 'Hunter',
      winnerName: winnerEntry()?.name || '',
      phase,
      phaseLabel: phase === 'hide' ? `HIDE · ${secondsLabel(hideRemainingMs())}` : phase === 'hunt' ? `HUNT · ${secondsLabel(huntRemainingMs())}` : String(state.phase || '').toUpperCase(),
      roleLabel: localRole() === 'hunter' ? 'HUNTER' : localRole() === 'seeker' ? 'SEEKER' : localRole() === 'prop' ? 'PROP' : 'SPECTATOR',
    };
  }

  setInterval(renderUi, UI_REFRESH_MS);

  global.ATMPropHunt = Object.freeze({
    syncEvent,
    updateContext,
    drawPlayerOverride,
    nearestTarget,
    tagTarget,
    getHudState,
    getBroadcastState,
    getRole: localRole,
    getAssignedPropLabel: (sessionId) => PROPS[assignedPropId(sessionId)]?.label || 'Prop',
  });
})(window);
