(function() {
  if (document.getElementById('ueda-widget-container')) return;

  const logoUrl = chrome.runtime.getURL('logo.png');
  const CONFIG_URL = 'https://preview-panel-buddy.lovable.app/api/public/ueda-updates';

  // ---- Remote config: greeting audio + chat SFX ----
  const chatAudio = new Audio();
  chatAudio.volume = 0.4;
  const welcomeAudio = new Audio();
  welcomeAudio.volume = 0.6;

  function playChatSfx() {
    try {
      chrome.storage.local.get(['uedaSoundMuted'], (r) => {
        if (r.uedaSoundMuted) return;
        if (!chatAudio.src) return;
        chatAudio.currentTime = 0;
        chatAudio.play().catch(() => {});
      });
    } catch (e) {}
  }

  function playWelcomeOnce() {
    try {
      chrome.storage.local.get(['uedaWelcomePlayedAt', 'uedaSoundMuted'], (r) => {
        if (r.uedaSoundMuted) return;
        if (Date.now() - (r.uedaWelcomePlayedAt || 0) < 6 * 3600 * 1000) return;
        if (!welcomeAudio.src) return;
        welcomeAudio.play().then(() => {
          chrome.storage.local.set({ uedaWelcomePlayedAt: Date.now() });
        }).catch(() => {});
      });
    } catch (e) {}
  }

  function attachChatListeners() {
    if (document.__uedaChatAttached) return;
    document.__uedaChatAttached = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const t = e.target;
      if (!t) return;
      const tag = (t.tagName || '').toLowerCase();
      const isEditable = tag === 'textarea' || (t.getAttribute && t.getAttribute('contenteditable') === 'true');
      if (isEditable) playChatSfx();
    }, true);
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('button');
      if (!btn) return;
      const label = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '')).toLowerCase();
      if (label.includes('send') || label.includes('enviar') || btn.type === 'submit') playChatSfx();
    }, true);
  }

  function applyRemoteConfig(cfg) {
    if (!cfg) return;
    const sounds = (cfg.config && cfg.config.sounds) || cfg.sounds || {};
    if (sounds.chat) chatAudio.src = sounds.chat;
    if (sounds.welcome) {
      welcomeAudio.src = sounds.welcome;
      welcomeAudio.addEventListener('canplaythrough', playWelcomeOnce, { once: true });
    }
    attachChatListeners();
  }

  fetch(CONFIG_URL, { cache: 'no-store' })
    .then((r) => r.json())
    .then(applyRemoteConfig)
    .catch(() => {});


  const html = `
    <div id="ueda-widget-container" class="ueda-collapsed">
      <div class="ueda-widget-menu">
        <div class="ueda-menu-header" id="ueda-menu-toggle">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span class="ueda-text" id="ueda-toggle-text">Expandir menu</span>
        </div>

        <div class="ueda-menu-item" style="cursor: default;">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <div class="ueda-text" style="display: flex; flex-direction: column;">
            <span id="ueda-user-name">Minha conta</span>
            <span id="ueda-time-value" style="font-size: 11px; color: #1DAFD8; font-weight: bold; margin-top: 2px;">Calculando...</span>
          </div>
        </div>

        <div class="ueda-menu-item" id="ueda-menu-mode">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg> 
          <span class="ueda-text" id="ueda-mode-text">Modo Padrão</span>
        </div>

        <div class="ueda-menu-item" id="ueda-menu-update">
          <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span class="ueda-text">Atualizar extensão</span>
        </div>

        <a href="https://wa.me/5511999999999" target="_blank" class="ueda-menu-item" style="text-decoration: none;">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> 
          <span class="ueda-text">Ajuda & Suporte</span>
        </a>

        <div class="ueda-menu-item ueda-text-green" id="ueda-menu-status">
          <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg> 
          <span class="ueda-text" id="ueda-status-text">Monitor ON</span>
        </div>
      </div>
      <button class="ueda-widget-btn">
        <img src="${logoUrl}" alt="U" class="ueda-widget-logo">
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const container = document.getElementById('ueda-widget-container');
  const toggleBtn = document.getElementById('ueda-menu-toggle');
  const toggleText = document.getElementById('ueda-toggle-text');
  
  const timeValue = document.getElementById('ueda-time-value');
  const modeBtn = document.getElementById('ueda-menu-mode');
  const modeText = document.getElementById('ueda-mode-text');
  const statusBtn = document.getElementById('ueda-menu-status');
  const statusText = document.getElementById('ueda-status-text');
  
  const updateBtn = document.getElementById('ueda-menu-update');
  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      // Tell the background script to reload if possible, otherwise just refresh the page
      try {
        chrome.runtime.sendMessage({ action: "reload_extension" });
      } catch (e) {}
      
      setTimeout(() => {
        window.location.reload();
      }, 300);
    });
  }

  let currentMode = "1";
  let isEnabled = true;

  // Toggle expand/collapse
  toggleBtn.addEventListener('click', () => {
    if (container.classList.contains('ueda-expanded')) {
      container.classList.remove('ueda-expanded');
      container.classList.add('ueda-collapsed');
      toggleText.textContent = "Expandir menu";
    } else {
      container.classList.add('ueda-expanded');
      container.classList.remove('ueda-collapsed');
      toggleText.textContent = "Recolher menu";
    }
  });

  chrome.storage.local.get(['enabled', 'mode', 'userName', 'user'], (result) => {
    isEnabled = result.enabled !== false;
    currentMode = result.mode || "1";
    
    const name = result.userName || result.user || "Minha conta";
    document.getElementById('ueda-user-name').textContent = name;
    
    updateUI();
  });

  function updateUI() {
    // Mode
    modeText.textContent = currentMode === "2" ? "Modo Avançado" : "Modo Padrão";
    
    // Status
    if (isEnabled) {
      statusText.textContent = "Monitor ON";
      statusBtn.classList.add("ueda-text-green");
      statusBtn.classList.remove("ueda-text-red");
      document.body.classList.add("ueda-monitor-on");
    } else {
      statusText.textContent = "Monitor OFF";
      statusBtn.classList.add("ueda-text-red");
      statusBtn.classList.remove("ueda-text-green");
      document.body.classList.remove("ueda-monitor-on");
    }
  }

  modeBtn.addEventListener('click', () => {
    currentMode = currentMode === "1" ? "2" : "1";
    chrome.storage.local.set({ mode: currentMode }, updateUI);
  });

  statusBtn.addEventListener('click', () => {
    isEnabled = !isEnabled;
    chrome.storage.local.set({ enabled: isEnabled }, updateUI);
  });

  // Chat glow is now handled purely in CSS via body.ueda-monitor-on

  const pollInterval = setInterval(() => {
    // Hide the ugly "Acesso Negado" text and icon, but keep the chat blocked
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.includes('Acesso Negado')) {
          let container = node.parentElement;
          while (container && container !== document.body) {
             // Find the wrapper (usually has absolute positioning or flex layout blocking the chat)
             if (container.style.position === 'absolute' || container.style.zIndex || container.style.display === 'flex') {
                 node.nodeValue = ''; // Clear text
                 // Hide all SVGs inside the overlay (the warning icon)
                 const svgs = container.querySelectorAll('svg');
                 svgs.forEach(s => s.style.display = 'none');
                 
                 // Make the background look like a subtle disabled state
                 container.style.backgroundColor = 'rgba(20, 20, 20, 0.6)';
                 container.style.backdropFilter = 'grayscale(1) blur(4px)';
                 
                 // Remove any warning emojis
                 const warnWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
                 let wNode;
                 while ((wNode = warnWalker.nextNode())) {
                     if (wNode.nodeValue.includes('⚠️')) wNode.nodeValue = wNode.nodeValue.replace('⚠️', '');
                 }
                 break;
             }
             container = container.parentElement;
          }
        }
      }
    } catch(e) {}

    try {
      if (!chrome.runtime.id) {
        clearInterval(pollInterval);
        return;
      }

      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) return;
        
        let name = result.userName || result.user || result.username || result.cliente || result.clientName || result.nome || result.name || result.owner || result.usuario || "Minha conta";
        // fallback search for any key with 'user' or 'name' that is a string
        if (name === "Minha conta") {
          for (let k in result) {
             if (typeof result[k] === 'string' && result[k].toLowerCase() === 'magda') name = result[k]; // hack if we can't find it
             if (typeof result[k] === 'string' && (k.toLowerCase().includes('user') || k.toLowerCase().includes('name') || k.toLowerCase().includes('cliente'))) {
               if (result[k] && result[k].length < 30) {
                 name = result[k];
                 break;
               }
             }
          }
        }
        document.getElementById('ueda-user-name').textContent = name;

        if (!result.enabled) {
          timeValue.textContent = 'Pausado';
          timeValue.style.color = '#ff8b8b';
          return;
        }
        
        if (!result.validade || result.validade === 'Sem validade') {
          timeValue.textContent = 'Ilimitado';
          timeValue.style.color = '#70f0c1';
          return;
        }

        let validadeTime = result.validade;
        if (typeof validadeTime === 'string') {
          const parsed = new Date(validadeTime).getTime();
          if (!isNaN(parsed)) {
            validadeTime = parsed;
          } else {
            // fallback if it's really a custom string like "29d 21h..."
            timeValue.textContent = validadeTime;
            timeValue.style.color = '#1DAFD8';
            return;
          }
        }

        const now = new Date().getTime();
        const timeLeft = Math.max(0, Math.floor((validadeTime - now) / 1000));
        
        if (timeLeft <= 0) {
          timeValue.textContent = 'Expirado';
          timeValue.style.color = '#ff8b8b';
        } else {
          const days = Math.floor(timeLeft / (3600 * 24));
          const hours = String(Math.floor((timeLeft % (3600 * 24)) / 3600)).padStart(2, '0');
          const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
          
          if (days > 0) {
             timeValue.textContent = `${days} dias restantes`;
          } else {
             const seconds = String(timeLeft % 60).padStart(2, '0');
             timeValue.textContent = `${hours}:${minutes}:${seconds}`;
          }
          timeValue.style.color = '#1DAFD8';
        }
      });
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        clearInterval(pollInterval);
      }
    }
  }, 1000);

})();
