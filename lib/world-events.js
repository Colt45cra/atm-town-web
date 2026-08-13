import crypto from 'node:crypto';
import { MONEY_RAIN_SAFE_POINTS } from './world-event-money-rain-points.js';

const EVENT_TYPE = 'money_rain';
const EVENT_SLOT = 'atm-town-world';
const COUNTDOWN_MS = 10_000;
const DURATION_MS = 45_000;
const RESULTS_WINDOW_MS = 25_000;
const START_COOLDOWN_MS = 45_000;
const MAX_CLAIM_DISTANCE = 84;
const MAX_BATCH_CLAIMS = 8;
const PICKUP_COUNT = 60;
const POOL_POINTS = 1000;
const HQ_CORE = Object.freeze({ map: 'hq', x: 771, y: 406, radius: 190 });

const VALUE_POOL = Object.freeze([
  ...Array(2).fill(5),
  ...Array(44).fill(10),
  ...Array(8).fill(25),
  ...Array(5).fill(50),
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
  const counts = Array(clusterCount).fill(4);
  const weights = Array.from({ length: clusterCount }, () => 0.45 + Math.pow(random(), 1.35));
  for (let remaining = Math.max(0, total - counts.length * 4); remaining > 0; remaining -= 1) {
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
  const clusteredTarget = 44 + Math.floor(random() * 7);
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

  // The remainder are intentionally isolated scatter so the event has trails
  // between hotspots and never reads as repeated rows/columns.
  for (const point of pool) {
    if (picked.length >= PICKUP_COUNT) break;
    addPoint(point);
  }

  return {
    points: picked.slice(0, PICKUP_COUNT),
    cluster_count: centers.length,
    clustered_pickups: Math.min(clusteredTarget, PICKUP_COUNT),
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
      rotation: Math.round(((random() - 0.5) * 0.42) * 1000) / 1000,
      drift_px: 5 + Math.floor(random() * 12),
      fall_height: 230 + Math.floor(random() * 150),
      spawn_offset_ms: Math.floor(random() * 30_500),
      fall_ms: 950 + Math.floor(random() * 700),
    };
  });
  return { pickups, layout };
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
  const cutoff = new Date(now - RESULTS_WINDOW_MS).toISOString();
  const { data, error } = await admin.from('world_events')
    .select('id,event_type,status,slot,sponsor_user_id,sponsor_display_name,sponsor_handle,seed,starts_at,ends_at,config,created_at,completed_at')
    .eq('slot', EVENT_SLOT)
    .gte('ends_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw setupError(error);
  if (!data) return null;
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
  const ranked = [...totals.values()].sort((a, b) => b.points - a.points || b.pickups - a.pickups).slice(0, 5);
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
  const myClaims = userId ? claims.filter((claim) => claim.user_id === userId) : [];
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
    reward_settlement: false,
    pool_points: Number(config.pool_points || 1000),
    pickups: Array.isArray(config.pickups) ? config.pickups : [],
    claimed_pickup_ids: claims.map((claim) => Number(claim.pickup_id)),
    claimed_points: claims.reduce((sum, claim) => sum + Number(claim.points || 0), 0),
    my_score: myClaims.reduce((sum, claim) => sum + Number(claim.points || 0), 0),
    my_pickups: myClaims.length,
    leaders,
    server_time_ms: now,
  };
}

export async function getWorldEventState(admin, userId = null) {
  const row = await readRecentEvent(admin);
  if (!row) return { server_time_ms: Date.now(), event: null };
  const claims = await claimsForEvent(admin, row.id);
  const leaders = await eventLeaders(admin, claims);
  return { server_time_ms: Date.now(), event: publicEvent(row, claims, leaders, userId) };
}

export async function startMoneyRain(admin, user, body = {}) {
  const map = String(body.map || '');
  const x = asFinite(body.x, 'Player X');
  const y = asFinite(body.y, 'Player Y');
  if (map !== HQ_CORE.map || Math.hypot(x - HQ_CORE.x, y - HQ_CORE.y) > HQ_CORE.radius) {
    throw forbidden('Money Rain can only be started from the ATM Command Core inside HQ.');
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
  const [{ data: player, error: playerError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from('player_accounts').select('display_name').eq('user_id', user.id).maybeSingle(),
    admin.from('atm_pay_profiles').select('handle').eq('user_id', user.id).maybeSingle(),
  ]);
  if (playerError) throw playerError;
  const sponsorName = String(player?.display_name || user.email?.split('@')[0] || 'ATM Player').slice(0, 30);
  const sponsorHandle = profileError ? '' : String(profile?.handle || '').slice(0, 20);
  const sponsor = normalizeSponsorChoice(body, sponsorName, sponsorHandle);
  const seed = crypto.randomBytes(4).readUInt32BE(0);
  const startsAt = new Date(now + COUNTDOWN_MS);
  const endsAt = new Date(startsAt.getTime() + DURATION_MS);
  const generated = buildMoneyRainManifest(seed);
  const config = {
    schema_version: 2,
    pool_points: POOL_POINTS,
    pickup_count: PICKUP_COUNT,
    reward_settlement: false,
    sponsor_mode: sponsor.mode,
    sponsor_label: sponsor.label,
    layout_strategy: 'organic_cluster_scatter_v2',
    cluster_count: generated.layout.cluster_count,
    clustered_pickups: generated.layout.clustered_pickups,
    pickups: generated.pickups,
  };
  const row = {
    id: crypto.randomUUID(),
    event_type: EVENT_TYPE,
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
  if (!row || row.event_type !== EVENT_TYPE) throw conflict('That Money Rain event is no longer available.');
  const now = Date.now();
  if (eventPhase(row, now) !== 'active') throw conflict('Money Rain is not currently active.');
  if (now >= Date.parse(row.ends_at)) throw conflict('Money Rain has ended.');

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

export const WORLD_EVENT_ACTIONS = Object.freeze(new Set(['start-money-rain', 'claim-money-rain']));
