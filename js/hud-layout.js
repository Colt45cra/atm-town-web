/* ATM Town v235.7.1 — Keyboard-Coupled HUD Layout Hotfix
 * Keeps the game canvas independent from keyboard resizing while this module
 * owns visual-viewport geometry for chat/UI. On touch devices, ATM TOWN LIVE
 * is only visually revealed once the software keyboard is actually open.
 */
(function initializeATMHudLayout(global) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = {
    liveChatOpen: false,
    keyboardLikelyOpen: false,
    baselineVisualHeight: 0,
    keyboardFailureTimer: null,
  };

  function isTextEntry(el = document.activeElement) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = String(el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function expectsSoftKeyboard() {
    const coarse = global.matchMedia?.('(hover:none) and (pointer:coarse)')?.matches;
    return Boolean(coarse && global.innerWidth <= 1000);
  }

  function viewportMetrics() {
    const vv = global.visualViewport;
    const layoutHeight = Math.max(1, global.innerHeight || document.documentElement.clientHeight || 1);
    const height = Math.max(1, vv?.height || layoutHeight);
    const width = Math.max(1, vv?.width || global.innerWidth || document.documentElement.clientWidth || 1);
    const top = Math.max(0, vv?.offsetTop || 0);
    const bottomGap = Math.max(0, layoutHeight - (top + height));
    return { layoutHeight, height, width, top, bottomGap };
  }

  function applyViewportVars() {
    const root = document.documentElement;
    const m = viewportMetrics();
    const focusedEntry = isTextEntry();

    if (!focusedEntry || state.baselineVisualHeight < 1) {
      state.baselineVisualHeight = Math.max(state.baselineVisualHeight, m.height);
    }

    const shrink = Math.max(0, state.baselineVisualHeight - m.height);
    state.keyboardLikelyOpen = Boolean(focusedEntry && (m.bottomGap > 70 || shrink > 70));

    root.style.setProperty('--vv-height', `${Math.round(m.height)}px`);
    root.style.setProperty('--vv-width', `${Math.round(m.width)}px`);
    root.style.setProperty('--vv-top', `${Math.round(m.top)}px`);
    root.style.setProperty('--vv-bottom-gap', `${Math.round(m.bottomGap)}px`);
    root.style.setProperty('--hud-notice-top', `${Math.round(m.top + 58)}px`);

    document.body.classList.toggle('atm-keyboard-open', state.keyboardLikelyOpen);
    document.body.classList.toggle('atm-soft-keyboard-device', expectsSoftKeyboard());
    document.body.classList.toggle(
      'atm-quick-chat-focus',
      !state.liveChatOpen && state.keyboardLikelyOpen && document.activeElement?.id === 'chatInput'
    );

    return m;
  }

  function moveComposer(open) {
    const bar = $('chatBar');
    const target = open ? $('liveChatComposerSlot') : $('chatComposerDock');
    if (!bar || !target || bar.parentElement === target) return;
    target.appendChild(bar);
  }

  function clearOldPanelGeometry() {
    const panel = $('liveChatPanel');
    if (!panel) return;
    panel.style.top = '';
    panel.style.bottom = '';
    panel.style.height = '';
    panel.style.maxHeight = '';
  }

  function focusChatInput() {
    const input = $('chatInput');
    if (!input) return false;
    try { input.focus({ preventScroll: true }); }
    catch (_) { input.focus(); }
    return document.activeElement === input;
  }

  function sync() {
    applyViewportVars();
    if (state.liveChatOpen) clearOldPanelGeometry();
  }

  function settleKeyboardGeometry() {
    sync();
    requestAnimationFrame(sync);
    setTimeout(sync, 60);
    setTimeout(sync, 150);
    setTimeout(sync, 280);
    setTimeout(sync, 480);
  }

  function armKeyboardFailureGuard() {
    clearTimeout(state.keyboardFailureTimer);
    if (!state.liveChatOpen || !expectsSoftKeyboard()) return;
    state.keyboardFailureTimer = setTimeout(() => {
      sync();
      if (state.liveChatOpen && !state.keyboardLikelyOpen) {
        global.dispatchEvent(new CustomEvent('atm:live-chat-keyboard-failed'));
      }
    }, 1350);
  }

  function setLiveChatOpen(open, options = {}) {
    state.liveChatOpen = Boolean(open);
    moveComposer(state.liveChatOpen);
    clearOldPanelGeometry();
    document.body.classList.toggle('atm-hud-live-chat', state.liveChatOpen);
    document.body.classList.remove('atm-quick-chat-focus');
    applyViewportVars();

    if (state.liveChatOpen) {
      // Must happen synchronously inside the user's chat-button gesture.
      if (options.focusInput !== false) focusChatInput();
      // Some mobile browsers need a second focus while the viewport animation starts.
      setTimeout(() => { if (state.liveChatOpen && !state.keyboardLikelyOpen) focusChatInput(); }, 120);
      setTimeout(() => { if (state.liveChatOpen && !state.keyboardLikelyOpen) focusChatInput(); }, 320);
      settleKeyboardGeometry();
      armKeyboardFailureGuard();
    } else {
      clearTimeout(state.keyboardFailureTimer);
      state.keyboardFailureTimer = null;
      document.body.classList.remove('atm-keyboard-open', 'atm-quick-chat-focus');
      applyViewportVars();
    }
  }

  function bind() {
    document.body.classList.add('atm-hud-layout-ready');
    applyViewportVars();
    moveComposer(false);

    const onViewportChange = () => {
      settleKeyboardGeometry();
      if (state.liveChatOpen && expectsSoftKeyboard() && !state.keyboardLikelyOpen) armKeyboardFailureGuard();
    };

    global.visualViewport?.addEventListener('resize', onViewportChange);
    global.visualViewport?.addEventListener('scroll', onViewportChange);
    global.addEventListener('resize', onViewportChange);
    global.addEventListener('orientationchange', () => setTimeout(onViewportChange, 120));

    document.addEventListener('focusin', (event) => {
      if (isTextEntry(event.target)) settleKeyboardGeometry();
    });
    document.addEventListener('focusout', (event) => {
      if (isTextEntry(event.target)) setTimeout(settleKeyboardGeometry, 80);
    });
  }

  global.ATMHudLayout = Object.freeze({
    setLiveChatOpen,
    sync: settleKeyboardGeometry,
    focusChatInput,
    viewport: viewportMetrics,
    isKeyboardOpen: () => state.keyboardLikelyOpen,
    expectsSoftKeyboard,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})(window);
