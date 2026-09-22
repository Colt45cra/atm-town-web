import { setCors, requireUser, sendError } from '../lib/auth.js';
import { payloadIntegrationRequest } from '../lib/payload-integration.js';

const XRPL_RPC_URL = String(process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/').trim();
const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

const REWARD_PROGRAMS = Object.freeze({
  'luci-666-welcome': Object.freeze({
    slug: 'luci-666-welcome',
    network: 'mainnet',
    currency: '666',
    issuer: 'rhvf9fe6PP3GC8Bku2Ug7iQPjPDxYZfrxN',
  }),
});

async function hasTrustline(wallet, reward) {
  const response = await fetch(XRPL_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      method: 'account_lines',
      params: [{
        account: wallet,
        peer: reward.issuer,
        ledger_index: 'validated',
        limit: 400,
      }],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error('XRPL could not verify the reward trustline.'), { status: 502 });
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    if (String(result.error || '') === 'actNotFound') return false;
    throw Object.assign(new Error(result.error_message || result.error || 'XRPL trustline verification failed.'), { status: 502 });
  }

  return Array.isArray(result.lines) && result.lines.some(line =>
    String(line?.currency || '') === reward.currency &&
    String(line?.account || '') === reward.issuer
  );
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST required.' });
  }

  try {
    const requestedProgram = String(req.body?.program || '').trim().toLowerCase();
    const reward = REWARD_PROGRAMS[requestedProgram];
    if (!reward) return res.status(404).json({ error: 'Unknown ATM Town reward program.' });

    const { admin, user } = await requireUser(req);
    const { data: account, error } = await admin
      .from('player_accounts')
      .select('wallet_address')
      .eq('user_id', user.id)
      .single();
    if (error) throw error;

    // ATM Town's embedded ATM Pay wallet is still Testnet-only. Real Mainnet
    // NPC rewards therefore use the player's verified linked Xaman address.
    // Keeping wallet resolution server-side lets a future Mainnet ATM Pay wallet
    // be added here without changing any NPC/browser code.
    const wallet = String(account?.wallet_address || '').trim();
    if (!XRPL_ADDRESS.test(wallet)) {
      throw Object.assign(new Error('Link and verify a Mainnet Xaman wallet in ATM Town before claiming this reward.'), { status: 409 });
    }

    if (!(await hasTrustline(wallet, reward))) {
      throw Object.assign(new Error(`Create the ${reward.currency} trustline before claiming this reward.`), { status: 409 });
    }

    const result = await payloadIntegrationRequest(
      `/api/integrations/v1/reward-programs/${encodeURIComponent(reward.slug)}/claim`,
      {
        walletAddress: wallet,
        externalUserId: user.id,
      },
      { timeoutMs: 30_000 },
    );

    const status = String(result?.status || '');
    const txHash = String(result?.txHash || '');
    const amount = String(result?.amount || '');
    const currency = String(result?.currency || reward.currency);
    const alreadyClaimed = result?.alreadyClaimed === true;

    if (status === 'success') {
      return res.status(200).json({
        ok: true,
        status,
        network: reward.network,
        wallet,
        amount,
        currency,
        issuer: reward.issuer,
        already_claimed: alreadyClaimed,
        tx_hash: txHash || null,
        message: alreadyClaimed
          ? `This wallet already claimed Luci's ${amount || '6'} ${currency} welcome reward.`
          : `${amount || '6'} ${currency} sent and confirmed on XRPL. 🔥`,
      });
    }

    if (status === 'pending') {
      return res.status(202).json({
        ok: false,
        pending: true,
        status,
        network: reward.network,
        wallet,
        amount,
        currency,
        issuer: reward.issuer,
        tx_hash: txHash || null,
        message: txHash
          ? 'Your reward transaction was submitted and is waiting for XRPL validation.'
          : 'Your reward claim is reserved and is still processing.',
      });
    }

    throw Object.assign(new Error(result?.error || 'Payload could not complete the reward payment.'), { status: 502 });
  } catch (error) {
    console.error('ATM Town reward claim failed:', error);
    sendError(res, error);
  }
}
