import { buildSync } from 'esbuild';
buildSync({ entryPoints: ['lib/xrpl-swap-codec.source.js'], outfile: 'lib/xrpl-swap-codec.cjs', bundle: true, platform: 'node', format: 'cjs', target: 'node22', minify: true, banner: { js: '/* Bundled XRPL codecs. Regenerate with npm run build:nft-codec. */' } });
