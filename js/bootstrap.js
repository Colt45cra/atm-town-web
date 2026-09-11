/*
 * ATM Town startup and safe browser helpers
 * v158: extracted from index.html without changing gameplay behavior.
 */
(function initializeATMTownBootstrap(global) {
  'use strict';

  const config = global.ATM_TOWN_CONFIG;
  if (!config) {
    throw new Error('ATM Town bootstrap could not start because js/config.js was not loaded first.');
  }

  let supabaseLibraryPromise = null;

  global.loadSupabaseLibrary = function loadSupabaseLibrary() {
    if (global.supabase) return Promise.resolve(global.supabase);
    if (supabaseLibraryPromise) return supabaseLibraryPromise;

    const sources = config.supabaseCdnSources;
    supabaseLibraryPromise = new Promise((resolve, reject) => {
      let index = 0;
      const tryNext = () => {
        if (global.supabase) {
          resolve(global.supabase);
          return;
        }
        if (index >= sources.length) {
          reject(new Error('Multiplayer library could not be loaded. Check your connection and tap RETRY JOIN.'));
          return;
        }
        const script = document.createElement('script');
        script.src = sources[index++];
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        script.onload = () => global.supabase ? resolve(global.supabase) : tryNext();
        script.onerror = () => {
          script.remove();
          tryNext();
        };
        document.head.appendChild(script);
      };
      tryNext();
    }).catch((error) => {
      supabaseLibraryPromise = null;
      throw error;
    });

    return supabaseLibraryPromise;
  };

  global.safeStorageGet = function safeStorageGet(key, fallback = '') {
    try {
      const value = global.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_error) {
      return fallback;
    }
  };

  global.safeStorageSet = function safeStorageSet(key, value) {
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (_error) {
      return false;
    }
  };

  global.safeJsonParse = function safeJsonParse(value, fallback = {}) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  };

  global.addEventListener('error', (event) => {
    const panel = document.getElementById('bootError');
    const text = document.getElementById('bootErrorText');
    if (panel && text) {
      text.textContent = event.message || 'Unknown startup error';
      panel.style.display = 'block';
    }
  });

  function applyBuildIdentity() {
    document.title = config.build.title;
    const mapLabel = document.getElementById('mapLabel');
    const buildVersion = document.getElementById('buildVersion');
    if (mapLabel && mapLabel.textContent.startsWith('ATM TOWN')) {
      mapLabel.textContent = `${config.maps.town.label} · ${config.build.version}`;
    }
    if (buildVersion) buildVersion.textContent = config.build.version;
  }

  // Relocate the ATM Town Directory to the former Upgrades Kiosk interaction hotspot.
  // The town interaction mask stays unchanged; only the semantic destination moves.
  function relocateTownDirectoryHotspot() {
    if (typeof TOWN_MISC_ZONES === 'undefined' || !Array.isArray(TOWN_MISC_ZONES)) return;

    const oldDirectory = TOWN_MISC_ZONES.find((zone) => zone.id === 'townInfoHub');
    const upgradesKiosk = TOWN_MISC_ZONES.find((zone) => zone.id === 'upgradesKiosk');
    if (!oldDirectory || !upgradesKiosk) return;

    oldDirectory.id = 'townInfoHubRetired';
    oldDirectory.name = '';
    oldDirectory.text = '';

    upgradesKiosk.id = 'townInfoHub';
    upgradesKiosk.name = 'ATM TOWN DIRECTORY';
    upgradesKiosk.text = 'Open the ATM Town directory to view the full town map and major landmarks.';

    const originalTownInteractionThing = global.townInteractionThing;
    if (typeof originalTownInteractionThing === 'function') {
      global.townInteractionThing = function relocatedTownInteractionThing(typeFilter = '') {
        const zone = originalTownInteractionThing(typeFilter);
        return zone && zone.id === 'townInfoHubRetired' ? null : zone;
      };
    }

    const originalDirectoryLocationData = global.directoryLocationData;
    if (typeof originalDirectoryLocationData === 'function') {
      global.directoryLocationData = function relocatedDirectoryLocationData(mapName) {
        return originalDirectoryLocationData(mapName).filter((item) =>
          item && item.zone && item.name !== 'Upgrades Kiosk'
        );
      };
    }
  }

  function loadNftPerformancePatch() {
    if (global.ATMNftPerformance || document.querySelector('script[data-atm-nft-performance]')) return;
    const script = document.createElement('script');
    script.src = '/js/nft-performance.js?v=1.0.1';
    script.async = false;
    script.dataset.atmNftPerformance = '1';
    script.onerror = () => script.remove();
    document.body.appendChild(script);
  }

  applyBuildIdentity();
  global.addEventListener('DOMContentLoaded', relocateTownDirectoryHotspot, { once: true });
  global.addEventListener('load', loadNftPerformancePatch, { once: true });
  global.loadSupabaseLibrary().catch(() => {});
})(window);
