/* ATM Pay no longer shares authentication sessions with ATM Town.
 *
 * This file intentionally performs no token handoff. It is kept temporarily so
 * older cached ATM Town HTML that still references the script fails closed rather
 * than throwing or attempting to transfer Supabase access/refresh tokens across
 * product origins.
 *
 * The replacement integration is an explicit account-link flow: ATM Town opens
 * ATM Pay, the user authenticates on the ATM Pay domain, approves the link, and
 * only an opaque association/public capability result is returned to Town.
 */
(function retireAtmPaySessionHandoff(global){
  'use strict';

  const params = new URLSearchParams(global.location.search);
  if (params.get('atmPayHandoff') !== '1') return;

  console.warn('ATM Pay session handoff is retired. ATM Town and ATM Pay now use separate authentication boundaries.');

  try {
    if (global.opener) {
      global.opener.postMessage({
        type: 'ATM_PAY_SESSION_HANDOFF_RETIRED',
        reason: 'separate_auth_boundaries'
      }, '*');
    }
  } catch (_error) {}
})(window);
