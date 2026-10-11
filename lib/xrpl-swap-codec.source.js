// Source for the bundled server codec. Bundling avoids requiring ESM-only
// dependencies through Vercel's CommonJS runtime instrumentation.
import { createHash } from 'node:crypto';
import { decodeAccountID } from 'ripple-address-codec';
import { encode, decode, encodeForSigningBatch } from 'ripple-binary-codec';
import { verify } from 'ripple-keypairs';
export { decodeAccountID, encode, decode, encodeForSigningBatch, verify };
export function hashSignedTx(transaction) {
  return createHash('sha512').update(Buffer.from('54584E00' + encode(transaction), 'hex')).digest('hex').slice(0, 64).toUpperCase();
}
