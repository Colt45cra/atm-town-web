const LIVE_CHAT_ACTIONS = new Set(['live-chat-history', 'live-chat-send']);
const ROOM_RE = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,39}$/;
const MESSAGE_ID_RE = /^[A-Za-z0-9:_-]{8,96}$/;
const MAX_MESSAGE = 180;
const RECENT_MINUTES = 10;
const RECENT_LIMIT = 100;
const PAIR_WINDOW_MS = 10_000;
const PAIR_MAX = 6;
const LONG_WINDOW_MS = 5 * 60_000;
const LONG_MAX = 60;
const RETENTION_HOURS = 1;

function badRequest(message) { return Object.assign(new Error(message), { status: 400 }); }
function tooMany(message) { return Object.assign(new Error(message), { status: 429 }); }

function cleanRoom(value) {
  const room = String(value || '').trim();
  if (!ROOM_RE.test(room)) throw badRequest('ATM Town chat room is invalid.');
  return room;
}

function cleanMessage(value) {
  const message = String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE);
  if (!message) throw badRequest('Type a chat message first.');
  return message;
}

function cleanMessageId(value) {
  const id = String(value || '').trim();
  if (!MESSAGE_ID_RE.test(id)) throw badRequest('Chat message id is invalid.');
  return id;
}

async function readSenderIdentity(admin, userId) {
  const { data, error } = await admin
    .from('player_accounts')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const name = String(data?.display_name || 'ATM Player')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
  return name || 'ATM Player';
}

async function enforceRateLimit(admin, userId, room) {
  const shortSince = new Date(Date.now() - PAIR_WINDOW_MS).toISOString();
  const { count: shortCount, error: shortError } = await admin
    .from('atm_live_chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_user_id', userId)
    .eq('room', room)
    .gte('created_at', shortSince);
  if (shortError) throw shortError;
  if (Number(shortCount || 0) >= PAIR_MAX) throw tooMany('Chat is moving too fast. Wait a few seconds and try again.');

  const longSince = new Date(Date.now() - LONG_WINDOW_MS).toISOString();
  const { count: longCount, error: longError } = await admin
    .from('atm_live_chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_user_id', userId)
    .gte('created_at', longSince);
  if (longError) throw longError;
  if (Number(longCount || 0) >= LONG_MAX) throw tooMany('Chat rate limit reached. Try again in a few minutes.');
}

async function pruneOldMessages(admin) {
  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60_000).toISOString();
  const { error } = await admin.from('atm_live_chat_messages').delete().lt('created_at', cutoff);
  if (error) console.warn('ATM Town live-chat retention cleanup failed', error.message || error);
}

async function recentHistory(admin, room) {
  const since = new Date(Date.now() - RECENT_MINUTES * 60_000).toISOString();
  const { data, error } = await admin
    .from('atm_live_chat_messages')
    .select('client_message_id,room,sender_user_id,sender_name,message,created_at')
    .eq('room', room)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;
  return (Array.isArray(data) ? data : []).reverse();
}

async function sendMessage(admin, user, body = {}) {
  const room = cleanRoom(body.room);
  const clientMessageId = cleanMessageId(body.message_id || body.client_message_id);
  const message = cleanMessage(body.message);
  await enforceRateLimit(admin, user.id, room);
  const senderName = await readSenderIdentity(admin, user.id);

  const { data, error } = await admin
    .from('atm_live_chat_messages')
    .upsert({
      client_message_id: clientMessageId,
      room,
      sender_user_id: user.id,
      sender_name: senderName,
      message,
    }, { onConflict: 'sender_user_id,client_message_id', ignoreDuplicates: true })
    .select('client_message_id,room,sender_user_id,sender_name,message,created_at')
    .maybeSingle();
  if (error) throw error;

  pruneOldMessages(admin).catch(() => {});
  if (data) return { stored: true, message: data };

  const { data: existing, error: existingError } = await admin
    .from('atm_live_chat_messages')
    .select('client_message_id,room,sender_user_id,sender_name,message,created_at')
    .eq('sender_user_id', user.id)
    .eq('client_message_id', clientMessageId)
    .maybeSingle();
  if (existingError) throw existingError;
  return { stored: Boolean(existing), message: existing || null };
}

export function isLiveChatAction(action) {
  return LIVE_CHAT_ACTIONS.has(String(action || '').toLowerCase());
}

export async function handleLiveChatAction(req, res, { admin, user, action }) {
  const normalized = String(action || '').toLowerCase();
  if (normalized === 'live-chat-history') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
    const room = cleanRoom(req.query?.room);
    return res.status(200).json({ room, recent_minutes: RECENT_MINUTES, messages: await recentHistory(admin, room) });
  }
  if (normalized === 'live-chat-send') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    return res.status(200).json(await sendMessage(admin, user, req.body || {}));
  }
  return res.status(404).json({ error: 'Live chat action not found.' });
}
