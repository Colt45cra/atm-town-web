# Identity Separation Status

This branch retires the old shared ATM Town -> ATM Pay session-token handoff and documents the separate authentication boundary.

No ATM Town production data or wallet tables are deleted by this change. Existing embedded-wallet and ATM Pay-era game code remains in place as legacy compatibility code until it is replaced incrementally by the explicit account-link/payment-request integration.

Next implementation steps after this branch is validated:

1. Add Town onboarding choice: Connect ATM Pay / Connect Xaman / Set up later.
2. Build short-lived account-link requests between Town and ATM Pay without transferring auth tokens.
3. Route Town purchases to ATM Pay approval or Xaman signing according to the user's selected provider.
4. Move any remaining standalone ATM Pay financial responsibilities out of the Town project before Mainnet use.
