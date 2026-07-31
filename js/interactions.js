/*
 * ATM Town shared interaction-mask foundation
 * v159: one color classifier and cached mask reader for every map.
 */
(function initializeATMTownInteractions(global) {
  'use strict';

  const TYPES = Object.freeze({
    none: 0,
    entry: 1,
    vending: 2,
    misc: 3,
    html: 4,
    atm: 5,
    voice: 6
  });

  const TYPE_NAMES = Object.freeze(Object.fromEntries(
    Object.entries(TYPES).map(([name, value]) => [value, name])
  ));

  const CORE_PALETTE = Object.freeze([
    Object.freeze({ type: TYPES.entry, name: 'entry', r: 0, g: 60, b: 255 }),
    Object.freeze({ type: TYPES.vending, name: 'vending', r: 255, g: 0, b: 0 }),
    Object.freeze({ type: TYPES.misc, name: 'misc', r: 223, g: 255, b: 0 }),
    Object.freeze({ type: TYPES.html, name: 'html', r: 150, g: 0, b: 161 }),
    Object.freeze({ type: TYPES.atm, name: 'atm', r: 0, g: 190, b: 173 }),
    Object.freeze({ type: TYPES.voice, name: 'voice', r: 6, g: 191, b: 0 })
  ]);



  function resolveType(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(TYPES, value)) return TYPES[value];
    return TYPES.none;
  }

  function classifyColor(r, g, b, a, palette = CORE_PALETTE, tolerance = 36) {
    if (a <= 10 || (r < 8 && g < 8 && b < 8)) return TYPES.none;

    let bestType = TYPES.none;
    let bestDistance = tolerance * tolerance;
    for (const color of palette) {
      const dr = r - color.r;
      const dg = g - color.g;
      const db = b - color.b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestType = color.type;
      }
    }
    return bestType;
  }

  function createMaskReader({
    id,
    image,
    width,
    height,
    palette = CORE_PALETTE,
    tolerance = 36
  }) {
    if (!image) throw new Error(`Interaction mask ${id || 'unknown'} requires an Image.`);

    const canvas = document.createElement('canvas');
    const state = { data: null, ready: false, activePixels: 0 };

    function getWidth() {
      const value = typeof width === 'function' ? width() : width;
      return Math.max(1, Math.round(Number(value) || 1));
    }

    function getHeight() {
      const value = typeof height === 'function' ? height() : height;
      return Math.max(1, Math.round(Number(value) || 1));
    }

    function rebuild() {
      const targetWidth = getWidth();
      const targetHeight = getHeight();
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (!(image.complete && image.naturalWidth)) {
        state.data = null;
        state.ready = false;
        state.activePixels = 0;
        return false;
      }

      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, targetWidth, targetHeight);
      context.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      const pixels = context.getImageData(0, 0, targetWidth, targetHeight).data;
      const types = new Uint8Array(targetWidth * targetHeight);
      let activePixels = 0;
      for (let source = 0, target = 0; source < pixels.length; source += 4, target += 1) {
        const type = classifyColor(
          pixels[source],
          pixels[source + 1],
          pixels[source + 2],
          pixels[source + 3],
          palette,
          tolerance
        );
        types[target] = type;
        if (type !== TYPES.none) activePixels += 1;
      }

      state.data = types;
      state.ready = true;
      state.activePixels = activePixels;
      console.info(`${id || 'ATM Town'} interaction mask loaded:`, activePixels, 'active pixels');
      return true;
    }

    function typeAt(px, py) {
      if (!state.ready || !state.data) return TYPES.none;
      const targetWidth = canvas.width;
      const targetHeight = canvas.height;
      const x = Math.max(0, Math.min(targetWidth - 1, Math.floor(px)));
      const y = Math.max(0, Math.min(targetHeight - 1, Math.floor(py)));
      return state.data[y * targetWidth + x] || TYPES.none;
    }

    function nearest(px, py, radius = 38, typeFilter = '', step = 3) {
      if (!state.ready || !state.data) return null;
      const wantedType = resolveType(typeFilter);
      const searchRadius = Math.max(0, Number(radius) || 0);
      const sampleStep = Math.max(1, Number(step) | 0);
      const radiusSquared = searchRadius * searchRadius;
      let best = null;
      let bestDistanceSquared = (searchRadius + 1) * (searchRadius + 1);

      for (let offsetY = -searchRadius; offsetY <= searchRadius; offsetY += sampleStep) {
        for (let offsetX = -searchRadius; offsetX <= searchRadius; offsetX += sampleStep) {
          const distanceSquared = offsetX * offsetX + offsetY * offsetY;
          if (distanceSquared > radiusSquared || distanceSquared >= bestDistanceSquared) continue;
          const type = typeAt(px + offsetX, py + offsetY);
          if (type === TYPES.none || (wantedType && type !== wantedType)) continue;
          best = {
            type,
            typeName: TYPE_NAMES[type] || 'none',
            x: px + offsetX,
            y: py + offsetY,
            distance: Math.sqrt(distanceSquared)
          };
          bestDistanceSquared = distanceSquared;
        }
      }
      return best;
    }

    return Object.freeze({
      id: id || '',
      image,
      canvas,
      rebuild,
      typeAt,
      nearest,
      get ready() { return state.ready; },
      get activePixels() { return state.activePixels; }
    });
  }

  function rectContainsPoint(rect, x, y, padding = 0) {
    return x >= rect.x1 - padding && x <= rect.x2 + padding &&
      y >= rect.y1 - padding && y <= rect.y2 + padding;
  }

  function zoneCenter(zone) {
    return {
      x: zone.x !== undefined ? zone.x : (zone.x1 + zone.x2) / 2,
      y: zone.y !== undefined ? zone.y : (zone.y1 + zone.y2) / 2
    };
  }

  function zoneHitRadius(zone, fallback = 32) {
    if (zone.radius !== undefined) return zone.radius;
    if (zone.x1 !== undefined && zone.y1 !== undefined && zone.x2 !== undefined && zone.y2 !== undefined) {
      return Math.max(zone.x2 - zone.x1, zone.y2 - zone.y1) * 0.8;
    }
    return fallback;
  }

  function nearestZone(zones, x, y, typeFilter = '') {
    const wantedType = typeof typeFilter === 'string' ? typeFilter : TYPE_NAMES[typeFilter];
    let best = null;
    let bestDistance = Infinity;
    for (const zone of zones || []) {
      if (wantedType && zone.interactionType && zone.interactionType !== wantedType) continue;
      const center = zoneCenter(zone);
      const distance = Math.hypot(x - center.x, y - center.y);
      if (distance < bestDistance) {
        best = zone;
        bestDistance = distance;
      }
    }
    return best ? { zone: best, distance: bestDistance } : null;
  }

  function hintFor(thing, mapId = '') {
    if (!thing) return '';
    if (thing.type === 'vending') return 'Tap ACTION to use the power-up vending machine';
    if (thing.type === 'voice') return 'Tap ACTION to join proximity voice chat';
    if (thing.type === 'html') return 'Tap ACTION to open the display';
    if (thing.type === 'atm') return 'Tap ACTION to use the ATM terminal';
    if (mapId === 'town' && thing.id === 'nftmega') return 'Tap ENTER to visit the NFT Art Gallery';
    if (mapId === 'town' && thing.id === 'hq') return 'Tap ENTER to visit ATM HQ';
    if (mapId === 'town' && thing.id === 'arcade') return 'Tap ENTER to visit the ATM Token Arcade';
    if (mapId === 'town' && thing.id === 'gameLounge') return 'Tap ENTER to visit the Community Lounge';
    if (mapId !== 'town' && thing.name === 'EXIT TO TOWN') return 'Tap ACTION to return to ATM Town';
    return 'Tap ACTION to interact';
  }

  global.ATMInteractions = Object.freeze({
    types: TYPES,
    typeNames: TYPE_NAMES,
    corePalette: CORE_PALETTE,
    resolveType,
    classifyColor,
    createMaskReader,
    rectContainsPoint,
    zoneCenter,
    zoneHitRadius,
    nearestZone,
    hintFor
  });
})(window);
