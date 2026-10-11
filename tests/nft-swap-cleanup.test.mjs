import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupObsoleteSwapRequest, innerBatchSignatureError } from '../lib/xrpl-nft-swap.js';
const uuid = '00000000-0000-0000-0000-000000000001';
process.env.XAMAN_API_KEY = 'test'; process.env.XAMAN_API_SECRET = 'test';
test('obsolete pending approvals are cancelled, submitting and active requests are preserved', async () => {
  const oldFetch = global.fetch;
  let meta = { resolved: false, submit: false }, calls = [];
  global.fetch = async (_url, opts) => {
    calls.push(opts.method);
    return new Response(JSON.stringify({ meta }));
  };
  const swap = { status: 'failed', inner_payload: { uuid } };
  try {
    assert.equal(await cleanupObsoleteSwapRequest(swap), true);
    assert.deepEqual(calls, ['GET', 'DELETE']);
    for (const submit of [true, undefined]) {
      calls = []; meta = { submit };
      assert.equal(await cleanupObsoleteSwapRequest(swap), false);
      assert.deepEqual(calls, ['GET']);
    }
    for (const patch of [{ status: 'signing' }, { status: 'ready' }, { status: 'settling' }, { final_payload: { uuid } }, { tx_hash: 'A'.repeat(64) }, { inner_payload: { uuid, cleanup_done: true } }]) {
      calls = [];
      assert.equal(await cleanupObsoleteSwapRequest({ ...swap, ...patch }), false);
      assert.deepEqual(calls, []);
    }
    calls = []; meta = { resolved: true, signed: true, submit: false };
    assert.equal(await cleanupObsoleteSwapRequest(swap), true);
    assert.deepEqual(calls, ['GET']);
    meta = { resolved: false, submit: false };
    global.fetch = async (_url, opts) => new Response(JSON.stringify({ meta }), { status: opts.method === 'DELETE' ? 503 : 200 });
    assert.equal(await cleanupObsoleteSwapRequest(swap), false);
  } finally { global.fetch = oldFetch; }
});
test('missing and malformed signed responses do not blame an unobserved wallet version', () => {
  assert.equal(innerBatchSignatureError(null, '', {}), 'Xaman returned no signed transaction to verify.');
  assert.equal(innerBatchSignatureError('INVALID', '', {}), 'The signed Batch response could not be decoded or verified.');
});
