import crypto from 'node:crypto';
import { MONEY_RAIN_SAFE_POINTS } from './world-event-money-rain-points.js';
import { bestEffortRegisterMoneyRainParticipant, settleCompletedMoneyRain } from './payload-money-rain.js';

const MONEY_RAIN_EVENT_TYPE = 'money_rain';
const ZOMBIE_EVENT_TYPE = 'zombie_outbreak';
const PROP_HUNT_EVENT_TYPE = 'prop_hunt';
const EVENT_SLOT = 'atm-town-world';
const COUNTDOWN_MS = 10_000;
const DURATION_MS = 45_000;
const ZOMBIE_COUNTDOWN_MS = 15_000;
const ZOMBIE_DURATION_MS = 90_000;
const ZOMBIE_COUNT = 60;
const PROP_HUNT_COUNTDOWN_MS = 15_000;
const PROP_HUNT_HIDE_MS = 20_000;
const PROP_HUNT_HUNT_MS = 120_000;
const PROP_HUNT_MIN_PLAYERS = 2;
const PROP_HUNT_MAX_PLAYERS = 12;
const RESULTS_WINDOW_MS = 25_000;
const START_COOLDOWN_MS = 45_000;
const MAX_CLAIM_DISTANCE = 84;
const MAX_BATCH_CLAIMS = 8;
const PICKUP_COUNT = 84;
const POOL_POINTS = 1000;
const HQ_CORE = Object.freeze({ map: 'hq', x: 771, y: 406, radius: 190 });
const PROP_HUNT_PROP_TYPES = Object.freeze(['atm_machine', 'bench', 'news_board', 'street_lamp', 'upgrade_board']);

const VALUE_POOL = Object.freeze([
  ...Array(25).fill(5),
  ...Array(50).fill(10),
  ...Array(5).fill(25),
  ...Array(3).fill(50),
  100,
]);

function badRequest(message) { return Object.assign(new Error(message), { status: 400 }); }
function conflict(message) { return Object.assign(new Error(message), { status: 409 }); }
function forbidden(message) { return Object.assign(new Error(message), { status: 403 }); }
function setupError(error) {
  if (error?.code === '42P01') return Object.assign(new Error('ATM Town v235 World Event tables are not installed yet. Run supabase/ATM-Town-v235.sql.'), { status: 503 });
  return error;
}
function asFinite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw badRequest(`${label} is invalid.`);
  return number;
}
function asUuid(value, label) {
  const text = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) throw badRequest(`${label} is invalid.`);
  return text;
}
function dropsToXrp(drops) {
  const value = BigInt(String(drops || '0'));
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}
function rng32(seed) {
  let x = (Number(seed) >>> 0) || 0xA7C15E3D;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
function shuffle(values, random) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function pointKey(point) { return `${point[0]},${point[1]}`; }
function distanceSq(a, b) {
  const dx = Number(a[0]) - Number(b[0]);
  const dy = Number(a[1]) - Number(b[1]);
  return dx * dx + dy * dy;
}
function chooseClusterCenters(pool, random, count) {
  const centers = [];
  const shuffled = shuffle(pool, random);
  for (const point of shuffled) {
    const minimum = 440 + Math.floor(random() * 110);
    if (centers.every((center) => distanceSq(point, center) >= minimum * minimum)) centers.push(point);
    if (centers.length >= count) break;
  }
  while (centers.length < count && shuffled.length) {
    const point = shuffled[Math.floor(random() * shuffled.length)];
    if (!centers.some((center) => pointKey(center) === pointKey(point))) centers.push(point);
  }
  return centers;
}
function allocateClusterCounts(clusterCount, total, random) {
  const counts = Array(clusterCount).fill(5);
  const weights = Array.from({ length: clusterCount }, () => 0.45 + Math.pow(random(), 1.35));
  for (let remaining = Math.max(0, total - counts.length * 5); remaining > 0; remaining -= 1) {
    const sum = weights.reduce((acc, value) => acc + value, 0);
    let roll = random() * sum;
    let chosen = weights.length - 1;
    for (let i = 0; i < weights.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) { chosen = i; break; }
    }
    counts[chosen] += 1;
  }
  return counts;
}
function buildOrganicLayout(random) {
  const pool = shuffle(MONEY_RAIN_SAFE_POINTS, random);
  const clusterCount = 4 + Math.floor(random() * 4);
  const clusteredTarget = 50 + Math.floor(random() * 9);
  const centers = chooseClusterCenters(pool, random, clusterCount);
  const counts = allocateClusterCounts(centers.length, clusteredTarget, random);
  const picked = [];
  const used = new Set();

  const addPoint = (point) => {
    const key = pointKey(point);
    if (used.has(key)) return false;
    used.add(key);
    picked.push(point);
    return true;
  };

  centers.forEach((center, index) => {
    const radius = 155 + Math.floor(random() * 205);
    const candidates = pool
      .filter((point) => !used.has(pointKey(point)) && distanceSq(point, center) <= radius * radius)
      .map((point) => {
        const normalizedDistance = Math.sqrt(distanceSq(point, center)) / radius;
        return { point, key: random() + normalizedDistance * 0.42 };
      })
      .sort((a, b) => a.key - b.key);
    for (const candidate of candidates.slice(0, counts[index])) addPoint(candidate.point);
  });

  // If a tiny/obstructed hotspot could not provide its target count, fill the
  // clustered portion from any safe point within an organic neighborhood of a
  // chosen hotspot. The source pool itself is non-grid-aligned.
  for (const point of pool) {
    if (picked.length >= clusteredTarget) break;
    if (used.has(pointKey(point))) continue;
    if (centers.some((center) => distanceSq(point, center) <= 430 * 430)) addPoint(point);
  }

  // The remainder are deliberately spread across the wider map. Prefer points
  // outside hotspot neighborhoods and away from other loose-scatter drops so
  // players still find money between the dense clumps instead of one giant pile.
  const scatterStart = picked.length;
  const scatterChosen = [];
  const tryScatter = (minimumHotspotDistance, minimumScatterDistance) => {
    for (const point of pool) {
      if (picked.length >= PICKUP_COUNT) break;
      if (used.has(pointKey(point))) continue;
      if (centers.some((center) => distanceSq(point, center) < minimumHotspotDistance * minimumHotspotDistance)) continue;
      if (scatterChosen.some((other) => distanceSq(point, other) < minimumScatterDistance * minimumScatterDistance)) continue;
      if (addPoint(point)) scatterChosen.push(point);
    }
  };
  tryScatter(330, 210);
  tryScatter(240, 155);
  tryScatter(150, 105);
  for (const point of pool) {
    if (picked.length >= PICKUP_COUNT) break;
    if (addPoint(point)) scatterChosen.push(point);
  }

  return {
    points: picked.slice(0, PICKUP_COUNT),
    cluster_count: centers.length,
    clustered_pickups: Math.min(scatterStart, PICKUP_COUNT),
    scatter_pickups: Math.max(0, PICKUP_COUNT - Math.min(scatterStart, PICKUP_COUNT)),
  };
}
function pickupPresentation(points) {
  if (points >= 100) return { kind: 'bag', rarity: 'jackpot' };
  if (points >= 50) return { kind: 'bundle', rarity: 'rare' };
  if (points >= 25) return { kind: 'bundle', rarity: 'uncommon' };
  return { kind: 'bill', rarity: 'common' };
}
export function buildMoneyRainManifest(seed) {
  const random = rng32(seed);
  const layout = buildOrganicLayout(random);
  const values = shuffle(VALUE_POOL, random);
  const pickups = layout.points.map((point, index) => {
    const presentation = pickupPresentation(values[index]);
    return {
      id: index + 1,
      x: point[0],
      y: point[1],
      points: values[index],
      kind: presentation.kind,
      rarity: presentation.rarity,
      placement: index < layout.clustered_pickups ? 'hotspot' : 'scatter',
      rotation: Math.round(((random() - 0.5) * 0.58) * 1000) / 1000,
      drift_px: 18 + Math.floor(random() * 39),
      fall_height: 900 + Math.floor(random() * 701),
      spawn_offset_ms: Math.floor(random() * 30_500),
      fall_ms: 2800 + Math.floor(random() * 1801),
    };
  });
  return { pickups, layout };
}

export function buildZombieOutbreakManifest(seed) {
  const random = rng32((Number(seed) >>> 0) ^ 0x5A17B1E);
  const pool = shuffle(MONEY_RAIN_SAFE_POINTS, random);
  const zombies = [];
  const used = new Set();
  const HORDE_VARIANTS = Object.freeze({
    gutter: Object.freeze({ type: 'gutter', hpMin: 10, hpMax: 14, speedMin: 50, speedMax: 68, points: 10, scale: 0.33, hit_radius: 21 }),
    handy: Object.freeze({ type: 'handy', hpMin: 12, hpMax: 17, speedMin: 46, speedMax: 62, points: 12, scale: 0.33, hit_radius: 21 }),
    beast: Object.freeze({ type: 'beast', hpMin: 42, hpMax: 56, speedMin: 34, speedMax: 46, points: 30, scale: 0.46, hit_radius: 32 }),
  });
  let beastBudget = Math.max(2, Math.round(ZOMBIE_COUNT * 0.12));
  function variantForIndex(index) {
    if (beastBudget > 0 && (index === 0 || random() < 0.12)) {
      beastBudget -= 1;
      return HORDE_VARIANTS.beast;
    }
    return random() < 0.5 ? HORDE_VARIANTS.gutter : HORDE_VARIANTS.handy;
  }
  function spawnZombie(point) {
    const variant = variantForIndex(zombies.length);
    const hp = variant.hpMin + Math.floor(random() * (variant.hpMax - variant.hpMin + 1));
    const speed = variant.speedMin + Math.floor(random() * (variant.speedMax - variant.speedMin + 1));
    zombies.push({
      id: zombies.length + 1,
      type: variant.type,
      x: point[0],
      y: point[1],
      hp,
      speed,
      points: variant.points,
      scale: variant.scale,
      hit_radius: variant.hit_radius,
      spawn_offset_ms: Math.floor(random() * 36_000),
    });
  }
  for (const point of pool) {
    const key = pointKey(point);
    if (used.has(key)) continue;
    // Keep the first wave naturally spread across the authored walkable map.
    if (zombies.some((zombie) => distanceSq(point, [zombie.x, zombie.y]) < 145 * 145)) continue;
    used.add(key);
    spawnZombie(point);
    if (zombies.length >= ZOMBIE_COUNT) break;
  }
  // Safe-point sets can evolve with the streamed world. Never fail event launch
  // just because the spacing pass could not fill every slot.
  for (const point of pool) {
    if (zombies.length >= ZOMBIE_COUNT) break;
    const key = pointKey(point);
    if (used.has(key)) continue;
    used.add(key);
    spawnZombie(point);
  }

  const pickupCandidates = pool.filter((point) => !used.has(pointKey(point)));
  const weaponPickups = [];
  const pickupTypes = ['rapid', 'spread', 'rapid', 'spread'];
  for (const type of pickupTypes) {
    let chosen = null;
    for (const point of pickupCandidates) {
      if (weaponPickups.every((pickup) => distanceSq(point, [pickup.x, pickup.y]) >= 620 * 620)) {
        chosen = point;
        break;
      }
    }
    if (!chosen) chosen = pickupCandidates.find((point) => !weaponPickups.some((pickup) => pickup.x === point[0] && pickup.y === point[1]));
    if (!chosen) break;
    const candidateIndex = pickupCandidates.indexOf(chosen);
    if (candidateIndex >= 0) pickupCandidates.splice(candidateIndex, 1);
    weaponPickups.push({ id: weaponPickups.length + 1, type, x: chosen[0], y: chosen[1] });
  }
  return { zombies, weapon_pickups: weaponPickups };
}

function normalizePropHuntParticipants(body = {}) {
  const input = Array.isArray(body.participants) ? body.participants : [];
  const seen = new Set();
  const participants = [];
  for (const row of input) {
    const sessionId = String(row?.session_id || '').trim();
    if (!sessionId || seen.has(sessionId)) continue;
    seen.add(sessionId);
    participants.push({
      session_id: sessionId.slice(0, 80),
      name: String(row?.name || 'ATM Player').trim().slice(0, 30) || 'ATM Player',
      character_id: String(row?.character_id || 'classic').trim().slice(0, 40) || 'classic',
    });
    if (participants.length >= PROP_HUNT_MAX_PLAYERS) break;
  }
  if (participants.length < PROP_HUNT_MIN_PLAYERS) throw badRequest('Prop Hunt needs at least 2 players in the lobby.');
  return participants;
}

export function buildPropHuntManifest(seed, participants = []) {
  const roster = normalizePropHuntParticipants({ participants });
  const random = rng32((Number(seed) >>> 0) ^ 0x19af46d3);
  const ordered = shuffle(roster, random);
  const hunter = ordered[0];
  const props = shuffle(PROP_HUNT_PROP_TYPES, random);
  const propAssignments = {};
  let propIndex = 0;
  for (const participant of ordered) {
    if (participant.session_id === hunter.session_id) continue;
    propAssignments[participant.session_id] = props[propIndex % props.length];
    propIndex += 1;
  }
  return {
    participants: roster,
    hunter_session_id: hunter.session_id,
    prop_assignments: propAssignments,
  };
}

function propHuntWinnerId(config = {}) {
  const participants = Array.isArray(config.participants) ? config.participants : [];
  const hunterId = String(config.hunter_session_id || '');
  const found = new Set((Array.isArray(config.found_session_ids) ? config.found_session_ids : []).map((value) => String(value || '')));
  const remaining = participants.filter((row) => row && String(row.session_id || '') && String(row.session_id) !== hunterId && !found.has(String(row.session_id)));
  if (config.winner_session_id) return String(config.winner_session_id);
  if (!remaining.length) {
    const order = Array.isArray(config.elimination_order) ? config.elimination_order : [];
    return order.length ? String(order[order.length - 1] || '') : '';
  }
  return '';
}

function normalizeSponsorChoice(body, sponsorName, sponsorHandle) {
  const requested = String(body.sponsor_mode || 'player').toLowerCase();
  const mode = requested === 'brand' ? 'brand' : 'player';
  if (mode === 'player') {
    return {
      mode,
      label: sponsorHandle ? `@${sponsorHandle}` : sponsorName,
    };
  }
  const label = String(body.sponsor_label || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (label.length < 2 || label.length > 32) throw badRequest('Project / brand name must be 2–32 characters.');
  if (/[\u0000-\u001f\u007f]/.test(label) || /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|app)\b)/i.test(label)) {
    throw badRequest('Use a project or brand name, not a URL.');
  }
  return { mode, label };
}
function eventPhase(row, nowMs = Date.now()) {
  if (!row) return 'none';
  const starts = Date.parse(row.starts_at), ends = Date.parse(row.ends_at);
  if (nowMs < starts) return 'announced';
  if (nowMs < ends) return 'active';
  return 'completed';
}
async function syncExpired(admin, nowIso = new Date().toISOString()) {
  const { error } = await admin.from('world_events')
    .update({ status: 'completed', completed_at: nowIso })
    .in('status', ['announced', 'active'])
    .lte('ends_at', nowIso);
  if (error) throw setupError(error);
}
async function maybeSyncLiveStatus(admin, row, nowMs) {
  const phase = eventPhase(row, nowMs);
  if (phase === 'active' && row.status === 'announced') {
    const { error } = await admin.from('world_events').update({ status: 'active' }).eq('id', row.id).eq('status', 'announced');
    if (error) throw setupError(error);
    row.status = 'active';
  }
  return phase;
}
async function readRecentEvent(admin) {
  const now = Date.now();
  await syncExpired(admin, new Date(now).toISOString());
  const { data, error } = await admin.from('world_events')
    .select('id,event_type,status,slot,sponsor_user_id,sponsor_display_name,sponsor_handle,seed,starts_at,ends_at,config,created_at,completed_at')
    .eq('slot', EVENT_SLOT)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw setupError(error);
  if (!data) return null;
  // Always return the latest row here so server-side payout/retirement work can
  // continue after the short results presentation window. getWorldEventState()
  // decides separately whether the player should still see the event HUD.
  await maybeSyncLiveStatus(admin, data, now);
  return data;
}
async function claimsForEvent(admin, eventId) {
  const { data, error } = await admin.from('world_event_claims')
    .select('pickup_id,user_id,points,claimed_at')
    .eq('event_id', eventId)
    .order('claimed_at', { ascending: true });
  if (error) throw setupError(error);
  return data || [];
}
async function eventLeaders(admin, claims) {
  const totals = new Map();
  for (const claim of claims) {
    const current = totals.get(claim.user_id) || { user_id: claim.user_id, points: 0, pickups: 0 };
    current.points += Number(claim.points || 0); current.pickups += 1; totals.set(claim.user_id, current);
  }
  // v235.2: Money Rain is not winner-take-all. Keep every participant in the
  // finalized result set so Payload can later settle exactly what each player collected.
  const ranked = [...totals.values()].sort((a, b) => b.points - a.points || b.pickups - a.pickups);
  if (!ranked.length) return [];
  const ids = ranked.map((row) => row.user_id);
  const [{ data: players, error: playerError }, { data: profiles, error: profileError }] = await Promise.all([
    admin.from('player_accounts').select('user_id,display_name,selected_character').in('user_id', ids),
    admin.from('atm_pay_profiles').select('user_id,handle').in('user_id', ids),
  ]);
  if (playerError) throw playerError;
  // ATM Pay profiles may not be installed for a legacy/guest account. Event
  // results still work with display names if the profile query is unavailable.
  const profileRows = profileError ? [] : (profiles || []);
  const playerMap = new Map((players || []).map((row) => [row.user_id, row]));
  const profileMap = new Map(profileRows.map((row) => [row.user_id, row]));
  return ranked.map((row, index) => ({
    // user_id stays server-side inside this result object; publicEvent strips it.
    user_id: row.user_id,
    rank: index + 1,
    display_name: String(playerMap.get(row.user_id)?.display_name || 'ATM Player').slice(0, 30),
    handle: String(profileMap.get(row.user_id)?.handle || ''),
    character_id: String(playerMap.get(row.user_id)?.selected_character || 'classic').slice(0, 40),
    points: row.points,
    pickups: row.pickups,
  }));
}
function publicEvent(row, claims, leaders, userId = null) {
  if (!row) return null;
  const now = Date.now();
  const config = row.config && typeof row.config === 'object' ? row.config : {};
  if (row.event_type === ZOMBIE_EVENT_TYPE) {
    return {
      id: row.id,
      type: row.event_type,
      phase: eventPhase(row, now),
      sponsor: {
        display_name: row.sponsor_display_name,
        handle: row.sponsor_handle || '',
        mode: 'player',
        label: row.sponsor_handle ? `@${row.sponsor_handle}` : row.sponsor_display_name || 'ATM Town player',
      },
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      combat_preview: true,
      sync_model: 'supabase_realtime_elected_authority',
      zombie_count: Number(config.zombie_count || 0),
      zombies: Array.isArray(config.zombies) ? config.zombies : [],
      weapon_pickups: Array.isArray(config.weapon_pickups) ? config.weapon_pickups : [],
      server_time_ms: now,
    };
  }
  if (row.event_type === PROP_HUNT_EVENT_TYPE) {
    const foundSessionIds = Array.isArray(config.found_session_ids) ? config.found_session_ids.map((value) => String(value || '')) : [];
    const participantRows = Array.isArray(config.participants) ? config.participants : [];
    const hunterSessionId = String(config.hunter_session_id || '');
    const remainingProps = participantRows.filter((row) => row && String(row.session_id || '') && String(row.session_id) !== hunterSessionId && !foundSessionIds.includes(String(row.session_id)));
    const winnerSessionId = propHuntWinnerId(config);
    return {
      id: row.id,
      type: row.event_type,
      phase: eventPhase(row, now),
      sponsor: {
        display_name: row.sponsor_display_name,
        handle: row.sponsor_handle || '',
        mode: 'player',
        label: row.sponsor_handle ? `@${row.sponsor_handle}` : row.sponsor_display_name || 'ATM Town player',
      },
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      hide_ends_at: String(config.hide_ends_at || row.starts_at),
      participants: participantRows,
      hunter_session_id: hunterSessionId,
      prop_assignments: config.prop_assignments && typeof config.prop_assignments === 'object' ? config.prop_assignments : {},
      found_session_ids: foundSessionIds,
      seeker_session_ids: [hunterSessionId, ...foundSessionIds].filter(Boolean),
      elimination_order: Array.isArray(config.elimination_order) ? config.elimination_order.map((value) => String(value || '')) : [],
      remaining_prop_count: remainingProps.length,
      winner_session_id: winnerSessionId,
      round_hint: 'last_prop_found',
      server_time_ms: now,
    };
  }
  const rewardSettlement = Boolean(config.reward_settlement);
  const rewardPointDrops = BigInt(String(config.reward_point_drops || '0'));
  const myClaims = userId ? claims.filter((claim) => claim.user_id === userId) : [];
  const poolPoints = Number(config.pool_points || 1000);
  const claimedPoints = claims.reduce((sum, claim) => sum + Number(claim.points || 0), 0);
  const myResult = userId ? leaders.find((leader) => leader.user_id === userId) || null : null;
  const publicLeaders = leaders.map(({ user_id: _userId, ...leader }) => ({
    ...leader,
    ...(rewardSettlement && rewardPointDrops > 0n
      ? { reward_amount_xrp: dropsToXrp(BigInt(Number(leader.points || 0)) * rewardPointDrops) }
      : {}),
  }));
  const myPoints = myClaims.reduce((sum, claim) => sum + Number(claim.points || 0), 0);
  const payloadState = config.payload && typeof config.payload === 'object' ? config.payload : {};
  return {
    id: row.id,
    type: row.event_type,
    phase: eventPhase(row, now),
    sponsor: {
      display_name: row.sponsor_display_name,
      handle: row.sponsor_handle || '',
      mode: String(config.sponsor_mode || 'player'),
      label: String(config.sponsor_label || (row.sponsor_handle ? `@${row.sponsor_handle}` : row.sponsor_display_name || 'ATM Town player')),
    },
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    reward_settlement: rewardSettlement,
    reward_asset: rewardSettlement ? 'XRP' : null,
    reward_pool_xrp: rewardSettlement ? String(config.reward_pool_xrp || '') : null,
    reward_point_value_xrp: rewardSettlement && rewardPointDrops > 0n ? dropsToXrp(rewardPointDrops) : null,
    settlement_status: rewardSettlement ? String(payloadState.settlement_status || 'funded') : 'preview',
    settlement_error: rewardSettlement && payloadState.settlement_error ? String(payloadState.settlement_error).slice(0, 220) : null,
    reserve_recovery_status: rewardSettlement ? String(payloadState.retirement_status || '') : '',
    reserve_recovery_error: rewardSettlement && payloadState.retirement_error ? String(payloadState.retirement_error).slice(0, 220) : null,
    ...(rewardSettlement && userId && String(userId) === String(row.sponsor_user_id) ? {
      is_sponsor: true,
      immediate_refund_xrp: payloadState.immediate_refund_amount ? String(payloadState.immediate_refund_amount) : null,
      immediate_refund_tx_hash: payloadState.immediate_refund_tx_hash ? String(payloadState.immediate_refund_tx_hash) : null,
      reserve_recovery_xrp: payloadState.retirement_recovered_amount ? String(payloadState.retirement_recovered_amount) : null,
      reserve_recovery_fee_xrp: payloadState.retirement_fee_amount ? String(payloadState.retirement_fee_amount) : null,
      reserve_recovery_tx_hash: payloadState.retirement_tx_hash ? String(payloadState.retirement_tx_hash) : null,
      reserve_recovery_eligible_ledger: Number.isSafeInteger(Number(payloadState.retirement_eligible_ledger)) ? Number(payloadState.retirement_eligible_ledger) : null,
    } : { is_sponsor: false }),
    settlement_basis: 'collected_points',
    unclaimed_policy: 'sponsor_remainder',
    pool_points: poolPoints,
    pickups: Array.isArray(config.pickups) ? config.pickups : [],
    claimed_pickup_ids: claims.map((claim) => Number(claim.pickup_id)),
    claimed_points: claimedPoints,
    unclaimed_points: Math.max(0, poolPoints - claimedPoints),
    participant_count: leaders.length,
    personal_score_available: Boolean(userId),
    my_score: myPoints,
    my_reward_xrp: rewardSettlement && rewardPointDrops > 0n ? dropsToXrp(BigInt(myPoints) * rewardPointDrops) : null,
    my_pickups: myClaims.length,
    my_rank: myResult?.rank || null,
    leaders: publicLeaders,
    server_time_ms: now,
  };
}

export async function getWorldEventState(admin, userId = null) {
  let row = await readRecentEvent(admin);
  if (!row) return { server_time_ms: Date.now(), event: null };
  const claims = await claimsForEvent(admin, row.id);
  const leaders = await eventLeaders(admin, claims);
  const now = Date.now();
  if (row.event_type === MONEY_RAIN_EVENT_TYPE && eventPhase(row, now) === 'completed' && row.config?.reward_settlement) {
    row = await settleCompletedMoneyRain(admin, row, claims, leaders);
  }
  const endedAt = Date.parse(row.ends_at);
  const payloadState = row.config?.payload && typeof row.config.payload === 'object' ? row.config.payload : {};
  const settlementFinal = ['completed', 'cancelled'].includes(String(payloadState.settlement_status || ''));
  const retirementFinal = ['retired', 'blocked'].includes(String(payloadState.retirement_status || ''));
  const backgroundPending = row.event_type === MONEY_RAIN_EVENT_TYPE && Boolean(row.config?.reward_settlement) && (!settlementFinal || !retirementFinal);
  const addressable = !Number.isFinite(endedAt) || endedAt >= now - RESULTS_WINDOW_MS || backgroundPending;
  return { server_time_ms: Date.now(), event: addressable ? publicEvent(row, claims, leaders, userId) : null };
}

async function assertWorldEventLaunchContext(admin, body = {}, eventLabel = 'World Event') {
  const map = String(body.map || '');
  const x = asFinite(body.x, 'Player X');
  const y = asFinite(body.y, 'Player Y');
  if (map !== HQ_CORE.map || Math.hypot(x - HQ_CORE.x, y - HQ_CORE.y) > HQ_CORE.radius) {
    throw forbidden(`${eventLabel} can only be started from the ATM Command Core inside HQ.`);
  }
  const now = Date.now();
  await syncExpired(admin, new Date(now).toISOString());
  const { data: lastEvent, error: lastError } = await admin.from('world_events')
    .select('id,status,ends_at')
    .eq('slot', EVENT_SLOT)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw setupError(lastError);
  if (lastEvent && ['announced', 'active'].includes(lastEvent.status)) throw conflict('A world event is already running.');
  if (lastEvent && now < Date.parse(lastEvent.ends_at) + START_COOLDOWN_MS) {
    throw conflict('The World Event Engine is cooling down. Try again in a moment.');
  }
  return { map, x, y, now };
}

export async function assertMoneyRainLaunchContext(admin, body = {}) {
  return assertWorldEventLaunchContext(admin, body, 'Money Rain');
}

export async function resolveMoneyRainSponsor(admin, user, body = {}) {
  const [{ data: player, error: playerError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from('player_accounts').select('display_name').eq('user_id', user.id).maybeSingle(),
    admin.from('atm_pay_profiles').select('handle').eq('user_id', user.id).maybeSingle(),
  ]);
  if (playerError) throw playerError;
  const sponsorName = String(player?.display_name || user.email?.split('@')[0] || 'ATM Player').slice(0, 30);
  const sponsorHandle = profileError ? '' : String(profile?.handle || '').slice(0, 20);
  const sponsor = normalizeSponsorChoice(body, sponsorName, sponsorHandle);
  return { sponsorName, sponsorHandle, sponsor };
}

async function insertMoneyRain(admin, user, body = {}, settlement = null) {
  const { now } = await assertMoneyRainLaunchContext(admin, body);
  const { sponsorName, sponsorHandle, sponsor } = await resolveMoneyRainSponsor(admin, user, body);
  const seed = crypto.randomBytes(4).readUInt32BE(0);
  const startsAt = new Date(now + COUNTDOWN_MS);
  const endsAt = new Date(startsAt.getTime() + DURATION_MS);
  const generated = buildMoneyRainManifest(seed);
  const config = {
    schema_version: 3,
    pool_points: POOL_POINTS,
    pickup_count: PICKUP_COUNT,
    reward_settlement: Boolean(settlement),
    ...(settlement ? {
      reward_asset: 'XRP',
      reward_pool_xrp: String(settlement.pool_xrp),
      reward_point_drops: String(settlement.point_drops),
      payload: {
        integration_campaign_id: String(settlement.integration_campaign_id),
        external_campaign_id: String(settlement.external_campaign_id),
        funding_tx_hash: settlement.funding_tx_hash ? String(settlement.funding_tx_hash).toUpperCase() : null,
        settlement_status: 'funded',
        next_action_at: 0,
      },
    } : {}),
    sponsor_mode: sponsor.mode,
    sponsor_label: sponsor.label,
    layout_strategy: 'organic_cluster_scatter_v3',
    cluster_count: generated.layout.cluster_count,
    clustered_pickups: generated.layout.clustered_pickups,
    scatter_pickups: generated.layout.scatter_pickups,
    pickups: generated.pickups,
  };
  const row = {
    id: settlement?.external_event_id ? asUuid(settlement.external_event_id, 'World event') : crypto.randomUUID(),
    event_type: MONEY_RAIN_EVENT_TYPE,
    status: 'announced',
    slot: EVENT_SLOT,
    sponsor_user_id: user.id,
    sponsor_display_name: sponsorName,
    sponsor_handle: sponsorHandle,
    seed,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    config,
  };
  const { error } = await admin.from('world_events').insert(row);
  if (error?.code === '23505') throw conflict('A world event is already running.');
  if (error) throw setupError(error);
  return getWorldEventState(admin, user.id);
}

export async function startMoneyRain(admin, user, body = {}) {
  return insertMoneyRain(admin, user, body, null);
}

export async function startZombieOutbreak(admin, user, body = {}) {
  const { now } = await assertWorldEventLaunchContext(admin, body, 'Zombie Outbreak');
  const { sponsorName, sponsorHandle } = await resolveMoneyRainSponsor(admin, user, { sponsor_mode: 'player' });
  const seed = crypto.randomBytes(4).readUInt32BE(0);
  const startsAt = new Date(now + ZOMBIE_COUNTDOWN_MS);
  const endsAt = new Date(startsAt.getTime() + ZOMBIE_DURATION_MS);
  const generated = buildZombieOutbreakManifest(seed);
  const row = {
    id: crypto.randomUUID(),
    event_type: ZOMBIE_EVENT_TYPE,
    status: 'announced',
    slot: EVENT_SLOT,
    sponsor_user_id: user.id,
    sponsor_display_name: sponsorName,
    sponsor_handle: sponsorHandle,
    seed,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    config: {
      schema_version: 1,
      combat_preview: true,
      sync_model: 'supabase_realtime_elected_authority',
      zombie_count: generated.zombies.length,
      zombies: generated.zombies,
      weapon_pickups: generated.weapon_pickups,
      weapons: {
        default: { range_px: 760 },
        rapid: { range: 'map_edge', extreme_falloff: true },
        spread: { role: 'close_range_power' },
      },
    },
  };
  const { error } = await admin.from('world_events').insert(row);
  if (error?.code === '23505') throw conflict('A world event is already running.');
  if (error) throw setupError(error);
  return getWorldEventState(admin, user.id);
}

export async function startPropHunt(admin, user, body = {}) {
  const { now } = await assertWorldEventLaunchContext(admin, body, 'Prop Hunt');
  const { sponsorName, sponsorHandle } = await resolveMoneyRainSponsor(admin, user, { sponsor_mode: 'player' });
  const participants = normalizePropHuntParticipants(body);
  const seed = crypto.randomBytes(4).readUInt32BE(0);
  const startsAt = new Date(now + PROP_HUNT_COUNTDOWN_MS);
  const hideEndsAt = new Date(startsAt.getTime() + PROP_HUNT_HIDE_MS);
  const endsAt = new Date(hideEndsAt.getTime() + PROP_HUNT_HUNT_MS);
  const generated = buildPropHuntManifest(seed, participants);
  const row = {
    id: crypto.randomUUID(),
    event_type: PROP_HUNT_EVENT_TYPE,
    status: 'announced',
    slot: EVENT_SLOT,
    sponsor_user_id: user.id,
    sponsor_display_name: sponsorName,
    sponsor_handle: sponsorHandle,
    seed,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    config: {
      schema_version: 1,
      playfield_map: 'town',
      countdown_ms: PROP_HUNT_COUNTDOWN_MS,
      hide_ms: PROP_HUNT_HIDE_MS,
      hunt_ms: PROP_HUNT_HUNT_MS,
      hide_ends_at: hideEndsAt.toISOString(),
      participants: generated.participants,
      hunter_session_id: generated.hunter_session_id,
      prop_assignments: generated.prop_assignments,
      found_session_ids: [],
      elimination_order: [],
      winner_session_id: '',
    },
  };
  const { error } = await admin.from('world_events').insert(row);
  if (error?.code === '23505') throw conflict('A world event is already running.');
  if (error) throw setupError(error);
  return getWorldEventState(admin, user.id);
}

export async function tagPropHuntPlayer(admin, user, body = {}) {
  const eventId = asUuid(body.event_id, 'World event');
  const seekerSessionId = String(body.seeker_session_id || body.hunter_session_id || '').trim();
  const targetSessionId = String(body.target_session_id || '').trim();
  const map = String(body.map || '');
  if (!seekerSessionId || !targetSessionId) throw badRequest('Prop Hunt target request is invalid.');
  if (map !== 'town') throw conflict('Prop Hunt tags only count in the outdoor town.');
  const { data: row, error } = await admin.from('world_events')
    .select('id,event_type,status,starts_at,ends_at,config')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw setupError(error);
  if (!row || row.event_type !== PROP_HUNT_EVENT_TYPE) throw conflict('That Prop Hunt event is no longer available.');
  const now = Date.now();
  if (eventPhase(row, now) !== 'active') throw conflict('Prop Hunt is not currently active.');
  const config = row.config && typeof row.config === 'object' ? row.config : {};
  const hideEndsAt = Date.parse(String(config.hide_ends_at || row.starts_at));
  if (Number.isFinite(hideEndsAt) && now < hideEndsAt) throw conflict('The hide phase is still active.');
  const participants = Array.isArray(config.participants) ? config.participants : [];
  const participantIds = new Set(participants.map((entry) => String(entry?.session_id || '')).filter(Boolean));
  if (!participantIds.has(seekerSessionId) || !participantIds.has(targetSessionId)) throw conflict('One of those players is not in this Prop Hunt round.');
  const originalHunterId = String(config.hunter_session_id || '');
  const foundSessionIds = Array.isArray(config.found_session_ids) ? config.found_session_ids.map((value) => String(value || '')) : [];
  const seekerIds = new Set([originalHunterId, ...foundSessionIds].filter(Boolean));
  if (!seekerIds.has(seekerSessionId)) throw forbidden('Only a Prop Hunt seeker can tag hidden props.');
  if (targetSessionId === seekerSessionId) throw conflict('A seeker cannot tag themselves.');
  if (foundSessionIds.includes(targetSessionId)) throw conflict('That prop was already found.');
  const eliminationOrder = Array.isArray(config.elimination_order) ? config.elimination_order.map((value) => String(value || '')) : [];
  const updatedFound = [...foundSessionIds, targetSessionId];
  const updatedOrder = eliminationOrder.includes(targetSessionId) ? eliminationOrder : [...eliminationOrder, targetSessionId];
  const remainingProps = participants.filter((entry) => {
    const sessionId = String(entry?.session_id || '');
    return sessionId && sessionId !== originalHunterId && !updatedFound.includes(sessionId);
  });
  let winnerSessionId = '';
  let nextEndsAt = row.ends_at;
  let nextStatus = row.status;
  let completedAt = null;
  if (remainingProps.length === 0) {
    // The final prop actually found wins the round. Every earlier found prop has
    // already joined the seeker team, so the hunt continues until the last tag.
    winnerSessionId = targetSessionId;
    nextEndsAt = new Date(now).toISOString();
    nextStatus = 'completed';
    completedAt = nextEndsAt;
  }
  const nextConfig = {
    ...config,
    found_session_ids: updatedFound,
    elimination_order: updatedOrder,
    winner_session_id: winnerSessionId,
  };
  const { error: updateError } = await admin.from('world_events')
    .update({ config: nextConfig, ends_at: nextEndsAt, status: nextStatus, completed_at: completedAt })
    .eq('id', row.id);
  if (updateError) throw setupError(updateError);
  return getWorldEventState(admin, user.id);
}

export async function startFundedMoneyRain(admin, user, body = {}, settlement = {}) {
  if (!settlement?.integration_campaign_id || !settlement?.external_campaign_id || !settlement?.external_event_id) {
    throw badRequest('Payload-funded Money Rain settlement data is incomplete.');
  }
  if (!/^\d+(?:\.\d{1,6})?$/.test(String(settlement.pool_xrp || '')) || !/^\d+$/.test(String(settlement.point_drops || ''))) {
    throw badRequest('Payload-funded Money Rain reward amount is invalid.');
  }
  return insertMoneyRain(admin, user, body, settlement);
}

export async function claimMoneyPickup(admin, user, body = {}) {
  const eventId = asUuid(body.event_id, 'World event');
  const rawIds = Array.isArray(body.pickup_ids) ? body.pickup_ids : [body.pickup_id];
  const pickupIds = [...new Set(rawIds.map(Number))];
  if (!pickupIds.length || pickupIds.length > MAX_BATCH_CLAIMS || pickupIds.some((id) => !Number.isInteger(id) || id < 1 || id > 200)) {
    throw badRequest('Money Rain pickup request is invalid.');
  }
  const map = String(body.map || '');
  const x = asFinite(body.x, 'Player X');
  const y = asFinite(body.y, 'Player Y');
  if (map !== 'town') throw conflict('Money Rain pickups can only be collected on the ATM Town outdoor map.');
  const { data: row, error } = await admin.from('world_events')
    .select('id,event_type,status,starts_at,ends_at,config')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw setupError(error);
  if (!row || row.event_type !== MONEY_RAIN_EVENT_TYPE) throw conflict('That Money Rain event is no longer available.');
  const now = Date.now();
  if (eventPhase(row, now) !== 'active') throw conflict('Money Rain is not currently active.');
  if (now >= Date.parse(row.ends_at)) throw conflict('Money Rain has ended.');

  if (row.config?.reward_settlement) {
    const { data: wallet, error: walletError } = await admin
      .from('embedded_wallets')
      .select('network,address')
      .eq('user_id', user.id)
      .maybeSingle();
    if (walletError) throw walletError;
    if (!wallet || wallet.network !== 'testnet' || !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(String(wallet.address || ''))) {
      throw conflict('An ATM Pay Testnet wallet is required to collect reward-enabled Money Rain.');
    }
  }

  const manifest = new Map((Array.isArray(row.config?.pickups) ? row.config.pickups : []).map((pickup) => [Number(pickup.id), pickup]));
  const accepted = [];
  const results = [];
  let pointsAwarded = 0;

  for (const pickupId of pickupIds) {
    const pickup = manifest.get(pickupId);
    if (!pickup) {
      results.push({ pickup_id: pickupId, status: 'invalid' });
      continue;
    }
    const landedAt = Date.parse(row.starts_at) + Number(pickup.spawn_offset_ms || 0) + Number(pickup.fall_ms || 0);
    if (now < landedAt - 120) {
      results.push({ pickup_id: pickupId, status: 'not_landed' });
      continue;
    }
    const distance = Math.hypot(x - Number(pickup.x), y - Number(pickup.y));
    if (!Number.isFinite(distance) || distance > MAX_CLAIM_DISTANCE) {
      results.push({ pickup_id: pickupId, status: 'too_far' });
      continue;
    }
    const insert = {
      event_id: row.id,
      pickup_id: pickupId,
      user_id: user.id,
      points: Number(pickup.points || 0),
      claim_map: map,
      claim_x: Math.round(x * 10) / 10,
      claim_y: Math.round(y * 10) / 10,
      claim_distance: Math.round(distance * 10) / 10,
    };
    const { error: claimError } = await admin.from('world_event_claims').insert(insert);
    if (claimError?.code === '23505') {
      results.push({ pickup_id: pickupId, status: 'already_claimed' });
      continue;
    }
    if (claimError) throw setupError(claimError);
    accepted.push(pickupId);
    pointsAwarded += insert.points;
    results.push({ pickup_id: pickupId, status: 'claimed', points: insert.points });
  }

  if (accepted.length && row.config?.reward_settlement) {
    await bestEffortRegisterMoneyRainParticipant(admin, user.id, row.config);
  }

  const state = await getWorldEventState(admin, user.id);
  return {
    ...state,
    claimed: accepted.length > 0,
    pickup_id: pickupIds.length === 1 ? pickupIds[0] : null,
    pickup_ids: pickupIds,
    claimed_pickup_ids_now: accepted,
    points: pointsAwarded,
    results,
  };
}

export const WORLD_EVENT_ACTIONS = Object.freeze(new Set(['start-money-rain', 'claim-money-rain', 'start-zombie-outbreak', 'start-prop-hunt', 'tag-prop-hunt']));
