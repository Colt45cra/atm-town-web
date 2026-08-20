/* ATM Town v235.9.3 — Horde Sprite Grounding + Walk Animation
 *
 * The Horde uses one elected room combat authority over Supabase
 * Realtime. That authority alone advances zombie AI/HP/deaths and broadcasts
 * compact snapshots; every other client interpolates to the same state.
 * Weapon-fire packets are shared so every player sees the same firing effects.
 * This authority seam is intentionally replaceable by a dedicated server later
 * for PvP/rewarded combat without changing the approved controls/weapons.
 */
(function initializeATMZombieOutbreak(global) {
  'use strict';

  const EVENT_TYPE = 'zombie_outbreak';
  const MAX_AIM_OFFSET = 40 * Math.PI / 180;
  const PLAYER_HIT_RADIUS = 18;
  const DEFAULT_HORDE_HIT_RADIUS = 21;
  const DEFAULT_RANGE = 760;
  const SPREAD_RANGE = 560;
  const PICKUP_RADIUS = 42;
  const WALK_ANIM_FPS = 8;
  const PLAYER_GROUND_FOOT_OFFSET = 34;
  const FACING_ANGLE = Object.freeze({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 });
  const FACING_VECTOR = Object.freeze({ right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] });

  const HORDE_SHEETS = Object.freeze({
    gutter: Object.freeze({ src: 'assets/world-events/horde/gutter.png', cols: 3, rows: 4, rowOrder: ['down', 'left', 'up', 'right'], anchorX: 128, anchorY: 303, displayScale: 0.33, hitRadius: 21 }),
    handy: Object.freeze({ src: 'assets/world-events/horde/handy-man.png', cols: 3, rows: 4, rowOrder: ['down', 'left', 'up', 'right'], anchorX: 128, anchorY: 303, displayScale: 0.33, hitRadius: 21 }),
    beast: Object.freeze({ src: 'assets/world-events/horde/beast-man.png', cols: 3, rows: 4, rowOrder: ['down', 'left', 'up', 'right'], anchorX: 128, anchorY: 303, displayScale: 0.46, hitRadius: 32 }),
  });
  const hordeSheetImgs = {};
  for (const type in HORDE_SHEETS) {
    const img = new Image();
    img.decoding = 'async';
    img.src = HORDE_SHEETS[type].src;
    hordeSheetImgs[type] = img;
  }
  function hordeSheet(type) { return HORDE_SHEETS[type] || HORDE_SHEETS.gutter; }
  function zombieHitRadius(zombie) { return Number(zombie?.hitRadius || zombie?.hit_radius || hordeSheet(zombie?.type).hitRadius || DEFAULT_HORDE_HIT_RADIUS); }

  const state = {
    event: null,
    phase: 'none',
    eventId: '',
    zombies: [],
    weaponMode: 'default',
    kills: 0,
    hits: 0,
    shots: 0,
    aimActive: false,
    touchAimActive: false,
    aimRawX: 0,
    aimRawY: 1,
    aimX: 0,
    aimY: 1,
    bodyDir: 'down',
    movementMode: 'standing',
    fireTimer: 0,
    localPlayer: { x: 0, y: 0, map: '' },
    participants: [],
    mapBounds: null,
    isBlocked: null,
    defaultBullets: [],
    microStreaks: [],
    spreadTracers: [],
    muzzleFx: [],
    hitFx: [],
    pickupPulse: 0,
    lastFrameAt: 0,
    mouseFiring: false,
    mouseX: 0,
    mouseY: 0,
    controllerAim: false,
    localId: '',
    networkOnline: false,
    authorityId: '',
    snapshotSeq: 0,
    lastSnapshotSeq: -1,
    lastSnapshotAt: 0,
    lastSnapshotSendAt: 0,
    netFireSeq: 0,
    lastFireSeqByShooter: new Map(),
    rapidNetworkQueue: [],
    lastRapidNetworkFlushAt: 0,
  };

  function isZombieEvent(event = state.event) { return event?.type === EVENT_TYPE; }
  function isActiveTown() { return isZombieEvent() && state.phase === 'active' && state.localPlayer.map === 'town'; }
  function norm(x, y) {
    const m = Math.hypot(Number(x) || 0, Number(y) || 0);
    return m > 0.0001 ? [(Number(x) || 0) / m, (Number(y) || 0) / m, m] : [0, 0, 0];
  }
  function wrapAngle(a) {
    while (a <= -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }
  function nearestFacingForVector(x, y) {
    if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
    return y < 0 ? 'up' : 'down';
  }
  function clampAimToFacing(rawX, rawY, facing) {
    const rawAngle = Math.atan2(rawY, rawX);
    const center = FACING_ANGLE[facing] ?? 0;
    const offset = wrapAngle(rawAngle - center);
    const clamped = Math.max(-MAX_AIM_OFFSET, Math.min(MAX_AIM_OFFSET, offset));
    const angle = center + clamped;
    return [Math.cos(angle), Math.sin(angle), angle];
  }
  function eventElapsedMs() {
    if (!state.event?.starts_at) return 0;
    const serverNow = Date.now() + Number(global.ATMWorldEvents?.getState?.().serverOffsetMs || 0);
    return Math.max(0, serverNow - Date.parse(state.event.starts_at));
  }
  function spawned(zombie) { return eventElapsedMs() >= Number(zombie.spawn_offset_ms || 0); }

  function roundNet(value, places = 1) {
    const factor = places === 0 ? 1 : 10 ** places;
    return Math.round((Number(value) || 0) * factor) / factor;
  }
  function emitNetwork(kind, payload = {}) {
    if (!state.networkOnline || !state.localId || !state.eventId) return false;
    global.dispatchEvent(new CustomEvent('atm:zombie-network-send', {
      detail: {
        kind,
        eventId: state.eventId,
        senderId: state.localId,
        authorityId: state.authorityId,
        ...payload,
      },
    }));
    return true;
  }
  function candidateAuthorityId() {
    const ids = new Set();
    for (const participant of state.participants || []) {
      if (participant?.map !== 'town') continue;
      const id = String(participant.id || '');
      if (id) ids.add(id);
    }
    if (state.localPlayer.map === 'town' && state.localId) ids.add(state.localId);
    return [...ids].sort((a, b) => a.localeCompare(b))[0] || '';
  }
  function refreshAuthority() {
    if (!state.networkOnline) {
      state.authorityId = state.localId || 'offline';
      return true;
    }
    const candidate = candidateAuthorityId();
    const leaseFresh = Boolean(state.authorityId && state.authorityId !== state.localId && state.lastSnapshotAt && Date.now() - state.lastSnapshotAt < 1200);
    // Preserve a fresh lower-id remote authority even when this client has not
    // received that player's normal player_state yet. A genuinely lower local
    // candidate can still take over deterministically.
    if (leaseFresh && (!candidate || state.authorityId.localeCompare(candidate) < 0)) {
      return false;
    }
    if (candidate && candidate !== state.authorityId) {
      state.authorityId = candidate;
      state.lastSnapshotSendAt = 0;
    }
    return Boolean(state.localId && state.authorityId === state.localId);
  }
  function isAuthority() {
    return !state.networkOnline || Boolean(state.localId && state.authorityId === state.localId);
  }
  function shotRng(seed) {
    let x = (Number(seed) >>> 0) || 0x9E3779B9;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }
  function nextShotSeed() {
    state.netFireSeq = (state.netFireSeq + 1) >>> 0;
    const base = ((Date.now() & 0x7fffffff) ^ (state.netFireSeq * 2654435761)) >>> 0;
    return base || state.netFireSeq || 1;
  }
  function queueFirePacket(weapon, shot) {
    if (!state.networkOnline) return;
    if (weapon === 'rapid') {
      state.rapidNetworkQueue.push(shot);
      if (state.rapidNetworkQueue.length > 6) flushRapidNetwork(true);
      return;
    }
    emitNetwork('fire', {
      seq: ++state.netFireSeq,
      weapon,
      shots: [shot],
    });
  }
  function flushRapidNetwork(force = false) {
    if (!state.networkOnline || !state.rapidNetworkQueue.length) return;
    const now = performance.now();
    if (!force && now - state.lastRapidNetworkFlushAt < 72) return;
    const shots = state.rapidNetworkQueue.splice(0, 6);
    state.lastRapidNetworkFlushAt = now;
    emitNetwork('fire', {
      seq: ++state.netFireSeq,
      weapon: 'rapid',
      shots,
    });
  }

  function installUi() {
    if (document.getElementById('atmZombieAimStick')) return;
    const style = document.createElement('style');
    style.textContent = `
      #atmZombieAimStick{position:fixed;z-index:47;right:max(16px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));width:96px;height:96px;border-radius:50%;border:2px solid rgba(255,102,126,.46);background:rgba(33,8,16,.48);box-shadow:inset 0 0 0 10px rgba(255,255,255,.025),0 10px 30px rgba(0,0,0,.28);pointer-events:none;opacity:0;visibility:hidden;transition:opacity .14s ease;touch-action:none;-webkit-tap-highlight-color:transparent}
      #atmZombieAimKnob{position:absolute;left:50%;top:50%;width:38px;height:38px;margin:-19px;border-radius:50%;background:linear-gradient(145deg,#ff9cb3,#ff516f);box-shadow:0 6px 18px rgba(0,0,0,.35);transform:translate(0,0)}
      #atmZombieAimStick::after{content:'AIM / FIRE';position:absolute;left:50%;bottom:-18px;transform:translateX(-50%);white-space:nowrap;color:#ffb7c7;font:1000 8px/1 system-ui;letter-spacing:.05em;text-shadow:0 1px 4px #000}
      body.atm-zombie-combat-active #atmZombieAimStick{pointer-events:auto;opacity:1;visibility:visible}
      body.atm-zombie-combat-active #action.available{bottom:max(120px,calc(env(safe-area-inset-bottom) + 120px))!important}
      body.live-chat-open #atmZombieAimStick,body.atm-quick-chat-focus #atmZombieAimStick,body.locker-modal-open #atmZombieAimStick,body.directory-open #atmZombieAimStick,body.vending-modal-open #atmZombieAimStick,body.access-flow-open #atmZombieAimStick,body.sky-run-open #atmZombieAimStick,body.platform-panic-open #atmZombieAimStick,body.ring-rumble-open #atmZombieAimStick,body.flappy-jetpack-open #atmZombieAimStick,body.atm-darts-open #atmZombieAimStick{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
      @media(max-width:700px){#atmZombieAimStick{width:92px;height:92px;right:max(12px,env(safe-area-inset-right));bottom:max(13px,env(safe-area-inset-bottom))}#atmZombieAimKnob{width:36px;height:36px;margin:-18px}}
    `;
    document.head.appendChild(style);
    const stick = document.createElement('div');
    stick.id = 'atmZombieAimStick';
    stick.setAttribute('aria-label', 'Zombie Outbreak aim and fire control');
    stick.innerHTML = '<div id="atmZombieAimKnob"></div>';
    document.body.appendChild(stick);

    const knob = stick.querySelector('#atmZombieAimKnob');
    const pointer = { id: null };
    function vectorFromPointer(event) {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = event.clientX - cx, dy = event.clientY - cy;
      const max = r.width * .33, mag = Math.hypot(dx, dy);
      if (mag > max) { dx = dx / mag * max; dy = dy / mag * max; }
      const nx = dx / max, ny = dy / max;
      state.aimRawX = nx; state.aimRawY = ny;
      state.touchAimActive = Math.hypot(nx, ny) > .08;
      state.aimActive = state.touchAimActive;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    }
    function finish(event) {
      if (pointer.id !== null && event?.pointerId !== undefined && event.pointerId !== pointer.id) return;
      pointer.id = null; state.touchAimActive = false; state.aimActive = false; knob.style.transform = 'translate(0,0)';
    }
    stick.addEventListener('pointerdown', (event) => {
      if (!isActiveTown()) return;
      event.preventDefault(); event.stopPropagation();
      pointer.id = event.pointerId;
      try { stick.setPointerCapture(event.pointerId); } catch (_) {}
      vectorFromPointer(event);
    }, { passive: false });
    stick.addEventListener('pointermove', (event) => {
      if (pointer.id !== event.pointerId) return;
      event.preventDefault(); vectorFromPointer(event);
    }, { passive: false });
    stick.addEventListener('pointerup', finish);
    stick.addEventListener('pointercancel', finish);
    stick.addEventListener('lostpointercapture', finish);

    // Desktop: hold the mouse on the world to aim/fire toward the cursor.
    const game = document.getElementById('game');
    if (game) {
      game.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch' || !isActiveTown() || event.button !== 0) return;
        state.mouseFiring = true; state.mouseX = event.clientX; state.mouseY = event.clientY;
      });
      game.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        state.mouseX = event.clientX; state.mouseY = event.clientY;
      });
      global.addEventListener('pointerup', (event) => { if (event.pointerType !== 'touch') state.mouseFiring = false; });
    }
  }

  function cloneZombie(def) {
    const type = String(def.type || 'gutter');
    const sheet = hordeSheet(type);
    return {
      id: Number(def.id),
      type,
      spawnX: Number(def.x), spawnY: Number(def.y),
      x: Number(def.x), y: Number(def.y),
      netX: Number(def.x), netY: Number(def.y),
      hp: Number(def.hp || 10), maxHp: Number(def.hp || 10),
      speed: Number(def.speed || 58),
      points: Number(def.points || 10),
      scale: Number(def.scale || sheet.displayScale || 0.33),
      hitRadius: Number(def.hit_radius || sheet.hitRadius || DEFAULT_HORDE_HIT_RADIUS),
      spawn_offset_ms: Number(def.spawn_offset_ms || 0),
      dead: false, hitFlash: 0,
      dir: 'down', moving: false, animClock: 0,
    };
  }

  function syncEvent(event, phase) {
    installUi();
    const incomingId = isZombieEvent(event) ? String(event.id || '') : '';
    if (incomingId && incomingId !== state.eventId) {
      state.eventId = incomingId;
      state.event = event;
      state.zombies = (event.zombies || []).map(cloneZombie);
      state.weaponMode = 'default'; state.kills = 0; state.hits = 0; state.shots = 0;
      state.defaultBullets.length = 0; state.microStreaks.length = 0; state.spreadTracers.length = 0; state.muzzleFx.length = 0; state.hitFx.length = 0;
      state.bodyDir = 'down'; state.aimX = 0; state.aimY = 1; state.aimActive = false; state.touchAimActive = false;
      state.authorityId = ''; state.snapshotSeq = 0; state.lastSnapshotSeq = -1; state.lastSnapshotAt = 0; state.lastSnapshotSendAt = 0;
      state.lastFireSeqByShooter.clear(); state.rapidNetworkQueue.length = 0; state.lastRapidNetworkFlushAt = 0;
    } else if (incomingId) {
      state.event = event;
    } else if (state.eventId) {
      state.event = null; state.eventId = ''; state.zombies = []; state.aimActive = false; state.touchAimActive = false; state.weaponMode = 'default';
      state.authorityId = ''; state.lastSnapshotSeq = -1; state.lastSnapshotAt = 0; state.rapidNetworkQueue.length = 0;
    }
    state.phase = incomingId ? String(phase || event?.phase || 'none') : 'none';
    document.body.classList.toggle('atm-zombie-combat-active', isActiveTown());
  }

  function syncFromWorldEvents() {
    const snapshot = global.ATMWorldEvents?.getState?.();
    if (!snapshot) return false;
    const event = snapshot.event?.type === EVENT_TYPE ? snapshot.event : null;
    const incomingId = event ? String(event.id || '') : '';
    const phase = incomingId ? String(snapshot.phase || 'none') : 'none';
    if (incomingId !== state.eventId || phase !== state.phase || (incomingId && !state.event)) {
      syncEvent(event, phase);
      return true;
    }
    return false;
  }

  function setAimFromVector(rawX, rawY) {
    const [nx, ny, mag] = norm(rawX, rawY);
    if (mag <= .08) return false;
    state.bodyDir = nearestFacingForVector(nx, ny);
    const [ax, ay] = clampAimToFacing(nx, ny, state.bodyDir);
    state.aimX = ax; state.aimY = ay;
    return true;
  }

  function movementOverride(args = {}) {
    if (!isZombieEvent() || state.phase !== 'active' || args.map !== 'town' || !state.aimActive) return null;
    const [mx, my, mag] = norm(args.movementX, args.movementY);
    let movementMode = 'standing';
    if (mag > .08) {
      const [fx, fy] = FACING_VECTOR[state.bodyDir] || [0, 1];
      const dot = mx * fx + my * fy;
      movementMode = dot < -.35 ? 'backpedal' : dot > .35 ? 'forward' : 'strafe';
    }
    state.movementMode = movementMode;
    return { bodyDir: state.bodyDir, movementMode, animationDirection: movementMode === 'backpedal' ? -1 : 1 };
  }

  function nearestTargetForZombie(zombie) {
    let best = null, bestD = Infinity;
    for (const p of state.participants) {
      if (p.map !== 'town') continue;
      const x = Number(p.x), y = Number(p.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const d = Math.hypot(x - zombie.x, y - zombie.y);
      if (d < bestD) { bestD = d; best = { x, y, d }; }
    }
    return best;
  }

  function moveZombie(zombie, dt) {
    if (zombie.dead || !spawned(zombie)) return;
    const target = nearestTargetForZombie(zombie);
    if (!target || target.d < 30) { zombie.moving = false; zombie.animClock = 0; return; }
    const dx = (target.x - zombie.x) / target.d, dy = (target.y - zombie.y) / target.d;
    zombie.dir = nearestFacingForVector(dx, dy);
    const step = zombie.speed * dt;
    const nx = zombie.x + dx * step, ny = zombie.y + dy * step;
    const blocked = typeof state.isBlocked === 'function' ? state.isBlocked : null;
    let moved = false;
    if (!blocked || !blocked(nx, zombie.y)) { zombie.x = nx; moved = true; }
    else if (!blocked || !blocked(zombie.x - dy * step * .7, zombie.y)) { zombie.x -= dy * step * .7; moved = true; }
    if (!blocked || !blocked(zombie.x, ny)) { zombie.y = ny; moved = true; }
    else if (!blocked || !blocked(zombie.x, zombie.y + dx * step * .7)) { zombie.y += dx * step * .7; moved = true; }
    zombie.moving = moved;
    if (moved) zombie.animClock += dt * WALK_ANIM_FPS;
    else zombie.animClock = 0;
  }

  function rayObstacleDistance(ox, oy, dx, dy, maxDistance) {
    if (typeof state.isBlocked !== 'function') return maxDistance;
    const step = 24;
    for (let d = 42; d <= maxDistance; d += step) {
      if (state.isBlocked(ox + dx * d, oy + dy * d)) return Math.max(0, d - step * .55);
    }
    return maxDistance;
  }

  function hitZombieRay(ox, oy, dx, dy, maxDistance, damageAtDistance) {
    const wallDistance = rayObstacleDistance(ox, oy, dx, dy, maxDistance);
    let best = null, bestDistance = wallDistance;
    for (const zombie of state.zombies) {
      if (zombie.dead || !spawned(zombie)) continue;
      const tx = zombie.x - ox, ty = (zombie.y - 20) - oy;
      const proj = tx * dx + ty * dy;
      if (proj < 0 || proj > bestDistance) continue;
      const px = tx - dx * proj, py = ty - dy * proj;
      const hitRadius = zombieHitRadius(zombie);
      if (px * px + py * py <= hitRadius * hitRadius) { best = zombie; bestDistance = proj; }
    }
    if (best) {
      const damage = Math.max(.1, Number(damageAtDistance(bestDistance, maxDistance)) || 0);
      best.hp -= damage; best.hitFlash = .10; state.hits += 1;
      state.hitFx.push({ x: best.x, y: best.y - 22, life: .18, maxLife: .18 });
      if (best.hp <= 0) { best.hp = 0; best.dead = true; state.kills += 1; }
    }
    return { zombie: best, distance: bestDistance, wallDistance };
  }

  function rapidMaxRange() {
    const b = state.mapBounds;
    if (!b) return 5600;
    const width = Number(b.width || (b.maxX - b.minX) || 0), height = Number(b.height || (b.maxY - b.minY) || 0);
    return Math.max(1800, Math.hypot(width, height) + 180);
  }

  function addMicroVisual(ox, oy, angle, maxDistance, random = Math.random) {
    for (let i = 0; i < 4; i += 1) {
      const a = angle + (random() - .5) * (7 * Math.PI / 180);
      const speed = 5400 + random() * 2200;
      const life = Math.min(.72, Math.max(.18, maxDistance / speed));
      state.microStreaks.push({
        x: ox + Math.cos(a) * (16 + random() * 18),
        y: oy + Math.sin(a) * (16 + random() * 18),
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life, maxLife: life, length: 7 + random() * 9,
      });
    }
    if (state.microStreaks.length > 180) state.microStreaks.splice(0, state.microStreaks.length - 180);
  }

  function fireRapid(ox, oy, ax, ay, options = {}) {
    const random = shotRng(options.seed || nextShotSeed());
    const base = Math.atan2(ay, ax);
    const jitter = (random() - .5) * (8 * Math.PI / 180);
    const angle = base + jitter, dx = Math.cos(angle), dy = Math.sin(angle);
    const maxRange = rapidMaxRange();
    let visualDistance = maxRange;
    if (options.damage !== false) {
      const result = hitZombieRay(ox, oy, dx, dy, maxRange, (distance, range) => {
        const fullDamageUntil = range * .88;
        if (distance <= fullDamageUntil) return 2.2;
        const p = Math.min(1, (distance - fullDamageUntil) / Math.max(1, range - fullDamageUntil));
        return 2.2 - p * 1.1;
      });
      visualDistance = result.distance || maxRange;
    } else {
      visualDistance = rayObstacleDistance(ox, oy, dx, dy, maxRange);
    }
    addMicroVisual(ox, oy, angle, visualDistance, random);
    state.muzzleFx.push({ x: ox, y: oy, ax: dx, ay: dy, life: .055, maxLife: .055, kind: 'rapid' });
  }

  function fireSpread(ox, oy, ax, ay, options = {}) {
    const random = shotRng(options.seed || nextShotSeed());
    const base = Math.atan2(ay, ax);
    const pellets = 7, spreadHalf = 18 * Math.PI / 180;
    for (let i = 0; i < pellets; i += 1) {
      const t = pellets === 1 ? .5 : i / (pellets - 1);
      const a = base - spreadHalf + t * spreadHalf * 2 + (random() - .5) * (2.5 * Math.PI / 180);
      const dx = Math.cos(a), dy = Math.sin(a);
      let distance = rayObstacleDistance(ox, oy, dx, dy, SPREAD_RANGE);
      if (options.damage !== false) {
        const result = hitZombieRay(ox, oy, dx, dy, SPREAD_RANGE, (distance) => {
          if (distance <= 150) return 3.2;
          if (distance <= 280) return 2.2;
          const p = Math.min(1, (distance - 280) / (SPREAD_RANGE - 280));
          return 2.2 - p * 1.45;
        });
        distance = result.distance;
      }
      state.spreadTracers.push({
        x1: ox, y1: oy,
        x2: ox + dx * distance, y2: oy + dy * distance,
        life: .09, maxLife: .09,
      });
    }
    if (state.spreadTracers.length > 130) state.spreadTracers.splice(0, state.spreadTracers.length - 130);
    state.muzzleFx.push({ x: ox, y: oy, ax, ay, life: .08, maxLife: .08, kind: 'spread' });
  }

  function fireDefault(ox, oy, ax, ay, options = {}) {
    state.defaultBullets.push({
      x: ox + ax * 22, y: oy + ay * 22,
      vx: ax * 720, vy: ay * 720,
      life: DEFAULT_RANGE / 720,
      damage: 1.2,
      canDamage: options.damage !== false,
    });
    state.muzzleFx.push({ x: ox, y: oy, ax, ay, life: .06, maxLife: .06, kind: 'default' });
  }

  function applyWeaponShot(weapon, shot, damage = false) {
    const ox = Number(shot?.x), oy = Number(shot?.y);
    let [ax, ay, mag] = norm(shot?.ax, shot?.ay);
    if (!Number.isFinite(ox) || !Number.isFinite(oy) || mag <= .08) return;
    const seed = Number(shot?.seed) >>> 0;
    if (weapon === 'rapid') fireRapid(ox, oy, ax, ay, { damage, seed });
    else if (weapon === 'spread') fireSpread(ox, oy, ax, ay, { damage, seed });
    else fireDefault(ox, oy, ax, ay, { damage, seed });
  }

  function updateDefaultBullets(dt) {
    for (let i = state.defaultBullets.length - 1; i >= 0; i -= 1) {
      const b = state.defaultBullets[i], beforeX = b.x, beforeY = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let remove = b.life <= 0 || (typeof state.isBlocked === 'function' && state.isBlocked(b.x, b.y));
      if (!remove && b.canDamage) {
        for (const zombie of state.zombies) {
          if (zombie.dead || !spawned(zombie)) continue;
          const dx = b.x - zombie.x, dy = b.y - (zombie.y - 20);
          const hitRadius = zombieHitRadius(zombie);
          if (dx * dx + dy * dy <= hitRadius * hitRadius) {
            zombie.hp -= b.damage; zombie.hitFlash = .10; state.hits += 1;
            state.hitFx.push({ x: zombie.x, y: zombie.y - 22, life: .18, maxLife: .18 });
            if (zombie.hp <= 0) { zombie.hp = 0; zombie.dead = true; state.kills += 1; }
            remove = true; break;
          }
        }
      }
      if (remove) state.defaultBullets.splice(i, 1);
      else if (Math.hypot(b.x - beforeX, b.y - beforeY) > 1000) state.defaultBullets.splice(i, 1);
    }
  }

  function buildSnapshot() {
    return {
      kind: 'snapshot',
      seq: ++state.snapshotSeq,
      authorityId: state.authorityId,
      at: Date.now(),
      // Direction, moving state and walk phase ride with the authoritative
      // position snapshot so every client renders the same 3-frame walk cycle.
      zombies: state.zombies.map((z) => [z.id, roundNet(z.x), roundNet(z.y), roundNet(z.hp), z.dead ? 1 : 0, z.dir, z.moving ? 1 : 0, roundNet(z.animClock, 2)]),
    };
  }
  function sendSnapshot(force = false) {
    if (!state.networkOnline || !isAuthority() || !isZombieEvent() || state.phase !== 'active') return;
    const now = performance.now();
    if (!force && now - state.lastSnapshotSendAt < 125) return;
    state.lastSnapshotSendAt = now;
    emitNetwork('snapshot', buildSnapshot());
  }
  function applySnapshot(payload) {
    if (!payload || String(payload.eventId || '') !== state.eventId) return;
    const authorityId = String(payload.authorityId || payload.senderId || '');
    if (!authorityId) return;
    const candidate = candidateAuthorityId();
    if (candidate && authorityId !== candidate && state.lastSnapshotAt && Date.now() - state.lastSnapshotAt < 1200) return;
    const seq = Number(payload.seq);
    if (authorityId === state.authorityId && Number.isFinite(seq) && seq <= state.lastSnapshotSeq) return;
    state.authorityId = authorityId;
    state.lastSnapshotSeq = Number.isFinite(seq) ? seq : state.lastSnapshotSeq + 1;
    state.lastSnapshotAt = Date.now();
    const byId = new Map(state.zombies.map((z) => [Number(z.id), z]));
    for (const row of Array.isArray(payload.zombies) ? payload.zombies : []) {
      if (!Array.isArray(row) || row.length < 5) continue;
      const z = byId.get(Number(row[0]));
      if (!z) continue;
      const nx = Number(row[1]), ny = Number(row[2]), hp = Number(row[3]), dead = Boolean(row[4]);
      if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(hp)) continue;
      if (hp < z.hp - .05) {
        z.hitFlash = .10;
        state.hitFx.push({ x: nx, y: ny - 22, life: .14, maxLife: .14 });
      }
      const travelX = nx - Number(z.netX ?? z.x), travelY = ny - Number(z.netY ?? z.y);
      const snapshotDir = ['down', 'left', 'up', 'right'].includes(String(row[5])) ? String(row[5]) : '';
      const snapshotMoving = row.length >= 7 ? Boolean(row[6]) : Math.hypot(travelX, travelY) > .25;
      z.dir = snapshotDir || (snapshotMoving ? nearestFacingForVector(travelX, travelY) : z.dir);
      z.moving = snapshotMoving;
      if (Number.isFinite(Number(row[7]))) z.animClock = Number(row[7]);
      else if (!z.moving) z.animClock = 0;
      z.netX = nx; z.netY = ny; z.hp = Math.max(0, hp); z.dead = dead;
      if (Math.hypot(z.x - nx, z.y - ny) > 180) { z.x = nx; z.y = ny; }
    }
  }
  function updateFollowerZombies(dt) {
    const smoothing = Math.min(1, dt * 12);
    for (const z of state.zombies) {
      if (z.dead || !spawned(z)) continue;
      if (Number.isFinite(z.netX)) z.x += (z.netX - z.x) * smoothing;
      if (Number.isFinite(z.netY)) z.y += (z.netY - z.y) * smoothing;
      z.hitFlash = Math.max(0, z.hitFlash - dt);
      if (z.moving) z.animClock += dt * WALK_ANIM_FPS;
      else z.animClock = 0;
    }
  }
  function receiveNetwork(payload = {}) {
    if (!payload || String(payload.eventId || '') !== state.eventId || String(payload.senderId || '') === state.localId) return false;
    const kind = String(payload.kind || '');
    if (kind === 'snapshot') {
      applySnapshot(payload);
      return true;
    }
    if (kind === 'request_snapshot') {
      if (isAuthority()) sendSnapshot(true);
      return true;
    }
    if (kind !== 'fire') return false;

    const shooterId = String(payload.senderId || '');
    const seq = Number(payload.seq || 0);
    const last = Number(state.lastFireSeqByShooter.get(shooterId) || 0);
    if (seq && seq <= last) return true;
    if (seq) state.lastFireSeqByShooter.set(shooterId, seq);

    const weapon = payload.weapon === 'rapid' ? 'rapid' : payload.weapon === 'spread' ? 'spread' : 'default';
    for (const shot of Array.isArray(payload.shots) ? payload.shots : []) {
      applyWeaponShot(weapon, shot, isAuthority());
    }
    if (isAuthority()) sendSnapshot(true);
    return true;
  }
  function updateFx(dt) {
    for (const s of state.microStreaks) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    state.microStreaks = state.microStreaks.filter((s) => s.life > 0);
    for (const t of state.spreadTracers) t.life -= dt;
    state.spreadTracers = state.spreadTracers.filter((t) => t.life > 0);
    for (const m of state.muzzleFx) m.life -= dt;
    state.muzzleFx = state.muzzleFx.filter((m) => m.life > 0);
    for (const h of state.hitFx) h.life -= dt;
    state.hitFx = state.hitFx.filter((h) => h.life > 0);
  }

  function checkWeaponPickups() {
    if (!isActiveTown()) return;
    for (const pickup of state.event?.weapon_pickups || []) {
      const d = Math.hypot(state.localPlayer.x - Number(pickup.x), state.localPlayer.y - Number(pickup.y));
      if (d <= PICKUP_RADIUS && state.weaponMode !== pickup.type) {
        state.weaponMode = pickup.type === 'spread' ? 'spread' : 'rapid';
        state.pickupPulse = .35;
        try { navigator.vibrate?.(25); } catch (_) {}
        global.ATMWorldEvents?.toast?.(state.weaponMode === 'rapid' ? '⚡ RAPID MICRO acquired · extreme range' : '💥 SPREAD acquired · devastating up close', 2600);
      }
    }
  }

  function update(args = {}) {
    installUi();
    syncFromWorldEvents();
    const dt = Math.max(0, Math.min(.05, Number(args.dt || 0)));
    state.localId = String(args.localId || state.localId || '');
    state.networkOnline = Boolean(args.networkOnline);
    state.localPlayer = { id: state.localId, x: Number(args.x || 0), y: Number(args.y || 0), map: String(args.map || '') };
    state.participants = Array.isArray(args.participants) ? args.participants : [state.localPlayer];
    state.mapBounds = args.mapBounds || state.mapBounds;
    state.isBlocked = typeof args.isBlocked === 'function' ? args.isBlocked : state.isBlocked;
    document.body.classList.toggle('atm-zombie-combat-active', isActiveTown());

    if (!isActiveTown()) {
      state.aimActive = false; state.touchAimActive = false; state.controllerAim = false; state.mouseFiring = false;
      state.rapidNetworkQueue.length = 0;
      updateFx(dt); updateDefaultBullets(dt); return;
    }

    refreshAuthority();

    // Controller right stick becomes aim/fire during the combat event. Touch,
    // mouse, and controller keep independent active flags so releasing one input
    // can never leave the weapon stuck firing.
    const [gx, gy, gmag] = norm(args.controllerAimX, args.controllerAimY);
    state.controllerAim = gmag > .22;
    if (state.controllerAim) {
      state.aimRawX = gx; state.aimRawY = gy; state.aimActive = true;
    } else if (state.mouseFiring && typeof args.screenToWorld === 'function') {
      const point = args.screenToWorld(state.mouseX, state.mouseY);
      if (point) {
        state.aimRawX = Number(point.x) - state.localPlayer.x;
        state.aimRawY = Number(point.y) - (state.localPlayer.y - 28);
        state.aimActive = true;
      } else {
        state.aimActive = state.touchAimActive;
      }
    } else {
      state.aimActive = state.touchAimActive;
    }

    if (state.aimActive) {
      setAimFromVector(state.aimRawX, state.aimRawY);
    } else {
      const [mx, my, moveMag] = norm(args.movementX, args.movementY);
      if (moveMag > .08) {
        state.bodyDir = nearestFacingForVector(mx, my);
        const [fx, fy] = FACING_VECTOR[state.bodyDir] || [0, 1];
        state.aimX = fx; state.aimY = fy;
      }
      state.movementMode = 'standing';
    }

    // One elected town player is authoritative for all zombie movement/HP/deaths.
    // Everyone else only interpolates compact snapshots from that authority.
    if (isAuthority()) {
      for (const zombie of state.zombies) {
        moveZombie(zombie, dt);
        zombie.netX = zombie.x; zombie.netY = zombie.y;
        zombie.hitFlash = Math.max(0, zombie.hitFlash - dt);
      }
      sendSnapshot(false);
    } else {
      updateFollowerZombies(dt);
    }

    checkWeaponPickups();

    state.fireTimer = Math.max(0, state.fireTimer - dt);
    if (state.aimActive && state.fireTimer <= 0) {
      const ox = state.localPlayer.x, oy = state.localPlayer.y - 28;
      const weapon = state.weaponMode === 'rapid' ? 'rapid' : state.weaponMode === 'spread' ? 'spread' : 'default';
      const seed = nextShotSeed();
      const shot = {
        x: roundNet(ox), y: roundNet(oy),
        ax: roundNet(state.aimX, 3), ay: roundNet(state.aimY, 3),
        seed,
      };

      // Local response is immediate. Only the elected authority is allowed to
      // mutate zombie HP; non-authority shooters wait for the shared snapshot.
      applyWeaponShot(weapon, shot, isAuthority());

      if (state.networkOnline) queueFirePacket(weapon, shot);
      if (weapon === 'rapid') state.fireTimer = .038;
      else if (weapon === 'spread') state.fireTimer = .23;
      else state.fireTimer = .13;
      state.shots += 1;
    }

    flushRapidNetwork(false);
    updateDefaultBullets(dt);
    updateFx(dt);
    state.pickupPulse = Math.max(0, state.pickupPulse - dt);
  }

  function drawGround(ctx, args = {}) {
    if (!isZombieEvent() || state.phase !== 'active' || args.map !== 'town') return;
    const now = performance.now();
    for (const pickup of state.event?.weapon_pickups || []) {
      const rapid = pickup.type === 'rapid', active = state.weaponMode === pickup.type;
      const pulse = 1 + Math.sin(now * .005 + Number(pickup.id || 0)) * .06;
      ctx.save();
      ctx.translate(Number(pickup.x), Number(pickup.y));
      ctx.scale(pulse, pulse);
      ctx.shadowBlur = active ? 22 : 14;
      ctx.shadowColor = rapid ? 'rgba(88,241,230,.8)' : 'rgba(255,209,102,.8)';
      ctx.fillStyle = rapid ? 'rgba(24,114,118,.68)' : 'rgba(129,82,18,.72)';
      ctx.strokeStyle = rapid ? '#58f1e6' : '#ffd166';
      ctx.lineWidth = active ? 4 : 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.font = '1000 17px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(rapid ? 'R' : 'S', 0, 1);
      ctx.font = '900 8px system-ui'; ctx.fillStyle = rapid ? '#bafffb' : '#ffe7a8';
      ctx.fillText(rapid ? 'RAPID MICRO' : 'SPREAD', 0, 36);
      ctx.restore();
    }
  }

  function getDepthActors(args = {}) {
    if (!isZombieEvent() || state.phase !== 'active' || args.map !== 'town') return [];
    return state.zombies.filter((z) => !z.dead && spawned(z)).map((z) => ({ id: z.id, x: z.x, y: z.y, depth: z.y + 20, zombie: z }));
  }

  function drawActor(ctx, actor) {
    const z = actor?.zombie || actor;
    if (!z || z.dead) return;
    const sheet = hordeSheet(z.type);
    const image = hordeSheetImgs[z.type] || hordeSheetImgs.gutter;
    const hp = Math.max(0, z.hp / Math.max(1, z.maxHp));

    // Match drawPlayerSprite's coordinate contract exactly: actor x/y is the
    // movement/collision point, while the sprite is foot-anchored 34px lower.
    // Walking bob only exists while moving, so idle horde members stay planted
    // instead of continuously oscillating above their shadows.
    const bob = z.moving ? Math.abs(Math.sin(z.animClock * 1.2)) * 2.0 : 0;
    const groundFootY = Math.round(z.y + PLAYER_GROUND_FOOT_OFFSET - bob);
    let healthY = groundFootY + 13;

    ctx.save();
    if (image && image.complete && image.naturalWidth > 0) {
      const cols = sheet.cols || 3, rows = sheet.rows || 4;
      const frameW = Math.floor(image.naturalWidth / cols), frameH = Math.floor(image.naturalHeight / rows);
      const rowOrder = sheet.rowOrder || ['down', 'left', 'up', 'right'];
      const row = Math.max(0, rowOrder.indexOf(z.dir || 'down'));
      const frame = z.moving ? Math.floor(z.animClock) % 3 : 1;
      const scale = Number(z.scale || sheet.displayScale || 0.33);
      const anchorX = Number(sheet.anchorX || frameW / 2), anchorY = Number(sheet.anchorY || frameH - 1);
      const drawX = Math.round(z.x - anchorX * scale), drawY = Math.round(groundFootY - anchorY * scale);
      const dw = Math.round(frameW * scale), dh = Math.round(frameH * scale);

      // Same grounded ellipse placement/sizing used by playable characters.
      ctx.fillStyle = 'rgba(3,10,14,.24)';
      ctx.beginPath();
      ctx.ellipse(Math.round(z.x), groundFootY - 1, Math.max(14, Math.round(Math.max(26, dw * .50))), 9, 0, 0, Math.PI * 2);
      ctx.fill();

      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      if (z.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.min(0.45, z.hitFlash * 4);
        ctx.filter = 'brightness(1.65) saturate(0.2)';
        ctx.drawImage(image, frame * frameW, row * frameH, frameW, frameH, drawX, drawY, dw, dh);
        ctx.restore();
      }
      ctx.drawImage(image, frame * frameW, row * frameH, frameW, frameH, drawX, drawY, dw, dh);
      ctx.imageSmoothingEnabled = prevSmooth;
    } else {
      ctx.fillStyle = 'rgba(3,10,14,.24)';
      ctx.beginPath(); ctx.ellipse(Math.round(z.x), groundFootY - 1, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = z.hitFlash > 0 ? '#fff' : '#c73f4b'; ctx.strokeStyle = '#57161e'; ctx.lineWidth = 2;
      ctx.fillRect(z.x - 18, groundFootY - 42, 36, 42); ctx.strokeRect(z.x - 18, groundFootY - 42, 36, 42);
      ctx.fillStyle = '#fff'; ctx.font = '1000 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Z', z.x, groundFootY - 21);
    }
    const barW = z.type === 'beast' ? 52 : 38;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(z.x - barW / 2, healthY, barW, 5);
    ctx.fillStyle = hp > .5 ? '#70f9c8' : hp > .25 ? '#ffd166' : '#ff6d86'; ctx.fillRect(z.x - barW / 2, healthY, barW * hp, 5);
    ctx.restore();
  }

  function drawAir(ctx, args = {}) {
    if (!isZombieEvent() || state.phase !== 'active' || args.map !== 'town') return;
    for (const b of state.defaultBullets) {
      ctx.save(); ctx.fillStyle = '#ffe477'; ctx.shadowBlur = 6; ctx.shadowColor = '#ffe477'; ctx.beginPath(); ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const s of state.microStreaks) {
      const alpha = Math.max(0, s.life / s.maxLife), mag = Math.hypot(s.vx, s.vy) || 1, dx = s.vx / mag, dy = s.vy / mag;
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = 'rgba(171,255,250,.96)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x - dx * s.length, s.y - dy * s.length); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.restore();
    }
    for (const t of state.spreadTracers) {
      ctx.save(); ctx.globalAlpha = Math.max(0, t.life / t.maxLife); ctx.strokeStyle = 'rgba(255,213,106,.9)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke(); ctx.restore();
    }
    for (const m of state.muzzleFx) {
      const alpha = Math.max(0, m.life / m.maxLife);
      const max = Math.hypot(Number(m.ax)||0, Number(m.ay)||0) || 1;
      const maxX = (Number(m.ax)||0) / max, maxY = (Number(m.ay)||0) / max;
      ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = m.kind === 'rapid' ? '#8ffdf7' : m.kind === 'spread' ? '#ffd166' : '#fff0a8';
      ctx.beginPath(); ctx.arc(m.x + maxX * 26, m.y + maxY * 26, 5 + alpha * 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const h of state.hitFx) {
      const p = 1 - h.life / h.maxLife;
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, 7 + p * 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    // Weapon points inside the same ±40° body-facing cone used by the sample.
    if (isActiveTown()) {
      const ox = state.localPlayer.x, oy = state.localPlayer.y - 28;
      const angle = Math.atan2(state.aimY, state.aimX);
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(angle);
      ctx.fillStyle = state.weaponMode === 'rapid' ? '#8ffdf7' : state.weaponMode === 'spread' ? '#ffd166' : '#dffcff';
      ctx.strokeStyle = '#061a21'; ctx.lineWidth = 2; ctx.fillRect(4, -4, 30, 8); ctx.strokeRect(4, -4, 30, 8); ctx.restore();
    }
  }

  function getBroadcastState() {
    if (!isZombieEvent() || state.phase !== 'active') return null;
    return {
      active: true,
      eventId: state.eventId,
      weaponMode: state.weaponMode,
      bodyDir: state.bodyDir,
      aimX: Number(state.aimX || 0),
      aimY: Number(state.aimY || 1),
      aimActive: Boolean(state.aimActive),
    };
  }

  function drawRemoteWeapon(ctx, remote = {}) {
    const combat = remote?.zombieCombat;
    if (!combat?.active || !isZombieEvent() || state.phase !== 'active' || String(combat.eventId || '') !== state.eventId || remote.map !== 'town') return;
    const x = Number.isFinite(Number(remote.drawX)) ? Number(remote.drawX) : Number(remote.x);
    const y = Number.isFinite(Number(remote.drawY)) ? Number(remote.drawY) : Number(remote.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    let [ax, ay, mag] = norm(combat.aimX, combat.aimY);
    if (mag <= .08) {
      const facing = String(combat.bodyDir || remote.dir || 'down');
      [ax, ay] = FACING_VECTOR[facing] || [0, 1];
    }
    const weaponMode = combat.weaponMode === 'rapid' ? 'rapid' : combat.weaponMode === 'spread' ? 'spread' : 'default';
    const lift = Math.max(0, Number(remote.jump || 0));
    const ox = x, oy = y - 28 - lift;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(Math.atan2(ay, ax));
    ctx.fillStyle = weaponMode === 'rapid' ? '#8ffdf7' : weaponMode === 'spread' ? '#ffd166' : '#dffcff';
    ctx.strokeStyle = '#061a21'; ctx.lineWidth = 2;
    ctx.fillRect(4, -4, 30, 8); ctx.strokeRect(4, -4, 30, 8);
    ctx.restore();
  }

  function controllerOwnsRightStick() { return isActiveTown(); }
  function getStats() {
    return {
      active: isActiveTown(),
      eventId: state.eventId,
      kills: state.kills,
      hits: state.hits,
      shots: state.shots,
      weaponMode: state.weaponMode,
      bodyDir: state.bodyDir,
      movementMode: state.movementMode,
      networkOnline: state.networkOnline,
      authorityId: state.authorityId,
      isAuthority: isAuthority(),
      lastSnapshotAgeMs: state.lastSnapshotAt ? Date.now() - state.lastSnapshotAt : null,
    };
  }

  global.addEventListener('atm:world-event-state', (event) => {
    const detail = event?.detail || {};
    const incoming = detail.event?.type === EVENT_TYPE ? detail.event : null;
    syncEvent(incoming, incoming ? String(detail.phase || 'none') : 'none');
  });

  installUi();
  setTimeout(syncFromWorldEvents, 0);
  global.ATMZombieOutbreak = Object.freeze({
    syncEvent,
    update,
    movementOverride,
    drawGround,
    drawAir,
    getDepthActors,
    drawActor,
    drawRemoteWeapon,
    receiveNetwork,
    controllerOwnsRightStick,
    getBroadcastState,
    getStats,
  });
})(window);
