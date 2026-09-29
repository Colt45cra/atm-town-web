const MAX_SOURCE_BYTES = 3_500_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const REFERENCE_PATH = '/assets/characters/playable/atm.webp';
const buckets = new Map();

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || 'unknown');
}

function rateLimited(req) {
  const now = Date.now();
  const ip = clientIp(req);
  const current = buckets.get(ip);
  if (!current || now - current.started > WINDOW_MS) {
    buckets.set(ip, { started: now, count: 1 });
    return false;
  }
  current.count += 1;
  buckets.set(ip, current);
  return current.count > MAX_PER_WINDOW;
}

function parseDataUrl(value) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(value || ''));
  if (!match) throw new Error('A valid PNG, JPEG or WebP character image is required.');
  const bytes = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!bytes.length) throw new Error('The character image is empty.');
  if (bytes.length > MAX_SOURCE_BYTES) throw new Error('The uploaded character image is too large after processing.');
  return { mime: match[1], bytes };
}

function extFor(mime) {
  return mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
}

async function loadReference(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  if (!host) throw new Error('Could not resolve the ATM Town sprite reference.');
  const response = await fetch(proto + '://' + host + REFERENCE_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load the hidden ATM Town sprite reference.');
  const mime = String(response.headers.get('content-type') || 'image/webp').split(';')[0];
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('The hidden ATM Town sprite reference is empty.');
  return { mime, bytes };
}

function buildPrompt() {
  return [
    'IMAGE 1 is the user\'s character.',
    'IMAGE 2 is the exact ATM Town sprite sheet reference.',
    '',
    'Create ONE complete sprite sheet for the character in IMAGE 1 that is laid out just like IMAGE 2.',
    'Keep the identity, design, colors, clothing, accessories, face, species, and recognizable features of IMAGE 1.',
    'Use IMAGE 2 as the authoritative reference for the sprite-sheet layout, character scale, spacing, framing, body poses, leg positions, arm positions, facing directions, and ATM Town visual style.',
    '',
    'The finished sheet must contain exactly 12 character frames in a clean 3-column by 4-row grid.',
    'Rows must match IMAGE 2 exactly: DOWN/front, LEFT, UP/back, RIGHT.',
    'Columns must match IMAGE 2 exactly: Walk A, Idle, Walk B.',
    'Copy the body pose in each corresponding reference cell as closely as possible, especially which leg is forward and which leg is back.',
    'Walk A and Walk B must visibly be opposite walking phases exactly like the reference sheet.',
    'Keep every character centered and spaced like IMAGE 2, with consistent size and the same foot baseline.',
    'Render the user character in the same compact ATM Town game-sprite style seen in IMAGE 2.',
    'Use crisp pixel-illustrated edges and simplified readable game-sprite details; do not make it photorealistic, painterly, cinematic, glossy 3D, or smooth vector art.',
    '',
    'Use a fully transparent background if possible.',
    'No labels, no text, no grid lines, no borders, no scenery, no floor, no shadow, no extra characters, and no objects outside the 12 sprite poses.',
    'Return only the finished sprite sheet.'
  ].join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: 'gpt-image-2',
      mode: 'single-generation-hidden-reference',
      reference: 'ATM Town playable sprite sheet',
      format: 'ATM Town 3x4 / 768x1280'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'GPT sprite generation is not configured on the server.' });
  }

  if (rateLimited(req)) {
    return res.status(429).json({ error: 'Too many sprite generations from this connection. Try again in a few minutes.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const character = parseDataUrl(body.imageDataUrl);
    const reference = await loadReference(req);

    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', buildPrompt());
    form.append('image[]', new Blob([character.bytes], { type: character.mime }), 'character.' + extFor(character.mime));
    form.append('image[]', new Blob([reference.bytes], { type: reference.mime }), 'atm-town-reference.' + extFor(reference.mime));
    form.append('size', '1024x1536');
    form.append('quality', 'medium');
    form.append('background', 'transparent');
    form.append('output_format', 'webp');
    form.append('output_compression', '72');

    const upstream = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
      body: form
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data?.error?.message || 'OpenAI image generation failed.';
      console.error('generate-sprite upstream error', upstream.status, message);
      return res.status(upstream.status >= 400 && upstream.status < 500 ? 400 : 502).json({ error: message });
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: 'OpenAI returned no image data.' });

    const imageBytes = Buffer.from(b64, 'base64');
    if (!imageBytes.length) return res.status(502).json({ error: 'OpenAI returned an empty image.' });

    console.log('generate-sprite single sheet bytes', imageBytes.length);
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Length', String(imageBytes.length));
    res.setHeader('X-ATM-Generated', 'single-sheet');
    res.setHeader('X-ATM-Model', 'gpt-image-2');
    return res.status(200).send(imageBytes);
  } catch (error) {
    console.error('generate-sprite error', error);
    return res.status(400).json({ error: error?.message || 'Sprite generation failed.' });
  }
}

export const config = { maxDuration: 120 };
