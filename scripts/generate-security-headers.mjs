import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const htmlPath = path.join(root, 'index.html');
const outputPath = path.join(root, 'vercel.json');
const html = await readFile(htmlPath, 'utf8');

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\ssrc\s*=/.test(match[0]))
  .map((match) => match[1]);

if (!inlineScripts.length) throw new Error('No inline scripts found; refusing to generate an incomplete CSP.');

const scriptHashes = [...new Set(inlineScripts.map((source) => {
  const digest = createHash('sha256').update(source, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}))];

const csp = [
  `default-src 'self'`,
  `script-src 'self' https://cdn.jsdelivr.net ${scriptHashes.join(' ')}`,
  `script-src-attr 'none'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `media-src 'self' blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://xnyjurertwohlqczaeux.supabase.co wss://xnyjurertwohlqczaeux.supabase.co https://s.altnet.rippletest.net:51234 wss://s.altnet.rippletest.net:51233 https://*.livekit.cloud wss://*.livekit.cloud`,
  `frame-src https://www.youtube-nocookie.com`,
  `worker-src 'self' blob:`,
  `child-src 'self' blob:`,
  `manifest-src 'self'`,
  `object-src 'none'`,
  `base-uri 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `upgrade-insecure-requests`,
].join('; ');

const vercel = {
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), payment=(), usb=(), serial=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      ],
    },
  ],
};

await writeFile(outputPath, `${JSON.stringify(vercel, null, 2)}\n`, 'utf8');
console.log(`Generated vercel.json with ${scriptHashes.length} inline-script SHA-256 CSP hashes.`);
