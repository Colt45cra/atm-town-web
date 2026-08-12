import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const htmlPath = path.join(root, 'index.html');
const outputPath = path.join(root, 'vercel.json');
const html = await readFile(htmlPath, 'utf8');

// v234.2.2: executable inline JavaScript is intentionally forbidden.
// Game/runtime code must live in same-origin external .js files so CSP does
// not depend on large inline-script hashes that can drift from deployed HTML.
const executableInlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\bsrc\s*=/.test(match[1]) && match[2].trim().length > 0);

if (executableInlineScripts.length) {
  throw new Error(`Executable inline JavaScript found (${executableInlineScripts.length}). Move it to a same-origin .js file before generating security headers.`);
}

const csp = [
  `default-src 'self'`,
  `script-src 'self' https://cdn.jsdelivr.net`,
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
console.log('Generated vercel.json with zero executable inline scripts; same-origin runtime scripts are authorized by CSP self.');
