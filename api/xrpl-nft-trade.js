import startHandler from '../server/xrpl-nft-offer-start.js';
import statusHandler from '../server/xrpl-nft-offer-status.js';
import offersHandler from '../server/xrpl-nft-offers.js';
import acceptHandler from '../server/xrpl-nft-offer-accept-start.js';

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (action.startsWith('fish-')) {
    const {default: fishingHandler}=await import('../server/fishing.js');
    return fishingHandler(req,res);
  }
  if (action.startsWith('pay-market-')) {
    const { default: handler } = await import('../server/atm-pay-nft-market.js');
    return handler(req,res);
  }
  if (action.startsWith('pay-swap-')) {
    const { default: handler } = await import('../server/atm-pay-swap.js');
    return handler(req,res);
  }
  if (action.startsWith('pay-link-')) {
    const { default: handler } = await import('../server/atm-pay-link.js');
    return handler(req,res);
  }
  if (action.startsWith('drop-')) {
    const { default: dropsHandler } = await import('../server/nft-drops.js');
    return dropsHandler(req, res);
  }
  if (action.startsWith('swap-')) {
    try {
      const { default: swapHandler } = await import('../server/xrpl-nft-swap.js');
      return await swapHandler(req, res);
    } catch (error) {
      console.error('Atomic NFT swap module failed to load:', error);
      return res.status(503).json({ error: 'Atomic NFT trading is temporarily unavailable.' });
    }
  }
  if (action === 'start') return startHandler(req, res);
  if (action === 'status') return statusHandler(req, res);
  if (action === 'offers') return offersHandler(req, res);
  if (action === 'accept') return acceptHandler(req, res);
  return res.status(400).json({ error: 'Unknown XRPL NFT trading action.' });
}
