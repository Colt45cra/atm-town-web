// ATM Town XRPL Testnet JSON-RPC transport.
// Uses multiple official/community-listed Testnet servers so one unavailable
// public endpoint does not break balances or ATM Pay verification.
const DEFAULT_TESTNET_RPC_URLS = Object.freeze([
  'https://testnet.xrpl-labs.com/',
  'https://testnet.honeycluster.io/',
  'https://s.altnet.rippletest.net:51234/',
]);

const DEFAULT_TIMEOUT_MS = 7_000;

function uniqueUrls(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

export function testnetRpcUrls() {
  return uniqueUrls([
    process.env.XRPL_TESTNET_RPC_URL,
    ...DEFAULT_TESTNET_RPC_URLS,
  ]);
}

function rpcError(result, fallback) {
  const error = new Error(result?.error_message || result?.error || fallback || 'XRPL Testnet request failed.');
  error.xrplCode = result?.error || '';
  return error;
}

export async function xrplTestnetRpc(method, params = [{}], options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const retryXrplCodes = new Set((options.retryXrplCodes || []).map((value) => String(value)));
  const payload = JSON.stringify({ method, params: Array.isArray(params) ? params : [params] });
  let lastError = null;

  for (const url of testnetRpcUrls()) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        lastError = new Error(`XRPL Testnet endpoint failed (${response.status}).`);
        continue;
      }
      const json = await response.json();
      if (json?.result?.status === 'error' || json?.result?.error) {
        const error = rpcError(json.result, 'XRPL Testnet request failed.');
        if (retryXrplCodes.has(String(error.xrplCode || ''))) {
          lastError = error;
          continue;
        }
        throw error;
      }
      return json?.result || {};
    } catch (error) {
      if (error?.xrplCode && !retryXrplCodes.has(String(error.xrplCode))) throw error;
      lastError = error;
    }
  }

  if (lastError?.xrplCode) throw lastError;
  const error = new Error('XRPL Testnet is temporarily unreachable from ATM Town. Please try again in a moment.');
  error.cause = lastError;
  throw error;
}
