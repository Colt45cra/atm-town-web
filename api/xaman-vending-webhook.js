import { adminClient } from '../lib/auth.js';
import {
  extractXamanPayloadUuid,
  verifyXamanWebhookSignature,
  resolveXamanVendingPayment
} from '../lib/xaman-vending.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST required.' });
  }

  try {
    if (!verifyXamanWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid Xaman webhook signature.' });
    }

    const payloadUuid = extractXamanPayloadUuid(req.body);
    if (!payloadUuid) {
      return res.status(200).json({ received: true, ignored: 'No payload UUID was included.' });
    }

    const admin = adminClient();
    const { data: request, error: requestError } = await admin
      .from('vending_payment_requests')
      .select('*')
      .eq('payload_uuid', payloadUuid)
      .maybeSingle();
    if (requestError) throw requestError;

    // The Xaman application webhook also receives wallet-link SignIn payloads.
    // Unknown UUIDs are intentionally acknowledged without changing anything.
    if (!request) {
      return res.status(200).json({ received: true, ignored: 'Payload is not a Magnet Can purchase.' });
    }
    if (request.status === 'paid') {
      return res.status(200).json({ received: true, status: 'paid', duplicate: true });
    }

    const result = await resolveXamanVendingPayment(admin, request, {
      attempts: 4,
      delayMs: 1200
    });

    return res.status(200).json({
      received: true,
      status: result.kind,
      phase: result.phase || null,
      tx_hash: result.request?.tx_hash || result.txHash || null
    });
  } catch (error) {
    console.error('ATM Town Xaman vending webhook failed:', error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'Xaman vending webhook processing failed.'
    });
  }
}
