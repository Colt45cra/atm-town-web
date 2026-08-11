import startHandler from '../server/xrpl-nft-offer-start.js';
import statusHandler from '../server/xrpl-nft-offer-status.js';
import offersHandler from '../server/xrpl-nft-offers.js';
import acceptHandler from '../server/xrpl-nft-offer-accept-start.js';

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (action === 'start') return startHandler(req, res);
  if (action === 'status') return statusHandler(req, res);
  if (action === 'offers') return offersHandler(req, res);
  if (action === 'accept') return acceptHandler(req, res);
  return res.status(400).json({ error: 'Unknown XRPL NFT trading action.' });
}
