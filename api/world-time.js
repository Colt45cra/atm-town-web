import { adminClient, requireUser, sendError } from '../lib/auth.js';
import { claimMoneyPickup, getWorldEventState, startMoneyRain, WORLD_EVENT_ACTIONS } from '../lib/world-events.js';

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

async function optionalUser(req) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return { admin: adminClient(), user: null };
  try { return await requireUser(req); }
  catch { return { admin: adminClient(), user: null }; }
}

export default async function handler(req, res) {
  noStore(res);
  const action = String(req.query?.action || '').toLowerCase();
  try {
    if (req.method === 'GET' && action === 'event') {
      const { admin, user } = await optionalUser(req);
      return res.status(200).json(await getWorldEventState(admin, user?.id || null));
    }

    if (req.method === 'POST' && WORLD_EVENT_ACTIONS.has(action)) {
      const { admin, user } = await requireUser(req);
      if (action === 'start-money-rain') return res.status(200).json(await startMoneyRain(admin, user, req.body || {}));
      if (action === 'claim-money-rain') return res.status(200).json(await claimMoneyPickup(admin, user, req.body || {}));
    }

    if (req.method !== 'GET' || action) {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Unsupported world-time request.' });
    }

    return res.status(200).json({ server_time_ms: Date.now() });
  } catch (error) {
    return sendError(res, error);
  }
}
