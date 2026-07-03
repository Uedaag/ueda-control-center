// UEDA EX 5.0 — floating widget injected on all pages.
(async function () {
  if (document.getElementById("ueda-root")) return;

  const stored = await chrome.storage.local.get(["ueda_config", "ueda_session"]);
  let config = stored.ueda_config || {};
  let session = stored.ueda_session || null;

  const root = document.createElement("div");
  root.id = "ueda-root";
  document.documentElement.appendChild(root);

  let state = "collapsed"; // collapsed | icons | labels | login | chat
  let msg = null; // { kind, text }

  function accent() { return config.brand_color || "#4fa1c9"; }
  function logoUrl() { return chrome.runtime.getURL("logo.png"); }

  function render() {
    root.style.setProperty("--ueda-accent", accent());
    root.innerHTML = "";

    // panel first (left of fab)
    if (state !== "collapsed") {
      const panel = document.createElement("div");
      panel.className = "ueda-panel " + state;

      if (state === "icons" || state === "labels") {
        const header = document.createElement("div");
        header.className = "ueda-header";
        header.innerHTML = `<img src="${logoUrl()}"/><div class="title">${escapeHtml(config.brand_name || "UEDA EX 5.0")}</div>`;
        const toggle = document.createElement("button");
        toggle.textContent = state === "icons" ? "›" : "‹";
        toggle.title = state === "icons" ? "Expandir" : "Recolher";
        toggle.onclick = () => { state = state === "icons" ? "labels" : "icons"; render(); };
        header.appendChild(toggle);
        panel.appendChild(header);

        const body = document.createElement("div");
        body.className = "ueda-body";
        const items = [
          { ico: "👤", label: "Minha conta", action: openLogin },
          { ico: "🔄", label: "Atualizar", action: checkUpdate },
          { ico: "💬", label: "Abrir chat", action: openChat },
          { ico: "🔊", label: "Som", action: () => toast("Som alternado") },
          { ico: "⚙️", label: "Configurações", action: () => toast("Em breve") },
          { ico: "✕", label: "Fechar", action: () => { state = "collapsed"; render(); } },
        ];
        items.forEach((it) => {
          const el = document.createElement("div");
          el.className = "ueda-menu-item";
          el.innerHTML = `<span class="ico">${it.ico}</span>${state === "labels" ? `<span>${it.label}</span>` : ""}`;
          el.title = it.label;
          el.onclick = it.action;
          body.appendChild(el);
        });
        panel.appendChild(body);
      }

      if (state === "login") {
        panel.appendChild(headerEl("Entrar", () => { state = "labels"; render(); }));
        const body = document.createElement("div");
        body.className = "ueda-body";
        if (msg) body.appendChild(msgEl(msg));
        const input = document.createElement("input");
        input.className = "ueda-input"; input.placeholder = "Chave de licença";
        input.value = session?.key || "";
        body.appendChild(input);
        const btn = document.createElement("button");
        btn.className = "ueda-btn"; btn.textContent = "Ativar licença";
        btn.onclick = async () => {
          btn.disabled = true; btn.textContent = "Validando...";
          const resp = await chrome.runtime.sendMessage({ type: "UEDA_VALIDATE_LICENSE", key: input.value.trim() });
          btn.disabled = false; btn.textContent = "Ativar licença";
          if (resp?.ok) {
            session = { key: input.value.trim(), ...resp.data };
            await chrome.storage.local.set({ ueda_session: session });
            msg = { kind: "ok", text: "Licença ativada!" };
            state = "chat"; render();
          } else {
            msg = { kind: "err", text: resp?.error || resp?.data?.error_code || "Falha na validação" };
            render();
          }
        };
        body.appendChild(btn);
        panel.appendChild(body);
        panel.appendChild(footerEl());
      }

      if (state === "chat") {
        panel.appendChild(headerEl("Chat", () => { state = "labels"; render(); }));
        const body = document.createElement("div");
        body.className = "ueda-body";
        if (msg) body.appendChild(msgEl(msg));
        const w = document.createElement("div");
        w.className = "ueda-welcome";
        w.textContent = config.welcome_message || "Bem-vindo!";
        body.appendChild(w);
        const upd = document.createElement("button");
        upd.className = "ueda-btn secondary"; upd.textContent = "Buscar atualizações";
        upd.onclick = checkUpdate;
        body.appendChild(upd);
        panel.appendChild(body);
        panel.appendChild(footerEl());
      }

      root.appendChild(panel);
    }

    // fab always
    const fab = document.createElement("button");
    fab.className = "ueda-fab";
    fab.title = config.brand_name || "UEDA EX 5.0";
    fab.innerHTML = `<img src="${logoUrl()}" alt="logo"/>`;
    fab.onclick = () => {
      state = state === "collapsed" ? (session ? "labels" : "labels") : "collapsed";
      render();
    };
    root.appendChild(fab);
  }

  function headerEl(title, onBack) {
    const h = document.createElement("div");
    h.className = "ueda-header";
    h.innerHTML = `<img src="${logoUrl()}"/><div class="title">${escapeHtml(title)}</div>`;
    const b = document.createElement("button"); b.textContent = "✕"; b.onclick = onBack;
    h.appendChild(b); return h;
  }
  function footerEl() {
    const f = document.createElement("div"); f.className = "ueda-footer";
    f.textContent = config.footer_signature || ""; return f;
  }
  function msgEl(m) {
    const el = document.createElement("div");
    el.className = "ueda-msg " + (m.kind === "err" ? "err" : "ok");
    el.textContent = m.text; return el;
  }
  function toast(t) { msg = { kind: "ok", text: t }; render(); setTimeout(() => { msg = null; render(); }, 1800); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function openLogin() { state = "login"; msg = null; render(); }
  function openChat() { state = session ? "chat" : "login"; render(); }

  async function checkUpdate() {
    msg = { kind: "ok", text: "Buscando atualizações..." }; render();
    const resp = await chrome.runtime.sendMessage({ type: "UEDA_CHECK_UPDATE" });
    if (resp?.ok) {
      config = resp.config;
      msg = { kind: "ok", text: "Atualizado com sucesso!" };
    } else {
      msg = { kind: "err", text: resp?.error || "Falha ao atualizar" };
    }
    render();
    setTimeout(() => { msg = null; render(); }, 2500);
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.ueda_config) { config = changes.ueda_config.newValue || {}; render(); }
    if (changes.ueda_session) { session = changes.ueda_session.newValue || null; render(); }
  });

  render();
})();
