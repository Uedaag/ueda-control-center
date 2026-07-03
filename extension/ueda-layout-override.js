(function uedaLayoutOverride() {
  const DOCK_ID = "ueda-floating-dock";
  const STORAGE_KEYS = ["licenseKey", "keyValid", "authStatus", "enabled", "uedaSound", "uedaWatermarkHidden", "uedaLicenseExpiry", "uedaRemoteVersion", "uedaLastUpdateCheck", "uedaRemoteConfig"];
  const logoUrl = chrome.runtime.getURL("ueda-logo.png");

  // === UPDATE ENDPOINT =========================================
  const CURRENT_VERSION = "5.0.0";
  const UPDATE_ENDPOINT = "https://project--668937c8-96ee-4d27-a33b-e2e15ce717a2.lovable.app/api/public/ueda-updates";
  const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 min

  function cmpVer(a, b) {
    const pa = String(a || "0").split(".").map((n) => parseInt(n, 10) || 0);
    const pb = String(b || "0").split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }

  async function checkForUpdate(force) {
    try {
      const url = UPDATE_ENDPOINT + (force ? `?t=${Date.now()}` : "");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      chrome.storage.local.set({
        uedaRemoteVersion: data.version || null,
        uedaLastUpdateCheck: Date.now(),
        uedaUpdateNotes: data.notes || "",
        uedaRemoteConfig: data.config || null,
      });
      return data;
    } catch (err) {
      console.warn("[UEDA] update check falhou:", err);
      return null;
    }
  }

  function hasPendingUpdate(config) {
    return config?.uedaRemoteVersion && cmpVer(config.uedaRemoteVersion, CURRENT_VERSION) > 0;
  }

  // === CONFIG ===================================================
  // Data de expiração fixa por chave. Adicione aqui suas chaves reais.
  // Formato: "CHAVE": "AAAA-MM-DD"
  const LICENSE_EXPIRY_MAP = {
    "UEDA-TESTE-2026": "2026-12-31",
    "UEDA-DEMO": "2027-01-15",
  };

  // Prompts injetados no chat da Lovable ao clicar em cada função.
  // Edite livremente. Se vazio, o botão apenas executa a ação local.
  const PROMPTS = {
    account: "Mostre o status da minha conta, plano ativo e uso atual.",
    notifications: "Liste as últimas notificações e atualizações do meu projeto.",
    download: "", // download é feito localmente via scraping
    watermark: "Remova o badge/marca da Lovable deste projeto.",
  };
  // =============================================================

  function hasActiveLicense(c) {
    return Boolean(c && (c.keyValid === true || Boolean(c.licenseKey) || c.authStatus === "success" || c.authStatus === "valid" || c.authStatus === "ueda_custom_active" || (typeof c.authStatus === "object" && c.authStatus?.valid === true)));
  }

  function computeExpiryLabel(config) {
    const key = (config.licenseKey || "").trim().toUpperCase();
    const iso = LICENSE_EXPIRY_MAP[key] || config.uedaLicenseExpiry;
    if (!iso) return "Licença ativa · sem expiração definida";
    const end = new Date(iso + (iso.length === 10 ? "T23:59:59" : ""));
    if (isNaN(end.getTime())) return "Licença ativa";
    const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
    if (days < 0) return `Licença expirada há ${Math.abs(days)} dias`;
    if (days === 0) return "Expira hoje";
    if (days === 1) return "Expira amanhã";
    return `Restam ${days} dias · até ${end.toLocaleDateString("pt-BR")}`;
  }

  function getHost(mode) {
    let host = document.getElementById(DOCK_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = DOCK_ID;
      host.attachShadow({ mode: "open" });
      (document.documentElement || document.body).appendChild(host);
    }
    Object.assign(host.style, { position: "fixed", zIndex: "2147483647", margin: "0", padding: "0", border: "0", background: "transparent", pointerEvents: "none", colorScheme: "dark", overflow: "visible" });
    Object.assign(host.style, mode === "dock" ? { right: "28px", bottom: "36px", top: "auto", left: "auto", width: "52px", height: "52px" } : { inset: "0px", width: "auto", height: "auto" });
    return host;
  }

  function renderActivationModal(config) {
    const root = getHost("modal").shadowRoot;
    root.innerHTML = `<style>:host{all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif!important;color:#e6e7ec!important}*{box-sizing:border-box!important;margin:0!important;padding:0!important}.layer{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;pointer-events:none!important}.modal{width:244px!important;min-height:216px!important;padding:10px!important;border-radius:14px!important;border:1px solid rgba(255,255,255,.08)!important;background:#0f1015!important;color:#e6e7ec!important;display:flex!important;flex-direction:column!important;gap:8px!important;overflow:hidden!important;pointer-events:auto!important;box-shadow:0 18px 44px -18px rgba(43,183,220,.7)!important}.top{position:relative!important;min-height:24px!important;display:flex!important;align-items:center!important;justify-content:center!important}.logo{width:24px!important;height:24px!important;border-radius:7px!important;display:grid!important;place-items:center!important;background:rgba(43,183,220,.08)!important;border:1px solid rgba(43,183,220,.18)!important}.logo img{width:16px!important;height:16px!important;object-fit:contain!important}.helper{text-align:center!important;color:#a2a6b4!important;font-size:10.5px!important;line-height:1.35!important}.input{width:100%!important;padding:8px 10px!important;border-radius:7px!important;border:1px solid rgba(255,255,255,.08)!important;background:#151721!important;color:#e6e7ec!important;font-size:11px!important;outline:0!important}.input:focus{border-color:rgba(43,183,220,.55)!important;background:#181a26!important}.activate{width:100%!important;border:0!important;border-radius:7px!important;padding:8px 10px!important;background:linear-gradient(180deg,#2bb7dc,#1a8fb0)!important;color:white!important;font-size:11.5px!important;font-weight:800!important;cursor:pointer!important;box-shadow:0 6px 20px -8px rgba(43,183,220,.55),inset 0 1px 0 rgba(255,255,255,.18)!important}.support{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;padding:7px!important;border-radius:7px!important;border:1px solid rgba(255,255,255,.08)!important;background:#151721!important;color:#e6e7ec!important;text-decoration:none!important;font-size:10.5px!important;font-weight:600!important}.support b{font-weight:800!important}.dot{color:#25d366!important}.msg{min-height:11px!important;text-align:center!important;color:#2bb7dc!important;font-size:10px!important}.foot{margin-top:auto!important;text-align:center!important;color:#4b5060!important;font-size:8.5px!important;letter-spacing:.35px!important}</style><div class="layer"><form class="modal" autocomplete="off"><div class="top"><span class="logo"><img src="${logoUrl}" alt=""></span></div><p class="helper">Insira sua chave para ativar a extensão.</p><input class="input" type="text" value="${escapeAttr(config.licenseKey || "")}" placeholder="Sua chave de licença…"><button class="activate" type="submit">Ativar Licença</button><a class="support" href="https://wa.me/5577999134858" target="_blank" rel="noopener noreferrer"><span class="dot">◌</span><span>Suporte:</span><b>77 99913-4858</b></a><p class="msg" aria-live="polite"></p><p class="foot">UEDA AGENCY · v1.5</p></form></div>`;
    const form = root.querySelector(".modal");
    const input = root.querySelector(".input");
    const msg = root.querySelector(".msg");
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const key = input.value.trim();
      if (!key) { msg.textContent = "Informe uma chave."; input.focus(); return; }
      chrome.storage.local.set({ licenseKey: key, keyValid: true, authStatus: "ueda_custom_active", enabled: true, activationSource: "ueda_custom_layout" });
    });
  }

  // Modal centralizado com layout UEDA (substitui window.confirm/alert)
  function uedaDialog({ title, body, confirmLabel = "OK", cancelLabel }) {
    return new Promise((resolve) => {
      const id = "ueda-dialog-host";
      document.getElementById(id)?.remove();
      const host = document.createElement("div");
      host.id = id;
      Object.assign(host.style, { position: "fixed", inset: "0", zIndex: "2147483647", pointerEvents: "auto" });
      host.attachShadow({ mode: "open" });
      host.shadowRoot.innerHTML = `
        <style>
          :host{all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif!important}
          *{box-sizing:border-box;margin:0;padding:0}
          .backdrop{position:absolute;inset:0;background:rgba(6,7,12,.62);backdrop-filter:blur(4px);animation:fadeIn .18s ease}
          .wrap{position:absolute;inset:0;display:grid;place-items:center;padding:16px}
          .card{width:288px;padding:16px;border-radius:16px;border:1px solid rgba(43,183,220,.28);background:#0f1015;color:#e6e7ec;box-shadow:0 24px 60px -18px rgba(43,183,220,.55),0 0 0 1px rgba(255,255,255,.04);animation:pop .2s ease}
          .head{display:flex;align-items:center;gap:9px;margin-bottom:8px}
          .lg{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:rgba(43,183,220,.1);border:1px solid rgba(43,183,220,.22)}
          .lg img{width:18px;height:18px}
          .title{font-size:13px;font-weight:800;color:#e6e7ec}
          .body{font-size:11.5px;line-height:1.5;color:#a2a6b4;margin-bottom:12px}
          .row{display:flex;gap:8px;justify-content:flex-end}
          button{border:0;border-radius:8px;padding:8px 14px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit}
          .cancel{background:#151721;color:#a2a6b4;border:1px solid rgba(255,255,255,.08)}
          .cancel:hover{background:#1a1d2a;color:#e6e7ec}
          .ok{background:linear-gradient(180deg,#2bb7dc,#1a8fb0);color:#fff;box-shadow:0 6px 18px -6px rgba(43,183,220,.55),inset 0 1px 0 rgba(255,255,255,.18)}
          .foot{margin-top:10px;text-align:center;font-size:9px;color:#4b5060;letter-spacing:.3px}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes pop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
        </style>
        <div class="backdrop"></div>
        <div class="wrap">
          <div class="card" role="dialog" aria-modal="true">
            <div class="head"><span class="lg"><img src="${logoUrl}" alt=""></span><div class="title">${escapeAttr(title)}</div></div>
            <div class="body">${escapeAttr(body)}</div>
            <div class="row">
              ${cancelLabel ? `<button class="cancel" type="button">${escapeAttr(cancelLabel)}</button>` : ""}
              <button class="ok" type="button">${escapeAttr(confirmLabel)}</button>
            </div>
            <div class="foot">UEDA AGENCY</div>
          </div>
        </div>`;
      (document.documentElement || document.body).appendChild(host);
      const close = (v) => { host.remove(); resolve(v); };
      host.shadowRoot.querySelector(".ok").addEventListener("click", () => close(true));
      host.shadowRoot.querySelector(".cancel")?.addEventListener("click", () => close(false));
      host.shadowRoot.querySelector(".backdrop").addEventListener("click", () => close(false));
    });
  }


  function renderDock(config) {
    const root = getHost("dock").shadowRoot;
    const enabled = config.enabled !== false;
    const sound = config.uedaSound !== false;
    const watermarkHidden = config.uedaWatermarkHidden === true;
    const expiryLabel = computeExpiryLabel(config);

    root.innerHTML = `<style>
:host{all:initial!important;position:fixed!important;right:28px!important;bottom:36px!important;width:52px!important;height:52px!important;z-index:2147483647!important;pointer-events:none!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif!important;color:#e6e7ec!important}
*{box-sizing:border-box!important;margin:0!important;padding:0!important}
.dock{position:absolute!important;right:0!important;bottom:0!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:9px!important;pointer-events:auto!important}
.menu{display:flex!important;flex-direction:column!important;width:44px!important;max-height:calc(min(70vh,520px) - 50px)!important;overflow:visible!important;padding:6px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:14px 0 0 14px!important;background:rgba(14,15,22,.92)!important;box-shadow:0 20px 40px -14px rgba(0,0,0,.58),0 0 0 1px rgba(43,183,220,.12)!important;backdrop-filter:blur(12px)!important;opacity:0!important;pointer-events:none!important;transform:translateX(8px) translateY(7px) scale(.98)!important;transition:width .22s ease,opacity .18s ease,transform .18s ease!important}
.dock:hover .menu,.dock:focus-within .menu{opacity:1!important;pointer-events:auto!important;transform:translateX(0) translateY(0) scale(1)!important}
.menu.expanded{width:200px!important}
.expand{width:100%!important;height:26px!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#8a8f9e!important;display:grid!important;place-items:center!important;cursor:pointer!important}
.expand:hover,.item:hover{background:#1a1d2a!important;color:#e6e7ec!important}
.expand svg{width:12px!important;height:12px!important;transition:transform .22s ease!important}
.menu.expanded .expand svg{transform:rotate(180deg)!important}
.item{position:relative!important;width:100%!important;min-height:30px!important;display:flex!important;align-items:center!important;gap:10px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#e6e7ec!important;text-decoration:none!important;padding:7px!important;font-size:11.5px!important;line-height:1!important;white-space:nowrap!important;cursor:pointer!important}
.item svg{width:15px!important;height:15px!important;flex:0 0 auto!important;color:#8a8f9e!important}
.item.is-on svg{color:#22c55e!important}.item.is-off svg{color:#ef4444!important}
.label{opacity:0!important;max-width:0!important;overflow:hidden!important;transition:opacity .16s ease,max-width .22s ease!important}
.menu.expanded .label{opacity:1!important;max-width:150px!important}
.item[data-tooltip]:hover::after{content:attr(data-tooltip)!important;position:absolute!important;right:calc(100% + 10px)!important;top:50%!important;transform:translateY(-50%)!important;background:#0b0c11!important;color:#e6e7ec!important;border:1px solid rgba(43,183,220,.32)!important;padding:6px 9px!important;border-radius:8px!important;font-size:10.5px!important;white-space:nowrap!important;box-shadow:0 8px 20px -8px rgba(0,0,0,.7)!important;z-index:10!important}
.orb{position:relative!important;width:40px!important;height:40px!important;display:grid!important;place-items:center!important;background:transparent!important;border:0!important;padding:0!important;cursor:pointer!important}
.orb img{width:30px!important;height:30px!important;object-fit:contain!important;position:relative!important;z-index:2!important;filter:drop-shadow(0 2px 8px rgba(43,183,220,.4))!important}
.arc{position:absolute!important;left:50%!important;top:50%!important;width:40px!important;height:40px!important;margin:-20px 0 0 -20px!important;border-radius:999px!important;border:1.5px solid #2bb7dc!important;opacity:0!important;pointer-events:none!important;animation:uedaPulse 2.4s ease-out infinite!important;will-change:transform,opacity!important}
.arc:nth-child(2){animation-delay:.8s!important}.arc:nth-child(3){animation-delay:1.6s!important}
.orb::after{content:""!important;position:absolute!important;inset:-4px!important;border-radius:999px!important;background:radial-gradient(circle,rgba(43,183,220,.35),transparent 70%)!important;filter:blur(6px)!important;z-index:1!important;pointer-events:none!important;animation:uedaGlow 2.4s ease-in-out infinite!important}
.toast{position:absolute!important;right:54px!important;bottom:3px!important;max-width:220px!important;padding:7px 10px!important;border-radius:9px!important;background:rgba(14,15,22,.95)!important;border:1px solid rgba(43,183,220,.22)!important;color:#e6e7ec!important;font-size:11px!important;opacity:0!important;transform:translateY(6px)!important;transition:.18s!important;pointer-events:none!important}
.toast.show{opacity:1!important;transform:translateY(0)!important}
.badge{position:absolute!important;top:3px!important;right:3px!important;width:8px!important;height:8px!important;border-radius:999px!important;background:#22c55e!important;box-shadow:0 0 0 2px #0e0f16,0 0 8px rgba(34,197,94,.75)!important;display:none!important}
.item.has-update .badge{display:block!important}
@keyframes uedaPulse{0%{transform:scale(.6);opacity:.9}70%{opacity:.15}100%{transform:scale(2.4);opacity:0}}
@keyframes uedaGlow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes uedaSpin{to{transform:rotate(360deg)}}
.item.spinning svg{animation:uedaSpin .8s linear infinite!important}
</style>
<div class="dock" tabindex="0">
  <div class="menu" role="menu" aria-label="UEDA">
    <button class="expand" type="button" aria-label="Expandir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>
    ${renderMenuItems(config)}
  </div>
  <button class="orb" type="button" aria-label="UEDA"><span class="arc"></span><span class="arc"></span><span class="arc"></span><img src="${logoUrl}" alt=""></button>
  <div class="toast" role="status" aria-live="polite"></div>
</div>`;

    const menu = root.querySelector(".menu");
    const toast = root.querySelector(".toast");
    root.querySelector(".expand")?.addEventListener("click", (ev) => { ev.stopPropagation(); menu?.classList.toggle("expanded"); });
    root.querySelectorAll(".item").forEach((el) => {
      const action = el.dataset.action;
      const prompt = el.dataset.prompt;
      if (!action && !prompt) return; // <a href> passa direto
      el.addEventListener("click", (ev) => {
        if (prompt && !action) ev.preventDefault();
        runAction(action || "prompt", config, toast, { prompt, id: el.dataset.itemId });
      });
    });
  }

  const DEFAULT_MENU = [
    { id: "help", icon: "help", label: "Suporte", tooltip: "WhatsApp 77 99913-4858", href: "https://wa.me/5577999134858" },
    { id: "refresh", icon: "refresh", label: "Atualizar", tooltip: "Buscar atualizações", action: "refresh" },
    { id: "logoff", icon: "power", label: "Logoff", tooltip: "Sair e reinserir a chave", action: "logoff", state: "on" },
  ];

  function renderMenuItems(config) {
    const items = config?.uedaRemoteConfig?.menuItems || DEFAULT_MENU;
    return items.map((it) => {
      const cls = ["item"];
      if (it.state === "on") cls.push("is-on");
      if (it.state === "off") cls.push("is-off");
      if (it.id === "refresh" && hasPendingUpdate(config)) cls.push("has-update");
      const tt = it.tooltip ? ` data-tooltip="${escapeAttr(it.tooltip)}"` : "";
      const dataAction = it.action ? ` data-action="${escapeAttr(it.action)}"` : "";
      const dataPrompt = it.prompt ? ` data-prompt="${escapeAttr(it.prompt)}"` : "";
      const dataId = ` data-item-id="${escapeAttr(it.id || "")}"`;
      const badge = it.id === "refresh" ? '<span class="badge"></span>' : "";
      if (it.href) {
        return `<a class="${cls.join(" ")}" href="${escapeAttr(it.href)}" target="_blank" rel="noopener noreferrer"${tt}${dataId}>${icon(it.icon)}<span class="label">${escapeAttr(it.label)}</span></a>`;
      }
      return `<button class="${cls.join(" ")}" type="button"${dataAction}${dataPrompt}${tt}${dataId}>${icon(it.icon)}<span class="label">${escapeAttr(it.label)}</span>${badge}</button>`;
    }).join("");
  }

  function runAction(action, config, toast, meta = {}) {
    const show = (t) => { toast.textContent = t; toast.classList.add("show"); clearTimeout(show.t); show.t = setTimeout(() => toast.classList.remove("show"), 2200); };


    if (action === "logoff") {
      uedaDialog({
        title: "Encerrar sessão",
        body: "Deseja realmente sair? Você precisará inserir a chave novamente para reativar a extensão.",
        confirmLabel: "Sair",
        cancelLabel: "Cancelar",
      }).then((ok) => {
        if (!ok) return;
        chrome.storage.local.remove(["licenseKey", "keyValid", "authStatus", "enabled", "activationSource", "uedaLicenseExpiry"], () => {
          show("Sessão encerrada.");
        });
      });
      return;
    }

    if (action === "refresh") {
      const btn = document.getElementById(DOCK_ID)?.shadowRoot?.querySelector('[data-action="refresh"]');
      btn?.classList.add("spinning");
      show("Buscando atualização…");
      checkForUpdate(true).then((data) => {
        btn?.classList.remove("spinning");
        if (!data) { show("Falha ao consultar atualizações."); return; }
        // Config nova já salva pelo checkForUpdate → onChanged dispara re-render.
        if (cmpVer(data.version, CURRENT_VERSION) > 0) {
          show(`Layout v${data.version} aplicado.`);
        } else if (data.config) {
          show("Layout sincronizado.");
        } else {
          show(`Sem novidades (v${CURRENT_VERSION}).`);
        }
      });
      return;
    }

    // Ação especial: baixar projeto via scraping
    if (action === "download") {
      show("Coletando arquivos do projeto…");
      downloadProjectZip().then((n) => show(`Zip gerado com ${n} arquivo(s).`)).catch((err) => {
        console.warn("[UEDA] download falhou:", err);
        const p = "Gere um arquivo .zip com todos os arquivos do projeto para download.";
        if (injectChatPrompt(p)) show("Não consegui coletar direto — pedido enviado no chat.");
        else show("Não foi possível baixar. Abra o editor da Lovable.");
      });
      return;
    }

    // Prompt vindo do item remoto (data-prompt) ou dos PROMPTS legacy
    const promptText = meta.prompt || PROMPTS[action];
    if (promptText) {
      if (injectChatPrompt(promptText)) show("Prompt enviado ao chat.");
      else show("Abra o chat da Lovable para enviar.");
    }
  }


  // === Injeção no chat da Lovable ===============================
  function injectChatPrompt(text) {
    const textarea = document.querySelector('textarea[placeholder*="Ask"],textarea[placeholder*="Pergunte"],textarea[placeholder*="Message"],textarea[data-testid*="chat"],form textarea');
    if (!textarea) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    setTimeout(() => {
      const form = textarea.closest("form");
      const btn = form?.querySelector('button[type="submit"]') || document.querySelector('button[aria-label*="Send"],button[aria-label*="Enviar"]');
      if (btn && !btn.disabled) btn.click();
      else textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    }, 60);
    return true;
  }

  // === Baixar projeto (scraping best-effort) ====================
  async function ensureJSZip() {
    if (window.JSZip) return window.JSZip;
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("jszip.min.js");
      s.onload = () => resolve(window.JSZip);
      s.onerror = reject;
      (document.head || document.documentElement).appendChild(s);
    });
  }

  async function downloadProjectZip() {
    const JSZip = await ensureJSZip();
    const zip = new JSZip();
    const files = collectVisibleFiles();
    if (!files.length) throw new Error("Nenhum arquivo visível no editor.");
    files.forEach((f) => zip.file(f.path, f.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lovable-projeto-${Date.now()}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return files.length;
  }

  function collectVisibleFiles() {
    // Best-effort: pega blocos de código com atributo de nome de arquivo
    const out = [];
    document.querySelectorAll("[data-filename],[data-file-path]").forEach((el) => {
      const path = el.getAttribute("data-filename") || el.getAttribute("data-file-path");
      const content = el.innerText || "";
      if (path && content) out.push({ path, content });
    });
    // Fallback: monaco editors visíveis
    document.querySelectorAll(".monaco-editor").forEach((el, i) => {
      const lines = el.querySelectorAll(".view-line");
      if (!lines.length) return;
      const content = [...lines].map((l) => l.textContent).join("\n");
      out.push({ path: `editor-${i + 1}.txt`, content });
    });
    return out;
  }

  function injectWatermarkRemoval() {
    const id = "ueda-hide-lovable-badge-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = '#lovable-badge,#lovable-badge-v2,[id^="lovable-badge"],a[href*="lovable.dev"][target="_blank"]{display:none!important}';
    document.documentElement.appendChild(style);
  }

  function injectChatBorder() {
    const id = "ueda-chat-border-style";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        [data-ueda-chat-glow] {
          border: 1.5px solid #2bb7dc !important;
          border-radius: 16px !important;
          box-shadow: 0 0 0 3px rgba(43,183,220,.14), 0 0 28px -6px rgba(43,183,220,.55) !important;
          transition: box-shadow .2s ease, border-color .2s ease !important;
        }
        [data-ueda-chat-glow]:focus-within {
          box-shadow: 0 0 0 3px rgba(43,183,220,.26), 0 0 34px -6px rgba(43,183,220,.75) !important;
        }
      `;
      document.documentElement.appendChild(style);
    }
    // Marca dinamicamente o container do composer (independe de placeholder).
    const mark = () => {
      const ta = document.querySelector(
        'textarea[placeholder*="Ask" i],textarea[placeholder*="Pergunte" i],textarea[placeholder*="Message" i],textarea[placeholder*="mensagem" i],textarea[placeholder*="fila" i],form textarea'
      );
      if (!ta) return;
      const target = ta.closest("form") || ta.parentElement?.parentElement || ta.parentElement;
      if (target && !target.hasAttribute("data-ueda-chat-glow")) {
        target.setAttribute("data-ueda-chat-glow", "1");
      }
    };
    mark();
    if (!window.__uedaChatObserver) {
      window.__uedaChatObserver = new MutationObserver(() => mark());
      window.__uedaChatObserver.observe(document.body, { childList: true, subtree: true });
    }
  }


  function render(config) {
    if (hasActiveLicense(config)) { if (config.uedaWatermarkHidden) injectWatermarkRemoval(); injectChatBorder(); renderDock(config); }
    else renderActivationModal(config || {});
  }


  function button(action, iconName, label, active, tooltip) {
    const stateClass = typeof active === "boolean" ? (active ? " is-on" : " is-off") : "";
    const tt = tooltip ? ` data-tooltip="${escapeAttr(tooltip)}"` : "";
    return `<button class="item${stateClass}" type="button" data-action="${action}"${tt}>${icon(iconName)}<span class="label">${label}</span></button>`;
  }

  function escapeAttr(v) { return String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

  function icon(name) {
    const icons = {
      user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
      volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15 9.34a4 4 0 0 1 0 5.32"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
      eraser: '<path d="M20 20H9L4 15a2 2 0 0 1 0-2.83l9.17-9.17a2 2 0 0 1 2.83 0l4 4a2 2 0 0 1 0 2.83L11 18"/>',
      help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
      refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>',
      grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
      wand: '<path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>',
      file: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    };



    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.info}</svg>`;
  }

  // === Sanitizador: remove UI antiga injetada por content.js/inject.js ===
  function sanitizeLegacyUI() {
    // Remove atributos que dirigem os overlays antigos
    const de = document.documentElement;
    ["data-validade", "data-show-validity", "data-key-valid", "data-enabled", "data-mode"].forEach((a) => de.hasAttribute(a) && de.removeAttribute(a));
    // Varre elementos suspeitos por texto
    const bad = /^(validade|sem validade|acesso negado|key expirada)/i;
    document.querySelectorAll("body *:not(#" + DOCK_ID + " *):not(script):not(style)").forEach((el) => {
      if (el.id === DOCK_ID || el.closest("#" + DOCK_ID)) return;
      const txt = (el.textContent || "").trim();
      if (!txt || txt.length > 60) return;
      if (bad.test(txt)) { el.style.setProperty("display", "none", "important"); }
    });
  }
  const legacyStyle = document.createElement("style");
  legacyStyle.textContent = `
    html[data-validade] > *:not(#${DOCK_ID}):not(script):not(style) [class*="validade" i],
    [class*="validity" i], [id*="validity" i],
    [class*="access-denied" i], [id*="access-denied" i],
    [data-ueda-legacy], [data-lovable-fix-toast]{display:none!important}
  `;
  (document.head || document.documentElement).appendChild(legacyStyle);
  const legacyObserver = new MutationObserver(() => sanitizeLegacyUI());
  legacyObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  sanitizeLegacyUI();

  chrome.storage.local.get(STORAGE_KEYS, render);
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && STORAGE_KEYS.some((k) => k in changes)) chrome.storage.local.get(STORAGE_KEYS, render); });

  // Check for updates on load + a cada 30min
  checkForUpdate(false);
  setInterval(() => checkForUpdate(false), UPDATE_INTERVAL_MS);

})();

