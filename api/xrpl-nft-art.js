// Authenticated, bounded media fallback for Locker NFTs. Never accept a
// caller-supplied remote image URL: artwork must come from parsed NFT metadata.
import { setCors, requireUser, sendError } from '../lib/auth.js';
import { resolveMetadata, fetchPublic } from './xrpl-nft-metadata.js';
import { identifyImage } from '../lib/nft-donation-artwork.js';

const MAX_IMAGE_BYTES = 3_000_000;
const MAX_CANDIDATES = 4;
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
  if (type && !['image/png','image/jpeg','image/gif','image/webp','image/avif','application/octet-stream','binary/octet-stream'].includes(type)) throw Error('Artwork is not a supported image.');
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

export default async function handler(req, res) {
  if (setCors(req, res)) return;
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
    if (!urls.length) throw Object.assign(new Error('This NFT metadata does not contain supported artwork.'), { status: 404 });
    // Competing healthy mirrors win; 404s, blocked hotlinks, HTML error pages,
    // corrupt images, and slow hosts cannot poison the result.
    let art;
    try {
      art = await Promise.any(urls.map(async url => {
        const { response } = await fetchPublic(url); // DNS, protocol and redirect guard
        return readVerifiedImage(response);
      }));
    } catch {
      throw Object.assign(new Error('Artwork hosts could not deliver a usable image.'), { status: 502 });
    }
    res.setHeader('Content-Type', art.type);
    return res.status(200).send(art.bytes);
  } catch (error) {
    return sendError(res, error);
  }
}
