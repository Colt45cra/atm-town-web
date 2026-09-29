const MAX_SOURCE_BYTES = 3_500_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 4;
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
  if (!match) throw new Error('A valid PNG, JPEG or WebP source image is required.');
  const bytes = Buffer.from(match[2].replace(/\s+/g,''), 'base64');
  if (!bytes.length) throw new Error('The source image is empty.');
  if (bytes.length > MAX_SOURCE_BYTES) throw new Error('The uploaded image is too large after processing.');
  return { mime: match[1], bytes };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: 'gpt-image-2',
      format: 'ATM Town 3x4 / 768x1280'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'GPT generation is not configured yet. OPENAI_API_KEY is missing on the server.' });
  }

  if (rateLimited(req)) {
    return res.status(429).json({ error: 'Too many sprite generations from this connection. Try again later.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { mime, bytes } = parseDataUrl(body.imageDataUrl);
    const prompt = String(body.prompt || '').trim();
    if (!prompt || prompt.length > 9000) return res.status(400).json({ error: 'A valid generation prompt is required.' });

    const quality = ['low','medium','high','auto'].includes(body.quality) ? body.quality : 'medium';
    const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];

    const form = new FormData();
    form.append('model','gpt-image-2');
    form.append('prompt',prompt);
    form.append('image',new Blob([bytes],{type:mime}),'character.'+ext);
    form.append('size','1024x1536');
    form.append('quality',quality);
    form.append('background','transparent');
    form.append('output_format','webp');
    form.append('output_compression','82');

    const upstream = await fetch('https://api.openai.com/v1/images/edits',{
      method:'POST',
      headers:{ Authorization:'Bearer '+process.env.OPENAI_API_KEY },
      body:form
    });

    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) {
      const message = data?.error?.message || 'OpenAI image generation failed.';
      console.error('generate-sprite upstream error', upstream.status, message);
      return res.status(upstream.status >= 400 && upstream.status < 500 ? 400 : 502).json({ error: message });
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: 'OpenAI returned no image data.' });

    return res.status(200).json({
      imageDataUrl:'data:image/webp;base64,'+b64,
      model:'gpt-image-2',
      generated:true
    });
  } catch (error) {
    console.error('generate-sprite error', error);
    return res.status(400).json({ error: error?.message || 'Sprite generation failed.' });
  }
}

export const config = { maxDuration: 120 };