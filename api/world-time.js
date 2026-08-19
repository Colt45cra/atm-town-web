import { adminClient, requireUser, sendError } from '../lib/auth.js';
import {
  assertMoneyRainLaunchContext,
  claimMoneyPickup,
  getWorldEventState,
  resolveMoneyRainSponsor,
  startFundedMoneyRain,
  startMoneyRain,
  startZombieOutbreak,
  WORLD_EVENT_ACTIONS,
} from '../lib/world-events.js';
import {
  createMoneyRainPayloadDraft,
  getMoneyRainFundingStatus,
  payloadDraftFromToken,
  prepareMoneyRainFunding,
  recheckMoneyRainFunding,
  relayMoneyRainFunding,
  verifyMoneyRainFundingTransaction,
} from '../lib/payload-money-rain.js';

const PAYLOAD_MONEY_RAIN_ACTIONS = new Set([
  'payload-create-money-rain',
  'payload-funding-prepare',
  'payload-funding-recheck',
  'payload-funding-relay',
  'payload-funding-verify',
  'payload-funding-status',
  'start-funded-money-rain',
]);

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

async function optionalUser(req) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return { admin: adminClient(), user: null };
  // If the browser supplied an Authorization header, do not silently downgrade
  // an expired/invalid session to public state. Personal Money Rain totals must never
  // be replaced with a misleading zero. Let requireUser return an auth error instead.
  return requireUser(req);
}

function conflict(message) {
  return Object.assign(new Error(message), { status: 409 });
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
      if (action === 'start-zombie-outbreak') return res.status(200).json(await startZombieOutbreak(admin, user, req.body || {}));
      if (action === 'claim-money-rain') return res.status(200).json(await claimMoneyPickup(admin, user, req.body || {}));
    }

    if (req.method === 'POST' && PAYLOAD_MONEY_RAIN_ACTIONS.has(action)) {
      const { admin, user } = await requireUser(req);
      const body = req.body || {};

      if (action === 'payload-create-money-rain') {
        await assertMoneyRainLaunchContext(admin, body);
        const { sponsor } = await resolveMoneyRainSponsor(admin, user, body);
        return res.status(201).json(await createMoneyRainPayloadDraft(admin, user, {
          poolXrp: body.pool_xrp,
          sponsorMode: sponsor.mode,
          sponsorLabel: sponsor.label,
        }));
      }

      if (action === 'payload-funding-prepare') {
        return res.status(200).json(await prepareMoneyRainFunding(admin, user, body.draft_token));
      }

      if (action === 'payload-funding-recheck') {
        return res.status(200).json(await recheckMoneyRainFunding(admin, user, body.draft_token, body.prepared || {}));
      }

      if (action === 'payload-funding-relay') {
        return res.status(200).json(await relayMoneyRainFunding(admin, user, body.draft_token, body));
      }

      if (action === 'payload-funding-verify') {
        return res.status(200).json(await verifyMoneyRainFundingTransaction(admin, user, body.draft_token, body.tx_hash));
      }

      if (action === 'payload-funding-status') {
        const status = await getMoneyRainFundingStatus(admin, user, body.draft_token);
        return res.status(200).json({ funded: status.funded, state: status.state });
      }

      if (action === 'start-funded-money-rain') {
        const draft = payloadDraftFromToken(body.draft_token, user.id);
        await assertMoneyRainLaunchContext(admin, body);
        const status = await getMoneyRainFundingStatus(admin, user, body.draft_token);
        if (!status.funded) throw conflict('Payload has not confirmed the full Money Rain funding amount yet.');
        return res.status(200).json(await startFundedMoneyRain(admin, user, {
          map: body.map,
          x: body.x,
          y: body.y,
          sponsor_mode: draft.sponsor_mode,
          sponsor_label: draft.sponsor_label,
        }, {
          integration_campaign_id: draft.integration_campaign_id,
          external_campaign_id: draft.external_campaign_id,
          external_event_id: draft.external_event_id,
          pool_xrp: draft.pool_xrp,
          point_drops: draft.point_drops,
          funding_tx_hash: status.state?.funding?.depositTxHash || body.tx_hash || null,
        }));
      }
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
