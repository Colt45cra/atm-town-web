import test from 'node:test';
import { execFileSync } from 'node:child_process';
import codec from '../lib/xrpl-swap-codec.cjs';
import assert from 'node:assert/strict';
import { Wallet, hashes, signMultiBatch, encode, decode } from 'xrpl';
import { buildNftSwapBatch, verifySwapResults, nftOfferId, ALL_OR_NOTHING, INNER_BATCH } from '../lib/xrpl-nft-swap.js';
const a = Wallet.generate(), b = Wallet.generate();
const batch = buildNftSwapBatch({ walletA: a.address, walletB: b.address, tokenA: 'A'.repeat(64), tokenB: 'B'.repeat(64), sequenceA: 100, sequenceB: 200, ledgerIndex: 107000000, expiration: 850000000, fee: '140' });
const hash = 'C'.repeat(64);
function results() {
  const outer = { tx_json: structuredClone(batch), meta: { TransactionResult: 'tesSUCCESS' }, validated: true, ledger_index: 107000001, hash };
  const inner = batch.RawTransactions.map(t => ({ tx_json: structuredClone(t.RawTransaction), meta: { TransactionResult: 'tesSUCCESS', ParentBatchID: hash }, validated: true, ledger_index: outer.ledger_index }));
  return { outer, inner };
}
test('creates and consumes both recipient-restricted offers inside one all-or-nothing batch', () => {
  assert.equal(batch.Flags, ALL_OR_NOTHING);
  assert.deepEqual(batch.RawTransactions.map(t => t.RawTransaction.Sequence), [101, 200, 201, 102]);
  assert.equal(batch.RawTransactions[0].RawTransaction.Destination, b.address);
  assert.equal(batch.RawTransactions[1].RawTransaction.Destination, a.address);
  assert.equal(batch.RawTransactions[2].RawTransaction.NFTokenSellOffer, nftOfferId(a.address, 101));
  assert.equal(batch.RawTransactions[3].RawTransaction.NFTokenSellOffer, nftOfferId(b.address, 200));
  for (const { RawTransaction: t } of batch.RawTransactions) {
    assert.equal(t.Flags & INNER_BATCH, INNER_BATCH); assert.equal(t.Fee, '0'); assert.equal(t.SigningPubKey, '');
    assert.equal(t.TxnSignature, undefined); assert.equal(t.LastLedgerSequence, undefined);
  }
});
test('actual second-wallet batch signature and first-wallet outer signature serialize with current XRPL codec', () => {
  const tx = structuredClone(batch);
  signMultiBatch(b, tx);
  assert.equal(tx.BatchSigners[0].BatchSigner.Account, b.address);
  const signed = a.sign(tx);
  assert.equal(decode(signed.tx_blob).TransactionType, 'Batch');
  assert.equal(signed.hash, hashes.hashSignedTx(signed.tx_blob));
  assert.ok(encode(tx));
});
test('only confirms all four validated inner transactions with same ledger and parent batch', () => {
  const { outer, inner } = results(); assert.equal(verifySwapResults(batch, outer, inner), 'completed');
});
test('outer tesSUCCESS alone never confirms NFT exchange', () => {
  const { outer } = results(); assert.equal(verifySwapResults(batch, outer, [null, null, null, null]), 'pending');
});
test('rejects partial failure and different parent batch', () => {
  let { outer, inner } = results(); inner[3].meta.TransactionResult = 'tecNO_PERMISSION'; assert.equal(verifySwapResults(batch, outer, inner), 'failed');
  ({ outer, inner } = results()); inner[0].meta.ParentBatchID = 'D'.repeat(64); assert.equal(verifySwapResults(batch, outer, inner), 'failed');
});
test('rejects altered terms, unsafe batch mode, fees and mismatched ledger', () => {
  for (const edit of [r => r.outer.tx_json.Flags = 524288, r => r.outer.tx_json.Fee = '999999', r => r.outer.tx_json.RawTransactions[0].RawTransaction.NFTokenID = 'E'.repeat(64), r => r.inner[1].ledger_index++]) {
    const r = results(); edit(r); assert.equal(verifySwapResults(batch, r.outer, r.inner), 'failed');
  }
});
test('awaits validation and rejects self swaps', () => {
  const { outer, inner } = results(); outer.validated = false; assert.equal(verifySwapResults(batch, outer, inner), 'pending');
  assert.throws(() => buildNftSwapBatch({ walletA: a.address, walletB: a.address, tokenA: 'A'.repeat(64), tokenB: 'B'.repeat(64) }));
});

test('Xaman inner approval is sign-only; final request submits with the same frozen terms', async () => {
  const { createSwapPayload } = await import('../lib/xrpl-nft-swap.js');
  const oldFetch = global.fetch;
  process.env.XAMAN_API_KEY = 'test'; process.env.XAMAN_API_SECRET = 'test';
  const sent = [];
  global.fetch = async (_url, opts) => { sent.push(JSON.parse(opts.body)); return new Response(JSON.stringify({ uuid: '00000000-0000-0000-0000-000000000001', next: { always: 'https://xumm.app/sign/test' } })); };
  try {
    await createSwapPayload(batch, { id: 'test', signer: b.address, submit: false });
    await createSwapPayload({ ...batch, BatchSigners: ['00000000-0000-0000-0000-000000000001'] }, { id: 'test', submit: true });
    assert.equal(sent[0].options.submit, false); assert.equal(sent[0].options.signer, b.address);
    assert.equal(sent[1].options.submit, true); assert.equal(sent[1].options.signer, undefined);
    assert.deepEqual(sent[0].txjson.RawTransactions, sent[1].txjson.RawTransactions);
    assert.equal(sent[1].txjson.Account, a.address);
  } finally { global.fetch = oldFetch; }
});
test('rejects a signed request from a wallet other than the counterparty', async () => {
  const { signatureState } = await import('../lib/xrpl-nft-swap.js'); const oldFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ meta: { resolved: true, signed: true }, response: { account: a.address } }));
  try { assert.equal((await signatureState('00000000-0000-0000-0000-000000000001', b.address)).status, 'failed'); } finally { global.fetch = oldFetch; }
});
test('feature gating requires Mainnet and the repaired BatchV1_1 amendment', async () => {
  const { batchCapability, BATCH_AMENDMENT } = await import('../lib/xrpl-nft-swap.js'); const oldFetch = global.fetch;
  let network = 0, enabled = true;
  global.fetch = async (_url, opts) => { const body = JSON.parse(opts.body); return new Response(JSON.stringify({ result: body.method === 'feature' ? { [BATCH_AMENDMENT]: { enabled } } : { info: { network_id: network } } })); };
  try { assert.equal(await batchCapability(), true); network = 1; assert.equal(await batchCapability(), false); network = 0; enabled = false; assert.equal(await batchCapability(), false); } finally { global.fetch = oldFetch; }
});
test('swap operations require authentication and reject invalid request methods', async () => {
  const { default: handler } = await import('../server/xrpl-nft-swap.js');
  const response = () => ({ statusCode: 200, setHeader() {}, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; } });
  const oldError = console.error; console.error = () => {};
  try {
    let res = response(); await handler({ method: 'POST', headers: {}, query: { action: 'swap-propose' } }, res); assert.equal(res.statusCode, 401);
    res = response(); await handler({ method: 'GET', headers: {}, query: { action: 'swap-finalize' } }, res); assert.equal(res.statusCode, 405);
  } finally { console.error = oldError; }
});

test('bundled codec matches SDK transaction hashes and loads without require-ESM support', () => {
  for (const { RawTransaction: tx } of batch.RawTransactions) assert.equal(codec.hashSignedTx(tx), hashes.hashSignedTx(tx));
  execFileSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e', "await import('./api/xrpl-nft-trade.js'); await import('./server/xrpl-nft-swap.js');"], { cwd: process.cwd() });
});
