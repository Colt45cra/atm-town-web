import { nftWallet } from '../lib/atm-pay-town.js';
import { randomUUID } from 'node:crypto';
import { setCors, requireUser, adminClient, sendError } from '../lib/auth.js';
import { NFT_ID, OFFER_ID, XRPL_ADDRESS, findOwnedNft, rpc, createXamanTransaction, cancelXamanTransaction } from '../lib/xrpl-nft-trading.js';
import { fetchXamanPayload, XRPL_TX_HASH } from '../lib/xaman-vending.js';
import { resolveMetadata } from '../api/xrpl-nft-metadata.js';
import { REWARDS_NFT_WALLET, DONATION_BOX_ID, freeOfferTransaction, matchesFreeOffer, validFreeOffer, offerIndex, placement, fail } from '../lib/nft-drops.js';

const check = ({ data, error }) => { if (error) throw error; return data; };
const parts = r => ({ tx: r.tx_json || r.tx || r.transaction || r, meta: r.meta || r.metaData || {} });
const success = r => r.validated === true && parts(r).meta.TransactionResult === 'tesSUCCESS';
const ownerRow = row => ({ ...publicRow(row), ...(row.status === 'pending' && /^[0-9a-f-]{36}$/i.test(row.payload_uuid || '') ? { deeplink: `https://xumm.app/sign/${row.payload_uuid}` } : {}) });
const publicRow = row => ({ id: row.id, kind: row.kind, status: row.status === 'claimed' && !row._claim_verified ? 'checking' : row.status, token_id: row.token_id, name: row.name, image_url: row.image_url, map: row.map, x: row.x, y: row.y, offer_index: row.offer_index, wallet_address: row.wallet_address, failure_reason: row.failure_reason, claim_verified: Boolean(row._claim_verified) });
async function walletFor(admin, user) {
  if ((await nftWallet(admin,user.id)).provider === 'atm_pay') throw fail('Select Xaman in ATM PAY MAINNET for NFT drop signing. Free drops currently use Xaman.',409);
  const account = check(await admin.from('player_accounts').select('wallet_address,wallet_verified_at').eq('user_id', user.id).maybeSingle());
  if (!account?.wallet_verified_at || !XRPL_ADDRESS.test(account.wallet_address || '')) throw fail('Link and verify your Xaman wallet first.', 409);
  return account.wallet_address;
}
async function update(admin, row, values) {
  return check(await admin.from('town_nft_drops').update({ ...values, updated_at: new Date().toISOString() }).eq('id', row.id).eq('status', row.status).select('*').maybeSingle()) || row;
}
async function activeOffer(row) {
  try {
    const r = await rpc('ledger_entry', { nft_offer: row.offer_index, ledger_index: 'validated' });
    if (!r.node) throw fail('XRPL did not return the NFT offer. Please check again.',502);
    if (!validFreeOffer(r.node,row)) throw fail('This offer no longer matches the agreed free drop.',409);
    return r.node;
  } catch (e) {
    if (['entryNotFound', 'objectNotFound'].includes(e.xrplCode)) return null;
    throw e; // Provider outages never prove that an offer is gone.
  }
}
async function signature(uuid, expectedWallet) {
  const lookup = await fetchXamanPayload(uuid);
  if (!lookup.found) return { status: 'pending' }; // A transient lookup failure cannot invalidate a signed transaction.
  const p = lookup.payload || {}, m = p.meta || {}, response = p.response || {};
  if (!m.resolved) return { status: m.expired ? 'expired' : 'pending' };
  if (!m.signed) return { status: 'rejected' };
  if (response.account && response.account !== expectedWallet) return { status: 'failed', error: 'Xaman was signed with a different wallet.' };
  if (response.dispatched_nodetype && !String(response.dispatched_nodetype).toUpperCase().includes('MAINNET')) return { status: 'failed', error: 'This offer must be signed on XRPL Mainnet.' };
  const hash = String(response.txid || '').toUpperCase();
  if (!XRPL_TX_HASH.test(hash)) return { status: 'pending' };
  let result;
  try { result = await rpc('tx', { transaction: hash, binary: false, api_version: 2 }); }
  catch { return { status: 'pending' }; }
  if (!result.validated) return { status: 'pending' };
  if (!success(result)) return { status: 'failed', error: 'The NFT transaction did not succeed on XRPL.' };
  return { status: 'validated', hash, ...parts(result) };
}
async function acceptedOffer(row) {
  const result = await rpc('account_tx', { account: row.wallet_address, ledger_index_min: -1, ledger_index_max: -1, limit: 100, forward: false, binary: false, api_version: 2 });
  return (result.transactions || []).some(entry => {
    const {tx,meta} = parts(entry);
    return (entry.validated === true || result.validated === true) && meta.TransactionResult === 'tesSUCCESS' && tx.TransactionType === 'NFTokenAcceptOffer' &&
      (meta.AffectedNodes || []).some(n => n.DeletedNode?.LedgerEntryType === 'NFTokenOffer' && n.DeletedNode.LedgerIndex === row.offer_index);
  });
}
async function boxContents(marker) {
  if (marker && (typeof marker !== 'string' || marker.length > 256)) throw fail('Invalid NFT page.');
  const result = await rpc('account_nfts', { account: REWARDS_NFT_WALLET, ledger_index: 'validated', limit: 20, ...(marker ? {marker} : {}), api_version: 2 });
  if (!Array.isArray(result.account_nfts)) throw fail('The rewards wallet inventory could not be verified.',502);
  const nfts = await Promise.all(result.account_nfts.map(async nft => {
    const metadata = await resolveMetadata(nft.URI,nft.NFTokenID);
    return { token_id:nft.NFTokenID, name:metadata.name || 'XRPL NFT', image_url:metadata.image_url || null };
  }));
  return {nfts,marker:result.marker || null};
}
async function reconcile(admin, row) {
  if (row.kind === 'drop' && row.status === 'carried' && !row.offer_index) {
    if (!await findOwnedNft(row.wallet_address,row.token_id)) return update(admin,row,{status:'unavailable',failure_reason:'This NFT is no longer in the wallet that prepared it.'});
    return row;
  }
  if (row.status === 'claimed' && row.offer_index) {
    if (await activeOffer(row)) return update(admin,row,{status:row.map === 'town' && Number.isFinite(row.x) && Number.isFinite(row.y) ? 'placed' : 'carried',failure_reason:null});
    if (await findOwnedNft(row.wallet_address,row.token_id)) return update(admin,row,{status:'carried',offer_index:null,payload_uuid:null,tx_hash:null,map:null,x:null,y:null,failure_reason:null});
    return {...row,_claim_verified:await acceptedOffer(row)};
  }
  if (row.status === 'pending') {
    const signed = await signature(row.payload_uuid, row.wallet_address);
    if (['rejected','expired','failed'].includes(signed.status)) return update(admin, row, { status: signed.status, failure_reason: signed.error || `Xaman request ${signed.status}.` });
    if (signed.status === 'validated') {
      if (!matchesFreeOffer(signed.tx, row)) return update(admin, row, { status: 'failed', failure_reason: 'The validated transaction did not match this free NFT offer.' });
      const index = offerIndex(signed.meta);
      if (!index) return row;
      row = await update(admin, row, { status: row.kind === 'donation' ? 'offered' : row.map === 'town' && Number.isFinite(row.x) && Number.isFinite(row.y) ? 'placed' : 'carried', tx_hash: signed.hash, offer_index: index });
    }
  }
  if (['carried','placed','offered'].includes(row.status) && !await activeOffer(row)) {
    const stillOwned = await findOwnedNft(row.wallet_address, row.token_id);
    if (row.kind === 'donation' && !stillOwned && await findOwnedNft(REWARDS_NFT_WALLET, row.token_id)) return update(admin, row, { status: 'received' });
    if (stillOwned) return update(admin,row,{status:'unavailable',failure_reason:'The free offer was cancelled or expired.'});
    if (await acceptedOffer(row)) return {...await update(admin,row,{status:'claimed',failure_reason:null}),_claim_verified:true};
    throw fail('The NFT offer is unavailable, but its pickup has not been confirmed. Check again shortly.',409);
  }
  return row;
}
async function start(admin, user, body, kind) {
  const wallet = await walletFor(admin, user), tokenId = String(body.token_id || '').toUpperCase();
  if (!NFT_ID.test(tokenId)) throw fail('Choose an NFT from your linked wallet.');
  if (wallet === REWARDS_NFT_WALLET && kind === 'donation') throw fail('This NFT is already in the rewards wallet.');
  const existing = check(await admin.from('town_nft_drops').select('*').eq('wallet_address', wallet).eq('token_id', tokenId).in('status',['preparing','pending','carried','placed','offered']).maybeSingle());
  if (existing) throw fail('This NFT already has a pending or active game offer. Open My NFT drops to resume it.',409);
  const nft = await findOwnedNft(wallet, tokenId);
  if (!nft || (Number(nft.Flags || 0) & 8) === 0) throw fail('This linked wallet must own a transferable NFT.',409);
  const id = randomUUID(), metadata = await resolveMetadata(nft.URI, tokenId);
  const row = check(await admin.from('town_nft_drops').insert({ id, user_id: user.id, wallet_address: wallet, token_id: tokenId, kind, name: String(metadata.name || 'XRPL NFT').slice(0,180), image_url: metadata.image_url || null, status: 'preparing' }).select('*').single());
  if (kind === 'drop') return publicRow(await update(admin,row,{status:'carried'}));
  let created;
  try {
    created = await createXamanTransaction(freeOfferTransaction(wallet, tokenId, kind === 'donation' ? REWARDS_NFT_WALLET : null), {
      identifier: id,
      instruction: kind === 'donation' ? 'Donate this NFT free to the ATM Town game rewards wallet.' : 'Create a public free NFT offer for ATM Town. Anyone can accept it, even before placement.'
    });
    const saved = await update(admin, row, { status: 'pending', payload_uuid: created.uuid });
    return { ...publicRow(saved), deeplink: created.next.always, qr_png: created.refs?.qr_png, payload_uuid: created.uuid };
  } catch (e) {
    await cancelXamanTransaction(created?.uuid);
    await update(admin, row, { status: 'failed', failure_reason: String(e.message || 'The Xaman offer could not be created.').slice(0,1000) });
    throw e;
  }
}
async function claimStatus(admin, user, id) {
  let claim = check(await admin.from('town_nft_drop_claims').select('*').eq('id', id).eq('user_id', user.id).single());
  if (claim.status === 'pending') {
    const signed = await signature(claim.payload_uuid, claim.wallet_address);
    let status = signed.status;
    const row = check(await admin.from('town_nft_drops').select('*').eq('id', claim.drop_id).single());
    if (status === 'validated') {
      if (signed.tx.TransactionType !== 'NFTokenAcceptOffer' || signed.tx.Account !== claim.wallet_address || signed.tx.NFTokenSellOffer !== row.offer_index || !await findOwnedNft(claim.wallet_address,row.token_id)) status = 'failed';
      else { status = 'claimed'; await update(admin,row,{status:'claimed'}); }
    }
    if (status !== 'pending') claim = check(await admin.from('town_nft_drop_claims').update({status,tx_hash:status==='claimed'?signed.hash:null,updated_at:new Date().toISOString()}).eq('id',claim.id).eq('status','pending').select('*').maybeSingle()) || claim;
  }
  return { id: claim.id, status: claim.status, tx_hash: claim.tx_hash };
}
export default async function handler(req,res) {
  if(setCors(req,res)) return;
  res.setHeader('Cache-Control','no-store');
  const action=String(req.query?.action || '');
  try {
    if(req.method==='GET'&&action==='drop-box') return res.json(await boxContents(req.query?.marker));
    if(req.method==='GET'&&action==='drop-list') {
      const admin=adminClient();
      const rows=check(await admin.from('town_nft_drops').select('*').eq('status','placed').order('created_at',{ascending:false}).limit(200));
      // Ledger state is rechecked before claiming; rendering alone never transfers anything.
      return res.json({drops:rows.map(publicRow),donation_box_id:DONATION_BOX_ID,rewards_wallet:REWARDS_NFT_WALLET});
    }
    if(!['GET','POST'].includes(req.method)) throw fail('GET or POST required.',405);
    const {admin,user}=await requireUser(req),body=req.body||{};
    if(action==='drop-mine'&&req.method==='GET') {
      const rows=check(await admin.from('town_nft_drops').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30));
      const recent=await Promise.all(rows.map(async r=>{try{return ['pending','carried','placed','offered','claimed'].includes(r.status)?await reconcile(admin,r):r;}catch(e){return {...r,failure_reason:'Confirmation unavailable: '+e.message};}}));
      return res.json({drops:recent.map(ownerRow),rewards_wallet:REWARDS_NFT_WALLET});
    }
    if(action==='drop-status'&&req.method==='GET') {
      const row=check(await admin.from('town_nft_drops').select('*').eq('id',req.query.id).eq('user_id',user.id).single());
      return res.json(ownerRow(await reconcile(admin,row)));
    }
    if(action==='drop-claim-status'&&req.method==='GET') return res.json(await claimStatus(admin,user,req.query.id));
    if(req.method!=='POST') throw fail('POST required.',405);
    if(action==='drop-start') return res.status(201).json(await start(admin,user,body,'drop'));
    if(action==='drop-donate') return res.status(201).json(await start(admin,user,body,'donation'));
    if(action==='drop-place'||action==='drop-carry') {
      let row=check(await admin.from('town_nft_drops').select('*').eq('id',body.id).eq('user_id',user.id).eq('kind','drop').single());
      row=await reconcile(admin,row);
      if(!['carried','placed'].includes(row.status)) throw fail('This NFT has no active free offer to place.',409);
      if(await walletFor(admin,user)!==row.wallet_address) throw fail('Use the wallet that created this NFT drop.',409);
      const point=action==='drop-place'?placement(body):{map:null,x:null,y:null};
      if (action === 'drop-place' && !row.offer_index) {
        let created;
        try {
          created = await createXamanTransaction(freeOfferTransaction(row.wallet_address,row.token_id),{identifier:randomUUID(),instruction:'Place a public free NFT drop in ATM Town. Anyone can accept this NFT after signing.'});
          const saved = await update(admin,row,{...point,status:'pending',payload_uuid:created.uuid,failure_reason:null});
          return res.json({...publicRow(saved),deeplink:created.next.always,qr_png:created.refs?.qr_png});
        } catch(e) { await cancelXamanTransaction(created?.uuid); throw e; }
      }
      return res.json(publicRow(await update(admin,row,{...point,status:action==='drop-place'?'placed':'carried'})));
    }
    if(action==='drop-claim') {
      const wallet=await walletFor(admin,user);
      let row=check(await admin.from('town_nft_drops').select('*').eq('id',body.id).single());
      row=await reconcile(admin,row);
      if(row.kind!=='drop'||row.status!=='placed'||!OFFER_ID.test(row.offer_index||'')) throw fail('This NFT drop is no longer available.',409);
      if(wallet===row.wallet_address) throw fail('You already own this NFT. You can carry it again instead.',409);
      const active=check(await admin.from('town_nft_drop_claims').select('id').eq('drop_id',row.id).eq('user_id',user.id).in('status',['preparing','pending']).maybeSingle());
      if(active) throw fail('An NFT claim is already waiting for Xaman. Resume it from My NFT drops.',409);
      const claim=check(await admin.from('town_nft_drop_claims').insert({drop_id:row.id,user_id:user.id,wallet_address:wallet}).select('*').single());
      let created;
      try {
        created=await createXamanTransaction({TransactionType:'NFTokenAcceptOffer',Account:wallet,NFTokenSellOffer:row.offer_index},{identifier:claim.id,instruction:'Accept this discovered ATM Town NFT for 0 XRP. Review the NFT in Xaman; normal XRPL network fees apply.'});
        check(await admin.from('town_nft_drop_claims').update({payload_uuid:created.uuid,status:'pending'}).eq('id',claim.id));
        return res.status(201).json({id:claim.id,status:'pending',deeplink:created.next.always,qr_png:created.refs?.qr_png,payload_uuid:created.uuid});
      } catch(e) {
        await cancelXamanTransaction(created?.uuid);
        check(await admin.from('town_nft_drop_claims').update({status:'failed'}).eq('id',claim.id)); throw e;
      }
    }
    throw fail('Unknown NFT drop action.');
  }catch(e){sendError(res,e);}
}
