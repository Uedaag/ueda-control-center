// UEDA EX 5.0 background service worker.
// - Loads bundled config.json on install.
// - Handles license validation, update checks (settings + skills), and skill execution.

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const res = await fetch(chrome.runtime.getURL("config.json"));
    const rawConfig = await res.json();
    const { initial_skills, ...config } = rawConfig || {};
    const existing = await chrome.storage.local.get(["ueda_config", "ueda_skills"]);
    if (!existing.ueda_config) await chrome.storage.local.set({ ueda_config: config });
    if (!existing.ueda_skills && Array.isArray(initial_skills)) {
      await chrome.storage.local.set({ ueda_skills: initial_skills });
    }
  } catch (e) {
    console.warn("[UEDA] Falha ao carregar config inicial", e);
  }
});

async function checkUpdate() {
  const { ueda_config } = await chrome.storage.local.get("ueda_config");
  if (!ueda_config?.updates_url) throw new Error("URL de atualização não configurada");
  const res = await fetch(ueda_config.updates_url, {
    headers: { "x-ext-version": chrome.runtime.getManifest().version },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const remote = await res.json();
  const merged = { ...ueda_config, ...(remote.settings || {}) };
  await chrome.storage.local.set({
    ueda_config: merged,
    ueda_skills: Array.isArray(remote.skills) ? remote.skills : [],
    ueda_last_update: Date.now(),
  });
  return { config: merged, skills: remote.skills || [] };
}

async function validateLicense(key, fingerprint) {
  const { ueda_config } = await chrome.storage.local.get("ueda_config");
  const endpoint = ueda_config?.validate_endpoint;
  if (!endpoint) throw new Error("Endpoint de validação não configurado");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license_key: key, fingerprint: fingerprint || "" }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok !== false, data };
}

async function runSkill(skillId, tabId) {
  const { ueda_skills } = await chrome.storage.local.get("ueda_skills");
  const skill = (ueda_skills || []).find((s) => s.id === skillId);
  if (!skill) throw new Error("Skill não encontrada");
  const code = String(skill.payload || "").trim();
  if (!code) throw new Error("Skill sem payload");
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: (src) => {
      const s = document.createElement("script");
      s.textContent = src;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    },
    args: [code],
  });
  return { name: skill.name };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "UEDA_CHECK_UPDATE") sendResponse({ ok: true, ...(await checkUpdate()) });
      else if (msg?.type === "UEDA_VALIDATE_LICENSE") sendResponse(await validateLicense(msg.key, msg.fingerprint));
      else if (msg?.type === "UEDA_RUN_SKILL") sendResponse({ ok: true, ...(await runSkill(msg.skillId, sender.tab?.id)) });
      else sendResponse({ ok: false, error: "Tipo desconhecido" });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true;
});
