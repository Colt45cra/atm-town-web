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

  applyBuildIdentity();
  global.loadSupabaseLibrary().catch(() => {});
})(window);
