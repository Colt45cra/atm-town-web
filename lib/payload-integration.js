import crypto from 'node:crypto';

const INTEGRATION_ID = 'atm_town';
const SIGNATURE_VERSION = 'PAYLOAD-INTEGRATION-V1';
const DRAFT_VERSION = 'ATM-TOWN-PAYLOAD-DRAFT-V1';
const DEFAULT_TIMEOUT_MS = 12_000;
const DRAFT_TTL_MS = 60 * 60 * 1000;

function configurationError(message) {
  return Object.assign(new Error(message), { status: 503 });
}

function requestError(message, status = 502, details = null) {
  const error = Object.assign(new Error(message), { status });
  if (details !== null) error.details = details;
  return error;
}

function getConfig() {
  const baseUrl = String(process.env.PAYLOAD_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const privateKeyB64 = String(process.env.PAYLOAD_INTEGRATION_PRIVATE_KEY_PKCS8_B64 || '').trim();
  if (!baseUrl || !/^https:\/\//i.test(baseUrl)) {
    throw configurationError('Payload integration URL is not configured for ATM Town.');
  }
  if (!privateKeyB64) {
    throw configurationError('ATM Town Payload integration signing key is not configured.');
  }
  return { baseUrl, privateKeyB64 };
}

function privateKey() {
  const { privateKeyB64 } = getConfig();
  try {
    return crypto.createPrivateKey({
      key: Buffer.from(privateKeyB64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
  } catch {
    throw configurationError('ATM Town Payload integration signing key is invalid.');
  }
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function signaturePayload(method, path, timestamp, nonce, rawBody) {
  return [
    SIGNATURE_VERSION,
    String(method || 'POST').toUpperCase(),
    path,
    timestamp,
    nonce,
    sha256Hex(rawBody),
  ].join('\n');
}

export async function payloadIntegrationRequest(path, body = {}, options = {}) {
  const { baseUrl } = getConfig();
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  const url = `${baseUrl}${normalizedPath}`;
  const method = String(options.method || 'POST').toUpperCase();
  const rawBody = body === null ? '' : JSON.stringify(body);
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const message = signaturePayload(method, normalizedPath, timestamp, nonce, rawBody);
  const signature = crypto.sign(null, Buffer.from(message, 'utf8'), privateKey()).toString('base64');

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-payload-integration-id': INTEGRATION_ID,
        'x-payload-timestamp': timestamp,
        'x-payload-nonce': nonce,
        'x-payload-signature': signature,
      },
      body: rawBody || undefined,
      signal: AbortSignal.timeout(Number(options.timeoutMs || DEFAULT_TIMEOUT_MS)),
      cache: 'no-store',
    });
  } catch (cause) {
    const error = requestError('Payload is temporarily unreachable. Try again in a moment.', 502);
    error.cause = cause;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw requestError(String(data?.error || `Payload request failed (${response.status}).`), response.status, data);
  }
  return { ...data, _httpStatus: response.status };
}

function draftSigningMessage(encodedPayload) {
  return `${DRAFT_VERSION}.${encodedPayload}`;
}

export function createPayloadDraftToken(payload) {
  const body = {
    v: 1,
    ...payload,
    issued_at: Date.now(),
    expires_at: Date.now() + DRAFT_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  const signature = crypto.sign(null, Buffer.from(draftSigningMessage(encoded), 'utf8'), privateKey()).toString('base64url');
  return `${encoded}.${signature}`;
}

export function verifyPayloadDraftToken(token, expectedUserId = null) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw Object.assign(new Error('Money Rain funding session is invalid.'), { status: 400 });
  }
  const [encoded, signatureText] = parts;
  let payload;
  try {
    const publicKey = crypto.createPublicKey(privateKey());
    const valid = crypto.verify(
      null,
      Buffer.from(draftSigningMessage(encoded), 'utf8'),
      publicKey,
      Buffer.from(signatureText, 'base64url'),
    );
    if (!valid) throw new Error('signature');
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw Object.assign(new Error('Money Rain funding session failed verification.'), { status: 401 });
  }
  if (payload?.v !== 1 || !payload?.integration_campaign_id || !payload?.external_event_id) {
    throw Object.assign(new Error('Money Rain funding session is malformed.'), { status: 400 });
  }
  if (!Number.isFinite(Number(payload.expires_at)) || Date.now() > Number(payload.expires_at)) {
    throw Object.assign(new Error('Money Rain funding session expired. Create a new Money Rain campaign.'), { status: 409 });
  }
  if (expectedUserId && String(payload.user_id || '') !== String(expectedUserId)) {
    throw Object.assign(new Error('This Money Rain funding session belongs to a different ATM Town account.'), { status: 403 });
  }
  return payload;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, stableValue(val)]),
    );
  }
  return value;
}

export function stablePayloadHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

export const PAYLOAD_INTEGRATION_ID = INTEGRATION_ID;
