# Player billboard rentals

Map Studio places rentable billboard sprites and exports a four-corner image-area mask in `collision.billboard`. Defaults are included for roadside, cyber, and timber frames. `Edit billboard image-area mask` saves an asset default; players supply the ad in game. Face points follow resize, rotation and flip. Depth, blocked footprints, doorway cutouts and stairs remain independent.

Players stand beside a billboard, press Action, upload a PNG/JPEG/WebP, preview its fit, select 1, 7, 30, 180 or 365 days, and open Xaman to sign an XRP Payment. Starting price is 1 XRP per day using the existing ATM Town commerce receiving wallet. Map Objects in `/admin` provides the rental switch, daily rate and wallet. Checkouts snapshot their agreed rate and destination.

An exclusive reservation precedes image upload or payment signing. The normalized ad must match the advertised pixel dimensions, pass PNG byte validation, and use an immutable server-controlled storage path. Authentication and a verified linked Xaman wallet are required. Direct public writes to rental records and reservation/activation functions are prohibited.

Activation requires a successful validated payment with the exact payer, destination, native XRP amount, delivered amount and rental memo. Partial payments and another rental's transaction are rejected. Hashes are unique; repeated confirmation cannot extend expiry. Uncertain payment responses keep the slot reserved until the signature is safely classified.

Duration starts at the validated ledger timestamp. Only paid unexpired ads render; original ATM Town art automatically returns at expiry. The ad stays clipped to its image-area mask and draws in the correct object depth pass. Public ad refresh also reconciles bounded pending payments if the purchaser closes the browser; a shared 30-second check lease prevents each viewer repeating ledger lookups. Background refresh runs once per minute only when billboards are placed.

Verification: payment-field checks, invalid uploads, proximity, server pricing, exclusive checkout, orientation after rotation/flip, existing map imports, and transactional database tests for reservation exclusivity and idempotent activation. Test rows were rolled back. No live XRP payment was made during verification.

Advertisers can optionally add a full HTTP(S) website URL before checkout. Players click or tap the billboard sprite itself to open that URL in a separate tab with noopener/noreferrer; Action still opens the rental panel. Only active, unexpired paid ads expose a link. Hit testing uses camera/zoom-correct world coordinates and opaque sprite pixels; dragging, pinching and cancelled touches do not open links. A linked mobile tap is consumed before the normal tap-to-jump behavior. Unsafe URL schemes and embedded credentials are rejected before payment.
