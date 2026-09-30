import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'atm-town-attribute-nft-manifest.json');
const schemaPath = path.join(root, 'data', 'atm-town-attribute-metadata.schema.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const expected = {
  issuer: 'rnCv6dCu3r1ANVD6vYuHikxV8TYphecdff',
  authorized_minter: 'rM5oXXzDLJxLqKp6ZwZjjesPvNvh669uCc',
  taxon: 321,
  royalty_bps: 1000,
  royalty_percent: 10,
  xrpl_transfer_fee: 10000,
  metadata_schema_version: 'atm-town.attribute.v1'
};

const errors = [];
for (const [key, value] of Object.entries(expected)) {
  if (manifest?.collection?.[key] !== value) {
    errors.push(`collection.${key} must be ${JSON.stringify(value)}`);
  }
}

const requiredMetadata = [
  'schema_version','name','description','image','external_url','game','collection',
  'item_id','asset_type','slot','compatible_character_ids','appearance','gameplay',
  'abilities','equip_rules','provenance'
];

function nonEmpty(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'object' ? Object.keys(value).length > 0 : true;
}

function validateReadyItem(item) {
  const meta = item?.metadata || {};
  const missing = requiredMetadata.filter((key) => !nonEmpty(meta[key]));
  if (missing.length) errors.push(`${item.item_id}: ready/minted metadata missing ${missing.join(', ')}`);
  if (meta.schema_version && meta.schema_version !== 'atm-town.attribute.v1') {
    errors.push(`${item.item_id}: unsupported schema_version ${meta.schema_version}`);
  }
  if (meta.item_id && meta.item_id !== item.item_id) {
    errors.push(`${item.item_id}: metadata.item_id does not match manifest item_id`);
  }
  const collection = meta.collection || {};
  if (nonEmpty(collection) && (
    collection.issuer !== expected.issuer ||
    Number(collection.taxon) !== expected.taxon
  )) {
    errors.push(`${item.item_id}: metadata collection issuer/taxon mismatch`);
  }
}

const items = Array.isArray(manifest.items) ? manifest.items : [];
for (const item of items) {
  if (['ready','minted'].includes(String(item?.mint_status || '').toLowerCase())) validateReadyItem(item);
}

if (items.length !== 61) errors.push(`expected 61 manifest items, found ${items.length}`);

if (errors.length) {
  console.error('ATM Town NFT metadata validation failed:');
  for (const error of errors) console.error(' - ' + error);
  process.exit(1);
}

const draftCount = items.filter((item) => !['ready','minted'].includes(String(item?.mint_status || '').toLowerCase())).length;
console.log(`ATM Town NFT metadata config valid. ${items.length} items total; ${draftCount} still gated from minting.`);
