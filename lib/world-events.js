import crypto from 'node:crypto';

const EVENT_TYPE = 'money_rain';
const EVENT_SLOT = 'atm-town-world';
const COUNTDOWN_MS = 10_000;
const DURATION_MS = 45_000;
const RESULTS_WINDOW_MS = 25_000;
const START_COOLDOWN_MS = 45_000;
const MAX_CLAIM_DISTANCE = 78;
const HQ_CORE = Object.freeze({ map: 'hq', x: 771, y: 406, radius: 190 });

// Authored from the exact v234.4 streamed collision mask. Every point has a
// clear player-sized footprint. The server chooses a deterministic subset for
// each event so all clients see the same world drops without trusting a client.
const SAFE_MONEY_POINTS = Object.freeze([
  [1560,3864],[2904,216],[216,1464],[2904,2328],[1368,408],[216,3096],[1464,2136],[2808,3576],[216,216],[2232,1176],
  [2040,3000],[1080,1272],[1176,3000],[600,2328],[2136,312],[2904,1560],[2232,1944],[696,696],[1752,1560],[2712,2904],
  [2136,3576],[792,120],[696,3384],[1560,984],[2616,696],[984,1944],[1848,2520],[120,3576],[120,2520],[2424,2424],
  [120,1944],[600,1176],[1176,3576],[216,696],[1656,3288],[696,2904],[2904,1080],[1368,2616],[2040,792],[1176,792],
  [792,1560],[2712,1944],[1752,504],[984,2520],[2520,1464],[1848,2040],[600,1944],[2520,312],[1368,1560],[2328,3192],
  [504,408],[1848,1176],[2328,2808],[984,504],[2904,3192],[1560,2904],[1848,216],[984,3288],[2232,1560],[1464,1272],
  [216,2232],[1080,2232],[2520,1080],[1560,1848],[2328,696],[2712,2616],[2424,3576],[1560,4152],[504,1560],[408,3384],
  [2904,696],[1560,3576],[1080,1560],[2136,2424],[1848,3480],[1560,216],[408,2520],[408,984],[2520,1752],[1272,1944],
  [2712,1272],[2040,1752],[408,2904],[792,984],[1272,1080],[2328,120],[1560,2424],[1368,3384],[2616,3384],[2424,2136],
  [984,2808],[2040,1368],[1848,2808],[312,1848],[1080,984],[1464,792],[1752,2232],[600,216],[600,3096],[1560,1464],
  [888,312],[1176,312],[504,3576],[408,2040],[792,2232],[1752,3096],[2040,1080],[2136,2136],[2040,3384],[2328,984],
  [2328,1368],[1272,2808],[2424,3000],[1368,3096],[696,2520],[2904,2712],[2808,1752],[1944,600],[984,3096],[408,696]
]);

const HQ_FEATURED_POINTS = Object.freeze([
  [1560,840],[1560,912],[1488,840],[1632,840],[1560,768],[1560,984],[1488,768],[1632,768],[1416,840],[1704,840],[1560,1056],[1344,840]
]);
const SPAWN_FEATURED_POINTS = Object.freeze([
  [1560,3864],[1560,3792],[1632,3864],[1560,3936],[1560,3720],[1560,4008],[1560,3648],[1776,3864],[1776,3792],[1560,4080],[1776,3936],[1776,4008]
]);
const CENTER_FEATURED_POINTS = Object.freeze([
  [1560,2208],[1560,2136],[1488,2208],[1632,2208],[1560,2280],[1488,2136],[1632,2136],[1488,2280]
]);

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
function buildPickups(seed) {
  const random = rng32(seed);
  const picked = [];
  const used = new Set();
  const add = (points) => {
    for (const point of shuffle(points, random)) {
      const key = pointKey(point);
      if (used.has(key)) continue;
      used.add(key); picked.push(point);
    }
  };
  // Guarantee activity near HQ's exterior, the normal spawn, and the center of
  // town, then distribute the rest across the full streamed world.
  add(HQ_FEATURED_POINTS);
  add(SPAWN_FEATURED_POINTS);
  add(CENTER_FEATURED_POINTS);
  add(shuffle(SAFE_MONEY_POINTS, random));
  const points = picked.slice(0, 60);
  const values = shuffle(VALUE_POOL, random);
  return points.map((point, index) => ({
    id: index + 1,
    x: point[0],
    y: point[1],
    points: values[index],
    spawn_offset_ms: Math.max(0, Math.floor((index / points.length) * 30_000 + random() * 650)),
    fall_ms: 1150 + Math.floor(random() * 850),
  }));
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
  const seed = crypto.randomBytes(4).readUInt32BE(0);
  const startsAt = new Date(now + COUNTDOWN_MS);
  const endsAt = new Date(startsAt.getTime() + DURATION_MS);
  const config = {
    schema_version: 1,
    pool_points: 1000,
    pickup_count: 60,
    reward_settlement: false,
    pickups: buildPickups(seed),
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
  const pickupId = Number(body.pickup_id);
  if (!Number.isInteger(pickupId) || pickupId < 1 || pickupId > 200) throw badRequest('Money Rain pickup is invalid.');
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
  const pickup = Array.isArray(row.config?.pickups) ? row.config.pickups.find((item) => Number(item.id) === pickupId) : null;
  if (!pickup) throw conflict('That Money Rain pickup does not belong to this event.');
  const landedAt = Date.parse(row.starts_at) + Number(pickup.spawn_offset_ms || 0) + Number(pickup.fall_ms || 0);
  if (now < landedAt - 120) throw conflict('That Money Rain pickup has not landed yet.');
  if (now >= Date.parse(row.ends_at)) throw conflict('Money Rain has ended.');
  const distance = Math.hypot(x - Number(pickup.x), y - Number(pickup.y));
  if (!Number.isFinite(distance) || distance > MAX_CLAIM_DISTANCE) throw conflict('Move closer to the Money Rain pickup.');
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
    const state = await getWorldEventState(admin, user.id);
    return { ...state, claimed: false, pickup_id: pickupId, reason: 'already_claimed' };
  }
  if (claimError) throw setupError(claimError);
  const state = await getWorldEventState(admin, user.id);
  return { ...state, claimed: true, pickup_id: pickupId, points: insert.points };
}

export const WORLD_EVENT_ACTIONS = Object.freeze(new Set(['start-money-rain', 'claim-money-rain']));
