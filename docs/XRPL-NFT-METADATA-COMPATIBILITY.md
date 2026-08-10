# XRPL NFT Metadata Compatibility — v231.1

This hotfix improves read-only NFT artwork and metadata resolution without changing ownership or transaction behavior.

- Tries multiple public IPFS gateways for IPFS-hosted metadata and artwork.
- Recognizes bare IPFS CIDs and common gateway-form IPFS URLs.
- Supports more common metadata image fields and nested media/file objects.
- Cycles through alternate artwork URLs in the Locker if the first gateway image fails.
- Manual XRPL refresh retries NFTs whose metadata was previously unavailable.
- The Locker status now counts only actually resolved/direct-image metadata as ready.
- NFTs with no usable on-ledger URI still remain visible with a placeholder because ownership is valid even when media cannot be resolved.
