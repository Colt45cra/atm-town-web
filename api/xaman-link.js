import startHandler from '../server/xaman-link-start.js';
import statusHandler from '../server/xaman-link-status.js';

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (action === 'start') return startHandler(req, res);
  if (action === 'status') return statusHandler(req, res);
  return res.status(400).json({ error: 'Unknown Xaman link action.' });
}
