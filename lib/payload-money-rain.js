import crypto from 'node:crypto';
import { xrplTestnetRpc } from './xrpl-testnet-rpc.js';
import {
  createPayloadDraftToken,
  payloadIntegrationRequest,
  stablePayloadHash,
  verifyPayloadDraftToken,
} from './payload-integration.js';

const CLASSIC_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const HASH_RE = /^[A-F0-9]{64}$/i;
const TX_BLOB_RE = /^[A-F0-9]+$/i;
const MAX_TX_BLOB_HEX = 16_384;
const MAX_FUNDING_DROPS = 25_000_000n; // 25 Testnet XRP hard ceiling for this proof phase.
const MAX_TEST_FEE_DROPS = 10_000n;
const LEDGER_EXPIRY_OFFSET = 20;
const MIN_LEDGER_HEADROOM = 2;
const DEFAULT_MAX_RECIPIENTS = 100;
const POINT_POOL = 1000n;

function badRequest(message) { return Object.assign(new Error(message), { status: 400 }); }
function conflict(message) { return Object.assign(new Error(message), { status: 409 }); }
function forbidden(message) { return Object.assign(new Error(message), { status: 403 }); }

function cleanText(value, max = 160) {
  const text = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (text.length > max) throw badRequest(`Text cannot exceed ${max} characters.`);
  return text;
}

function xrpToDrops(value, label = 'XRP amount') {
  const text = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(text)) throw badRequest(`${label} must use no more than 6 decimal places.`);
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 1_000_000n + BigInt((fraction + '000000').slice(0, 6));
}

function dropsToXrp(drops) {
  const value = BigInt(drops);
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

function normalizePoolXrp(value) {
  const drops = xrpToDrops(value, 'Money Rain prize pool');
  if (drops < 1_000n) throw badRequest('Money Rain prize pool must be at least 0.001 Testnet XRP.');
  if (drops > 5_000_000n) throw badRequest('Money Rain prize pool is limited to 5 Testnet XRP during integration testing.');
  if (drops % POINT_POOL !== 0n) throw badRequest('Money Rain prize pool must be in 0.001 XRP increments so every game point maps to an exact XRP amount.');
  return { drops, xrp: dropsToXrp(drops), pointDrops: drops / POINT_POOL };
}

async function readEmbeddedWallet(admin, userId) {
  const { data, error } = await admin.from('embedded_wallets').select('user_id,network,address').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data || data.network !== 'testnet' || !CLASSIC_ADDRESS_RE.test(String(data.address || ''))) return null;
  return { user_id: String(data.user_id), address: String(data.address) };
}

function safeFeeDrops(feeResult) {
  const drops = feeResult?.drops || {};
  const candidates = [drops.open_ledger_fee, drops.minimum_fee, drops.base_fee].map((value) => BigInt(String(value || '0')));
  const base = candidates.reduce((max, value) => value > max ? value : max, 0n);
  if (base <= 0n) throw conflict('XRPL Testnet did not return a usable network fee.');
  const buffered = (base * 12n + 9n) / 10n;
  if (buffered > MAX_TEST_FEE_DROPS) throw conflict('XRPL Testnet fee is above the ATM Town funding safety limit.');
  return buffered;
}

function memoHex(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('hex').toUpperCase();
}

function fundingMemos(memoId) {
  return [{ Memo: { MemoType: memoHex('PAYLOAD-MONEY-RAIN'), MemoData: memoHex(memoId) } }];
}

function assertTxBlob(value) {
  const blob = String(value || '').trim().toUpperCase();
  if (!blob || blob.length % 2 !== 0 || blob.length > MAX_TX_BLOB_HEX || !TX_BLOB_RE.test(blob)) throw badRequest('Signed XRPL transaction blob is invalid.');
  return blob;
}

function assertDraftStateMatches(tokenData, state) {
  if (!state || state.network !== 'testnet' || state.asset?.type !== 'xrp') throw conflict('Payload campaign is not an XRP Testnet campaign.');
  if (String(state.integrationCampaignId || '') !== String(tokenData.integration_campaign_id || '')) throw conflict('Payload campaign identity changed.');
  if (String(state.externalEventId || '') !== String(tokenData.external_event_id || '')) throw conflict('Payload event identity changed.');
  if (String(state.externalCampaignId || '') !== String(tokenData.external_campaign_id || '')) throw conflict('Payload external campaign identity changed.');
  if (String(state.poolAmount || '') !== String(tokenData.pool_xrp || '')) throw conflict('Payload prize pool changed.');
  if (!state.funding || String(state.funding.address || '') !== String(tokenData.funding_address || '')) throw conflict('Payload funding destination changed.');
  if (String(state.funding.depositRequired || '') !== String(tokenData.funding_required_xrp || '')) throw conflict('Payload funding requirement changed.');
  return state;
}

export async function createMoneyRainPayloadDraft(admin, user, options = {}) {
  const wallet = await readEmbeddedWallet(admin, user.id);
  if (!wallet) throw conflict('Create or restore an ATM Pay Testnet wallet before funding a reward Money Rain.');
  const pool = normalizePoolXrp(options.poolXrp);
  const externalEventId = crypto.randomUUID();
  const externalCampaignId = `atm-town-money-rain-${externalEventId}`;
  const sponsorLabel = cleanText(options.sponsorLabel || 'ATM Town player', 32) || 'ATM Town player';
  const body = {
    externalCampaignId,
    externalEventId,
    kind: 'atm_town_money_rain',
    name: `${sponsorLabel} Money Rain`,
    sponsorLabel,
    asset: { type: 'xrp' },
    poolAmount: pool.xrp,
    maxRecipients: DEFAULT_MAX_RECIPIENTS,
    refundAddress: wallet.address,
    metadata: {
      source: 'atm_town',
      worldEvent: 'money_rain',
      pointPool: Number(POINT_POOL),
    },
  };
  const created = await payloadIntegrationRequest('/api/integrations/v1/campaigns', body, { timeoutMs: 20_000 });
  const state = created?.state;
  if (!state?.funding?.address) throw conflict('Payload did not return a campaign funding wallet.');
  const fundingDrops = xrpToDrops(state.funding.depositRequired, 'Payload funding amount');
  if (fundingDrops <= 0n || fundingDrops > MAX_FUNDING_DROPS) throw conflict('Payload funding requirement is outside ATM Town Testnet safety limits.');
  if (state.network !== 'testnet' || state.asset?.type !== 'xrp' || String(state.externalEventId || '') !== externalEventId) {
    throw conflict('Payload returned a campaign that does not match this Money Rain request.');
  }

  const draftToken = createPayloadDraftToken({
    purpose: 'money_rain_xrp',
    user_id: user.id,
    integration_campaign_id: state.integrationCampaignId,
    payload_campaign_id: state.payloadCampaignId,
    external_campaign_id: externalCampaignId,
    external_event_id: externalEventId,
    pool_xrp: pool.xrp,
    point_drops: pool.pointDrops.toString(),
    sponsor_mode: String(options.sponsorMode || 'player'),
    sponsor_label: sponsorLabel,
    funding_address: state.funding.address,
    funding_memo_id: state.funding.memoId,
    funding_required_xrp: String(state.funding.depositRequired),
    refund_address: wallet.address,
  });

  return {
    draft_token: draftToken,
    integration_campaign_id: state.integrationCampaignId,
    external_event_id: externalEventId,
    pool_xrp: pool.xrp,
    point_value_xrp: dropsToXrp(pool.pointDrops),
    funding_required_xrp: String(state.funding.depositRequired),
    funding_stage: state.funding.stage,
    status: state.status,
    network: 'testnet',
  };
}

export async function getMoneyRainFundingStatus(admin, user, draftToken) {
  const draft = verifyPayloadDraftToken(draftToken, user.id);
  const wallet = await readEmbeddedWallet(admin, user.id);
  if (!wallet || wallet.address !== draft.refund_address) throw forbidden('Money Rain funding wallet identity no longer matches this account.');
  const response = await payloadIntegrationRequest(`/api/integrations/v1/campaigns/${encodeURIComponent(draft.integration_campaign_id)}/funding-status`, {});
  const state = assertDraftStateMatches(draft, response.state);
  return {
    draft,
    funded: state.status === 'funded' && state.funding?.stage === 'ready',
    state,
  };
}

export async function prepareMoneyRainFunding(admin, user, draftToken) {
  const status = await getMoneyRainFundingStatus(admin, user, draftToken);
  if (status.funded) return { funded: true, state: status.state };
  const { draft } = status;
  const wallet = await readEmbeddedWallet(admin, user.id);
  if (!wallet) throw conflict('ATM Pay Testnet wallet is unavailable.');
  const amountDrops = xrpToDrops(draft.funding_required_xrp, 'Payload funding amount');
  if (amountDrops <= 0n || amountDrops > MAX_FUNDING_DROPS) throw conflict('Payload funding amount failed ATM Town safety limits.');
  const [accountInfo, feeInfo] = await Promise.all([
    xrplTestnetRpc('account_info', [{ account: wallet.address, ledger_index: 'current', queue: true }]),
    xrplTestnetRpc('fee', [{}]),
  ]);
  const sequence = Number(accountInfo?.account_data?.Sequence);
  const ledgerIndex = Number(feeInfo?.ledger_current_index || accountInfo?.ledger_current_index || accountInfo?.ledger_index || 0);
  const feeDrops = safeFeeDrops(feeInfo);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) throw conflict('XRPL Testnet did not return a valid account sequence.');
  if (!Number.isSafeInteger(ledgerIndex) || ledgerIndex <= 0) throw conflict('XRPL Testnet did not return a valid ledger index.');

  const tx = {
    TransactionType: 'Payment',
    Account: wallet.address,
    Destination: draft.funding_address,
    Amount: amountDrops.toString(),
    Fee: feeDrops.toString(),
    Sequence: sequence,
    LastLedgerSequence: ledgerIndex + LEDGER_EXPIRY_OFFSET,
    Memos: fundingMemos(draft.funding_memo_id),
  };
  const canonical = {
    purpose: 'payload_money_rain_funding',
    integrationCampaignId: draft.integration_campaign_id,
    externalEventId: draft.external_event_id,
    poolXrp: draft.pool_xrp,
    fundingRequiredXrp: draft.funding_required_xrp,
    network: 'testnet',
    tx,
  };
  const intentDigest = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('base64url');
  return {
    funded: false,
    network: 'testnet',
    integration_campaign_id: draft.integration_campaign_id,
    external_event_id: draft.external_event_id,
    pool_xrp: draft.pool_xrp,
    funding_required_xrp: draft.funding_required_xrp,
    amount_drops: amountDrops.toString(),
    fee_drops: feeDrops.toString(),
    ledger_index: ledgerIndex,
    intent_digest: intentDigest,
    tx,
  };
}

export async function recheckMoneyRainFunding(admin, user, draftToken, prepared = {}) {
  const status = await getMoneyRainFundingStatus(admin, user, draftToken);
  if (status.funded) return { funded: true, state: status.state };
  const draft = status.draft;
  if (String(prepared?.integration_campaign_id || '') !== draft.integration_campaign_id || String(prepared?.intent_digest || '').length < 20) {
    throw conflict('Money Rain funding review is no longer valid. Review it again.');
  }
  const tx = prepared?.tx;
  const expectedDrops = xrpToDrops(draft.funding_required_xrp, 'Payload funding amount').toString();
  if (!tx || tx.TransactionType !== 'Payment' || tx.Account !== draft.refund_address || tx.Destination !== draft.funding_address || String(tx.Amount || '') !== expectedDrops) {
    throw conflict('Money Rain funding transaction changed after review. Review it again.');
  }
  if (!Array.isArray(tx.Memos) || tx.Memos.length !== 1 || String(tx.Memos?.[0]?.Memo?.MemoType || '').toUpperCase() !== memoHex('PAYLOAD-MONEY-RAIN') || String(tx.Memos?.[0]?.Memo?.MemoData || '').toUpperCase() !== memoHex(draft.funding_memo_id)) {
    throw conflict('Money Rain funding memo binding changed after review.');
  }
  const canonical = {
    purpose: 'payload_money_rain_funding',
    integrationCampaignId: draft.integration_campaign_id,
    externalEventId: draft.external_event_id,
    poolXrp: draft.pool_xrp,
    fundingRequiredXrp: draft.funding_required_xrp,
    network: 'testnet',
    tx,
  };
  const expectedDigest = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('base64url');
  if (String(prepared.intent_digest) !== expectedDigest) throw conflict('Money Rain funding intent integrity check failed.');
  const wallet = await readEmbeddedWallet(admin, user.id);
  if (!wallet) throw conflict('ATM Pay Testnet wallet is unavailable.');
  const [accountInfo, feeInfo] = await Promise.all([
    xrplTestnetRpc('account_info', [{ account: wallet.address, ledger_index: 'validated', queue: false }]),
    xrplTestnetRpc('fee', [{}]),
  ]);
  const sequence = Number(accountInfo?.account_data?.Sequence);
  const ledgerIndex = Number(feeInfo?.ledger_current_index || accountInfo?.ledger_index || 0);
  if (!Number.isSafeInteger(sequence) || sequence <= 0 || !Number.isSafeInteger(ledgerIndex) || ledgerIndex <= 0) throw conflict('ATM Town could not confirm the live XRPL Testnet ledger.');
  if (Number(prepared?.tx?.Sequence) !== sequence) throw conflict('Your Testnet wallet balance changed since review. Review Money Rain funding again.');
  if (Number(prepared?.tx?.LastLedgerSequence) <= ledgerIndex + MIN_LEDGER_HEADROOM) throw conflict('Money Rain funding review is too close to expiration. Review it again.');
  return { funded: false, sequence, ledger_index: ledgerIndex };
}

export async function relayMoneyRainFunding(admin, user, draftToken, body = {}) {
  const status = await getMoneyRainFundingStatus(admin, user, draftToken);
  if (status.funded) return { submitted: true, validated: true, funded: true, state: status.state };
  const draft = status.draft;
  const txHash = String(body.tx_hash || '').trim().toUpperCase();
  if (!HASH_RE.test(txHash)) throw badRequest('XRPL transaction hash is invalid.');
  const txBlob = assertTxBlob(body.tx_blob);
  const result = await xrplTestnetRpc('submit', [{ tx_blob: txBlob, fail_hard: false }]);
  const returnedHash = String(result?.tx_json?.hash || result?.tx_json?.Hash || '').toUpperCase();
  if (returnedHash && returnedHash !== txHash) throw conflict('XRPL relay returned a different transaction hash than the locally signed Money Rain funding payment.');
  return {
    submitted: true,
    validated: false,
    funded: false,
    tx_hash: txHash,
    engine_result: String(result?.engine_result || ''),
    integration_campaign_id: draft.integration_campaign_id,
  };
}

export async function verifyMoneyRainFundingTransaction(admin, user, draftToken, txHash) {
  const draft = verifyPayloadDraftToken(draftToken, user.id);
  const wallet = await readEmbeddedWallet(admin, user.id);
  if (!wallet || wallet.address !== draft.refund_address) throw forbidden('Money Rain funding wallet identity no longer matches this account.');
  const hash = String(txHash || '').trim().toUpperCase();
  if (!HASH_RE.test(hash)) throw badRequest('XRPL transaction hash is invalid.');
  let result;
  try {
    result = await xrplTestnetRpc('tx', [{ transaction: hash, binary: false }], { retryXrplCodes: ['txnNotFound'] });
  } catch (error) {
    if (error?.xrplCode === 'txnNotFound') return { validated: false, pending: true, tx_hash: hash };
    throw error;
  }
  const tx = result?.tx_json || result?.tx || result;
  const validated = result?.validated === true;
  if (!validated) return { validated: false, pending: true, tx_hash: hash };
  const resultCode = String(result?.meta?.TransactionResult || '');
  const expectedDrops = xrpToDrops(draft.funding_required_xrp, 'Payload funding amount').toString();
  if (tx?.TransactionType !== 'Payment' || tx?.Account !== wallet.address || tx?.Destination !== draft.funding_address || String(tx?.Amount || '') !== expectedDrops) {
    throw conflict('Validated XRPL transaction does not match the reviewed Money Rain funding payment.');
  }
  return { validated: true, success: resultCode === 'tesSUCCESS', result: resultCode || 'UNKNOWN', tx_hash: hash };
}

export async function bestEffortRegisterMoneyRainParticipant(admin, userId, eventConfig) {
  try {
    if (!eventConfig?.reward_settlement || !eventConfig?.payload?.integration_campaign_id) return false;
    const wallet = await readEmbeddedWallet(admin, userId);
    if (!wallet) return false;
    await payloadIntegrationRequest(
      `/api/integrations/v1/campaigns/${encodeURIComponent(eventConfig.payload.integration_campaign_id)}/participants`,
      { participants: [{ walletAddress: wallet.address, externalUserId: userId, metadata: { source: 'money_rain_claim' } }] },
    );
    return true;
  } catch (error) {
    console.warn('[payload-money-rain] participant registration will retry at settlement:', error?.message || error);
    return false;
  }
}

async function updateSettlementConfig(admin, row, patch) {
  const current = row.config && typeof row.config === 'object' ? row.config : {};
  const payload = current.payload && typeof current.payload === 'object' ? current.payload : {};
  const next = { ...current, payload: { ...payload, ...patch } };
  const { error } = await admin.from('world_events').update({ config: next }).eq('id', row.id);
  if (error) throw error;
  row.config = next;
  return row;
}

function moneyRainAmountForPoints(points, pointDrops) {
  return dropsToXrp(BigInt(Number(points || 0)) * BigInt(String(pointDrops || '0')));
}

export async function settleCompletedMoneyRain(admin, row, claims, leaders) {
  const config = row?.config && typeof row.config === 'object' ? row.config : {};
  const payload = config.payload && typeof config.payload === 'object' ? config.payload : {};
  if (!config.reward_settlement || !payload.integration_campaign_id) return row;
  if (['completed', 'cancelled'].includes(String(payload.settlement_status || ''))) return row;
  const nextAt = Number(payload.next_action_at || 0);
  if (nextAt && Date.now() < nextAt) return row;

  const campaignId = String(payload.integration_campaign_id);
  const retryPatch = (status, error, delayMs = 4_000) => ({
    settlement_status: status,
    settlement_error: String(error || '').slice(0, 500),
    next_action_at: Date.now() + delayMs,
  });

  try {
    if (!claims.length || !leaders.length) {
      const cancelled = await payloadIntegrationRequest(`/api/integrations/v1/campaigns/${encodeURIComponent(campaignId)}/cancel`, {});
      await updateSettlementConfig(admin, row, {
        settlement_status: cancelled?.cancelled ? 'cancelled' : 'refund_pending',
        settlement_error: null,
        next_action_at: 0,
      });
      return row;
    }

    const userIds = leaders.map((leader) => leader.user_id);
    const { data: wallets, error: walletError } = await admin
      .from('embedded_wallets')
      .select('user_id,network,address')
      .in('user_id', userIds);
    if (walletError) throw walletError;
    const walletMap = new Map((wallets || [])
      .filter((wallet) => wallet.network === 'testnet' && CLASSIC_ADDRESS_RE.test(String(wallet.address || '')))
      .map((wallet) => [String(wallet.user_id), String(wallet.address)]));
    const missing = userIds.filter((userId) => !walletMap.has(String(userId)));
    if (missing.length) {
      await updateSettlementConfig(admin, row, retryPatch('blocked', `${missing.length} participant wallet(s) are unavailable for Testnet settlement.`, 10_000));
      return row;
    }

    const participantRows = leaders.map((leader) => ({
      walletAddress: walletMap.get(String(leader.user_id)),
      externalUserId: String(leader.user_id),
      metadata: { source: 'money_rain_final', rank: leader.rank, pickups: leader.pickups },
    }));
    await payloadIntegrationRequest(`/api/integrations/v1/campaigns/${encodeURIComponent(campaignId)}/participants`, { participants: participantRows });

    const results = leaders.map((leader) => ({
      walletAddress: walletMap.get(String(leader.user_id)),
      amount: moneyRainAmountForPoints(leader.points, config.reward_point_drops),
      externalUserId: String(leader.user_id),
      rank: Number(leader.rank),
      metadata: { points: Number(leader.points), pickups: Number(leader.pickups) },
    }));
    const canonicalResults = [...results].sort((a, b) => a.walletAddress.localeCompare(b.walletAddress));
    const canonicalResultPackage = {
      integration: 'atm_town',
      integrationCampaignId: campaignId,
      externalCampaignId: String(payload.external_campaign_id),
      externalEventId: String(row.id),
      kind: 'atm_town_money_rain',
      network: 'testnet',
      asset: { type: 'xrp' },
      poolAmount: String(config.reward_pool_xrp),
      results: canonicalResults.map((result) => ({
        walletAddress: result.walletAddress,
        amount: result.amount,
        externalUserId: result.externalUserId,
        rank: result.rank,
      })),
    };
    const resultsHash = stablePayloadHash(canonicalResultPackage);
    const finalized = await payloadIntegrationRequest(`/api/integrations/v1/campaigns/${encodeURIComponent(campaignId)}/results`, {
      externalResultsHash: resultsHash,
      results,
      metadata: { world_event_id: row.id, point_pool: Number(POINT_POOL), claimed_points: leaders.reduce((sum, leader) => sum + Number(leader.points || 0), 0) },
    }, { timeoutMs: 20_000 });

    const execute = await payloadIntegrationRequest(`/api/integrations/v1/campaigns/${encodeURIComponent(campaignId)}/execute`, {}, { timeoutMs: 30_000 });
    const complete = execute?.complete === true || execute?.campaignStatus === 'completed';
    await updateSettlementConfig(admin, row, {
      settlement_status: complete ? 'completed' : String(execute?.campaignStatus || 'executing'),
      settlement_error: null,
      results_hash: String(finalized?.resultsHash || resultsHash),
      manifest_hash: String(finalized?.manifestHash || payload.manifest_hash || ''),
      next_action_at: complete ? 0 : Date.now() + Number(execute?.retryAfterMs || 3_000),
      payout_progress: execute?.progress || null,
    });
    return row;
  } catch (error) {
    console.error('[payload-money-rain] settlement step failed:', error);
    await updateSettlementConfig(admin, row, retryPatch('retrying', error?.message || 'Payload settlement failed.'));
    return row;
  }
}

export function payloadDraftFromToken(token, userId) {
  return verifyPayloadDraftToken(token, userId);
}

export function rewardPoolDetails(poolXrp) {
  const pool = normalizePoolXrp(poolXrp);
  return { pool_xrp: pool.xrp, point_drops: pool.pointDrops.toString(), point_value_xrp: dropsToXrp(pool.pointDrops) };
}
