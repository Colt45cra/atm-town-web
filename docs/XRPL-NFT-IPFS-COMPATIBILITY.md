# XRPL NFT IPFS Compatibility — v231.2

This hotfix improves compatibility with NFTs minted by platforms that placed human-readable filenames directly in IPFS URIs.

## Fixed

- Encodes every IPFS path segment before constructing HTTP gateway URLs. This preserves literal spaces, `#`, `?`, Unicode, and other filename characters instead of allowing them to be interpreted as URL syntax.
- Races multiple public IPFS gateways instead of waiting on slow gateways sequentially.
- Adds NFT.Storage and Web3.Storage gateway fallbacks in addition to existing gateways.
- Separates NFTs with no on-ledger URI from metadata fetch failures in the Locker status.

An NFToken with no URI cannot have its artwork reconstructed from XRPL alone.
