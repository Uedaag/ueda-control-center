// UEDA EX 5.0 — floating widget on all pages. Minimalist black theme.
(async function () {
  if (document.getElementById("ueda-root")) return;

  const stored = await chrome.storage.local.get(["ueda_config", "ueda_session", "ueda_skills"]);
  let config = stored.ueda_config || {};
  let session = stored.ueda_session || null; // { key, label, expires_at, credits, activated_at }
  let skills = stored.ueda_skills || [];
  let msg = null;
  // States: collapsed | login | labels | account
  let state = "collapsed";

  const root = document.createElement("div");
  root.id = "ueda-root";
  document.documentElement.appendChild(root);

  const accent = () => config.brand_color || "#4fa1c9";
  const logoUrl = () => chrome.runtime.getURL("logo.png");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (t, k = "ok") => { msg = { kind: k, text: t }; render(); setTimeout(() => { msg = null; render(); }, 2200); };

  function fmtRemaining(iso) {
    if (!iso) return { text: "Ilimitado", d: 0, h: 0, m: 0, pct: 100 };
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return { text: "Expirada", d: 0, h: 0, m: 0, pct: 0 };
    const d = Math.floor(ms / 86400_000);
    const h = Math.floor((ms % 86400_000) / 3600_000);
    const m = Math.floor((ms % 3600_000) / 60_000);
    const total = session?.activated_at ? new Date(iso).getTime() - new Date(session.activated_at).getTime() : ms;
    const pct = Math.max(0, Math.min(100, (ms / Math.max(total, 1)) * 100));
    return { text: `${d}d ${h}h ${m}m`, d, h, m, pct };
  }

  function headerEl(title, onClose) {
    const h = document.createElement("div");
    h.className = "ueda-header";
    h.innerHTML = `<img src="${logoUrl()}"/><div class="title">${esc(title)}</div>`;
    const b = document.createElement("button"); b.textContent = "✕"; b.onclick = onClose; h.appendChild(b);
    return h;
  }
  const footerEl = () => { const f = document.createElement("div"); f.className = "ueda-footer"; f.textContent = config.footer_signature || ""; return f; };
  const msgEl = (m) => { const el = document.createElement("div"); el.className = "ueda-msg " + (m.kind === "err" ? "err" : "ok"); el.textContent = m.text; return el; };

  function loginPanel() {
    const p = document.createElement("div"); p.className = "ueda-panel login";
    p.appendChild(headerEl("Entrar", () => { state = "collapsed"; render(); }));
    const body = document.createElement("div"); body.className = "ueda-body";
    if (msg) body.appendChild(msgEl(msg));
    const w = document.createElement("div"); w.className = "ueda-welcome";
    w.textContent = config.welcome_message || "Ative sua chave para continuar."; body.appendChild(w);
    const input = document.createElement("input"); input.className = "ueda-input"; input.placeholder = "Chave de licença"; input.value = session?.key || "";
    body.appendChild(input);
    const btn = document.createElement("button"); btn.className = "ueda-btn"; btn.textContent = "Ativar licença";
    btn.onclick = async () => {
      const key = input.value.trim();
      if (!key) return toast("Informe a chave", "err");
      btn.disabled = true; btn.textContent = "Validando...";
      const resp = await chrome.runtime.sendMessage({ type: "UEDA_VALIDATE_LICENSE", key });
      btn.disabled = false; btn.textContent = "Ativar licença";
      if (resp?.ok && resp.data?.ok) {
        session = {
          key,
          label: resp.data.label || "",
          expires_at: resp.data.expires_at || null,
          credits: resp.data.credits ?? 0,
          activated_at: new Date().toISOString(),
        };
        await chrome.storage.local.set({ ueda_session: session });
        toast("Licença ativada!"); state = "labels"; render();
      } else {
        toast(resp?.data?.error_code || resp?.error || "Chave inválida", "err");
      }
    };
    body.appendChild(btn);
    p.appendChild(body); p.appendChild(footerEl());
    return p;
  }

  function accountPanel() {
    const p = document.createElement("div"); p.className = "ueda-panel account";
    p.appendChild(headerEl("Minha conta", () => { state = "labels"; render(); }));
    const body = document.createElement("div"); body.className = "ueda-body";
    if (msg) body.appendChild(msgEl(msg));

    const name = document.createElement("div"); name.className = "ueda-welcome";
    name.textContent = session?.label || "Cliente"; body.appendChild(name);

    const t = fmtRemaining(session?.expires_at);
    const card = document.createElement("div"); card.className = "ueda-account-card";
    card.innerHTML = `
      <div class="ueda-account-label">⏱ Tempo restante</div>
      <div class="ueda-account-value">${esc(t.text)}</div>
      <div class="ueda-progress"><div style="width:${t.pct}%"></div></div>
      <div class="ueda-account-sub">${session?.expires_at ? "Expira em " + new Date(session.expires_at).toLocaleString("pt-BR") : ""}</div>
    `;
    body.appendChild(card);

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;";
    grid.innerHTML = `
      <div class="ueda-account-card"><div class="ueda-account-label">Créditos</div><div class="ueda-account-value">${session?.credits ?? 0}</div></div>
      <div class="ueda-account-card"><div class="ueda-account-label">Status</div><div class="ueda-account-value" style="font-size:14px">Ativa</div></div>
    `;
    body.appendChild(grid);

    const out = document.createElement("button"); out.className = "ueda-btn secondary"; out.style.marginTop = "10px"; out.textContent = "Sair da conta";
    out.onclick = async () => { session = null; await chrome.storage.local.set({ ueda_session: null }); state = "login"; render(); };
    body.appendChild(out);

    p.appendChild(body); p.appendChild(footerEl());
    return p;
  }

  function labelsPanel() {
    const p = document.createElement("div"); p.className = "ueda-panel labels";
    p.appendChild(headerEl(config.brand_name || "UEDA EX", () => { state = "collapsed"; render(); }));
    const body = document.createElement("div"); body.className = "ueda-body";
    if (msg) body.appendChild(msgEl(msg));

    const acc = document.createElement("div"); acc.className = "ueda-menu-item";
    acc.innerHTML = `<span class="ico">👤</span><span>Minha conta</span>`;
    acc.onclick = () => { state = "account"; render(); };
    body.appendChild(acc);

    (skills || []).forEach((s) => {
      const el = document.createElement("div"); el.className = "ueda-menu-item";
      el.innerHTML = `<span class="ico">▸</span><span>${esc(s.name)}</span>`;
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

    const upd = document.createElement("div"); upd.className = "ueda-menu-item";
    upd.innerHTML = `<span class="ico">↻</span><span>Atualizar extensão</span>`;
    upd.onclick = doUpdate; body.appendChild(upd);

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
    else if (state === "account") root.appendChild(accountPanel());
    else if (state === "labels") root.appendChild(labelsPanel());

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
