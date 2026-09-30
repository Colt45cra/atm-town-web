import { setCors, requireUser, publicOriginForRequest, sendError } from '../lib/auth.js';
import {
  XAMAN_API_BASE,
  readJson,
  xamanHeaders,
  xamanError,
  fetchXamanPayload,
  XRPL_TX_HASH
} from '../lib/xaman-vending.js';

export const ATM_TOWN_NFT_ISSUER = 'rnCv6dCu3r1ANVD6vYuHikxV8TYphecdff';
export const ATM_TOWN_NFT_MINTER = 'rM5oXXzDLJxLqKp6ZwZjjesPvNvh669uCc';
export const AUTHORIZED_NFT_MINTER_FLAG = 10;
export const ATM_TOWN_NFT_TAXON = 321;
export const ATM_TOWN_NFT_TRANSFER_FEE = 10000;
export const ATM_TOWN_NFT_FLAGS = 8;
export const ASTRONAUT_ITEM_ID = 'body:astronaut';
export const ASTRONAUT_METADATA_URI = 'https://raw.githubusercontent.com/Colt45cra/atm-town-web/939d769f53e297de047933cbf3be0f5fab60f48f/nft/metadata/body-astronaut-v1.json';
export const ASTRONAUT_METADATA_URI_HEX = Buffer.from(ASTRONAUT_METADATA_URI, 'utf8').toString('hex').toUpperCase();

const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const PAYLOAD_UUID = /^[0-9a-f-]{36}$/i;

function rpcEndpoints() {
  return [...new Set([
    String(process.env.XRPL_RPC_URL || '').trim(),
    'https://xrplcluster.com/',
    'https://s1.ripple.com:51234/',
    'https://s2.ripple.com:51234/'
  ].filter(Boolean))];
}

async function rpc(endpoint, method, params) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'atm-town-nft-issuer-setup',
      method,
      params: [params]
    })
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(`XRPL server returned HTTP ${response.status}.`);
  const result = payload?.result || {};
  if (result.status === 'error' || result.error) {
    const error = new Error(result.error_message || result.error || 'XRPL request failed.');
    error.xrplCode = String(result.error || '');
    throw error;
  }
  return result;
}

async function accountInfo(account) {
  let lastError = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const result = await rpc(endpoint, 'account_info', {
        account,
        ledger_index: 'validated',
        queue: false,
        api_version: 2
      });
      const data = result.account_data || {};
      return {
        exists: true,
        address: account,
        balance_drops: String(data.Balance || '0'),
        owner_count: Number(data.OwnerCount || 0),
        sequence: Number(data.Sequence || 0),
        nftoken_minter: String(data.NFTokenMinter || ''),
        ledger_index: result.ledger_index ?? null
      };
    } catch (error) {
      if (error?.xrplCode === 'actNotFound') {
        return {
          exists: false,
          address: account,
          balance_drops: '0',
          owner_count: 0,
          sequence: 0,
          nftoken_minter: '',
          ledger_index: null
        };
      }
      lastError = error;
    }
  }
  throw Object.assign(lastError || new Error('No XRPL server was available.'), { status: 502 });
}

async function verifiedPlayerWallet(req) {
  const { admin, user } = await requireUser(req);
  const { data: player, error } = await admin
    .from('player_accounts')
    .select('wallet_address,wallet_verified_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  const wallet = String(player?.wallet_address || '').trim();
  if (!XRPL_ADDRESS.test(wallet) || !player?.wallet_verified_at) {
    throw Object.assign(new Error('Link and verify your game Xaman wallet before running the Astronaut NFT test.'), { status: 409 });
  }
  return { admin, user, wallet };
}

async function accountNfts(account) {
  let lastError = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const result = await rpc(endpoint, 'account_nfts', {
        account,
        ledger_index: 'validated',
        limit: 400,
        api_version: 2
      });
      return Array.isArray(result?.account_nfts) ? result.account_nfts : [];
    } catch (error) {
      if (error?.xrplCode === 'actNotFound') return [];
      lastError = error;
    }
  }
  throw Object.assign(lastError || new Error('Could not read XRPL NFT ownership.'), { status: 502 });
}

function canonicalAstronautNft(nfts) {
  const matches = (Array.isArray(nfts) ? nfts : []).filter((nft) =>
    String(nft?.Issuer || '') === ATM_TOWN_NFT_ISSUER &&
    Number(nft?.NFTokenTaxon) === ATM_TOWN_NFT_TAXON &&
    String(nft?.URI || '').toUpperCase() === ASTRONAUT_METADATA_URI_HEX
  );
  matches.sort((a, b) => Number(b?.nft_serial || 0) - Number(a?.nft_serial || 0));
  return matches[0] || null;
}

async function findAstronautNft(account) {
  return canonicalAstronautNft(await accountNfts(account));
}

async function sellOffers(tokenId) {
  let lastError = null;
  for (const endpoint of rpcEndpoints()) {
    try {
      const result = await rpc(endpoint, 'nft_sell_offers', {
        nft_id: tokenId,
        ledger_index: 'validated',
        api_version: 2
      });
      return Array.isArray(result?.offers) ? result.offers : [];
    } catch (error) {
      if (['objectNotFound', 'entryNotFound'].includes(error?.xrplCode)) return [];
      lastError = error;
    }
  }
  throw Object.assign(lastError || new Error('Could not read XRPL NFT sell offers.'), { status: 502 });
}

function offerIdFromMeta(meta) {
  const direct = String(meta?.offer_id || meta?.OfferID || '').toUpperCase();
  if (/^[A-F0-9]{64}$/.test(direct)) return direct;
  for (const wrapper of Array.isArray(meta?.AffectedNodes) ? meta.AffectedNodes : []) {
    const node = wrapper?.CreatedNode;
    if (node?.LedgerEntryType === 'NFTokenOffer') {
      const id = String(node?.LedgerIndex || '').toUpperCase();
      if (/^[A-F0-9]{64}$/.test(id)) return id;
    }
  }
  return '';
}

function tokenIdFromMeta(meta) {
  const value = String(meta?.nftoken_id || meta?.NFTokenID || '').toUpperCase();
  return /^[A-F0-9]{64}$/.test(value) ? value : '';
}

async function txByHash(hash) {
  let lastError = null;
  let reachedServer = false;
  for (const endpoint of rpcEndpoints()) {
    try {
      const result = await rpc(endpoint, 'tx', {
        transaction: hash,
        binary: false,
        api_version: 2
      });
      reachedServer = true;
      if (result?.validated === true) return result;
    } catch (error) {
      if (error?.xrplCode === 'txnNotFound') {
        reachedServer = true;
        continue;
      }
      lastError = error;
    }
  }
  if (reachedServer) return null;
  throw Object.assign(lastError || new Error('No XRPL server was available.'), { status: 502 });
}

function authorizationMatches(result, hash) {
  const tx = result?.tx_json || result?.tx || result?.transaction || result || {};
  const meta = result?.meta || result?.metaData || result?.metadata || {};
  const txHash = String(result?.hash || tx?.hash || tx?.Hash || '').toUpperCase();
  const engine = String(meta?.TransactionResult || meta?.transaction_result || result?.engine_result || '');
  return {
    ok:
      result?.validated === true &&
      txHash === String(hash || '').toUpperCase() &&
      String(tx?.TransactionType || '') === 'AccountSet' &&
      String(tx?.Account || '') === ATM_TOWN_NFT_ISSUER &&
      Number(tx?.SetFlag) === AUTHORIZED_NFT_MINTER_FLAG &&
      String(tx?.NFTokenMinter || '') === ATM_TOWN_NFT_MINTER &&
      engine === 'tesSUCCESS',
    tx,
    engine
  };
}

function mintMatches(result, hash) {
  const tx = result?.tx_json || result?.tx || result?.transaction || result || {};
  const meta = result?.meta || result?.metaData || result?.metadata || {};
  const txHash = String(result?.hash || tx?.hash || tx?.Hash || '').toUpperCase();
  const engine = String(meta?.TransactionResult || meta?.transaction_result || result?.engine_result || '');
  const typeFlags = Number(tx?.Flags || 0) & 0xFFFF;
  return {
    ok:
      result?.validated === true &&
      txHash === String(hash || '').toUpperCase() &&
      String(tx?.TransactionType || '') === 'NFTokenMint' &&
      String(tx?.Account || '') === ATM_TOWN_NFT_MINTER &&
      String(tx?.Issuer || '') === ATM_TOWN_NFT_ISSUER &&
      Number(tx?.NFTokenTaxon) === ATM_TOWN_NFT_TAXON &&
      Number(tx?.TransferFee) === ATM_TOWN_NFT_TRANSFER_FEE &&
      typeFlags === ATM_TOWN_NFT_FLAGS &&
      String(tx?.URI || '').toUpperCase() === ASTRONAUT_METADATA_URI_HEX &&
      tx?.Destination === undefined &&
      tx?.Amount === undefined &&
      engine === 'tesSUCCESS',
    tx,
    meta,
    engine
  };
}

function transferOfferMatches(result, hash, tokenId, playerWallet) {
  const tx = result?.tx_json || result?.tx || result?.transaction || result || {};
  const meta = result?.meta || result?.metaData || result?.metadata || {};
  const txHash = String(result?.hash || tx?.hash || tx?.Hash || '').toUpperCase();
  const engine = String(meta?.TransactionResult || meta?.transaction_result || result?.engine_result || '');
  const typeFlags = Number(tx?.Flags || 0) & 0xFFFF;
  return {
    ok:
      result?.validated === true &&
      txHash === String(hash || '').toUpperCase() &&
      String(tx?.TransactionType || '') === 'NFTokenCreateOffer' &&
      String(tx?.Account || '') === ATM_TOWN_NFT_MINTER &&
      String(tx?.NFTokenID || '').toUpperCase() === String(tokenId || '').toUpperCase() &&
      String(tx?.Amount ?? '') === '0' &&
      String(tx?.Destination || '') === playerWallet &&
      typeFlags === 1 &&
      engine === 'tesSUCCESS',
    tx,
    meta,
    engine
  };
}

function acceptMatches(result, hash, playerWallet) {
  const tx = result?.tx_json || result?.tx || result?.transaction || result || {};
  const meta = result?.meta || result?.metaData || result?.metadata || {};
  const txHash = String(result?.hash || tx?.hash || tx?.Hash || '').toUpperCase();
  const engine = String(meta?.TransactionResult || meta?.transaction_result || result?.engine_result || '');
  return {
    ok:
      result?.validated === true &&
      txHash === String(hash || '').toUpperCase() &&
      String(tx?.TransactionType || '') === 'NFTokenAcceptOffer' &&
      String(tx?.Account || '') === playerWallet &&
      /^[A-F0-9]{64}$/.test(String(tx?.NFTokenSellOffer || '').toUpperCase()) &&
      engine === 'tesSUCCESS',
    tx,
    meta,
    engine
  };
}

async function createAstronautMintPayload(req) {
  const origin = publicOriginForRequest(req);
  const returnUrl = `${origin}/?nft_setup=1&astronaut_mint_return=1&mint_payload={id}`;
  const txjson = {
    TransactionType: 'NFTokenMint',
    Account: ATM_TOWN_NFT_MINTER,
    Issuer: ATM_TOWN_NFT_ISSUER,
    NFTokenTaxon: ATM_TOWN_NFT_TAXON,
    TransferFee: ATM_TOWN_NFT_TRANSFER_FEE,
    Flags: ATM_TOWN_NFT_FLAGS,
    URI: ASTRONAUT_METADATA_URI_HEX
  };
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST',
    headers: xamanHeaders(),
    cache: 'no-store',
    body: JSON.stringify({
      txjson,
      options: {
        submit: true,
        expire: 10,
        force_network: 'MAINNET',
        return_url: { app: returnUrl, web: returnUrl }
      },
      custom_meta: {
        identifier: 'atm-town-astronaut-body-first-mint',
        instruction: `Mint Astronaut Body only. Verify minter ${ATM_TOWN_NFT_MINTER}, issuer ${ATM_TOWN_NFT_ISSUER}, Taxon 321, TransferFee 10000 (10%), and transferable flag 8 before signing.`
      }
    })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) {
    throw xamanError(created, 'Xaman rejected the Astronaut Body mint request');
  }
  return created;
}

async function createAstronautTransferOfferPayload(req, playerWallet, tokenId) {
  const origin = publicOriginForRequest(req);
  const returnUrl = `${origin}/?nft_setup=1&astronaut_offer_return=1&offer_payload={id}`;
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST',
    headers: xamanHeaders(),
    cache: 'no-store',
    body: JSON.stringify({
      txjson: {
        TransactionType: 'NFTokenCreateOffer',
        Account: ATM_TOWN_NFT_MINTER,
        NFTokenID: tokenId,
        Amount: '0',
        Destination: playerWallet,
        Flags: 1
      },
      options: {
        submit: true,
        expire: 10,
        force_network: 'MAINNET',
        return_url: { app: returnUrl, web: returnUrl }
      },
      custom_meta: {
        identifier: 'atm-town-astronaut-body-transfer-offer',
        instruction: `Create a 0 XRP Astronaut Body sell offer restricted to ${playerWallet}. Sign with the ATM Town operational/minter wallet only.`
      }
    })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) {
    throw xamanError(created, 'Xaman rejected the Astronaut Body transfer-offer request');
  }
  return created;
}

async function createAstronautAcceptPayload(req, playerWallet, offerId) {
  const origin = publicOriginForRequest(req);
  const returnUrl = `${origin}/?nft_setup=1&astronaut_accept_return=1&accept_payload={id}`;
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST',
    headers: xamanHeaders(),
    cache: 'no-store',
    body: JSON.stringify({
      txjson: {
        TransactionType: 'NFTokenAcceptOffer',
        Account: playerWallet,
        NFTokenSellOffer: offerId
      },
      options: {
        submit: true,
        expire: 10,
        force_network: 'MAINNET',
        return_url: { app: returnUrl, web: returnUrl }
      },
      custom_meta: {
        identifier: 'atm-town-astronaut-body-accept',
        instruction: 'Accept the zero-XRP Astronaut Body transfer into your verified ATM Town game wallet.'
      }
    })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) {
    throw xamanError(created, 'Xaman rejected the Astronaut Body accept request');
  }
  return created;
}

async function createAuthorizationPayload(req) {
  const origin = publicOriginForRequest(req);
  const returnUrl = `${origin}/?nft_setup=1&nft_auth_return=1&payload={id}`;
  const response = await fetch(`${XAMAN_API_BASE}/payload`, {
    method: 'POST',
    headers: xamanHeaders(),
    cache: 'no-store',
    body: JSON.stringify({
      txjson: {
        TransactionType: 'AccountSet',
        Account: ATM_TOWN_NFT_ISSUER,
        SetFlag: AUTHORIZED_NFT_MINTER_FLAG,
        NFTokenMinter: ATM_TOWN_NFT_MINTER
      },
      options: {
        submit: true,
        expire: 10,
        force_network: 'MAINNET',
        return_url: {
          app: returnUrl,
          web: returnUrl
        }
      },
      custom_meta: {
        identifier: 'atm-town-authorized-nft-minter',
        instruction: `Authorize ${ATM_TOWN_NFT_MINTER} as the ATM Town NFToken minter. Verify both addresses before signing.`
      }
    })
  });
  const created = await readJson(response);
  if (!response.ok || !created?.uuid || !created?.next?.always) {
    throw xamanError(created, 'Xaman rejected the ATM Town NFT minter authorization request');
  }
  return created;
}

async function handleLedgerStatus(req, res) {
  await requireUser(req);
  const [issuer, minter] = await Promise.all([
    accountInfo(ATM_TOWN_NFT_ISSUER),
    accountInfo(ATM_TOWN_NFT_MINTER)
  ]);
  const authorized = issuer.exists && issuer.nftoken_minter === ATM_TOWN_NFT_MINTER;
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({
    network: 'mainnet',
    issuer: {
      ...issuer,
      configured_minter: ATM_TOWN_NFT_MINTER,
      authorized_minter_matches: authorized
    },
    minter,
    authorized
  });
}

async function handleAuthorizeStart(req, res) {
  await requireUser(req);
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });

  if (!XRPL_ADDRESS.test(ATM_TOWN_NFT_ISSUER) || !XRPL_ADDRESS.test(ATM_TOWN_NFT_MINTER)) {
    throw Object.assign(new Error('ATM Town NFT wallet configuration is invalid.'), { status: 500 });
  }

  const issuer = await accountInfo(ATM_TOWN_NFT_ISSUER);
  const minter = await accountInfo(ATM_TOWN_NFT_MINTER);
  if (!issuer.exists) {
    return res.status(409).json({
      error: 'The ATM Town issuer account is not active on XRPL Mainnet yet. Fund the issuer wallet with XRP, then retry.'
    });
  }
  if (!minter.exists) {
    return res.status(409).json({
      error: 'The ATM Town operational/minter account is not active on XRPL Mainnet yet. Fund the operational wallet with XRP, then retry.'
    });
  }
  if (issuer.nftoken_minter === ATM_TOWN_NFT_MINTER) {
    return res.status(200).json({
      already_authorized: true,
      network: 'mainnet',
      issuer: ATM_TOWN_NFT_ISSUER,
      minter: ATM_TOWN_NFT_MINTER
    });
  }

  const created = await createAuthorizationPayload(req);
  return res.status(201).json({
    already_authorized: false,
    network: 'mainnet',
    issuer: ATM_TOWN_NFT_ISSUER,
    minter: ATM_TOWN_NFT_MINTER,
    payload_uuid: created.uuid,
    deeplink: created.next.always,
    qr_png: created.refs?.qr_png || null,
    expires_in_minutes: 10
  });
}

async function handleAuthorizeStatus(req, res) {
  await requireUser(req);
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required.' });
  const payloadUuid = String(req.query?.payload_uuid || '').trim();
  if (!PAYLOAD_UUID.test(payloadUuid)) return res.status(400).json({ error: 'A valid Xaman payload UUID is required.' });

  const lookup = await fetchXamanPayload(payloadUuid);
  if (!lookup.found) return res.status(404).json({ error: 'Xaman authorization request was not found.' });
  const payload = lookup.payload || {};
  const meta = payload.meta || {};

  if (!meta.resolved) {
    return res.status(200).json({
      status: meta.expired === true ? 'expired' : 'pending',
      phase: meta.opened_by_deeplink ? 'opened' : 'waiting'
    });
  }
  if (meta.signed !== true) return res.status(200).json({ status: 'rejected' });

  const response = payload.response || {};
  const signer = String(response.account || '');
  if (signer && signer !== ATM_TOWN_NFT_ISSUER) {
    return res.status(409).json({
      status: 'failed',
      error: 'The authorization was signed by a different XRPL account. It must be signed by the ATM Town issuer.'
    });
  }
  const nodeType = String(response.dispatched_nodetype || '').toUpperCase();
  if (nodeType && !nodeType.includes('MAINNET')) {
    return res.status(409).json({ status: 'failed', error: 'The authorization was not submitted to XRPL Mainnet.' });
  }

  const txHash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(txHash)) {
    return res.status(200).json({ status: 'pending', phase: 'validating' });
  }

  const validated = await txByHash(txHash);
  if (!validated) {
    return res.status(200).json({ status: 'pending', phase: 'validating', tx_hash: txHash });
  }
  const match = authorizationMatches(validated, txHash);
  if (!match.ok) {
    return res.status(409).json({
      status: 'failed',
      tx_hash: txHash,
      error: `The validated transaction did not exactly match the ATM Town minter authorization${match.engine ? ` (${match.engine})` : ''}.`
    });
  }

  const issuer = await accountInfo(ATM_TOWN_NFT_ISSUER);
  const authorized = issuer.nftoken_minter === ATM_TOWN_NFT_MINTER;
  return res.status(200).json({
    status: authorized ? 'authorized' : 'pending',
    phase: authorized ? 'complete' : 'ledger-setting',
    tx_hash: txHash,
    issuer: ATM_TOWN_NFT_ISSUER,
    minter: ATM_TOWN_NFT_MINTER,
    authorized
  });
}

async function handleAstronautState(req, res) {
  const { wallet } = await verifiedPlayerWallet(req);
  const [playerNft, minterNft] = await Promise.all([
    findAstronautNft(wallet),
    wallet === ATM_TOWN_NFT_MINTER ? Promise.resolve(null) : findAstronautNft(ATM_TOWN_NFT_MINTER)
  ]);
  let offerId = '';
  if (!playerNft && minterNft?.NFTokenID && wallet !== ATM_TOWN_NFT_MINTER) {
    const offers = await sellOffers(String(minterNft.NFTokenID).toUpperCase());
    const offer = offers.find((entry) =>
      String(entry?.destination || entry?.Destination || '') === wallet &&
      String(entry?.amount ?? entry?.Amount ?? '') === '0'
    );
    offerId = String(offer?.nft_offer_index || offer?.NFTokenOffer || offer?.index || '').toUpperCase();
  }
  return res.status(200).json({
    status: playerNft
      ? 'owned_by_player'
      : minterNft
        ? (offerId ? 'offer_ready' : 'minted_needs_offer')
        : 'not_minted',
    player_wallet: wallet,
    nftoken_id: String(playerNft?.NFTokenID || minterNft?.NFTokenID || '').toUpperCase(),
    offer_id: offerId,
    item_id: ASTRONAUT_ITEM_ID,
    metadata_uri: ASTRONAUT_METADATA_URI,
    taxon: ATM_TOWN_NFT_TAXON,
    transfer_fee: ATM_TOWN_NFT_TRANSFER_FEE
  });
}

async function handleAstronautMintStart(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  const { wallet } = await verifiedPlayerWallet(req);
  const issuer = await accountInfo(ATM_TOWN_NFT_ISSUER);
  if (!issuer.exists || issuer.nftoken_minter !== ATM_TOWN_NFT_MINTER) {
    return res.status(409).json({ error: 'The operational wallet is not currently authorized as the issuer NFTokenMinter.' });
  }
  const playerNft = await findAstronautNft(wallet);
  if (playerNft) {
    return res.status(200).json({ already_owned: true, nftoken_id: String(playerNft.NFTokenID || '').toUpperCase(), player_wallet: wallet });
  }
  if (wallet !== ATM_TOWN_NFT_MINTER) {
    const minterNft = await findAstronautNft(ATM_TOWN_NFT_MINTER);
    if (minterNft) {
      return res.status(200).json({ already_minted: true, nftoken_id: String(minterNft.NFTokenID || '').toUpperCase(), player_wallet: wallet });
    }
  }
  const created = await createAstronautMintPayload(req);
  return res.status(201).json({
    payload_uuid: created.uuid,
    deeplink: created.next.always,
    qr_png: created.refs?.qr_png || null,
    expires_in_minutes: 10,
    player_wallet: wallet,
    minter: ATM_TOWN_NFT_MINTER,
    issuer: ATM_TOWN_NFT_ISSUER,
    item_id: ASTRONAUT_ITEM_ID,
    taxon: ATM_TOWN_NFT_TAXON,
    transfer_fee: ATM_TOWN_NFT_TRANSFER_FEE,
    flags: ATM_TOWN_NFT_FLAGS,
    metadata_uri: ASTRONAUT_METADATA_URI
  });
}

async function handleAstronautMintStatus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required.' });
  const { wallet } = await verifiedPlayerWallet(req);
  const payloadUuid = String(req.query?.payload_uuid || '').trim();
  if (!PAYLOAD_UUID.test(payloadUuid)) return res.status(400).json({ error: 'A valid Xaman mint payload UUID is required.' });
  const lookup = await fetchXamanPayload(payloadUuid);
  if (!lookup.found) return res.status(404).json({ error: 'Astronaut mint request was not found.' });
  const payload = lookup.payload || {};
  const meta = payload.meta || {};
  if (!meta.resolved) {
    return res.status(200).json({ status: meta.expired === true ? 'expired' : 'pending', phase: meta.opened_by_deeplink ? 'opened' : 'waiting' });
  }
  if (meta.signed !== true) return res.status(200).json({ status: 'rejected' });
  const response = payload.response || {};
  const signer = String(response.account || '');
  if (signer && signer !== ATM_TOWN_NFT_MINTER) {
    return res.status(409).json({ status: 'failed', error: 'The mint was signed by a different XRPL account. It must be signed by the ATM Town operational/minter wallet.' });
  }
  const nodeType = String(response.dispatched_nodetype || '').toUpperCase();
  if (nodeType && !nodeType.includes('MAINNET')) return res.status(409).json({ status: 'failed', error: 'The mint was not submitted to XRPL Mainnet.' });
  const dispatchedResult = String(response.dispatched_result || response.engine_result || '');
  if (dispatchedResult && dispatchedResult !== 'tesSUCCESS') {
    return res.status(409).json({ status: 'failed', error: `XRPL rejected the mint: ${dispatchedResult}.` });
  }
  const txHash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(txHash)) return res.status(200).json({ status: 'pending', phase: 'validating' });
  const validated = await txByHash(txHash);
  if (!validated) return res.status(200).json({ status: 'pending', phase: 'validating', tx_hash: txHash });
  const match = mintMatches(validated, txHash);
  if (!match.ok) {
    return res.status(409).json({ status: 'failed', tx_hash: txHash, error: `The validated transaction did not exactly match the locked Astronaut Body mint${match.engine ? ` (${match.engine})` : ''}.` });
  }
  let tokenId = tokenIdFromMeta(match.meta);
  if (!tokenId) {
    const minted = await findAstronautNft(ATM_TOWN_NFT_MINTER);
    tokenId = String(minted?.NFTokenID || '').toUpperCase();
  }
  const playerOwns = Boolean(await findAstronautNft(wallet));
  return res.status(200).json({
    status: playerOwns ? 'owned_by_player' : 'minted',
    phase: playerOwns || wallet === ATM_TOWN_NFT_MINTER ? 'complete' : 'ready_to_create_offer',
    tx_hash: txHash,
    nftoken_id: tokenId,
    player_wallet: wallet,
    metadata_uri: ASTRONAUT_METADATA_URI
  });
}

async function handleAstronautOfferStart(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  const { wallet } = await verifiedPlayerWallet(req);
  if (wallet === ATM_TOWN_NFT_MINTER) {
    const owned = await findAstronautNft(wallet);
    return res.status(200).json({ not_needed: true, already_owned: Boolean(owned), nftoken_id: String(owned?.NFTokenID || '').toUpperCase() });
  }
  const playerNft = await findAstronautNft(wallet);
  if (playerNft) return res.status(200).json({ already_owned: true, nftoken_id: String(playerNft.NFTokenID || '').toUpperCase() });
  const minterNft = await findAstronautNft(ATM_TOWN_NFT_MINTER);
  if (!minterNft?.NFTokenID) return res.status(409).json({ error: 'Mint Astronaut Body first. The operational wallet does not currently hold the test NFT.' });
  const tokenId = String(minterNft.NFTokenID).toUpperCase();
  const offers = await sellOffers(tokenId);
  const existing = offers.find((entry) =>
    String(entry?.destination || entry?.Destination || '') === wallet &&
    String(entry?.amount ?? entry?.Amount ?? '') === '0'
  );
  const existingOfferId = String(existing?.nft_offer_index || existing?.NFTokenOffer || existing?.index || '').toUpperCase();
  if (/^[A-F0-9]{64}$/.test(existingOfferId)) {
    return res.status(200).json({ already_created: true, nftoken_id: tokenId, offer_id: existingOfferId, player_wallet: wallet });
  }
  const created = await createAstronautTransferOfferPayload(req, wallet, tokenId);
  return res.status(201).json({
    payload_uuid: created.uuid,
    deeplink: created.next.always,
    qr_png: created.refs?.qr_png || null,
    expires_in_minutes: 10,
    player_wallet: wallet,
    nftoken_id: tokenId
  });
}

async function handleAstronautOfferStatus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required.' });
  const { wallet } = await verifiedPlayerWallet(req);
  const payloadUuid = String(req.query?.payload_uuid || '').trim();
  if (!PAYLOAD_UUID.test(payloadUuid)) return res.status(400).json({ error: 'A valid Xaman transfer-offer payload UUID is required.' });

  const lookup = await fetchXamanPayload(payloadUuid);
  if (!lookup.found) return res.status(404).json({ error: 'Astronaut transfer-offer request was not found.' });
  const payload = lookup.payload || {};
  const meta = payload.meta || {};
  if (!meta.resolved) return res.status(200).json({ status: meta.expired === true ? 'expired' : 'pending', phase: meta.opened_by_deeplink ? 'opened' : 'waiting' });
  if (meta.signed !== true) return res.status(200).json({ status: 'rejected' });

  const response = payload.response || {};
  const signer = String(response.account || '');
  if (signer && signer !== ATM_TOWN_NFT_MINTER) {
    return res.status(409).json({ status: 'failed', error: 'The transfer offer must be signed by the ATM Town operational/minter wallet.' });
  }
  const nodeType = String(response.dispatched_nodetype || '').toUpperCase();
  if (nodeType && !nodeType.includes('MAINNET')) return res.status(409).json({ status: 'failed', error: 'The transfer offer was not submitted to XRPL Mainnet.' });

  const dispatchedResult = String(response.dispatched_result || response.engine_result || '');
  if (dispatchedResult && dispatchedResult !== 'tesSUCCESS') {
    return res.status(409).json({ status: 'failed', error: `XRPL rejected the transfer offer: ${dispatchedResult}.` });
  }

  const txHash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(txHash)) return res.status(200).json({ status: 'pending', phase: 'validating' });
  const validated = await txByHash(txHash);
  if (!validated) return res.status(200).json({ status: 'pending', phase: 'validating', tx_hash: txHash });

  const minterNft = await findAstronautNft(ATM_TOWN_NFT_MINTER);
  const tokenId = String(minterNft?.NFTokenID || '').toUpperCase();
  if (!/^[A-F0-9]{64}$/.test(tokenId)) {
    return res.status(409).json({ status: 'failed', tx_hash: txHash, error: 'The operational wallet no longer holds the Astronaut test NFT.' });
  }
  const match = transferOfferMatches(validated, txHash, tokenId, wallet);
  if (!match.ok) {
    return res.status(409).json({ status: 'failed', tx_hash: txHash, error: `The validated transaction did not exactly match the restricted Astronaut transfer offer${match.engine ? ` (${match.engine})` : ''}.` });
  }

  let offerId = offerIdFromMeta(match.meta);
  if (!offerId) {
    const offers = await sellOffers(tokenId);
    const offer = offers.find((entry) =>
      String(entry?.destination || entry?.Destination || '') === wallet &&
      String(entry?.amount ?? entry?.Amount ?? '') === '0'
    );
    offerId = String(offer?.nft_offer_index || offer?.NFTokenOffer || offer?.index || '').toUpperCase();
  }
  return res.status(200).json({
    status: /^[A-F0-9]{64}$/.test(offerId) ? 'offer_ready' : 'pending',
    phase: /^[A-F0-9]{64}$/.test(offerId) ? 'ready_to_accept' : 'offer-sync',
    tx_hash: txHash,
    nftoken_id: tokenId,
    offer_id: offerId,
    player_wallet: wallet
  });
}

async function handleAstronautAcceptStart(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required.' });
  const { wallet } = await verifiedPlayerWallet(req);
  const playerNft = await findAstronautNft(wallet);
  if (playerNft) return res.status(200).json({ already_owned: true, nftoken_id: String(playerNft.NFTokenID || '').toUpperCase() });
  const minterNft = await findAstronautNft(ATM_TOWN_NFT_MINTER);
  if (!minterNft?.NFTokenID) return res.status(409).json({ error: 'The Astronaut Body test NFT is not waiting in the operational wallet.' });
  const tokenId = String(minterNft.NFTokenID).toUpperCase();
  const offers = await sellOffers(tokenId);
  const offer = offers.find((entry) =>
    String(entry?.destination || entry?.Destination || '') === wallet &&
    String(entry?.amount ?? entry?.Amount ?? '') === '0'
  );
  const offerId = String(offer?.nft_offer_index || offer?.NFTokenOffer || offer?.index || '').toUpperCase();
  if (!/^[A-F0-9]{64}$/.test(offerId)) return res.status(409).json({ error: 'The zero-XRP Astronaut transfer offer for your linked wallet was not found.' });
  const created = await createAstronautAcceptPayload(req, wallet, offerId);
  return res.status(201).json({
    payload_uuid: created.uuid,
    deeplink: created.next.always,
    qr_png: created.refs?.qr_png || null,
    expires_in_minutes: 10,
    player_wallet: wallet,
    nftoken_id: tokenId,
    offer_id: offerId
  });
}

async function handleAstronautAcceptStatus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required.' });
  const { wallet } = await verifiedPlayerWallet(req);
  const payloadUuid = String(req.query?.payload_uuid || '').trim();
  if (!PAYLOAD_UUID.test(payloadUuid)) return res.status(400).json({ error: 'A valid Xaman accept payload UUID is required.' });
  const lookup = await fetchXamanPayload(payloadUuid);
  if (!lookup.found) return res.status(404).json({ error: 'Astronaut accept request was not found.' });
  const payload = lookup.payload || {};
  const meta = payload.meta || {};
  if (!meta.resolved) return res.status(200).json({ status: meta.expired === true ? 'expired' : 'pending', phase: meta.opened_by_deeplink ? 'opened' : 'waiting' });
  if (meta.signed !== true) return res.status(200).json({ status: 'rejected' });
  const response = payload.response || {};
  const signer = String(response.account || '');
  if (signer && signer !== wallet) return res.status(409).json({ status: 'failed', error: 'The transfer acceptance must be signed by your verified ATM Town game wallet.' });
  const nodeType = String(response.dispatched_nodetype || '').toUpperCase();
  if (nodeType && !nodeType.includes('MAINNET')) return res.status(409).json({ status: 'failed', error: 'The transfer acceptance was not submitted to XRPL Mainnet.' });
  const txHash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(txHash)) return res.status(200).json({ status: 'pending', phase: 'validating' });
  const validated = await txByHash(txHash);
  if (!validated) return res.status(200).json({ status: 'pending', phase: 'validating', tx_hash: txHash });
  const match = acceptMatches(validated, txHash, wallet);
  if (!match.ok) return res.status(409).json({ status: 'failed', tx_hash: txHash, error: `The validated transaction did not match the Astronaut NFT transfer acceptance${match.engine ? ` (${match.engine})` : ''}.` });
  const owned = await findAstronautNft(wallet);
  if (!owned?.NFTokenID) return res.status(200).json({ status: 'pending', phase: 'ownership-sync', tx_hash: txHash });
  return res.status(200).json({
    status: 'owned_by_player',
    phase: 'complete',
    tx_hash: txHash,
    nftoken_id: String(owned.NFTokenID).toUpperCase(),
    player_wallet: wallet,
    item_id: ASTRONAUT_ITEM_ID
  });
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  try {
    const action = String(req.query?.action || '').toLowerCase();
    if (action === 'ledger-status') return await handleLedgerStatus(req, res);
    if (action === 'authorize-start') return await handleAuthorizeStart(req, res);
    if (action === 'authorize-status') return await handleAuthorizeStatus(req, res);
    if (action === 'astronaut-state') return await handleAstronautState(req, res);
    if (action === 'astronaut-mint-start') return await handleAstronautMintStart(req, res);
    if (action === 'astronaut-mint-status') return await handleAstronautMintStatus(req, res);
    if (action === 'astronaut-offer-start') return await handleAstronautOfferStart(req, res);
    if (action === 'astronaut-offer-status') return await handleAstronautOfferStatus(req, res);
    if (action === 'astronaut-accept-start') return await handleAstronautAcceptStart(req, res);
    if (action === 'astronaut-accept-status') return await handleAstronautAcceptStatus(req, res);
    return res.status(400).json({ error: 'Unknown ATM Town NFT issuer setup action.' });
  } catch (error) {
    console.error('ATM Town NFT issuer setup failed:', error);
    sendError(res, error);
  }
}
