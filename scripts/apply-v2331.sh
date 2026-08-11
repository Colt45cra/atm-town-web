#!/usr/bin/env bash
set -euo pipefail
rm -f \
  api/_auth.js \
  api/_xaman-vending.js \
  api/_xrpl-nft-trading.js \
  api/xaman-link-start.js \
  api/xaman-link-status.js \
  api/xrpl-nft-offer-start.js \
  api/xrpl-nft-offer-status.js \
  api/xrpl-nft-offers.js \
  api/xrpl-nft-offer-accept-start.js
printf 'ATM Town v233.1 obsolete API routes removed. Current API functions: '
find api -maxdepth 1 -type f -name '*.js' | wc -l
