// Source for the bundled server codec. Bundling avoids requiring ESM-only
// dependencies through Vercel's CommonJS runtime instrumentation.
import { createHash } from 'node:crypto';
import { decodeAccountID } from 'ripple-address-codec';
import { encode } from 'ripple-binary-codec';
export { decodeAccountID, encode };
export function hashSignedTx(transaction) {
  return createHash('sha512').update(Buffer.from('54584E00' + encode(transaction), 'hex')).digest('hex').slice(0, 64).toUpperCase();
}
