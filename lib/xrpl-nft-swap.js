import { createHash } from 'node:crypto';
import { decodeAccountID, hashes, validate } from 'xrpl';
import { rpc, findOwnedNft } from './xrpl-nft-trading.js';
import { readJson, XAMAN_API_BASE, xamanHeaders, xamanError, fetchXamanPayload } from './xaman-vending.js';

export const BATCH_AMENDMENT = '9F287AED3CDB50A7BD1ACEC24296A30C9B5230CCD136219317AC790E3B884377';
export const ALL_OR_NOTHING = 65536;
export const INNER_BATCH = 1073741824;
export const terminalSwap = status => ['completed', 'cancelled', 'expired', 'failed', 'rejected'].includes(status);
export const swapError = (message, status = 409) => Object.assign(new Error(message), { status });

// rippled keylet::nftokenOffer uses LedgerNameSpace::NftokenOffer ('q').
export function nftOfferId(account, sequence) {
  const seq = Buffer.alloc(4); seq.writeUInt32BE(sequence);
  return createHash('sha512').update(Buffer.concat([Buffer.from('0071', 'hex'), Buffer.from(decodeAccountID(account)), seq])).digest('hex').slice(0, 64).toUpperCase();
}
export function buildNftSwapBatch({ walletA, walletB, tokenA, tokenB, sequenceA, sequenceB, ledgerIndex, expiration, fee }) {
  if (walletA === walletB || tokenA === tokenB) throw swapError('Choose two different wallets and NFTs.');
  if (![sequenceA, sequenceB, ledgerIndex, expiration].every(n => Number.isSafeInteger(n) && n > 0 && n < 0xffffffff - 151)) throw swapError('XRPL returned invalid transaction sequencing.');
  const inner = (account, sequence, fields) => ({ RawTransaction: { Account: account, Sequence: sequence, Fee: '0', SigningPubKey: '', Flags: INNER_BATCH, ...fields } });
  const batch = {
    TransactionType: 'Batch', Account: walletA, Sequence: sequenceA, Fee: fee, Flags: ALL_OR_NOTHING,
    LastLedgerSequence: ledgerIndex + 150,
    RawTransactions: [
      inner(walletA, sequenceA + 1, { TransactionType: 'NFTokenCreateOffer', NFTokenID: tokenA, Destination: walletB, Amount: '0', Expiration: expiration, Flags: INNER_BATCH + 1 }),
      inner(walletB, sequenceB, { TransactionType: 'NFTokenCreateOffer', NFTokenID: tokenB, Destination: walletA, Amount: '0', Expiration: expiration, Flags: INNER_BATCH + 1 }),
      inner(walletB, sequenceB + 1, { TransactionType: 'NFTokenAcceptOffer', NFTokenSellOffer: nftOfferId(walletA, sequenceA + 1) }),
      inner(walletA, sequenceA + 2, { TransactionType: 'NFTokenAcceptOffer', NFTokenSellOffer: nftOfferId(walletB, sequenceB) })
    ]
  };
  validate(batch);
  batch.RawTransactions.forEach(t => validate(t.RawTransaction));
  return batch;
}
export async function batchCapability() {
  const [result, server] = await Promise.all([rpc('feature', { feature: BATCH_AMENDMENT }), rpc('server_info', {})]);
  return server.info?.network_id === 0 && (result?.[BATCH_AMENDMENT]?.enabled === true || result?.features?.[BATCH_AMENDMENT]?.enabled === true);
}
export async function checkSwapOwnership(swap) {
  const [a, b] = await Promise.all([findOwnedNft(swap.wallet_a, swap.token_a), findOwnedNft(swap.wallet_b, swap.token_b)]);
  if (!a || !b) throw swapError('One of these NFTs is no longer owned by the agreed wallet. Create a new proposal.');
  if ([a, b].some(n => (Number(n.Flags || 0) & 8) === 0)) throw swapError('Both NFTs must be transferable.');
}
export async function prepareSwapBatch(swap) {
  if (!await batchCapability()) throw swapError('Atomic NFT trades are unavailable on this XRPL server.', 503);
  await checkSwapOwnership(swap);
  const [a, b, fee] = await Promise.all([
    rpc('account_info', { account: swap.wallet_a, ledger_index: 'validated', queue: true }),
    rpc('account_info', { account: swap.wallet_b, ledger_index: 'validated', queue: true }),
    rpc('fee', {})
  ]);
  if (Number(a.queue_data?.txn_count || 0) || Number(b.queue_data?.txn_count || 0)) throw swapError('Wait for both wallets’ pending transactions to finish before trading.');
  // Two base fees + four inner fees + one BatchSigner fee. Double for headroom.
  const base = BigInt(fee.drops?.open_ledger_fee || fee.drops?.base_fee || '10');
  const drops = base * 14n;
  if (drops <= 0n || drops > 100000n) throw swapError('XRPL fees are unusually high. Try again later.');
  return buildNftSwapBatch({ walletA: swap.wallet_a, walletB: swap.wallet_b, tokenA: swap.token_a, tokenB: swap.token_b,
    sequenceA: Number(a.account_data?.Sequence), sequenceB: Number(b.account_data?.Sequence), ledgerIndex: Math.max(Number(a.ledger_index), Number(b.ledger_index)),
    expiration: Math.floor(Date.now() / 1000) - 946684800 + 600, fee: drops.toString() });
}
export async function checkSwapSequences(swap) {
  await checkSwapOwnership(swap);
  const batch = swap.batch_json;
  const [a, b, ledger] = await Promise.all([
    rpc('account_info', { account: swap.wallet_a, ledger_index: 'validated', queue: true }),
    rpc('account_info', { account: swap.wallet_b, ledger_index: 'validated', queue: true }), rpc('ledger', { ledger_index: 'validated' })
  ]);
  if (Number(ledger.ledger_index) >= batch.LastLedgerSequence) throw swapError('This signature window has expired. Create a new proposal.');
  if (Number(a.account_data?.Sequence) !== batch.Sequence || Number(b.account_data?.Sequence) !== batch.RawTransactions[1].RawTransaction.Sequence || Number(a.queue_data?.txn_count || 0) || Number(b.queue_data?.txn_count || 0)) throw swapError('A wallet changed while this trade was waiting. Create a new proposal to sign fresh terms.');
}
export async function createSwapPayload(batch, { id, signer, submit }) {
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST', headers: xamanHeaders(), cache: 'no-store',
    body: JSON.stringify({ txjson: batch, options: { submit, expire: 10, force_network: 'MAINNET', ...(signer ? { signer } : {}) },
      custom_meta: { identifier: id, instruction: 'ATM Town NFT swap: review BOTH NFTs and wallet addresses. Both transfers must succeed together. Only the displayed network fee is paid in XRP.' } })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) throw xamanError(created, 'Xaman could not prepare this atomic NFT trade. Update Xaman and try again');
  return { uuid: created.uuid, deeplink: created.next.always, qr_png: created.refs?.qr_png || null };
}
export async function signatureState(uuid, expectedWallet) {
  const lookup = await fetchXamanPayload(uuid);
  if (!lookup.found) return { status: 'failed', error: 'Xaman sign request could not be found.' };
  const { meta = {}, response = {} } = lookup.payload || {};
  if (meta.cancelled) return { status: 'rejected' };
  if (!meta.resolved) return { status: meta.expired ? 'expired' : 'pending' };
  if (!meta.signed) return { status: 'rejected' };
  if (response.account !== expectedWallet) return { status: 'failed', error: 'A different wallet signed this trade.' };
  return { status: 'signed', tx_hash: response.txid || null };
}
function parts(result) { return { tx: result.tx_json || result.tx || result, meta: result.meta || result.metaData || {} }; }
export function verifySwapResults(batch, outer, innerResults) {
  if (!outer?.validated) return 'pending';
  const { tx, meta } = parts(outer);
  if (meta.TransactionResult !== 'tesSUCCESS') return 'failed';
  if (tx.TransactionType !== 'Batch' || (Number(tx.Flags) & ~0x80000000) !== ALL_OR_NOTHING || tx.Account !== batch.Account || tx.Sequence !== batch.Sequence || tx.LastLedgerSequence !== batch.LastLedgerSequence || String(tx.Fee) !== batch.Fee) return 'failed';
  if (!Array.isArray(tx.RawTransactions) || tx.RawTransactions.length !== 4 || tx.RawTransactions.some((t, i) => hashes.hashSignedTx(t.RawTransaction) !== hashes.hashSignedTx(batch.RawTransactions[i].RawTransaction))) return 'failed';
  if (innerResults.length !== 4 || innerResults.some(r => !r?.validated)) return 'pending';
  for (let i = 0; i < 4; i++) {
    const p = parts(innerResults[i]);
    if (p.meta.TransactionResult !== 'tesSUCCESS' || hashes.hashSignedTx(p.tx) !== hashes.hashSignedTx(batch.RawTransactions[i].RawTransaction) || innerResults[i].ledger_index !== outer.ledger_index) return 'failed';
    if (String(p.meta.ParentBatchID || p.tx.ParentBatchID || '').toUpperCase() !== String(outer.hash || outer.tx_json?.hash || '').toUpperCase()) return 'failed';
  }
  return 'completed';
}
export async function settleSwap(swap) {
  const signed = await signatureState(swap.final_payload.uuid, swap.wallet_a);
  if (signed.status !== 'signed') return signed;
  if (!/^[A-F0-9]{64}$/i.test(signed.tx_hash || '')) return { status: 'pending' };
  let outer;
  try { outer = await rpc('tx', { transaction: signed.tx_hash, binary: false, api_version: 2 }); } catch { return { status: 'pending', tx_hash: signed.tx_hash }; }
  outer.hash = signed.tx_hash.toUpperCase();
  const inner = await Promise.all(swap.batch_json.RawTransactions.map(async t => {
    try { return await rpc('tx', { transaction: hashes.hashSignedTx(t.RawTransaction), binary: false, api_version: 2 }); } catch { return null; }
  }));
  const status = verifySwapResults(swap.batch_json, outer, inner);
  // All-or-nothing rollback omits failed/skipped inner transactions. Once the
  // outer ledger is validated, query that exact ledger (not only a tx indexer).
  if (status === 'pending' && outer.validated && parts(outer).meta.TransactionResult === 'tesSUCCESS') {
    const ledger = await rpc('ledger', { ledger_index: outer.ledger_index, transactions: true, expand: true, api_version: 2 });
    const transactions = ledger.ledger?.transactions;
    if (Array.isArray(transactions)) {
      const results = swap.batch_json.RawTransactions.map(t => {
        const hash = hashes.hashSignedTx(t.RawTransaction);
        const found = transactions.find(x => String(x.hash || x.tx_json?.hash || '').toUpperCase() === hash);
        return found ? { ...found, validated: true, ledger_index: outer.ledger_index } : null;
      });
      if (results.some(x => !x)) return { status: 'failed', tx_hash: signed.tx_hash, error: 'The atomic trade did not apply. Neither NFT was exchanged.' };
      return { status: verifySwapResults(swap.batch_json, outer, results), tx_hash: signed.tx_hash };
    }
  }
  return { status, tx_hash: signed.tx_hash, ...(status === 'failed' ? { error: 'The atomic trade did not match or succeed. Neither NFT is marked exchanged.' } : {}) };
}
