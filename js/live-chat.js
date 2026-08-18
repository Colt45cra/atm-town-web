/* ATM Town v235.7.1 keyboard-coupled HUD + live chat integration
 * Overhead speech bubbles keep their short lifetime in game-core.
 * This module keeps chat messages for the current browser play session and
 * loads the last 10 minutes of authenticated server history on room join.
 */
(function initializeATMLiveChat(global) {
  'use strict';

  const MAX_SESSION_MESSAGES = 200;
  const PREVIEW_LIFETIME_MS = 5_000;
  const PREVIEW_LIMIT = 2;
  const state = {
    room: '',
    messages: [],
    ids: new Set(),
    open: false,
    unread: 0,
    recentLoadedFor: '',
  };

  const $ = (id) => document.getElementById(id);
  const clean = (value, max = 180) => String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

  function fallbackId(message) {
    const base = `${message.created_at || ''}|${message.sender_name || ''}|${message.message || ''}`;
    let hash = 2166136261;
    for (let i = 0; i < base.length; i++) { hash ^= base.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return `legacy:${(hash >>> 0).toString(16)}:${String(message.created_at || Date.now()).slice(-12)}`;
  }

  function normalize(raw = {}, options = {}) {
    const created = String(raw.created_at || new Date().toISOString());
    const senderName = clean(raw.sender_name || raw.name || 'Player', 30) || 'Player';
    const message = clean(raw.message, 180);
    if (!message) return null;
    const normalized = {
      id: clean(raw.client_message_id || raw.message_id || '', 96),
      room: clean(raw.room || state.room, 40),
      sender_user_id: clean(raw.sender_user_id || raw.user_id || '', 64),
      sender_player_id: clean(raw.sender_player_id || raw.id || '', 96),
      sender_name: senderName,
      message,
      created_at: Number.isFinite(Date.parse(created)) ? new Date(created).toISOString() : new Date().toISOString(),
      local: Boolean(options.local || raw.local),
      historical: Boolean(options.historical || raw.historical),
      preview_expires_at: Date.now() + PREVIEW_LIFETIME_MS,
    };
    if (!normalized.id) normalized.id = fallbackId(normalized);
    return normalized;
  }

  function nearBottom(el) {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }

  function syncPanelToVisualViewport() {
    if (!state.open) return;
    global.ATMHudLayout?.sync?.();
  }

  function timeLabel(value) {
    try { return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    catch (_) { return ''; }
  }

  function updateUnread() {
    const badge = $('chatUnreadBadge');
    const toggle = $('chatToggle');
    if (badge) {
      badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
      badge.hidden = state.unread < 1;
    }
    if (toggle) toggle.setAttribute('aria-label', state.unread ? `Open live chat, ${state.unread} unread` : 'Open live chat');
  }

  function renderPreview() {
    const log = $('chatLog');
    if (!log) return;
    const now = Date.now();
    const recent = state.messages.filter((item) => !item.historical && item.preview_expires_at > now).slice(-PREVIEW_LIMIT);
    log.replaceChildren();
    for (const item of recent) {
      const line = document.createElement('div');
      line.className = 'chatLine' + (item.local ? ' local' : '');
      const strong = document.createElement('strong'); strong.textContent = item.sender_name;
      const text = document.createElement('span'); text.textContent = item.message;
      line.append(strong, text); log.appendChild(line);
    }
  }

  function renderPanel({ preserveScroll = true } = {}) {
    const list = $('liveChatMessages');
    const empty = $('liveChatEmpty');
    if (!list) return;
    const shouldStick = !preserveScroll || nearBottom(list);
    const previousTop = list.scrollTop;
    list.replaceChildren();
    for (const item of state.messages) {
      const row = document.createElement('article');
      row.className = 'liveChatMessage' + (item.local ? ' local' : '');
      row.dataset.messageId = item.id;
      const header = document.createElement('div'); header.className = 'liveChatMessageHeader';
      const name = document.createElement('strong'); name.textContent = item.local ? `${item.sender_name} · You` : item.sender_name;
      const time = document.createElement('time'); time.dateTime = item.created_at; time.textContent = timeLabel(item.created_at);
      const body = document.createElement('div'); body.className = 'liveChatMessageBody'; body.textContent = item.message;
      header.append(name, time); row.append(header, body); list.appendChild(row);
    }
    if (empty) empty.hidden = state.messages.length > 0;
    if (shouldStick) list.scrollTop = list.scrollHeight;
    else list.scrollTop = previousTop;
  }

  function receiveMessage(raw, options = {}) {
    const item = normalize(raw, options);
    if (!item || state.ids.has(item.id)) return false;
    state.ids.add(item.id);
    state.messages.push(item);
    if (state.messages.length > MAX_SESSION_MESSAGES) {
      const removed = state.messages.splice(0, state.messages.length - MAX_SESSION_MESSAGES);
      for (const old of removed) state.ids.delete(old.id);
    }
    if (!item.historical && !item.local && !state.open) state.unread += 1;
    updateUnread();
    renderPreview();
    setTimeout(renderPreview, PREVIEW_LIFETIME_MS + 60);
    renderPanel();
    return true;
  }

  function setOpen(open) {
    state.open = Boolean(open);
    const panel = $('liveChatPanel');
    const toggle = $('chatToggle');
    if (panel) { panel.classList.toggle('open', state.open); panel.setAttribute('aria-hidden', state.open ? 'false' : 'true'); }
    if (toggle) toggle.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    document.body.classList.toggle('live-chat-open', state.open);

    // The HUD layout owns keyboard coupling. On touch devices the panel is
    // intentionally transparent/hidden until the software keyboard is real.
    global.ATMHudLayout?.setLiveChatOpen?.(state.open, { focusInput: state.open });

    if (state.open) {
      state.unread = 0;
      updateUnread();
      renderPanel({ preserveScroll: false });
      requestAnimationFrame(() => {
        syncPanelToVisualViewport();
        const list = $('liveChatMessages');
        if (list) list.scrollTop = list.scrollHeight;
      });
    }
  }

  async function persistSentMessage(payload = {}) {
    const api = global.atmApiWithAuth;
    if (typeof api !== 'function' || !state.room) return { stored: false, reason: 'not_authenticated' };
    try {
      return await api('/api/embedded-wallet?action=live-chat-send', {
        method: 'POST',
        body: JSON.stringify({
          room: state.room,
          message_id: payload.message_id || payload.client_message_id,
          message: payload.message,
        }),
      });
    } catch (error) {
      console.warn('ATM Town live chat could not save this message to recent history:', error?.message || error);
      return { stored: false, reason: error?.message || 'save_failed' };
    }
  }

  async function loadRecent(room) {
    const nextRoom = clean(room, 40);
    if (!nextRoom) return;
    state.room = nextRoom;
    if (state.recentLoadedFor === nextRoom) return;
    const api = global.atmApiWithAuth;
    if (typeof api !== 'function') return;
    try {
      const data = await api(`/api/embedded-wallet?action=live-chat-history&room=${encodeURIComponent(nextRoom)}`);
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      for (const row of rows) receiveMessage(row, { historical: true });
      state.recentLoadedFor = nextRoom;
      renderPanel({ preserveScroll: false });
    } catch (error) {
      if (!/sign in/i.test(String(error?.message || ''))) console.warn('ATM Town recent live chat could not load:', error?.message || error);
    }
  }

  function connectRoom(room) {
    const nextRoom = clean(room, 40);
    if (!nextRoom) return;
    if (state.room && state.room !== nextRoom) {
      state.messages = [];
      state.ids.clear();
      state.unread = 0;
      state.recentLoadedFor = '';
    }
    state.room = nextRoom;
    updateUnread(); renderPreview(); renderPanel();
    loadRecent(nextRoom);
  }

  function bind() {
    $('chatToggle')?.addEventListener('click', () => setOpen(!state.open));
    $('liveChatClose')?.addEventListener('click', () => setOpen(false));
    $('chatInput')?.addEventListener('focus', () => {
      if (state.open) {
        syncPanelToVisualViewport();
        setTimeout(() => {
          syncPanelToVisualViewport();
          const list = $('liveChatMessages');
          if (list) list.scrollTop = list.scrollHeight;
        }, 80);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.open) setOpen(false);
    });
    global.visualViewport?.addEventListener('resize', syncPanelToVisualViewport);
    global.visualViewport?.addEventListener('scroll', syncPanelToVisualViewport);
    global.addEventListener('orientationchange', () => setTimeout(syncPanelToVisualViewport, 120));

    // If a phone refuses to open (or the user dismisses) the software keyboard,
    // close Live Chat instead of ever leaving the chat panel open by itself.
    global.addEventListener('atm:live-chat-keyboard-failed', () => {
      if (state.open) setOpen(false);
    });
    $('chatInput')?.addEventListener('blur', () => {
      if (!state.open || !global.ATMHudLayout?.expectsSoftKeyboard?.()) return;
      setTimeout(() => {
        if (state.open && !global.ATMHudLayout?.isKeyboardOpen?.()) setOpen(false);
      }, 260);
    });

    setInterval(renderPreview, 1_000);
    updateUnread(); renderPreview(); renderPanel();
  }

  global.ATMLiveChat = Object.freeze({ receiveMessage, persistSentMessage, loadRecent, connectRoom, open: () => setOpen(true), close: () => setOpen(false), isOpen: () => state.open });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})(window);
