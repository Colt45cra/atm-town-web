import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const core=fs.readFileSync(new URL('js/runtime/game-core.js',root),'utf8');
const recovery=fs.readFileSync(new URL('js/nft-performance.js',root),'utf8');
const metadata=fs.readFileSync(new URL('api/xrpl-nft-metadata.js',root),'utf8');
const relay=metadata;
const page=fs.readFileSync(new URL('index.html',root),'utf8');

test('mobile NFT recovery is loaded after core and scripts remain valid',()=>{
 assert.ok(page.indexOf('js/nft-performance.js?v=locker-art-relay-1')>page.indexOf('js/runtime/game-core.js'));
 assert.doesNotThrow(()=>new vm.Script(core,{filename:'game-core.js'}));
 assert.doesNotThrow(()=>new vm.Script(recovery,{filename:'nft-performance.js'}));
});

test('Locker keeps stable image elements between metadata updates',()=>{
 assert.match(core,/const previous=new Map\(Array\.from\(grid\.children\)/);
 assert.match(core,/dataset\.nftImageSignature/);
 assert.match(core,/if\(grid\.children\[i\]!==ordered\[i\]\)/);
 assert.match(core,/Metadata ready/);
});

test('fallback requires authenticated same-origin NFT media and bounded verification',()=>{
 assert.match(recovery,/Authorization':'Bearer '/);
 assert.match(recovery,/nftoken_id:tokenId,uri/);
 assert.match(recovery,/proxyArtActive<3/);
 assert.match(recovery,/IntersectionObserver/);
 assert.match(relay,/requireUser\(req\)/);
 assert.match(relay,/resolveMetadata\(uri, id\)/);
 assert.match(relay,/fetchPublic\(url\)/);
 assert.match(relay,/MAX_IMAGE_BYTES = 3_000_000/);
 assert.match(relay,/identifyImage\(bytes\)/);
 assert.match(relay,/Promise\.any/);
 assert.match(metadata,/export async function fetchPublic/);
});
