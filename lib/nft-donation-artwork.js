// Artwork fallbacks are restricted to public IPFS/Arweave image gateways.
// Never turn an NFT-provided URL into an unrestricted same-origin fetch proxy.
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/', 'https://w3s.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/'
];
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
const MAX_IMAGE_BYTES = 3_000_000;

function identifyImage(data) {
  if(data.length>=8 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(data.length>=3 && data[0]===255 && data[1]===216 && data[2]===255)return 'image/jpeg';
  if(data.length>=6 && (data.toString('ascii',0,6)==='GIF87a'||data.toString('ascii',0,6)==='GIF89a'))return 'image/gif';
  if(data.length>=12 && data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP')return 'image/webp';
  if(data.length>=12 && data.toString('ascii',4,8)==='ftyp'&&['avif','avis'].includes(data.toString('ascii',8,12)))return 'image/avif';
  return '';
}


function encodedPath(path) {
  return String(path || '').split('/').map(part => {
    try { return encodeURIComponent(decodeURIComponent(part)); }
    catch { return encodeURIComponent(part); }
  }).join('/');
}

export function trustedArtworkUrls(values) {
  const urls = [];
  const push = value => { if (value && !urls.includes(value)) urls.push(value); };
  for (const value of values) {
    const raw = String(value || '').trim();
    if (!raw) continue;
    let path = '';
    if (/^ipfs:\/\//i.test(raw)) path = raw.replace(/^ipfs:\/\/(?:ipfs\/)?/i, '').replace(/^\/+/, '');
    else if (/^(?:Qm[1-9A-HJ-NP-Za-km-z]{40,}|b[a-z2-7]{20,})(?:\/|$)/i.test(raw)) path = raw;
    else {
      let url;
      try { url = new URL(raw); } catch { continue; }
      if (url.protocol !== 'https:' || url.username || url.password) continue;
      const host = url.hostname.toLowerCase();
      if (host === 'arweave.net' && /^\/[a-zA-Z0-9_-]{32,}(?:\/|$)/.test(url.pathname)) { push(url.toString()); continue; }
      if (!IPFS_GATEWAYS.some(g => new URL(g).hostname === host)) continue;
      const matched = url.pathname.match(/^\/ipfs\/(.+)$/i);
      if (matched) path = matched[1];
    }
    if (path && !/[?#]/.test(path)) {
      const encoded = encodedPath(path);
      for (const gateway of IPFS_GATEWAYS) push(gateway + encoded);
    }
  }
  return urls.slice(0, 15);
}

async function fetchImage(url, signal, fetchImpl) {
  const response = await fetchImpl(url, {
    method: 'GET', headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif' },
    redirect: 'error', cache: 'force-cache', signal
  });
  if (!response.ok) throw Error('Image gateway failed.');
  const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!IMAGE_TYPES.has(contentType) && !['application/octet-stream','binary/octet-stream'].includes(contentType)) throw Error('Gateway did not return a supported image.');
  if (Number(response.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) throw Error('Image is too large.');
  const reader = response.body?.getReader?.();
  if (!reader) throw Error('Gateway returned no image body.');
  const buffers = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_IMAGE_BYTES) throw Error('Image exceeds the size limit.');
      buffers.push(Buffer.from(part.value));
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (!length) throw Error('Gateway returned an empty image.');
  const body=Buffer.concat(buffers);
  const verifiedType=identifyImage(body);
  if(!verifiedType)throw Error('Gateway returned unsupported or invalid image bytes.');
  return { body, contentType:verifiedType };
}

export async function fetchDonationArtwork(values, {fetchImpl=fetch, timeoutMs=6500}={}) {
  const urls = trustedArtworkUrls(values);
  if (!urls.length) throw Error('No supported public image gateway for this NFT.');
  const controller = new AbortController();
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    // A stalled IPFS gateway must not hold every other provider hostage.
    return await Promise.any(urls.map(url =>
      fetchImage(url, AbortSignal.any([controller.signal, timeout]), fetchImpl)));
  } finally { controller.abort(); }
}
