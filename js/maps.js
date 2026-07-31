/*
 * ATM Town map registry helpers
 * v160: central access point for assets and reusable map runtime behavior.
 */
(function initializeATMTownMaps(global) {
  'use strict';

  const config = global.ATM_TOWN_CONFIG;
  if (!config || !config.maps) {
    throw new Error('ATM Town map registry could not start because js/config.js was not loaded first.');
  }

  const pixelSizes = Object.freeze(Object.fromEntries(
    Object.entries(config.maps).map(([mapId, map]) => [
      mapId,
      map.pixelSize || Object.freeze({
        w: map.world.w * config.tileSize,
        h: map.world.h * config.tileSize
      })
    ])
  ));

  const entranceMapIds = Object.freeze(Object.fromEntries(
    Object.values(config.maps)
      .filter((map) => map.entranceId)
      .map((map) => [map.entranceId, map.id])
  ));

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
    get(mapId);
    return pixelSizes[mapId];
  }

  function entryZoom(mapId, fallbackZoom = null) {
    const value = get(mapId).entryZoom;
    return Number.isFinite(value) ? value : fallbackZoom;
  }

  function entryDirection(mapId) {
    return get(mapId).entryDirection || 'up';
  }

  function isInterior(mapId) {
    return get(mapId).interior === true;
  }

  function exitTarget(mapId) {
    return get(mapId).exitTarget || null;
  }

  function fromEntrance(entranceId) {
    return entranceId ? (entranceMapIds[entranceId] || null) : null;
  }

  function townReturnPoint(mapId, door) {
    const rule = get(mapId).townReturn;
    if (!rule || !door) return null;
    if (rule.mode === 'fixedY') {
      return Object.freeze({ x: door.x, y: rule.y });
    }
    if (rule.mode === 'doorOffset') {
      return Object.freeze({ x: door.x + (rule.x || 0), y: door.y + (rule.y || 0) });
    }
    throw new Error(`Unknown town return rule for ATM Town map: ${mapId}`);
  }

  function runtime(mapId, fallbackZoom = null) {
    return Object.freeze({
      id: mapId,
      label: label(mapId),
      spawn: spawn(mapId),
      pixelSize: pixelSize(mapId),
      zoom: entryZoom(mapId, fallbackZoom),
      direction: entryDirection(mapId),
      interior: isInterior(mapId),
      exitTarget: exitTarget(mapId)
    });
  }

  global.ATMMaps = Object.freeze({
    get,
    asset,
    world,
    spawn,
    label,
    pixelSize,
    entryZoom,
    entryDirection,
    isInterior,
    exitTarget,
    fromEntrance,
    townReturnPoint,
    runtime
  });
})(window);
