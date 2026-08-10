/*
 * ATM Town streamed outdoor-world runtime.
 * Phase 1: preserves existing ATM Town world coordinates while loading 1024px
 * visual/data chunks around the camera and player instead of full-map images.
 */
(function initializeATMWorldStreaming(global) {
  'use strict';

  const interactions = global.ATMInteractions;

  function nowMs() {
    return global.performance?.now?.() ?? Date.now();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to decode world chunk: ${src}`));
      image.src = src;
    });
  }

  function keyFor(cx, cy) {
    return `${cx}_${cy}`;
  }

  class StreamedWorld {
    constructor(manifestUrl, options = {}) {
      this.manifestUrl = manifestUrl;
      this.options = options;
      this.manifest = null;
      this.chunkSize = 1024;
      this.bounds = null;
      this.cells = {};
      this.layerChunkSets = new Map();
      this.visualCaches = new Map();
      this.maskCaches = new Map();
      this.maskLoadQueue = [];
      this.activeMaskLoads = 0;
      this.maxConcurrentMaskLoads = Math.max(1, Number(options.maxConcurrentMaskLoads) || 3);
      this.failedAssets = new Set();
      this.lastView = null;
      this.ready = this._loadManifest();
    }

    async _loadManifest() {
      const response = await fetch(this.manifestUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`World manifest request failed (${response.status}): ${this.manifestUrl}`);
      const manifest = await response.json();
      if (!manifest || !Number.isFinite(manifest.chunkSize) || !manifest.bounds || !manifest.layers || !manifest.cells) {
        throw new Error('ATM Town world manifest is missing required chunk metadata.');
      }
      this.manifest = manifest;
      this.chunkSize = manifest.chunkSize;
      this.bounds = Object.freeze({ ...manifest.bounds });
      this.cells = manifest.cells;
      for (const [layerName, layer] of Object.entries(manifest.layers)) {
        this.layerChunkSets.set(layerName, new Set(layer.chunks || []));
        if (['terrain', 'night', 'lighting'].includes(layerName)) this.visualCaches.set(layerName, new Map());
        else this.maskCaches.set(layerName, new Map());
      }
      console.info('ATM Town streamed world manifest loaded.', {
        chunkSize: this.chunkSize,
        bounds: this.bounds,
        cells: Object.keys(this.cells).length
      });
      return manifest;
    }

    hasManifest() {
      return !!this.manifest;
    }

    getBounds(fallback = null) {
      return this.bounds || fallback;
    }

    getOverview() {
      return this.manifest?.overview || null;
    }

    contains(x, y, padding = 0) {
      const b = this.bounds;
      if (!b) return true;
      return x >= b.minX + padding && x <= b.maxX - padding && y >= b.minY + padding && y <= b.maxY - padding;
    }

    clampPoint(x, y, marginX = 0, marginY = marginX) {
      const b = this.bounds;
      if (!b) return { x, y };
      return {
        x: Math.max(b.minX + marginX, Math.min(b.maxX - marginX, x)),
        y: Math.max(b.minY + marginY, Math.min(b.maxY - marginY, y))
      };
    }

    worldToChunk(x, y) {
      return {
        x: Math.floor(x / this.chunkSize),
        y: Math.floor(y / this.chunkSize)
      };
    }

    cellKeyAt(x, y) {
      const chunk = this.worldToChunk(x, y);
      return keyFor(chunk.x, chunk.y);
    }

    _chunkKeysForRect(rect, margin = 0) {
      if (!this.manifest) return [];
      const b = this.bounds;
      const left = Math.max(b.minX, rect.x - margin);
      const top = Math.max(b.minY, rect.y - margin);
      const right = Math.min(b.maxX - 0.0001, rect.x + rect.w + margin);
      const bottom = Math.min(b.maxY - 0.0001, rect.y + rect.h + margin);
      if (right < left || bottom < top) return [];
      const first = this.worldToChunk(left, top);
      const last = this.worldToChunk(right, bottom);
      const keys = [];
      for (let cy = first.y; cy <= last.y; cy += 1) {
        for (let cx = first.x; cx <= last.x; cx += 1) {
          const key = keyFor(cx, cy);
          if (this.cells[key]) keys.push(key);
        }
      }
      return keys;
    }

    _chunkKeysAround(x, y, radius = 1) {
      if (!this.manifest) return [];
      const center = this.worldToChunk(x, y);
      const keys = [];
      for (let cy = center.y - radius; cy <= center.y + radius; cy += 1) {
        for (let cx = center.x - radius; cx <= center.x + radius; cx += 1) {
          const key = keyFor(cx, cy);
          if (this.cells[key]) keys.push(key);
        }
      }
      return keys;
    }

    _layerHasChunk(layerName, key) {
      return this.layerChunkSets.get(layerName)?.has(key) || false;
    }

    _assetPath(layerName, key) {
      const layer = this.manifest.layers[layerName];
      return `${layer.path}/${key}.${layer.format}`;
    }

    _ensureVisual(layerName, key) {
      if (!this.manifest || !this.cells[key] || !this._layerHasChunk(layerName, key)) return Promise.resolve(null);
      const cache = this.visualCaches.get(layerName);
      if (!cache) return Promise.resolve(null);
      let entry = cache.get(key);
      if (entry) {
        entry.lastUsed = nowMs();
        return entry.promise;
      }
      const src = this._assetPath(layerName, key);
      entry = { image: null, status: 'loading', lastUsed: nowMs(), promise: null };
      entry.promise = loadImage(src).then((image) => {
        entry.image = image;
        entry.status = 'ready';
        entry.lastUsed = nowMs();
        return entry;
      }).catch((error) => {
        entry.status = 'failed';
        this.failedAssets.add(src);
        console.error(error);
        return null;
      });
      cache.set(key, entry);
      return entry.promise;
    }

    _queueMaskLoad(layerName, key) {
      if (!this.manifest || !this.cells[key]) return Promise.resolve(null);
      const cache = this.maskCaches.get(layerName);
      if (!cache) return Promise.resolve(null);
      if (!this._layerHasChunk(layerName, key)) {
        // Tiler omitted this chunk only after proving it contains zero gameplay data.
        return Promise.resolve({ status: 'empty', empty: true, lastUsed: nowMs() });
      }
      let entry = cache.get(key);
      if (entry) {
        entry.lastUsed = nowMs();
        return entry.promise;
      }
      let resolvePromise;
      const promise = new Promise((resolve) => { resolvePromise = resolve; });
      entry = { status: 'queued', data: null, width: 0, height: 0, lastUsed: nowMs(), promise };
      cache.set(key, entry);
      this.maskLoadQueue.push({ layerName, key, entry, resolve: resolvePromise });
      this._pumpMaskQueue();
      return promise;
    }

    _pumpMaskQueue() {
      while (this.activeMaskLoads < this.maxConcurrentMaskLoads && this.maskLoadQueue.length) {
        const job = this.maskLoadQueue.shift();
        this.activeMaskLoads += 1;
        this._decodeMask(job.layerName, job.key, job.entry)
          .then((entry) => job.resolve(entry))
          .catch((error) => {
            job.entry.status = 'failed';
            const src = this._assetPath(job.layerName, job.key);
            this.failedAssets.add(src);
            console.error(error);
            job.resolve(null);
          })
          .finally(() => {
            this.activeMaskLoads -= 1;
            this._pumpMaskQueue();
          });
      }
    }

    async _decodeMask(layerName, key, entry) {
      entry.status = 'loading';
      const src = this._assetPath(layerName, key);
      const image = await loadImage(src);
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, width, height).data;

      if (layerName === 'collision' || layerName === 'stairs') {
        const bits = new Uint8Array(Math.ceil((width * height) / 8));
        for (let source = 0, pixel = 0; source < pixels.length; source += 4, pixel += 1) {
          if (pixels[source] + pixels[source + 1] + pixels[source + 2] >= 420) {
            bits[pixel >> 3] |= (1 << (pixel & 7));
          }
        }
        entry.data = bits;
        entry.kind = 'bits';
      } else if (layerName === 'interaction') {
        const types = new Uint8Array(width * height);
        const palette = interactions?.corePalette;
        for (let source = 0, pixel = 0; source < pixels.length; source += 4, pixel += 1) {
          types[pixel] = interactions?.classifyColor
            ? interactions.classifyColor(pixels[source], pixels[source + 1], pixels[source + 2], pixels[source + 3], palette, 36)
            : 0;
        }
        entry.data = types;
        entry.kind = 'types';
      } else {
        throw new Error(`Unsupported streamed mask layer: ${layerName}`);
      }

      entry.width = width;
      entry.height = height;
      entry.status = 'ready';
      entry.lastUsed = nowMs();
      // Release the temporary decoded RGBA surface after compact data extraction.
      canvas.width = 1;
      canvas.height = 1;
      try { image.src = ''; } catch (_error) {}
      return entry;
    }

    _readMask(layerName, x, y) {
      if (!this.manifest || !this.bounds) return null;
      const b = this.bounds;
      if (x < b.minX || y < b.minY || x >= b.maxX || y >= b.maxY) return null;
      const key = this.cellKeyAt(x, y);
      const cell = this.cells[key];
      if (!cell) return null;
      if (!this._layerHasChunk(layerName, key)) return 0;
      const cache = this.maskCaches.get(layerName);
      const entry = cache?.get(key);
      if (!entry || entry.status === 'queued' || entry.status === 'loading') {
        this._queueMaskLoad(layerName, key);
        return null;
      }
      if (entry.status !== 'ready' || !entry.data) return null;
      entry.lastUsed = nowMs();
      const localX = Math.floor(x - cell.x);
      const localY = Math.floor(y - cell.y);
      if (localX < 0 || localY < 0 || localX >= entry.width || localY >= entry.height) return null;
      const pixel = localY * entry.width + localX;
      if (entry.kind === 'bits') return (entry.data[pixel >> 3] >> (pixel & 7)) & 1;
      return entry.data[pixel] || 0;
    }

    _legacySamplePoint(x, y) {
      const streaming = this.manifest?.streaming || {};
      const step = Number(streaming.collisionSampleStep) || 1;
      const offset = Number(streaming.collisionSampleOffset) || 0;
      return {
        x: Math.floor(x / step) * step + offset,
        y: Math.floor(y / step) * step + offset
      };
    }

    collisionAt(x, y) {
      if (!this.manifest) return null;
      const point = this._legacySamplePoint(x, y);
      return this._readMask('collision', point.x, point.y);
    }

    stairsAt(x, y) {
      if (!this.manifest) return null;
      const point = this._legacySamplePoint(x, y);
      return this._readMask('stairs', point.x, point.y);
    }

    interactionTypeAt(x, y) {
      return this._readMask('interaction', x, y);
    }

    nearestInteraction(px, py, radius = 38, typeFilter = '', step = 3) {
      if (!this.manifest) return null;
      const wantedType = interactions?.resolveType ? interactions.resolveType(typeFilter) : 0;
      const searchRadius = Math.max(0, Number(radius) || 0);
      const sampleStep = Math.max(1, Number(step) | 0);
      const radiusSquared = searchRadius * searchRadius;
      let best = null;
      let bestDistanceSquared = (searchRadius + 1) * (searchRadius + 1);
      for (let offsetY = -searchRadius; offsetY <= searchRadius; offsetY += sampleStep) {
        for (let offsetX = -searchRadius; offsetX <= searchRadius; offsetX += sampleStep) {
          const distanceSquared = offsetX * offsetX + offsetY * offsetY;
          if (distanceSquared > radiusSquared || distanceSquared >= bestDistanceSquared) continue;
          const type = this.interactionTypeAt(px + offsetX, py + offsetY);
          if (type === null || type === 0 || (wantedType && type !== wantedType)) continue;
          best = {
            type,
            typeName: interactions?.typeNames?.[type] || 'none',
            x: px + offsetX,
            y: py + offsetY,
            distance: Math.sqrt(distanceSquared)
          };
          bestDistanceSquared = distanceSquared;
        }
      }
      return best;
    }

    isMaskReadyAt(layerName, x, y) {
      if (!this.manifest || !this.bounds) return false;
      if (x < this.bounds.minX || y < this.bounds.minY || x >= this.bounds.maxX || y >= this.bounds.maxY) return false;
      const key = this.cellKeyAt(x, y);
      if (!this.cells[key]) return false;
      if (!this._layerHasChunk(layerName, key)) return true;
      return this.maskCaches.get(layerName)?.get(key)?.status === 'ready';
    }

    async preloadMaskPoints(points, layerNames = ['collision', 'stairs'], radius = 0) {
      await this.ready;
      const jobs = [];
      const seen = new Set();
      for (const point of points || []) {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        for (const key of this._chunkKeysAround(point.x, point.y, Math.max(0, Number(radius) || 0))) {
          for (const layerName of layerNames) {
            const token = `${layerName}:${key}`;
            if (seen.has(token)) continue;
            seen.add(token);
            jobs.push(this._queueMaskLoad(layerName, key));
          }
        }
      }
      await Promise.all(jobs);
      return true;
    }

    async preloadPlayerNeighborhood(x, y) {
      await this.ready;
      const radius = Number(this.manifest.streaming?.maskNeighborhoodRadius) || 1;
      return this.preloadMaskPoints([{ x, y }], ['collision', 'stairs', 'interaction'], radius);
    }

    updateView({ cameraX, cameraY, viewportWidth, viewportHeight, playerX, playerY, collisionPoints = [], includeNight = true }) {
      if (!this.manifest) return;
      const view = { x: cameraX, y: cameraY, w: viewportWidth, h: viewportHeight };
      this.lastView = view;
      const margin = Number(this.manifest.streaming?.visualPreloadMargin) || 384;
      const visualKeys = this._chunkKeysForRect(view, margin);
      const visualKeep = new Set(visualKeys);
      for (const key of visualKeys) {
        this._ensureVisual('terrain', key);
        this._ensureVisual('lighting', key);
        if (includeNight) this._ensureVisual('night', key);
      }

      // Interaction data only follows the local player. Collision/stairs also
      // keep the chunks occupied by active bots so off-camera NPC pathing never
      // interprets a not-yet-decoded mask as a solid wall.
      const radius = Number(this.manifest.streaming?.maskNeighborhoodRadius) || 1;
      const playerKeys = this._chunkKeysAround(playerX, playerY, radius);
      const collisionKeys = new Set(playerKeys);
      for (const point of collisionPoints || []) {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        for (const key of this._chunkKeysAround(point.x, point.y, 0)) collisionKeys.add(key);
      }
      const interactionKeep = new Set(playerKeys);
      for (const key of collisionKeys) {
        this._queueMaskLoad('collision', key);
        this._queueMaskLoad('stairs', key);
      }
      for (const key of playerKeys) this._queueMaskLoad('interaction', key);

      this._pruneVisualCachesByLayer({
        terrain: visualKeep,
        lighting: visualKeep,
        night: includeNight ? visualKeep : new Set()
      });
      this._pruneMaskCachesByLayer({
        collision: collisionKeys,
        stairs: collisionKeys,
        interaction: interactionKeep
      });
    }

    _pruneVisualCachesByLayer(keepByLayer = {}) {
      if (!this.manifest) return;
      const limit = Number(this.manifest.streaming?.visualCacheLimitPerLayer) || 18;
      const graceMs = Number(this.manifest.streaming?.cacheGraceMs) || 15000;
      const now = nowMs();
      for (const [layerName, cache] of this.visualCaches.entries()) {
        const keepKeys = keepByLayer[layerName] || new Set();
        const removable = [...cache.entries()]
          .filter(([key, entry]) => !keepKeys.has(key) && entry.status !== 'loading')
          .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        for (const [key, entry] of removable) {
          if (cache.size <= limit && now - entry.lastUsed < graceMs) continue;
          try { if (entry.image) entry.image.src = ''; } catch (_error) {}
          cache.delete(key);
        }
      }
    }

    _pruneMaskCachesByLayer(keepByLayer = {}) {
      if (!this.manifest) return;
      const limit = Number(this.manifest.streaming?.maskCacheLimitPerLayer) || 12;
      const graceMs = Number(this.manifest.streaming?.cacheGraceMs) || 15000;
      const now = nowMs();
      for (const [layerName, cache] of this.maskCaches.entries()) {
        const keepKeys = keepByLayer[layerName] || new Set();
        const removable = [...cache.entries()]
          .filter(([key, entry]) => !keepKeys.has(key) && !['queued', 'loading'].includes(entry.status))
          .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        for (const [key, entry] of removable) {
          if (cache.size <= limit && now - entry.lastUsed < graceMs) continue;
          entry.data = null;
          cache.delete(key);
        }
      }
    }

    drawLayer(context, layerName, viewRect, alpha = 1) {
      if (!this.manifest || alpha <= 0) return 0;
      const cache = this.visualCaches.get(layerName);
      if (!cache) return 0;
      const keys = this._chunkKeysForRect(viewRect, 2);
      let drawn = 0;
      context.save();
      if (alpha < 1) context.globalAlpha *= alpha;
      for (const key of keys) {
        const cell = this.cells[key];
        if (!cell || !this._layerHasChunk(layerName, key)) continue;
        const entry = cache.get(key);
        if (!entry || entry.status !== 'ready' || !entry.image) {
          this._ensureVisual(layerName, key);
          continue;
        }
        entry.lastUsed = nowMs();
        context.drawImage(entry.image, cell.x, cell.y, cell.width, cell.height);
        drawn += 1;
      }
      context.restore();
      return drawn;
    }

    getStats() {
      const visuals = {};
      for (const [name, cache] of this.visualCaches) visuals[name] = cache.size;
      const masks = {};
      for (const [name, cache] of this.maskCaches) masks[name] = cache.size;
      return {
        ready: !!this.manifest,
        chunkSize: this.chunkSize,
        visualCacheEntries: visuals,
        maskCacheEntries: masks,
        failedAssets: [...this.failedAssets]
      };
    }
  }

  function create(manifestUrl, options = {}) {
    return new StreamedWorld(manifestUrl, options);
  }

  global.ATMWorldStreaming = Object.freeze({ create });
})(window);
