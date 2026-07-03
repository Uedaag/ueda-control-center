// UEDA EX 5.0 — floating widget on all pages.
(async function () {
  if (document.getElementById("ueda-root")) return;

  const stored = await chrome.storage.local.get(["ueda_config", "ueda_session", "ueda_skills"]);
  let config = stored.ueda_config || {};
  let session = stored.ueda_session || null;
  let skills = stored.ueda_skills || [];
  let msg = null;
  // States: collapsed | login | labels | chat
  let state = "collapsed";

  const root = document.createElement("div");
  root.id = "ueda-root";
  document.documentElement.appendChild(root);

  const accent = () => config.brand_color || "#4fa1c9";
  const logoUrl = () => chrome.runtime.getURL("logo.png");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(text, kind = "ok") { msg = { kind, text }; render(); setTimeout(() => { msg = null; render(); }, 2200); }

  function headerEl(title, onClose) {
    const h = document.createElement("div");
    h.className = "ueda-header";
    h.innerHTML = `<img src="${logoUrl()}"/><div class="title">${esc(title)}</div>`;
    const b = document.createElement("button"); b.textContent = "✕"; b.onclick = onClose; h.appendChild(b);
    return h;
  }
  function footerEl() {
    const f = document.createElement("div"); f.className = "ueda-footer";
    f.textContent = config.footer_signature || ""; return f;
  }
  function msgEl(m) { const el = document.createElement("div"); el.className = "ueda-msg " + (m.kind === "err" ? "err" : "ok"); el.textContent = m.text; return el; }

  function loginPanel() {
    const p = document.createElement("div"); p.className = "ueda-panel login";
    p.appendChild(headerEl(config.brand_name || "UEDA EX", () => { state = "collapsed"; render(); }));
    const body = document.createElement("div"); body.className = "ueda-body";
    if (msg) body.appendChild(msgEl(msg));
    const w = document.createElement("div"); w.className = "ueda-welcome";
    w.textContent = config.welcome_message || "Ative sua chave para continuar."; body.appendChild(w);
    const input = document.createElement("input"); input.className = "ueda-input"; input.placeholder = "Chave de licença"; input.value = session?.key || "";
    body.appendChild(input);
    const btn = document.createElement("button"); btn.className = "ueda-btn"; btn.textContent = "Ativar licença";
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = "Validando...";
      const resp = await chrome.runtime.sendMessage({ type: "UEDA_VALIDATE_LICENSE", key: input.value.trim() });
      btn.disabled = false; btn.textContent = "Ativar licença";
      if (resp?.ok) {
        session = { key: input.value.trim() };
        await chrome.storage.local.set({ ueda_session: session });
        toast("Licença ativada!"); state = "labels"; render();
      } else {
        toast(resp?.error || resp?.data?.error_display || "Falha na validação", "err");
      }
    };
    body.appendChild(btn);
    p.appendChild(body); p.appendChild(footerEl());
    return p;
  }

  function skillsPanel() {
    const p = document.createElement("div"); p.className = "ueda-panel labels";
    p.appendChild(headerEl(config.brand_name || "UEDA EX", () => { state = "collapsed"; render(); }));
    const body = document.createElement("div"); body.className = "ueda-body";
    if (msg) body.appendChild(msgEl(msg));

    const built = [
      { key: "__update", label: "Atualizar extensão", ico: "🔄", action: doUpdate },
      { key: "__logout", label: "Sair da conta", ico: "🚪", action: async () => { session = null; await chrome.storage.local.set({ ueda_session: null }); state = "login"; render(); } },
    ];

    (skills || []).forEach((s) => {
      const el = document.createElement("div"); el.className = "ueda-menu-item";
      el.innerHTML = `<span class="ico">▶</span><span>${esc(s.name)}</span>`;
      el.title = s.description || s.name;
      el.onclick = async () => {
        toast(`Executando ${s.name}...`);
        const resp = await chrome.runtime.sendMessage({ type: "UEDA_RUN_SKILL", skillId: s.id });
        toast(resp?.ok ? `✓ ${s.name}` : (resp?.error || "Falha"), resp?.ok ? "ok" : "err");
      };
      body.appendChild(el);
    });
    if (!skills.length) {
      const e = document.createElement("div"); e.className = "ueda-welcome";
      e.textContent = "Nenhuma skill ativa. Clique em Atualizar."; body.appendChild(e);
    }

    built.forEach((it) => {
      const el = document.createElement("div"); el.className = "ueda-menu-item";
      el.innerHTML = `<span class="ico">${it.ico}</span><span>${it.label}</span>`;
      el.onclick = it.action; body.appendChild(el);
    });

    p.appendChild(body); p.appendChild(footerEl());
    return p;
  }

  async function doUpdate() {
    toast("Buscando atualizações...");
    const resp = await chrome.runtime.sendMessage({ type: "UEDA_CHECK_UPDATE" });
    if (resp?.ok) { config = resp.config; skills = resp.skills || []; toast("Atualizado!"); }
    else toast(resp?.error || "Falha", "err");
  }

  function render() {
    root.style.setProperty("--ueda-accent", accent());
    root.innerHTML = "";
    if (state === "login") root.appendChild(loginPanel());
    else if (state === "labels") root.appendChild(skillsPanel());

    const fab = document.createElement("button"); fab.className = "ueda-fab";
    fab.title = config.brand_name || "UEDA EX 5.0";
    fab.innerHTML = `<img src="${logoUrl()}" alt="logo"/>`;
    fab.onclick = () => { state = state === "collapsed" ? (session ? "labels" : "login") : "collapsed"; render(); };
    root.appendChild(fab);
  }

  chrome.storage.onChanged.addListener((c) => {
    if (c.ueda_config) config = c.ueda_config.newValue || {};
    if (c.ueda_session) session = c.ueda_session.newValue || null;
    if (c.ueda_skills) skills = c.ueda_skills.newValue || [];
    render();
  });

  render();
})();
