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

  const CANONICAL_AUTH_REDIRECT = 'https://www.atmtown.fun/?signup_return=1';
  let supabaseLibraryPromise = null;

  function resumeSignupReturnIntent() {
    let url;
    try {
      url = new URL(global.location.href);
    } catch (_error) {
      return;
    }
    if (url.searchParams.get('signup_return') !== '1') return;

    try {
      global.localStorage.setItem('atm_signup_pending', '1');
    } catch (_error) {}

    let attempts = 0;
    const reopenSignup = () => {
      attempts += 1;
      if (typeof global.atmShowFlowScreen === 'function') {
        global.atmShowFlowScreen('signup');
        try {
          const cleanUrl = new URL(global.location.href);
          cleanUrl.searchParams.delete('signup_return');
          global.history.replaceState(global.history.state, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        } catch (_error) {}
        return;
      }
      if (attempts < 160) global.setTimeout(reopenSignup, 50);
    };
    reopenSignup();
  }

  function enforceCanonicalEmailAuthRedirect(library) {
    if (!library || typeof library.createClient !== 'function' || library.__atmCanonicalAuthRedirectPatched) {
      return library;
    }

    const originalCreateClient = library.createClient.bind(library);
    const wrappedCreateClient = (...args) => {
      const client = originalCreateClient(...args);
      const auth = client?.auth;

      if (auth && typeof auth.signInWithOtp === 'function' && !auth.__atmCanonicalAuthRedirectPatched) {
        const originalSignInWithOtp = auth.signInWithOtp.bind(auth);
        auth.signInWithOtp = (credentials = {}) => {
          if (!credentials || typeof credentials !== 'object' || !credentials.email) {
            return originalSignInWithOtp(credentials);
          }
          return originalSignInWithOtp({
            ...credentials,
            options: {
              ...(credentials.options || {}),
              emailRedirectTo: CANONICAL_AUTH_REDIRECT
            }
          });
        };
        try {
          Object.defineProperty(auth, '__atmCanonicalAuthRedirectPatched', { value: true });
        } catch (_error) {}
      }

      return client;
    };

    try {
      library.createClient = wrappedCreateClient;
      Object.defineProperty(library, '__atmCanonicalAuthRedirectPatched', { value: true });
    } catch (_error) {
      return library;
    }

    return library;
  }

  global.loadSupabaseLibrary = function loadSupabaseLibrary() {
    if (global.supabase) return Promise.resolve(enforceCanonicalEmailAuthRedirect(global.supabase));
    if (supabaseLibraryPromise) return supabaseLibraryPromise;

    const sources = config.supabaseCdnSources;
    supabaseLibraryPromise = new Promise((resolve, reject) => {
      let index = 0;
      const tryNext = () => {
        if (global.supabase) {
          resolve(enforceCanonicalEmailAuthRedirect(global.supabase));
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
        script.onload = () => global.supabase ? resolve(enforceCanonicalEmailAuthRedirect(global.supabase)) : tryNext();
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

  function loadNpcDialogueStandard(onReady) {
    if (global.ATMNpcDialogueStandard) {
      if (typeof onReady === 'function') onReady();
      return;
    }
    const existing = document.querySelector('script[data-atm-npc-dialogue-standard]');
    if (existing) {
      if (typeof onReady === 'function') existing.addEventListener('load', onReady, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = '/js/npc-dialogue-standard.js?v=1.0.0';
    script.async = false;
    script.dataset.atmNpcDialogueStandard = '1';
    script.onload = () => { if (typeof onReady === 'function') onReady(); };
    script.onerror = () => {
      script.remove();
      if (typeof onReady === 'function') onReady();
    };
    document.body.appendChild(script);
  }

  function loadLuci666Npc() {
    if (global.ATMLuci666 || document.querySelector('script[data-atm-luci-666]')) return;
    const script = document.createElement('script');
    script.src = '/js/luci-666.js?v=1.0.2';
    script.async = false;
    script.dataset.atmLuci666 = '1';
    script.onerror = () => script.remove();
    document.body.appendChild(script);
  }

  function loadLuci666BeckonUx() {
    if (global.ATMLuci666BeckonUx || document.querySelector('script[data-atm-luci-666-beckon-ux]')) return;
    const script = document.createElement('script');
    script.src = '/js/luci-666-beckon-ux.js?v=3.0.0';
    script.async = false;
    script.dataset.atmLuci666BeckonUx = '1';
    script.onerror = () => script.remove();
    document.body.appendChild(script);
  }

  function loadMiracle111Npc() {
    if (global.ATMMiracle111 || document.querySelector('script[data-atm-miracle-111]')) return;
    const script = document.createElement('script');
    script.src = '/js/miracle-111.js?v=1.0.0';
    script.async = false;
    script.dataset.atmMiracle111 = '1';
    script.onerror = () => script.remove();
    document.body.appendChild(script);
  }

  function loadAtmEcosystemGuide() {
    if (global.ATMAtmGuide || document.querySelector('script[data-atm-ecosystem-guide]')) return;
    const script = document.createElement('script');
    script.src = '/js/atm-ecosystem-guide.js?v=1.0.0';
    script.async = false;
    script.dataset.atmEcosystemGuide = '1';
    script.onerror = () => script.remove();
    document.body.appendChild(script);
  }

  function loadFuzzyXrpNpc() {
    if (global.ATMFuzzyXrp || document.querySelector('script[data-atm-fuzzy-xrp]')) return;
    const script = document.createElement('script');
    script.src = '/js/fuzzy-xrp.js?v=1.0.0';
    script.async = false;
    script.dataset.atmFuzzyXrp = '1';
    script.onerror = () => script.remove();
    document.body.appendChild(script);
  }

  function loadLuciRuntime() {
    loadLuci666Npc();
    loadLuci666BeckonUx();
  }

  function loadProjectNpcRuntime() {
    loadLuciRuntime();
    loadNpcDialogueStandard(() => {
      loadMiracle111Npc();
      loadAtmEcosystemGuide();
      loadFuzzyXrpNpc();
    });
  }

  applyBuildIdentity();
  resumeSignupReturnIntent();
  global.addEventListener('DOMContentLoaded', relocateTownDirectoryHotspot, { once: true });

  if (document.readyState === 'complete') {
    loadNftPerformancePatch();
    loadProjectNpcRuntime();
  } else {
    global.addEventListener('load', loadNftPerformancePatch, { once: true });
    global.addEventListener('load', loadProjectNpcRuntime, { once: true });
  }

  global.loadSupabaseLibrary().catch(() => {});
})(window);
