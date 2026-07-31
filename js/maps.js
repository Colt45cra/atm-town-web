/*
 * ATM Town map registry helpers
 * v158: central access point for map metadata and asset paths.
 */
(function initializeATMTownMaps(global) {
  'use strict';

  const config = global.ATM_TOWN_CONFIG;
  if (!config || !config.maps) {
    throw new Error('ATM Town map registry could not start because js/config.js was not loaded first.');
  }

  function get(mapId) {
    const map = config.maps[mapId];
    if (!map) throw new Error(`Unknown ATM Town map: ${mapId}`);
    return map;
  }

  function asset(mapId, assetName) {
    const value = get(mapId).assets?.[assetName];
    if (!value) throw new Error(`Missing ${assetName} asset for ATM Town map: ${mapId}`);
    return value;
  }

  function world(mapId) {
    return get(mapId).world;
  }

  function spawn(mapId) {
    return get(mapId).entrySpawn;
  }

  function label(mapId) {
    return get(mapId).label;
  }

  function pixelSize(mapId) {
    const map = get(mapId);
    return map.pixelSize || Object.freeze({
      w: map.world.w * config.tileSize,
      h: map.world.h * config.tileSize
    });
  }

  global.ATMMaps = Object.freeze({ get, asset, world, spawn, label, pixelSize });
})(window);
