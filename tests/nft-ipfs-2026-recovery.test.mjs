import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMetadata} from '../api/xrpl-nft-metadata.js';
import {trustedArtworkUrls} from '../lib/nft-donation-artwork.js';

const A='A'.repeat(64),B='B'.repeat(64);
const cid1='Qm'+'a'.repeat(44),cid2='Qm'+'b'.repeat(44);
function embedded(value){return Buffer.from('data:application/json,'+JSON.stringify(value)).toString('hex').toUpperCase();}

test('NFT metadata offers independent 2026 IPFS mirrors before retired endpoints',async()=>{
  const m=await resolveMetadata(embedded({name:'Example',image:'ipfs://'+cid1}),A);
  assert.equal(m.status,'resolved');
  assert.equal(m.name,'Example');
  assert.equal(m.image_candidates[0],'https://gateway.pinata.cloud/ipfs/'+cid1);
  assert.ok(m.image_candidates.some(url=>url.startsWith('https://ipfs.filebase.io/ipfs/')));
  assert.ok(m.image_candidates.some(url=>url.startsWith('https://gateway.lighthouse.storage/ipfs/')));
  assert.ok(m.image_candidates.indexOf('https://ipfs.io/ipfs/'+cid1)>m.image_candidates.indexOf('https://ipfs.filebase.io/ipfs/'+cid1));
});

test('mixes an alternate thumbnail ahead of dead gateways for primary art',async()=>{
  const m=await resolveMetadata(embedded({image:'ipfs://'+cid1,thumbnail:'ipfs://'+cid2}),B);
  assert.equal(m.image_candidates[0],'https://gateway.pinata.cloud/ipfs/'+cid1);
  assert.equal(m.image_candidates[1],'https://gateway.pinata.cloud/ipfs/'+cid2);
  assert.equal(m.image_candidates[2],'https://ipfs.filebase.io/ipfs/'+cid1);
  assert.ok(m.image_candidates.length>=12);
});

test('donation artwork also tries independent mirrors with encoded paths',()=>{
  const urls=trustedArtworkUrls(['ipfs://'+cid1+'/Art #50.png']);
  assert.equal(urls[0],'https://gateway.pinata.cloud/ipfs/'+cid1+'/Art%20%2350.png');
  assert.ok(urls.some(url=>url.startsWith('https://ipfs.filebase.io/ipfs/')));
});
