import startHandler from '../server/xaman-link-start.js';
import statusHandler from '../server/xaman-link-status.js';
import nftSetupHandler from '../server/nft-issuer-setup.js';

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (action === 'start') return startHandler(req, res);
  if (action === 'status') return statusHandler(req, res);
  if (action === 'nft-ledger-status') { req.query.action = 'ledger-status'; return nftSetupHandler(req, res); }
  if (action === 'nft-authorize-start') { req.query.action = 'authorize-start'; return nftSetupHandler(req, res); }
  if (action === 'nft-authorize-status') { req.query.action = 'authorize-status'; return nftSetupHandler(req, res); }
  return res.status(400).json({ error: 'Unknown Xaman link action.' });
}
