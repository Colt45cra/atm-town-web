import dns from 'node:dns/promises';
import net from 'node:net';
import { setCors, requireUser, sendError } from '../lib/auth.js';
import { identifyImage } from '../lib/nft-donation-artwork.js';

const MAX_URI_HEX_LENGTH = 512; // XRPL NFToken URI max is 256 bytes.
const MAX_METADATA_BYTES = 1_500_000;
const MAX_DATA_IMAGE_LENGTH = 600_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 45 * 1000;
const METADATA_FETCH_TIMEOUT_MS = 6000;
// ipfs.io/dweb.link converted to browser peer-to-peer gateways in 2026 and
// now throttle backend and image hotlink requests. Prefer independently
// operated retrieval gateways; retain the retired URLs only as last resorts.
const IPFS_GATEWAYS = Object.freeze([
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.filebase.io/ipfs/',
  'https://gateway.lighthouse.storage/ipfs/',
  'https://ipfs.eth.aragon.network/ipfs/',
  'https://ipfs.kaleido.art/ipfs/',
  'https://ipfs.1-2.dev/ipfs/',
  'https://w3s.link/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/'
]);
const metadataCache = globalThis.__atmNftMetadataCache || new Map();
globalThis.__atmNftMetadataCache = metadataCache;

function decodeHexUri(value) {
  const hex = String(value || '').trim();
  if (!hex || hex.length > MAX_URI_HEX_LENGTH || hex.length % 2 || !/^[0-9a-f]+$/i.test(hex)) return '';
  try { return Buffer.from(hex, 'hex').toString('utf8').replace(/\0+$/g, ''); }
  catch { return ''; }
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((value) => String(value || '').trim()).filter(Boolean))];
}

function ipfsPathFromValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^ipfs:\/\//i.test(raw)) return raw.replace(/^ipfs:\/\/(?:ipfs\/)?/i, '').replace(/^\/+/, '');
  if (/^ipfs\//i.test(raw)) return raw.replace(/^ipfs\//i, '').replace(/^\/+/, '');
  if (/^(?:Qm[1-9A-HJ-NP-Za-km-z]{40,}|b[a-z2-7]{20,})(?:\/|$)/i.test(raw)) return raw.replace(/^\/+/, '');
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/^\/ipfs\/(.+)$/i);
    return match ? match[1] + (url.search || '') + (url.hash || '') : '';
  } catch { return ''; }
}

// A surprising number of older XRPL NFT minters wrote human-readable IPFS
// filenames such as `Rooster Gang #148.json` directly into the NFToken URI.
// When that raw path is appended to an HTTP gateway, `#148.json` is interpreted
// as a URL fragment and never reaches IPFS, producing a false 404. Encode each
// path segment before constructing gateway URLs so spaces, #, ?, unicode, etc.
// remain part of the IPFS object path. Existing percent-encoding is normalized
// instead of double-encoded.
function encodeIpfsPath(path) {
  return String(path || '').split('/').map((segment) => {
    if (!segment) return '';
    try { return encodeURIComponent(decodeURIComponent(segment)); }
    catch { return encodeURIComponent(segment); }
  }).join('/');
}

function contentUriCandidates(value, baseUrl = '') {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const ipfsPath = ipfsPathFromValue(raw);
  if (ipfsPath) { const encodedPath = encodeIpfsPath(ipfsPath); return uniqueStrings(IPFS_GATEWAYS.map((gateway) => gateway + encodedPath)); }
  if (/^ar:\/\//i.test(raw)) {
    const path = raw.replace(/^ar:\/\//i, '').replace(/^\/+/, '');
    return path ? [`https://arweave.net/${path}`] : [];
  }
  if (/^data:image\//i.test(raw)) return raw.length <= MAX_DATA_IMAGE_LENGTH ? [raw] : [];
  if (/^data:application\/json/i.test(raw)) return [raw];
  try {
    const url = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return [];
    return [url.toString()];
  } catch {
    if (!baseUrl && /^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw)) {
      try { return [new URL(`https://${raw}`).toString()]; } catch { return []; }
    }
    return [];
  }
}

function normalizeContentUri(value, baseUrl = '') {
  return contentUriCandidates(value, baseUrl)[0] || '';
}

function isPrivateIp(address) {
  if (!address) return true;
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224;
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith('::ffff:')) return isPrivateIp(normalized.slice(7));
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return true;
}

async function assertPublicHttpUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported NFT metadata URL protocol.');
  if (url.username || url.password) throw new Error('NFT metadata URL credentials are not allowed.');
  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('NFT metadata URL is not public.');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('NFT metadata URL points to a private network.');
  } else {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (!records.length || records.some((record) => isPrivateIp(record.address))) throw new Error('NFT metadata host did not resolve to a public address.');
  }
  return url;
}

export async function fetchPublic(value, redirects = 0, forImage = false) {
  if (redirects > 4) throw new Error('NFT metadata redirected too many times.');
  const url = await assertPublicHttpUrl(value);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: forImage ? 'image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.5' : 'application/json, image/*;q=0.8, text/plain;q=0.5, */*;q=0.1',
      'User-Agent': 'ATM-Town-NFT-Metadata/1.0'
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
    cache: 'force-cache'
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');
    if (!location) throw new Error('NFT metadata redirect was missing a destination.');
    return fetchPublic(new URL(location, url).toString(), redirects + 1, forImage);
  }
  if (!response.ok) throw new Error(`NFT metadata returned HTTP ${response.status}.`);
  return { response, url: url.toString() };
}

async function fetchFirstPublic(candidates) {
  const urls = uniqueStrings(candidates);
  if (!urls.length) throw new Error('NFT metadata could not be fetched.');
  if (urls.length === 1) return fetchPublic(urls[0]);

  // Race independent IPFS gateways. Sequential 6-7 second gateway attempts can
  // exceed a serverless request window before a healthy fallback is tried.
  const errors = [];
  try {
    return await Promise.any(urls.map(async (url) => {
      try { return await fetchPublic(url); }
      catch (error) { errors.push(error); throw error; }
    }));
  } catch {
    const messages = errors.map((error) => cleanText(error?.message || '', 180)).filter(Boolean);
    const non404 = messages.find((message) => !/HTTP 404/i.test(message));
    throw new Error(non404 || messages[0] || 'NFT metadata could not be fetched.');
  }
}

function directImageUrl(url, contentType = '') {
  if (/^image\//i.test(contentType)) return url;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(?:png|jpe?g|gif|webp|avif|svg)$/.test(path) ? url : '';
  } catch { return ''; }
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
}

function cleanStringArray(value, maxItems = 50, maxLength = 100) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => cleanText(entry, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function cleanPlainJson(value, depth = 0) {
  if (depth > 4) return null;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return cleanText(value, 500);
  if (Array.isArray(value)) return value.slice(0, 40).map((entry) => cleanPlainJson(entry, depth + 1));
  if (!value || typeof value !== 'object') return null;
  const out = {};
  for (const [key, entry] of Object.entries(value).slice(0, 60)) {
    const cleanKey = cleanText(key, 100);
    if (!cleanKey) continue;
    out[cleanKey] = cleanPlainJson(entry, depth + 1);
  }
  return out;
}

const metadataRequests=globalThis.__atmNftMetadataRequests||new Map();
globalThis.__atmNftMetadataRequests=metadataRequests;
export async function resolveMetadata(uriHex,tokenId,options={}){
  const key=`${tokenId}:${uriHex}`;
  if(metadataRequests.has(key))return metadataRequests.get(key);
  const pending=resolveMetadataOnce(uriHex,tokenId,options);metadataRequests.set(key,pending);
  try{return await pending;}finally{if(metadataRequests.get(key)===pending)metadataRequests.delete(key);}
}
async function resolveMetadataOnce(uriHex, tokenId, {refresh=false}={}) {
  const decodedUri = decodeHexUri(uriHex);
  if (!decodedUri) return { status: 'missing', uri: '', name: '', description: '', image_url: '' };

  const cacheKey = `${tokenId}:${uriHex}`;
  const cached = metadataCache.get(cacheKey);
  if (cached && !refresh) {
    const ttl = cached.value?.status === 'unavailable' ? FAILURE_CACHE_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - cached.savedAt < ttl) return cached.value;
  }

  let value = { status: 'unavailable', uri: decodedUri, name: '', description: '', image_url: '' };
  try {
    if (/^data:application\/json/i.test(decodedUri)) {
      const comma = decodedUri.indexOf(',');
      if (comma === -1) throw new Error('Invalid data JSON URI.');
      const header = decodedUri.slice(0, comma);
      const body = decodedUri.slice(comma + 1);
      const raw = /;base64/i.test(header) ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body);
      if (Buffer.byteLength(raw, 'utf8') > MAX_METADATA_BYTES) throw new Error('NFT metadata is too large.');
      const json = JSON.parse(raw);
      value = metadataFromJson(json, decodedUri, '');
    } else {
      const metadataCandidates = contentUriCandidates(decodedUri);
      if (!metadataCandidates.length || /^data:/i.test(metadataCandidates[0])) throw new Error('NFT metadata URI is not supported.');
      const fetched = await fetchFirstPublic(metadataCandidates);
      const { response, url } = fetched;
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const imageUrl = directImageUrl(url, contentType);
      if (imageUrl) {
        value = { status: 'direct-image', uri: decodedUri, metadata_url: url, name: '', description: '', image_url: imageUrl, image_candidates: metadataCandidates };
      } else {
        const declaredLength = Number(response.headers.get('content-length') || 0);
        if (declaredLength > MAX_METADATA_BYTES) throw new Error('NFT metadata is too large.');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.byteLength > MAX_METADATA_BYTES) throw new Error('NFT metadata is too large.');
        const raw = bytes.toString('utf8');
        let json;
        try { json = JSON.parse(raw); }
        catch { throw new Error('NFT URI did not return JSON metadata or a supported image.'); }
        value = metadataFromJson(json, decodedUri, url);
      }
    }
  } catch (error) {
    value = { ...value, error: cleanText(error?.message || 'NFT metadata could not be resolved.', 180) };
  }

  metadataCache.set(cacheKey, { savedAt: Date.now(), value });
  if (metadataCache.size > 1500) {
    const oldest = [...metadataCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt).slice(0, 300);
    for (const [key] of oldest) metadataCache.delete(key);
  }
  return value;
}

function metadataUriValue(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value.uri || value.url || value.src || value.href || value.image || value.image_url || value.content || '';
}

function firstMediaUri(source) {
  const pools = [source?.files, source?.media, source?.assets, source?.properties?.files,source?.properties?.media,source?.media?.files,source?.content?.files];
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    for (const entry of pool) {
      const uri = metadataUriValue(entry);
      if (uri) return uri;
    }
  }
  return '';
}

function metadataFromJson(json, decodedUri, metadataUrl) {
  const source = json && typeof json === 'object' ? json : {};
  // Older NFT issuers often publish a dead primary image while a thumbnail,
  // properties.image or files[] entry still works. Keep *all* valid artwork
  // sources, including every IPFS gateway, instead of abandoning the NFT after
  // the first unreachable image. The display client will try them in order.
  const imageValues = [
    source.image, source.image_url, source.imageUrl, source.image_uri,
    source.Image, source.imageURI, source.imageUri, source.image_link,
    source.thumbnail, source.thumbnail_url, source.thumbnailUrl, source.preview,
    source.properties?.image, source.properties?.image_url, source.properties?.imageUrl,
    source.properties?.thumbnail, source.properties?.media,
    source.metadata?.image, source.metadata?.image_url, source.asset?.image,
    source.content?.image, source.media?.image, source.media?.thumbnail,
    firstMediaUri(source)
  ].map(metadataUriValue).filter(Boolean);
  const imageCandidates = uniqueStrings(imageValues.flatMap(uri => contentUriCandidates(uri, metadataUrl))).slice(0, 35);
  return {
    status: 'resolved',
    uri: decodedUri,
    metadata_url: metadataUrl,
    name: cleanText(source.name || source.title || source.asset_name || '', 180),
    description: cleanText(source.description || source.summary || '', 900),
    image_url: imageCandidates[0] || '',
    image_candidates: imageCandidates,
    animation_url: normalizeContentUri(metadataUriValue(source.animation_url) || metadataUriValue(source.animation) || metadataUriValue(source.video), metadataUrl),
    external_url: normalizeContentUri(metadataUriValue(source.external_url) || metadataUriValue(source.external_link) || metadataUriValue(source.website), metadataUrl),
    collection: cleanText(source.collection?.name || source.collection || source.project || source.collection_name || '', 180),
    schema_version: cleanText(source.schema_version || source.schemaVersion || '', 80),
    item_id: cleanText(source.item_id || source.properties?.item_id || '', 100),
    asset_type: cleanText(source.asset_type || source.properties?.asset_type || '', 60),
    slot: cleanText(source.slot || source.properties?.slot || '', 60),
    compatible_character_ids: cleanStringArray(source.compatible_character_ids || source.properties?.compatible_character_ids, 50, 64),
    game: cleanPlainJson(source.game),
    collection_data: cleanPlainJson(source.collection),
    appearance: cleanPlainJson(source.appearance),
    gameplay: cleanPlainJson(source.gameplay),
    abilities: Array.isArray(source.abilities) ? cleanPlainJson(source.abilities) : [],
    equip_rules: cleanPlainJson(source.equip_rules),
    provenance: cleanPlainJson(source.provenance),
    properties: cleanPlainJson(source.properties),
    attributes: Array.isArray(source.attributes) ? source.attributes.slice(0, 80).map((entry) => ({
      trait_type: cleanText(entry?.trait_type || entry?.type || entry?.name || '', 100),
      value: cleanText(entry?.value ?? entry?.description ?? '', 180)
    })).filter((entry) => entry.trait_type || entry.value) : []
  };
}

const MAX_IMAGE_BYTES = 8_000_000;
const MAX_CANDIDATES = 12;
const MAX_REQUESTS_PER_MINUTE = 100;
const requests = globalThis.__atmLockerArtLimits || new Map();
globalThis.__atmLockerArtLimits = requests;

function limitUser(userId) {
  const now = Date.now();
  const current = requests.get(userId);
  const entry = current && now - current.start < 60_000 ? current : { start: now, count: 0 };
  entry.count++;
  requests.set(userId, entry);
  if (entry.count > MAX_REQUESTS_PER_MINUTE) throw Object.assign(new Error('Too many artwork requests. Try again shortly.'), { status: 429 });
  if (requests.size > 1000) for (const [id, value] of requests) if (now - value.start >= 60_000) requests.delete(id);
}

async function readVerifiedImage(response) {
  if (Number(response.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) throw Error('Artwork exceeds size limit.');
  const type = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  // Some IPFS gateways report PNG/WebP bytes as text/plain or octet-stream.
  // Trust checked file signatures instead of unreliable gateway MIME headers.
  const reader = response.body?.getReader?.();
  if (!reader) throw Error('Artwork response has no readable body.');
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_IMAGE_BYTES) throw Error('Artwork exceeds size limit.');
      parts.push(Buffer.from(part.value));
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (!size) throw Error('Artwork was empty.');
  const bytes = Buffer.concat(parts);
  const verifiedType = identifyImage(bytes);
  if (!verifiedType) throw Error('Artwork bytes are not a supported image.');
  return { bytes, type: verifiedType };
}

async function handleNftArtwork(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST required.' }); }
  res.setHeader('Cache-Control', 'private, max-age=900');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const { user } = await requireUser(req);
    limitUser(user.id);
    const id = String(req.body?.nftoken_id || '').toUpperCase();
    const uri = String(req.body?.uri || '').toUpperCase();
    if (!/^[A-F0-9]{64}$/.test(id) || !uri || uri.length > 512 || uri.length % 2 || !/^[A-F0-9]+$/.test(uri))
      throw Object.assign(new Error('A valid NFT token and on-ledger metadata URI are required.'), { status: 400 });
    const meta = await resolveMetadata(uri, id);
    const urls = [...new Set([meta.image_url, ...(Array.isArray(meta.image_candidates) ? meta.image_candidates : [])]
      .filter(value => typeof value === 'string' && /^https?:\/\//i.test(value)))].slice(0, MAX_CANDIDATES);
    if (!urls.length) {
      console.warn('NFT metadata lacks image URL', {status:meta.status,metadataHost:(()=>{try{return new URL(meta.metadata_url).hostname;}catch{return 'unknown';}})()});
      throw Object.assign(new Error('This NFT metadata does not contain supported artwork.'), { status: 404 });
    }
    // Race independent gateways instead of waiting behind retired IPFS
    // providers. Guard redirects and verify image bytes before serving.
    const failures=[];
    let art;
    try {
      art = await Promise.any(urls.map(async url => {
        try {
          const { response } = await fetchPublic(url, 0, true);
          return await readVerifiedImage(response);
        } catch(error) {
          let host='unknown';
          try{host=new URL(url).hostname;}catch{}
          failures.push(host+':'+String(error?.message||'failed').slice(0,85));
          throw error;
        }
      }));
    } catch {
      // Hostnames and HTTP errors only; never log wallet tokens or full URLs.
      console.warn('NFT artwork gateway failures', failures.slice(0,12));
      throw Object.assign(new Error('Artwork hosts could not deliver a usable image.'), { status: 502 });
    }
    res.setHeader('Content-Type', art.type);
    return res.status(200).send(art.bytes);
  } catch (error) {
    return sendError(res, error);
  }
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (String(req.query?.action || '') === 'art') return handleNftArtwork(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST required.' });
  }

  try {
    await requireUser(req);
    const tokenId = String(req.body?.nftoken_id || '').trim().toUpperCase();
    const uriHex = String(req.body?.uri || '').trim().toUpperCase();
    if (!/^[A-F0-9]{64}$/.test(tokenId)) return res.status(400).json({ error: 'A valid NFTokenID is required.' });
    if (uriHex && (uriHex.length > MAX_URI_HEX_LENGTH || uriHex.length % 2 || !/^[A-F0-9]+$/.test(uriHex))) {
      return res.status(400).json({ error: 'NFT URI must be valid XRPL hex data.' });
    }

    const metadata = await resolveMetadata(uriHex, tokenId,{refresh:req.body?.refresh===true});
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).json({ nftoken_id: tokenId, ...metadata });
  } catch (error) {
    sendError(res, error);
  }
}
