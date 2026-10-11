import test from 'node:test';
import assert from 'node:assert/strict';
import { BATCH_AMENDMENT, prepareSwapBatch, checkSwapSequences } from '../lib/xrpl-nft-swap.js';

const swap = { wallet_a: 'rBFiKoUpq11CrQWnAGFtAtAuMNf1aaKLrg', wallet_b: 'ra3HM6w8crt8oM4JcgggdpjTfJbHiYCW4H', token_a: 'A'.repeat(64), token_b: 'B'.repeat(64) };
function mockRpc({ queued = 0, pending = 0, changed = 0 } = {}) {
  const requests = [], original = global.fetch;
  global.fetch = async (_url, opts) => {
    const { method, params: [p] } = JSON.parse(opts.body); requests.push({ method, ...p });
    let result;
    if (method === 'feature') result = { [BATCH_AMENDMENT]: { enabled: true } };
    else if (method === 'server_info') result = { info: { network_id: 0 } };
    else if (method === 'account_nfts') result = { account_nfts: [{ NFTokenID: p.account === swap.wallet_a ? swap.token_a : swap.token_b, Flags: 8 }] };
    else if (method === 'account_info') {
      // Reproduce the exact mainnet error instead of accepting illegal params.
      if (p.queue && p.ledger_index !== 'current') result = { status: 'error', error: 'invalidParams', error_message: 'Invalid parameters.' };
      else result = { validated: p.ledger_index === 'validated', ledger_index: 100000000, account_data: { Sequence: (p.account === swap.wallet_a ? 100 : 200) + changed + (p.ledger_index === 'current' ? pending : 0) }, ...(p.queue ? { queue_data: { txn_count: queued } } : {}) };
    } else if (method === 'fee') result = { drops: { open_ledger_fee: '10' } };
    else if (method === 'ledger') result = { ledger_index: 100000001 };
    else throw Error('Unexpected RPC method: ' + method);
    return new Response(JSON.stringify({ result }));
  };
  return { requests, restore() { global.fetch = original; } };
}
test('prepares and rechecks a batch using legal queue queries and validated sequences', async () => {
  const m = mockRpc();
  try {
    const batch = await prepareSwapBatch(swap);
    assert.equal(batch.Sequence, 100); assert.equal(batch.RawTransactions[1].RawTransaction.Sequence, 200); assert.equal(batch.Fee, '140');
    await checkSwapSequences({ ...swap, batch_json: batch });
    const accounts = m.requests.filter(r => r.method === 'account_info');
    assert.equal(accounts.length, 8);
    assert.ok(accounts.every(r => r.queue ? r.ledger_index === 'current' : r.ledger_index === 'validated'));
  } finally { m.restore(); }
});
test('pending queued and open-ledger transactions both block signing', async () => {
  for (const state of [{ queued: 1 }, { pending: 1 }]) {
    const m = mockRpc(state);
    try { await assert.rejects(prepareSwapBatch(swap), /pending transactions/); } finally { m.restore(); }
  }
});
test('a changed wallet sequence still prevents finalizing previously signed terms', async () => {
  let m = mockRpc(), batch;
  try { batch = await prepareSwapBatch(swap); } finally { m.restore(); }
  m = mockRpc({ changed: 1 });
  try { await assert.rejects(checkSwapSequences({ ...swap, batch_json: batch }), /wallet changed/); } finally { m.restore(); }
});
