# ATM Town / ATM Pay Identity Boundaries

## Decision

ATM Town and ATM Pay are separate products with separate authentication systems.

ATM Town must stay easy to join and play. ATM Pay is a financial/self-custodial product and keeps its own stronger account, recovery, passkey, and wallet controls.

A shared public ecosystem identity may link the two later, but shared identity does **not** mean shared authentication.

## ATM Town owns

- Town email/password or other Town login methods
- character and display profile
- game progress, inventory, achievements, events and social state
- optional Xaman connection
- future opaque link to an ATM Pay account

Town must not store or receive ATM Pay access tokens, refresh tokens, wallet vault keys, recovery keys, seeds, or private keys.

## ATM Pay owns

- ATM Pay signup/login
- ATM Pay username/profile
- self-custodial XRPL wallet
- encrypted backup and wallet route/version records
- transaction authorization and receipts
- payment activity and future merchant/payment features

ATM Pay authenticates against its dedicated Supabase project. Town sessions are never valid ATM Pay sessions.

## Town onboarding target

Town onboarding should ultimately be:

1. Create/sign in to a Town account.
2. Choose character/profile and enter Town.
3. Offer **Payments & Rewards** setup:
   - Connect ATM Pay
   - Connect Xaman
   - Set up later

A wallet is not required to enter Town.

## ATM Pay integration target

**Connect ATM Pay** is an account-link operation, not SSO.

1. Town creates a short-lived link request.
2. Town opens ATM Pay on the ATM Pay domain.
3. User authenticates to ATM Pay there.
4. ATM Pay displays the requesting Town profile.
5. User explicitly approves the link.
6. The backend records only an opaque Town-user <-> Pay-user association.
7. Town receives limited capability/public profile data.

No Supabase tokens are copied between products.

## Payments from Town

When a linked player chooses ATM Pay for a purchase:

- Town creates a payment request/intention containing only the merchant/item/amount context needed for review.
- ATM Pay opens its own approval surface.
- ATM Pay locally authorizes/signs using the user's wallet security boundary.
- Town receives settlement status/receipt metadata, never wallet secrets.

Xaman remains a separate external signing option.

## Shared username strategy

For now, Town and Pay may each maintain their own username records. Do not enforce cross-project uniqueness by directly querying another product database from the browser.

A later ecosystem identity/namespace service will reserve a shared `@handle` and bind verified product accounts to it. Linking or unlinking a product must not delete or merge the underlying auth accounts.

## Migration rules

- The old cross-origin ATM Pay session handoff is retired and must remain fail-closed.
- Do not add new features that depend on Town being the ATM Pay auth provider.
- Existing embedded-wallet/ATM Pay-era Town code should be treated as legacy compatibility code and replaced incrementally, not deleted in one risky migration.
- Town's own Supabase project remains the source of truth for Town/game data.
- ATM Pay's own Supabase project remains the source of truth for ATM Pay account/wallet/payment data.
