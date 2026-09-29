export const config = { api: { bodyParser: { sizeLimit: '4mb' } }, maxDuration: 120 };

function parseDataUrl(dataUrl) {
  const match = /^data:(image\\/(?:png|jpeg|webp));base64,(.+)$/s.exec(dataUrl || '');
  if (!match) throw new Error('Unsupported source image. Use PNG, JPG, or WebP.');
  return { mime: match[1], bytes: Buffer.from(match[2], 'base64') };
}

function safeSize(value) {
  const allowed = new Set(['1024x1024', '1024x1536', '1536x1024']);
  return allowed.has(value) ? value : '1024x1536';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Sprite generation is not configured yet.' });
  }

  try {
    const { imageDataUrl, prompt, generationSize, quality = 'low' } = req.body || {};
    if (!imageDataUrl || !prompt) return res.status(400).json({ error: 'Image and prompt are required.' });
    if (prompt.length > 12000) return res.status(400).json({ error: 'Prompt is too long.' });

    const { mime, bytes } = parseDataUrl(imageDataUrl);
    if (bytes.length > 3500000) return res.status(413).json({ error: 'Image is too large. Please upload a smaller image.' });

    const form = new FormData();
    form.append('model', 'gpt-image-2.5-sunburst');
    form.append('prompt', prompt);
    form.append('quality', ['low','medium','high'].includes(quality) ? quality : 'low');
    form.append('size', safeSize(generationSize));
    form.append('background', 'transparent');
    form.append('image[]', new Blob([bytes], { type: mime }), 'character.' + mime.split('/')[1].replace('jpeg','jpg'));

    const upstream = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data?.error?.message || `OpenAI image generation failed (${upstream.status})`;
      return res.status(upstream.status >= 500 ? 502 : 400).json({ error: message });
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: 'OpenAI returned no image.' });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (error) {
    console.error('generate-sprite error', error);
    return res.status(500).json({ error: error?.message || 'Sprite generation failed.' });
  }
}
