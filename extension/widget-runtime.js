// UEDA EX — Widget Runtime v5.2.0
// Este arquivo é carregado dinamicamente pelo widget.js (bootstrap).
// Para atualizar o visual/funcionalidades sem reinstalar a extensão,
// basta editar este arquivo e fazer push para o GitHub.
// Cores e notificações são controladas via config.json no mesmo repositório.
(function uedaRuntime() {
  'use strict';

  // ── Evitar dupla injeção ──
  if (window.__uedaRuntimeLoaded) return;
  window.__uedaRuntimeLoaded = true;

  // ── Lê atributos injetados pelo bootstrap ──
  var root     = document.documentElement;
  var LOGO_URL = root.getAttribute('data-ueda-logo-url') || '';
  var EXT_VER  = root.getAttribute('data-ueda-ext-version') || '5.2.0';
  var CFG_URL  = root.getAttribute('data-ueda-config-url') ||
    'https://cdn.jsdelivr.net/gh/Uedaag/ueda-control-center@main/extension/config.json';

  // ── Estado global ──
  var state = {
    isOpen:       false,
    isExpanded:   false,
    chatEnabled:  true,
    soundEnabled: true,
    userName:     'Minha Conta',
    validity:     null,
    config:       null,
    notifications: [],
    unreadCount:  0,
  };

  // ── Ponte chrome.storage via postMessage ──
  var _pending = {};
  var _reqId   = 0;

  function bridgeCall(type, data) {
    return new Promise(function(resolve) {
      var id = 'ueda_' + (++_reqId);
      _pending[id] = resolve;
      window.postMessage({ __uedaBridge: 'req', id: id, type: type, data: data,
        keys: data && data.keys, opts: data && data.opts,
        msg: data && data.msg, url: data && data.url }, '*');
      setTimeout(function() {
        if (_pending[id]) { delete _pending[id]; resolve(null); }
      }, 5000);
    });
  }

  window.addEventListener('message', function(e) {
    if (e.source !== window) return;
    var d = e.data;
    if (!d || d.__uedaBridge !== 'res' || !d.id) return;
    if (_pending[d.id]) { _pending[d.id](d.result); delete _pending[d.id]; }
  });

  function storageGet(keys) {
    return bridgeCall('storage.get', { keys: keys });
  }
  function storageSet(data) {
    return bridgeCall('storage.set', { data: data });
  }
  function openTab(url) {
    return bridgeCall('openTab', { url: url });
  }

  // ── Escuta mudanças de storage (atualizações em tempo real) ──
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.__uedaStorageChanged) return;
    var changes = e.data.changes || {};
    if (changes.enabled !== undefined) {
      state.chatEnabled = !!changes.enabled.newValue;
      updateChatGlow(state.chatEnabled);
      updateMenuStates();
    }
    if (changes.soundEnabled !== undefined) {
      state.soundEnabled = !!changes.soundEnabled.newValue;
      updateMenuStates();
    }
  });

  // ─────────────────────────────────────────────
  // TOAST NOTIFICATIONS
  // ─────────────────────────────────────────────
  var toastContainer = null;
  var toastTimeout   = null;

  function ensureToastContainer() {
    if (toastContainer && document.contains(toastContainer)) return;
    toastContainer = document.createElement('div');
    toastContainer.id = 'ueda-toast-container';
    document.body.appendChild(toastContainer);
  }

  function showToast(message, opts) {
    opts = opts || {};
    ensureToastContainer();
    toastContainer.innerHTML = '';
    clearTimeout(toastTimeout);

    var wrapper = document.createElement('div');
    wrapper.className = 'ueda-toast-wrapper';

    var toast = document.createElement('div');
    toast.className = 'ueda-toast';
    if (opts.color) toast.style.borderLeftColor = opts.color;

    var cfg = state.config;
    var icon = opts.icon || '●';
    toast.innerHTML = '<span style="opacity:0.7">' + icon + '</span> ' +
      document.createTextNode(message).textContent;
    toast.textContent = message;

    var pill = document.createElement('div');
    pill.className = 'ueda-toast-pill';

    wrapper.appendChild(toast);
    wrapper.appendChild(pill);
    toastContainer.appendChild(wrapper);

    setTimeout(function() { wrapper.classList.add('show'); }, 10);

    var duration = opts.duration || 3500;
    toastTimeout = setTimeout(function() {
      wrapper.classList.remove('show');
      setTimeout(function() { if (wrapper.parentNode) wrapper.remove(); }, 320);
    }, duration);
  }

  // ─────────────────────────────────────────────
  // SOUNDS
  // ─────────────────────────────────────────────
  function playSound(type) {
    if (!state.soundEnabled) return;
    var sounds = (state.config && state.config.sounds) || {};
    var url = sounds[type];
    if (!url) return;
    try {
      var a = new Audio(url);
      a.volume = 0.45;
      a.play().catch(function(){});
    } catch(_) {}
  }

  // ─────────────────────────────────────────────
  // NOTIFICATION BADGE
  // ─────────────────────────────────────────────
  function updateNotifBadge() {
    var btn = document.getElementById('ueda-trigger-btn');
    if (!btn) return;
    var existing = btn.querySelector('.ueda-notif-badge');
    if (state.unreadCount > 0) {
      if (!existing) {
        existing = document.createElement('div');
        existing.className = 'ueda-notif-badge';
        btn.appendChild(existing);
      }
      existing.textContent = state.unreadCount > 9 ? '9+' : String(state.unreadCount);
    } else {
      if (existing) existing.remove();
    }
  }

  // ─────────────────────────────────────────────
  // CONFIG LOADER (from GitHub)
  // ─────────────────────────────────────────────
  function loadConfig() {
    var cacheBust = Math.floor(Date.now() / (10 * 60 * 1000));
    fetch(CFG_URL + '?cb=' + cacheBust, { cache: 'no-cache' })
      .then(function(r) { return r.json(); })
      .then(function(cfg) {
        state.config = cfg;
        applyThemeFromConfig(cfg);
        processNotifications(cfg.notifications || []);
        console.log('[UEDA] Config carregada v' + (cfg.version || '?'));
      })
      .catch(function(e) {
        console.warn('[UEDA] Config não disponível, usando padrões.', e);
      });
  }

  function applyThemeFromConfig(cfg) {
    if (!cfg || !cfg.theme) return;
    var t = cfg.theme;
    var style = document.getElementById('ueda-theme-vars');
    if (!style) {
      style = document.createElement('style');
      style.id = 'ueda-theme-vars';
      document.head.appendChild(style);
    }
    style.textContent = ':root {' +
      (t.bg        ? '--ueda-bg: '          + t.bg        + ';' : '') +
      (t.bgActive  ? '--ueda-bg-active: '   + t.bgActive  + ';' : '') +
      (t.accent    ? '--ueda-accent: '      + t.accent    + ';' : '') +
      (t.accentDim ? '--ueda-accent-dim: '  + t.accentDim + ';' : '') +
      (t.text      ? '--ueda-text: '        + t.text      + ';' : '') +
      (t.textMuted ? '--ueda-text-muted: '  + t.textMuted + ';' : '') +
      (t.border    ? '--ueda-border: '      + t.border    + ';' : '') +
    '}';
    // Atualiza cor da borda do toast
    if (t.toastBorder) {
      var toasts = document.querySelectorAll('.ueda-toast');
      toasts.forEach(function(el) { el.style.borderLeftColor = t.toastBorder; });
    }
  }

  function processNotifications(notifications) {
    var seen = {};
    try {
      var raw = localStorage.getItem('ueda_seen_notifs');
      if (raw) seen = JSON.parse(raw);
    } catch(_) {}

    var unread = 0;
    notifications.forEach(function(n) {
      if (!seen[n.id]) unread++;
    });

    state.notifications = notifications;
    state.unreadCount   = unread;
    updateNotifBadge();

    // Mostra primeira notificação não vista automaticamente
    var first = notifications.find(function(n) { return !seen[n.id]; });
    if (first) {
      setTimeout(function() {
        showToast(first.message, { duration: 5000, color: first.color });
        seen[first.id] = true;
        try { localStorage.setItem('ueda_seen_notifs', JSON.stringify(seen)); } catch(_) {}
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        updateNotifBadge();
      }, 2000);
    }
  }

  // ─────────────────────────────────────────────
  // CHAT GLOW
  // ─────────────────────────────────────────────
  var GLOW_ID = 'ueda-chat-glow';

  function updateChatGlow(on) {
    var existing = document.getElementById(GLOW_ID);
    if (existing) existing.remove();
    if (!on) return;
    var s = document.createElement('style');
    s.id = GLOW_ID;
    s.textContent = [
      'textarea[placeholder]:not(#ueda-widget-container *) {',
      '  outline: 2px solid var(--ueda-accent, #4ade80) !important;',
      '  outline-offset: 2px !important;',
      '  box-shadow: 0 0 0 2px rgba(74,222,128,0.25), 0 0 18px rgba(74,222,128,0.18) !important;',
      '  border-radius: 12px !important;',
      '  transition: box-shadow 0.3s ease !important;',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────
  // WIDGET HTML
  // ─────────────────────────────────────────────
  function buildWidget() {
    if (document.getElementById('ueda-widget-container')) return;

    var container = document.createElement('div');
    container.id = 'ueda-widget-container';

    // Sidebar
    var sidebar = document.createElement('div');
    sidebar.className = 'ueda-sidebar';

    // Header (logo + brand)
    var header = document.createElement('div');
    header.className = 'ueda-sidebar-header';
    var headerLogo = document.createElement('img');
    headerLogo.className = 'ueda-sidebar-logo';
    headerLogo.src = LOGO_URL;
    headerLogo.alt = 'U';
    var brand = document.createElement('div');
    brand.className = 'ueda-sidebar-brand';
    var brandName = document.createElement('span');
    brandName.className = 'ueda-brand-name';
    brandName.textContent = 'UEDA EX';
    var brandSub = document.createElement('span');
    brandSub.className = 'ueda-brand-sub';
    brandSub.id = 'ueda-validity-label';
    brandSub.textContent = 'Calculando...';
    brand.appendChild(brandName);
    brand.appendChild(brandSub);
    header.appendChild(headerLogo);
    header.appendChild(brand);
    sidebar.appendChild(header);

    // Menu
    var menu = document.createElement('div');
    menu.className = 'ueda-menu';

    // Menu items definition
    var items = [
      {
        id: 'ueda-item-chat', icon: makeSVG('power'),
        label: 'Chat Padrão', extraClass: 'ueda-active',
        onClick: function() { toggleChat(); }
      },
      {
        id: 'ueda-item-sound', icon: makeSVG('sound'),
        label: 'Som',
        onClick: function() { toggleSound(); }
      },
      {
        id: 'ueda-item-watermark', icon: makeSVG('edit'),
        label: 'Remover Marca',
        onClick: function() { removeWatermark(); }
      },
      {
        id: 'ueda-item-update', icon: makeSVG('refresh'),
        label: 'Atualizar',
        onClick: function() { updateRuntime(); }
      },
      {
        id: 'ueda-item-support', icon: makeSVG('help'),
        label: 'Suporte',
        tag: 'a',
        href: 'https://wa.me/5577999134858',
        target: '_blank'
      },
    ];

    items.forEach(function(item) {
      var el = document.createElement(item.tag || 'div');
      el.id = item.id;
      el.className = 'ueda-item' + (item.extraClass ? ' ' + item.extraClass : '');
      if (item.href) { el.href = item.href; el.target = item.target || '_blank'; }
      el.innerHTML = item.icon;
      var lbl = document.createElement('span');
      lbl.className = 'ueda-item-label';
      lbl.textContent = item.label;
      el.appendChild(lbl);
      if (item.onClick) el.addEventListener('click', function(e) { e.stopPropagation(); item.onClick(); });
      menu.appendChild(el);
    });

    // Expand toggle button (arrow)
    var expandBtn = document.createElement('div');
    expandBtn.className = 'ueda-expand-btn';
    expandBtn.title = 'Expandir / Recolher';
    expandBtn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    expandBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      container.classList.toggle('ueda-expanded');
      state.isExpanded = container.classList.contains('ueda-expanded');
    });

    sidebar.appendChild(menu);
    sidebar.appendChild(expandBtn);

    // Trigger (floating) button
    var triggerBtn = document.createElement('button');
    triggerBtn.id = 'ueda-trigger-btn';
    triggerBtn.title = 'UEDA EX';
    var triggerLogo = document.createElement('img');
    triggerLogo.className = 'ueda-trigger-logo';
    triggerLogo.src = LOGO_URL;
    triggerLogo.alt = 'U';
    triggerBtn.appendChild(triggerLogo);

    triggerBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      state.isOpen = !container.classList.contains('ueda-open');
      container.classList.toggle('ueda-open', state.isOpen);
      if (!state.isOpen) container.classList.remove('ueda-expanded');
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
      if (!container.contains(e.target)) {
        container.classList.remove('ueda-open', 'ueda-expanded');
        state.isOpen = false;
      }
    });

    container.appendChild(sidebar);
    container.appendChild(triggerBtn);
    document.body.appendChild(container);

    // Ensure toast container exists
    ensureToastContainer();
  }

  // ─────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────
  function toggleChat() {
    state.chatEnabled = !state.chatEnabled;
    storageSet({ enabled: state.chatEnabled });
    updateChatGlow(state.chatEnabled);
    updateMenuStates();
    var msg = state.chatEnabled ? 'Chat Padrão ATIVADO' : 'Chat Padrão DESATIVADO';
    showToast(msg);
    playSound(state.chatEnabled ? 'success' : 'chat');
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    storageSet({ soundEnabled: state.soundEnabled });
    updateMenuStates();
    showToast(state.soundEnabled ? '🔊 Som ATIVADO' : '🔇 Som DESATIVADO');
  }

  function removeWatermark() {
    try {
      var cmds = state.config && state.config.commands;
      if (cmds && cmds.remove_watermark) {
        new Function(cmds.remove_watermark)();
      } else {
        document.querySelectorAll('*').forEach(function(el) {
          if (!el.children.length && el.textContent &&
              el.textContent.includes('Made with Lovable')) {
            el.style.display = 'none';
          }
        });
      }
      showToast("✓ Marca d'água removida!");
    } catch(e) {
      showToast('Erro ao remover marca', { color: '#f87171' });
    }
  }

  function updateRuntime() {
    showToast('🔄 Atualizando extensão...', { duration: 2000 });
    setTimeout(function() {
      window.__uedaRuntimeLoaded = false;
      window.__uedaBootstrapped  = false;
      var loader = document.querySelector('script[data-ueda-loader]');
      if (loader) loader.remove();
      var container = document.getElementById('ueda-widget-container');
      if (container) container.remove();
      var toastCont = document.getElementById('ueda-toast-container');
      if (toastCont) toastCont.remove();
      var themeStyle = document.getElementById('ueda-theme-vars');
      if (themeStyle) themeStyle.remove();
      var glowStyle = document.getElementById(GLOW_ID);
      if (glowStyle) glowStyle.remove();
      // Reload fresh from server (cache-bust forced)
      var s = document.createElement('script');
      s.setAttribute('data-ueda-loader', '1');
      var newVer = Math.floor(Date.now() / 1000);
      var RUNTIME_URL = 'https://cdn.jsdelivr.net/gh/Uedaag/ueda-control-center@main/extension/widget-runtime.js';
      s.src = RUNTIME_URL + '?force=' + newVer;
      s.async = false;
      (document.head || document.documentElement).appendChild(s);
    }, 2100);
  }

  // ─────────────────────────────────────────────
  // UI STATE SYNC
  // ─────────────────────────────────────────────
  function updateMenuStates() {
    var chatItem = document.getElementById('ueda-item-chat');
    if (chatItem) {
      chatItem.classList.toggle('ueda-active', state.chatEnabled);
      var lbl = chatItem.querySelector('.ueda-item-label');
      if (lbl) lbl.textContent = state.chatEnabled ? 'Chat Padrão ATIVADO' : 'Chat Padrão DESATIVADO';
    }

    var soundItem = document.getElementById('ueda-item-sound');
    if (soundItem) {
      soundItem.classList.toggle('ueda-active', state.soundEnabled);
      var slbl = soundItem.querySelector('.ueda-item-label');
      if (slbl) slbl.textContent = state.soundEnabled ? 'Som ATIVADO' : 'Som DESATIVADO';
    }
  }

  function updateValidityLabel() {
    var el = document.getElementById('ueda-validity-label');
    if (!el) return;
    if (!state.validity) { el.textContent = 'Ilimitado ✓'; el.style.color = '#4ade80'; return; }
    var ms = typeof state.validity === 'string' ? new Date(state.validity).getTime() : Number(state.validity);
    var secs = Math.max(0, Math.floor((ms - Date.now()) / 1000));
    if (secs <= 0) { el.textContent = 'Expirado!'; el.style.color = '#f87171'; return; }
    var d = Math.floor(secs / 86400);
    var h = String(Math.floor((secs % 86400) / 3600)).padStart(2, '0');
    var m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    var s = String(secs % 60).padStart(2, '0');
    el.textContent = d > 0 ? d + ' dias restantes' : h + ':' + m + ':' + s;
  }

  // ─────────────────────────────────────────────
  // SVG ICONS
  // ─────────────────────────────────────────────
  function makeSVG(name) {
    var icons = {
      power:   '<svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
      sound:   '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
      edit:    '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
      refresh: '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
      help:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      user:    '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    };
    return icons[name] || icons.help;
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  function init() {
    // Load saved state from chrome storage
    storageGet(['enabled', 'soundEnabled', 'userName', 'validade', 'user']).then(function(r) {
      r = r || {};
      state.chatEnabled  = r.enabled !== false;
      state.soundEnabled = r.soundEnabled !== false;
      state.userName     = r.userName || r.user || 'Minha Conta';
      state.validity     = r.validade || null;

      buildWidget();
      updateMenuStates();
      updateChatGlow(state.chatEnabled);
      updateValidityLabel();

      // Load remote config
      loadConfig();

      // Update validity label every second
      setInterval(updateValidityLabel, 1000);
      // Refresh config every 15 minutes
      setInterval(loadConfig, 15 * 60 * 1000);
    });
  }

  // ─────────────────────────────────────────────
  // START
  // ─────────────────────────────────────────────
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }

})();
