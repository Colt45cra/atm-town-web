import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.listeners = {}; this.queries = new Map(); this.style = {}; this.classList = { add() {}, contains: () => false, toggle() {} }; this.isConnected = true; this.value = ''; }
  set textContent(value) { this.text = value; this.children = []; }
  get textContent() { return (this.text || '') + this.children.map(n => n.textContent).join(''); }
  set innerHTML(_) { this.children = []; }
  setAttribute() {}
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.append(item); return item; }
  get firstChild() { return this.children[0]; }
  querySelector(key) { if (!this.queries.has(key)) this.queries.set(key, new Element()); return this.queries.get(key); }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
}
const A = 'A'.repeat(64), B = 'B'.repeat(64), C = 'C'.repeat(64);
const id = '12345678-1234-1234-1234-123456789abc';
function setup({ own = B, role = 'proposer', wallet = 'mine', deferred = null } = {}) {
  const body = new Element(), calls = [], notices = [];
  const local = own ? { active: true, mode: 'open_to_trade', tokenId: own, name: 'Beacon NFT', wallet: 'mine' } : null;
  const remote = { map: 'town', lastSeen: Date.now(), name: 'Other player', x: 20, y: 20 };
  const s = { id, role, status: 'offered', offered_name: 'Beacon NFT', requested_name: 'Their NFT', offered_token_id: B, requested_token_id: C, wallet_a: 'other', wallet_b: wallet };
  const context = vm.createContext({ document: { body, activeElement: new Element(), hidden: false, createElement: tag => new Element(tag), getElementById: () => null },
    window: { addEventListener() {}, location: { assign() { throw Error('Must not sign automatically'); } } }, navigator: { userAgent: 'Test' },
    setTimeout() {}, setInterval() {}, URL, Date, Math, authSession: { user: { id: 'user' } },
    lockerWalletAddress: () => 'mine', lockerState: { nfts: [A, B].map(tokenId => ({ tokenId, Flags: 8, transferable: true })) },
    lockerRefreshXrpl: async () => { if (deferred) await deferred; }, tradeBeaconValidateOwnership() {}, tradeBeaconBroadcastPayload: () => local,
    lockerNftTokenId: n => n.tokenId, lockerNftDisplayName: n => n.tokenId === B ? 'Beacon NFT' : 'First NFT', lockerNftShortToken: n => n.tokenId.slice(0, 8), lockerNftImageNode: () => new Element('img'),
    showXrplPaymentToast() {}, dialogOpen: false, vendingOpen: false, joy: { x: 1, y: 1 }, knob: new Element(), tradeNftClose() {},
    realtimeChannel: { send: data => notices.push(data.payload) }, onlineMode: true, playerId: 'local', currentMap: 'town', player: { x: 0, y: 0 }, remotePlayers: new Map([['remote', remote]]),
    fetch: async () => ({ json: async () => ({ enabled: true }) }),
    apiWithAuth: async (url, opts) => { calls.push({ url, body: opts?.body ? JSON.parse(opts.body) : null }); return url.includes('swap-propose') ? { id } : s; }
  });
  vm.runInContext(fs.readFileSync(new URL('../js/nft-swaps.js', import.meta.url), 'utf8'), context);
  const panel = body.children[0], content = panel.querySelector('#nftSwapContent');
  return { context, panel, content, calls, notices, api: context.window.atmNftSwaps, target: { remoteId: 'remote', beacon: { tokenId: C, name: 'Their NFT', wallet: 'other', mode: 'open_to_trade', transferable: true } } };
}
test('beacon trade uses the beacon NFT even when it is not first in inventory, and hints both windows', async () => {
  const t = setup(); await t.api.openProposal(t.target);
  assert.equal(t.calls.find(c => c.body)?.body.offered_token_id, B);
  assert.deepEqual(t.notices.map(n => n.type), ['invite', 'proposal']);
  assert.ok(t.panel.open); assert.equal(t.context.dialogOpen, true); assert.equal(t.context.joy.x, 0);
  assert.ok(t.content.textContent.includes('Beacon NFT')); assert.equal(t.calls.some(c => /swap-(sign|finalize)/.test(c.url)), false);
});
test('without a beacon, no inventory NFT is silently selected or proposed', async () => {
  const t = setup({ own: null }); await t.api.openProposal(t.target);
  const select = t.content.children.find(n => n.tag === 'select'), send = t.content.children.find(n => n.tag === 'button');
  assert.equal(select.value, ''); assert.equal(send.disabled, true); assert.equal(t.calls.length, 0);
  select.value = B; select.listeners.change(); assert.equal(send.disabled, false); await send.listeners.click();
  assert.equal(t.calls.find(c => c.body).body.offered_token_id, B);
});
test('a stale beacon NFT falls back to choosing rather than trading the first NFT', async () => {
  const t = setup({ own: C }); await t.api.openProposal(t.target);
  assert.equal(t.content.children.find(n => n.tag === 'select').value, ''); assert.equal(t.calls.length, 0);
});
test('recipient sees invitation immediately and authoritative terms when the proposal arrives', async () => {
  const t = setup({ role: 'recipient' });
  await t.api.receiveNotice({ type: 'invite', senderId: 'remote', targetId: 'local', tokenId: B });
  assert.ok(t.panel.open); assert.ok(t.content.textContent.includes('wants to trade')); assert.equal(t.calls.length, 0);
  await t.api.receiveNotice({ type: 'proposal', senderId: 'remote', targetId: 'local', id });
  assert.ok(t.content.textContent.includes('REVIEW & SIGN WITH XAMAN')); assert.equal(t.calls.length, 1);
});
test('wrong destination or unverified recipient cannot open a trade via broadcast', async () => {
  const t = setup({ role: 'recipient', wallet: 'someone-else' });
  await t.api.receiveNotice({ type: 'invite', senderId: 'remote', targetId: 'wrong', tokenId: B });
  await t.api.receiveNotice({ type: 'proposal', senderId: 'remote', targetId: 'local', id });
  assert.equal(t.panel.open, undefined);
});
test('closing while wallet loads prevents an automatic proposal or late UI changes', async () => {
  let release; const wait = new Promise(resolve => { release = resolve; });
  const t = setup({ deferred: wait }), opening = t.api.openProposal(t.target);
  await new Promise(resolve => setImmediate(resolve));
  t.panel.querySelector('.nftSwapHeader button').listeners.click(); release(); await opening;
  assert.equal(t.panel.open, false); assert.equal(t.context.dialogOpen, false); assert.equal(t.calls.length, 0);
});
