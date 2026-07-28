import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const MAX_PARTICIPANTS = 6;
const ALLOWED_ROOM = 'atm-hq-meeting-table';

function getHttpLiveKitUrl(url) {
  return String(url || '')
    .replace(/^wss:/i, 'https:')
    .replace(/^ws:/i, 'http:');
}

function cleanIdentity(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function cleanName(value) {
  return String(value || 'Guest').replace(/[<>]/g, '').trim().slice(0, 32) || 'Guest';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST required.' });
  }

  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit environment variables are not configured.' });
  }

  const room = String(req.body?.room || '');
  const identity = cleanIdentity(req.body?.identity);
  const name = cleanName(req.body?.name);

  if (room !== ALLOWED_ROOM) {
    return res.status(403).json({ error: 'This voice room is not allowed.' });
  }
  if (!identity) {
    return res.status(400).json({ error: 'A valid player identity is required.' });
  }

  try {
    const roomService = new RoomServiceClient(getHttpLiveKitUrl(livekitUrl), apiKey, apiSecret);
    let participants = [];
    try {
      participants = await roomService.listParticipants(room);
    } catch (error) {
      // A room that does not exist yet is treated as empty and will be created on first connection.
      if (!/not found|does not exist/i.test(String(error?.message || error))) throw error;
    }

    const alreadyConnected = participants.some((participant) => participant.identity === identity);
    if (!alreadyConnected && participants.length >= MAX_PARTICIPANTS) {
      return res.status(409).json({ error: 'The ATM HQ meeting table is full (6/6).' });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: '15m',
      metadata: JSON.stringify({ area: 'atm-hq-meeting-table' }),
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return res.status(201).json({
      server_url: livekitUrl,
      participant_token: await token.toJwt(),
      max_participants: MAX_PARTICIPANTS,
    });
  } catch (error) {
    console.error('LiveKit token endpoint failed:', error);
    return res.status(500).json({ error: 'Voice room service is temporarily unavailable.' });
  }
}
