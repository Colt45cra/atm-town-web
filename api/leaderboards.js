import { randomUUID } from 'node:crypto';
import { setCors, requireUser, adminClient, sendError } from './_auth.js';

const GAME_CONFIG = Object.freeze({
  'sky-run': { label: 'ATM Sky Run', metric: 'FASTEST TIME', direction: 'asc' },
  'platform-panic': { label: 'ATM Platform Panic', metric: 'HIGHEST CLIMB', direction: 'desc' },
  'flappy-jetpack': { label: 'ATM Flappy Jetpack', metric: 'HIGH SCORE', direction: 'desc' },
  'ring-rumble': { label: 'ATM Ring Rumble', metric: 'ONLINE WINS', direction: 'desc', aggregateWins: true }
});

const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

function gameConfig(gameId) {
  return GAME_CONFIG[String(gameId || '').trim()] || null;
}
function shortWallet(value) {
  const v = String(value || '');
  return XRPL_ADDRESS.test(v) ? `${v.slice(0, 6)}…${v.slice(-6)}` : '';
}
function cleanDetails(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value).slice(0, 20)) {
    if (!/^[a-z0-9_]{1,40}$/i.test(key)) continue;
    if (typeof raw === 'boolean') out[key] = raw;
    else if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === 'string') out[key] = raw.slice(0, 120);
  }
  return out;
}
function tableMissing(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return text.includes('42p01') || text.includes('does not exist') || text.includes('could not find the table');
}
function setupError(error) {
  if (!tableMissing(error)) return error;
  return Object.assign(new Error('Leaderboard database setup is required. Run supabase/ATM-Town-v233.sql in Supabase SQL Editor.'), { status: 503 });
}
function validateResult(gameId, scoreValue, secondaryValue, details, elapsedMs) {
  if (!Number.isSafeInteger(scoreValue) || scoreValue < 0) return { ok: false, reason: 'Invalid score value.' };
  if (!Number.isSafeInteger(secondaryValue) || secondaryValue < 0) return { ok: false, reason: 'Invalid secondary score value.' };
  const seconds = Math.max(0, elapsedMs / 1000);
  if (elapsedMs < 900) return { ok: false, reason: 'Game session ended too quickly to verify.' };
  if (elapsedMs > 60 * 60 * 1000) return { ok: false, reason: 'Game session expired.' };
  if (gameId === 'sky-run') {
    if (scoreValue < 4000 || scoreValue > 30 * 60 * 1000) return { ok: false, reason: 'Sky Run time is outside the accepted range.' };
    if (scoreValue > elapsedMs + 5000) return { ok: false, reason: 'Sky Run timing did not match the server session.' };
  } else if (gameId === 'flappy-jetpack') {
    if (scoreValue > Math.ceil(seconds * 4) + 25) return { ok: false, reason: 'Flappy score exceeded the session plausibility limit.' };
  } else if (gameId === 'platform-panic') {
    if (scoreValue > Math.ceil(seconds * 250) + 600) return { ok: false, reason: 'Platform Panic height exceeded the session plausibility limit.' };
  } else if (gameId === 'ring-rumble') {
    if (scoreValue !== 1 || details.online !== true) return { ok: false, reason: 'Only online Ring Rumble wins qualify.' };
    if (elapsedMs < 3000) return { ok: false, reason: 'Ring Rumble round ended too quickly to verify.' };
  }
  return { ok: true };
}
function formatScore(gameId, value, secondary = 0) {
  if (gameId === 'sky-run') {
    const ms = Number(value) || 0;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const centi = Math.floor((ms % 1000) / 10);
    return `${min}:${String(sec).padStart(2, '0')}.${String(centi).padStart(2, '0')}`;
  }
  if (gameId === 'platform-panic') return `${value}m${secondary ? ` · ${secondary} coins` : ''}`;
  if (gameId === 'ring-rumble') return `${value} win${Number(value) === 1 ? '' : 's'}`;
  return String(value);
}

async function playerProfile(admin, userId) {
  const { data, error } = await admin.from('player_accounts')
    .select('display_name,wallet_address,selected_character')
    .eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data || {};
}

async function startSession(req, res) {
  const { admin, user } = await requireUser(req);
  const gameId = String(req.body?.game_id || '').trim();
  if (!gameConfig(gameId)) return res.status(400).json({ error: 'Unknown ATM Town game.' });
  const id = randomUUID();
  const metadata = cleanDetails(req.body?.metadata);
  const { error } = await admin.from('arcade_game_sessions').insert({ id, user_id: user.id, game_id: gameId, metadata });
  if (error) throw setupError(error);
  return res.status(201).json({ session_id: id, game_id: gameId, started_at: new Date().toISOString() });
}

async function submitScore(req, res) {
  const { admin, user } = await requireUser(req);
  const sessionId = String(req.body?.session_id || '').trim();
  const gameId = String(req.body?.game_id || '').trim();
  const cfg = gameConfig(gameId);
  if (!cfg || !/^[0-9a-f-]{36}$/i.test(sessionId)) return res.status(400).json({ error: 'Invalid leaderboard session.' });
  const { data: session, error: sessionError } = await admin.from('arcade_game_sessions')
    .select('*').eq('id', sessionId).eq('user_id', user.id).maybeSingle();
  if (sessionError) throw setupError(sessionError);
  if (!session || session.game_id !== gameId || session.status !== 'active') return res.status(409).json({ error: 'This game session is no longer eligible for submission.' });

  const scoreValue = Math.round(Number(req.body?.score_value));
  const secondaryValue = Math.round(Number(req.body?.secondary_value || 0));
  const details = cleanDetails(req.body?.details);
  const elapsedMs = Math.max(0, Date.now() - Date.parse(session.started_at));
  const validation = validateResult(gameId, scoreValue, secondaryValue, details, elapsedMs);
  if (!validation.ok) {
    await admin.from('arcade_game_sessions').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', sessionId);
    return res.status(422).json({ error: validation.reason, verified: false });
  }

  const profile = await playerProfile(admin, user.id);
  const scoreId = randomUUID();
  const row = {
    id: scoreId,
    session_id: sessionId,
    user_id: user.id,
    game_id: gameId,
    display_name: String(profile.display_name || user.email?.split('@')[0] || 'ATM Player').slice(0, 30),
    wallet_address: XRPL_ADDRESS.test(String(profile.wallet_address || '')) ? profile.wallet_address : null,
    character_id: String(profile.selected_character || 'classic').slice(0, 40),
    score_value: scoreValue,
    secondary_value: secondaryValue,
    verified: true,
    verification_level: 'session',
    details: { ...details, server_elapsed_ms: elapsedMs }
  };
  const { error: insertError } = await admin.from('arcade_scores').insert(row);
  if (insertError) throw setupError(insertError);
  await admin.from('arcade_game_sessions').update({ status: 'submitted', ended_at: new Date().toISOString() }).eq('id', sessionId);
  return res.status(201).json({ submitted: true, verified: true, score_id: scoreId, score_display: formatScore(gameId, scoreValue, secondaryValue) });
}

async function getLeaderboard(req, res) {
  const gameId = String(req.query?.game_id || '').trim();
  const cfg = gameConfig(gameId);
  if (!cfg) return res.status(400).json({ error: 'Unknown ATM Town game.' });
  const admin = adminClient();
  let query = admin.from('arcade_scores')
    .select('user_id,display_name,wallet_address,character_id,score_value,secondary_value,created_at')
    .eq('game_id', gameId).eq('verified', true);
  if (!cfg.aggregateWins) {
    query = query.order('score_value', { ascending: cfg.direction === 'asc' })
      .order('secondary_value', { ascending: false }).order('created_at', { ascending: true }).limit(1000);
  } else {
    query = query.order('created_at', { ascending: false }).limit(5000);
  }
  const { data, error } = await query;
  if (error) throw setupError(error);
  const rows = Array.isArray(data) ? data : [];
  let entries = [];
  if (cfg.aggregateWins) {
    const byUser = new Map();
    for (const row of rows) {
      const key = row.user_id;
      const current = byUser.get(key) || { ...row, score_value: 0, secondary_value: 0 };
      current.score_value += 1;
      if (Date.parse(row.created_at) > Date.parse(current.created_at || 0)) Object.assign(current, { display_name: row.display_name, wallet_address: row.wallet_address, character_id: row.character_id, created_at: row.created_at });
      byUser.set(key, current);
    }
    entries = [...byUser.values()].sort((a, b) => b.score_value - a.score_value || Date.parse(a.created_at) - Date.parse(b.created_at)).slice(0, 20);
  } else {
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id); entries.push(row);
      if (entries.length >= 20) break;
    }
  }
  return res.status(200).json({
    game_id: gameId,
    game_label: cfg.label,
    metric: cfg.metric,
    direction: cfg.direction,
    entries: entries.map((row, index) => ({
      rank: index + 1,
      player_name: row.display_name || 'ATM Player',
      wallet: shortWallet(row.wallet_address),
      has_wallet: XRPL_ADDRESS.test(String(row.wallet_address || '')),
      character: row.character_id || 'classic',
      score_value: Number(row.score_value),
      secondary_value: Number(row.secondary_value || 0),
      score_display: formatScore(gameId, row.score_value, row.secondary_value),
      achieved_at: row.created_at
    }))
  });
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return await getLeaderboard(req, res);
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'GET or POST required.' }); }
    const action = String(req.body?.action || '');
    if (action === 'start') return await startSession(req, res);
    if (action === 'submit') return await submitScore(req, res);
    return res.status(400).json({ error: 'Unknown leaderboard action.' });
  } catch (error) { sendError(res, error); }
}
