import test from 'node:test';
import assert from 'node:assert/strict';
import { trustedArtworkUrls, fetchDonationArtwork } from '../lib/nft-donation-artwork.js';

function fakeResponse(type,bytes) {
  const body = new ReadableStream({start(controller){controller.enqueue(new Uint8Array(bytes));controller.close();}});
  return {ok:true,headers:{get:key=>key==='content-type'?type:key==='content-length'?String(bytes.length):null},body};
}

test('NFT artwork proxy accepts only public named IPFS and Arweave gateways',()=>{
  const cid='Qm'+'a'.repeat(44);
  const urls=trustedArtworkUrls([
    'https://127.0.0.1/private.png',
    'https://evil.example/ipfs/'+cid,
    'http://ipfs.io/ipfs/'+cid,
    'file:///etc/passwd',
    'ipfs://'+cid+'/Ticket #123.png',
    'https://arweave.net/'+'A'.repeat(43)
  ]);
  assert.equal(urls.some(url=>url.includes('127.0.0.1')||url.includes('evil.example')||url.startsWith('http:')),false);
  assert.equal(urls.some(url=>url.includes('/Ticket%20%23123.png')),true);
  assert.equal(urls.some(url=>url.startsWith('https://arweave.net/')),true);
  assert.equal(urls.some(url=>url.startsWith('https://ipfs.io/ipfs/')),true);
});

test('image fallback races independent gateways, keeps only bounded image bytes',async()=>{
  const cid='Qm'+'b'.repeat(44),visited=[];
  const image=await fetchDonationArtwork(['ipfs://'+cid],{fetchImpl:async url=>{
    visited.push(url);
    if(url.includes('ipfs.io'))throw Error('IPFS unavailable');
    return fakeResponse('image/png',[137,80,78,71,13,10,26,10]);
  }});
  assert.equal(image.contentType,'image/png');
  assert.equal(image.body.length,8);
  assert.ok(visited.length>=2);
});

test('proxy rejects HTML and oversized responses from gateway',async()=>{
  const cid='Qm'+'c'.repeat(44);
  await assert.rejects(fetchDonationArtwork(['ipfs://'+cid],{
    fetchImpl:async()=>fakeResponse('text/html',[60,104,116,109,108,62])
  }),AggregateError);
  const huge=new Uint8Array(3_000_001);
  await assert.rejects(fetchDonationArtwork(['ipfs://'+cid],{
    fetchImpl:async()=>fakeResponse('image/png',huge)
  }),AggregateError);
});
