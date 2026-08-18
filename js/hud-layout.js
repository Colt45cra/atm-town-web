/* ATM Town v235.7 — Mobile HUD Layout System
 * One owner for mobile viewport/keyboard geometry and chat-composer placement.
 * The game HUD uses CSS zones; this module only supplies dynamic viewport state
 * and moves the single chat composer into/out of ATM TOWN LIVE.
 */
(function initializeATMHudLayout(global) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = {
    liveChatOpen: false,
    keyboardLikelyOpen: false,
    lastVisualHeight: 0,
  };

  function viewportMetrics() {
    const vv = global.visualViewport;
    const layoutHeight = Math.max(1, global.innerHeight || document.documentElement.clientHeight || 1);
    const height = Math.max(1, vv?.height || layoutHeight);
    const top = Math.max(0, vv?.offsetTop || 0);
    const bottomGap = Math.max(0, layoutHeight - (top + height));
    return { layoutHeight, height, top, bottomGap };
  }

  function applyViewportVars() {
    const root = document.documentElement;
    const m = viewportMetrics();
    root.style.setProperty('--vv-height', `${Math.round(m.height)}px`);
    root.style.setProperty('--vv-top', `${Math.round(m.top)}px`);
    root.style.setProperty('--vv-bottom-gap', `${Math.round(m.bottomGap)}px`);
    root.style.setProperty('--hud-notice-top', `${Math.round(m.top + 58)}px`);
    state.keyboardLikelyOpen = m.bottomGap > 80 || (state.lastVisualHeight > 0 && state.lastVisualHeight - m.height > 80);
    state.lastVisualHeight = Math.max(state.lastVisualHeight, m.height);
    document.body.classList.toggle('atm-keyboard-open', state.liveChatOpen && state.keyboardLikelyOpen);
    return m;
  }

  function moveComposer(open) {
    const bar = $('chatBar');
    const target = open ? $('liveChatComposerSlot') : $('chatComposerDock');
    if (!bar || !target || bar.parentElement === target) return;
    target.appendChild(bar);
  }

  function syncLiveChatPanel() {
    const panel = $('liveChatPanel');
    if (!panel || !state.liveChatOpen) return;
    const m = applyViewportVars();
    const margin = global.innerWidth <= 700 ? 8 : 10;
    const preferred = Math.min(520, m.height * (global.innerWidth <= 700 ? 0.62 : 0.58));
    const maxHeight = Math.max(178, m.height - (margin * 2));
    const height = Math.max(178, Math.min(preferred, maxHeight));
    const top = Math.max(m.top + margin, m.top + m.height - height - margin);
    panel.style.top = `${Math.round(top)}px`;
    panel.style.bottom = 'auto';
    panel.style.height = `${Math.round(height)}px`;
    panel.style.maxHeight = `${Math.round(maxHeight)}px`;
  }

  function focusChatInput() {
    const input = $('chatInput');
    if (!input) return;
    try { input.focus({ preventScroll: true }); }
    catch (_) { input.focus(); }
  }

  function settleKeyboardGeometry() {
    syncLiveChatPanel();
    requestAnimationFrame(syncLiveChatPanel);
    setTimeout(syncLiveChatPanel, 80);
    setTimeout(syncLiveChatPanel, 220);
    setTimeout(syncLiveChatPanel, 420);
  }

  function setLiveChatOpen(open, options = {}) {
    state.liveChatOpen = Boolean(open);
    moveComposer(state.liveChatOpen);
    document.body.classList.toggle('atm-hud-live-chat', state.liveChatOpen);
    applyViewportVars();

    if (state.liveChatOpen) {
      // This must remain synchronous inside the chat-button click gesture so
      // iOS/Android are allowed to open the software keyboard immediately.
      if (options.focusInput !== false) focusChatInput();
      settleKeyboardGeometry();
    } else {
      const panel = $('liveChatPanel');
      if (panel) {
        panel.style.top = '';
        panel.style.bottom = '';
        panel.style.height = '';
        panel.style.maxHeight = '';
      }
      document.body.classList.remove('atm-keyboard-open');
    }
  }

  function bind() {
    document.body.classList.add('atm-hud-layout-ready');
    applyViewportVars();
    moveComposer(false);
    global.visualViewport?.addEventListener('resize', settleKeyboardGeometry);
    global.visualViewport?.addEventListener('scroll', settleKeyboardGeometry);
    global.addEventListener('resize', settleKeyboardGeometry);
    global.addEventListener('orientationchange', () => setTimeout(settleKeyboardGeometry, 120));
  }

  global.ATMHudLayout = Object.freeze({
    setLiveChatOpen,
    sync: settleKeyboardGeometry,
    focusChatInput,
    viewport: viewportMetrics,
    isKeyboardOpen: () => state.keyboardLikelyOpen,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})(window);
