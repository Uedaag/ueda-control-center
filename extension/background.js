// Loads bundled config.json on first install so content scripts have defaults.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const url = chrome.runtime.getURL("config.json");
    const res = await fetch(url);
    const config = await res.json();
    const existing = await chrome.storage.local.get("ueda_config");
    if (!existing.ueda_config) {
      await chrome.storage.local.set({ ueda_config: config });
    }
  } catch (e) {
    console.warn("[UEDA] Falha ao carregar config inicial", e);
  }
});

// Central update fetcher — called from content script.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "UEDA_CHECK_UPDATE") {
    (async () => {
      try {
        const { ueda_config } = await chrome.storage.local.get("ueda_config");
        if (!ueda_config?.updates_url) throw new Error("URL de atualização não configurada");
        const res = await fetch(ueda_config.updates_url, {
          headers: { "x-ext-version": chrome.runtime.getManifest().version },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const remote = await res.json();
        // Merge remote settings into local config
        const merged = { ...ueda_config };
        if (remote?.settings) {
          if (remote.settings.widget_accent_color) merged.brand_color = remote.settings.widget_accent_color;
          if (remote.settings.widget_title) merged.brand_name = remote.settings.widget_title;
          if (remote.settings.widget_subtitle) merged.footer_signature = remote.settings.widget_subtitle;
        }
        await chrome.storage.local.set({ ueda_config: merged });
        sendResponse({ ok: true, config: merged });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true; // keep channel open for async response
  }

  if (msg?.type === "UEDA_VALIDATE_LICENSE") {
    (async () => {
      try {
        const { ueda_config } = await chrome.storage.local.get("ueda_config");
        if (!ueda_config?.validate_endpoint) throw new Error("Endpoint de validação não configurado");
        const res = await fetch(ueda_config.validate_endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ license_key: msg.key, fingerprint: msg.fingerprint || "" }),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok && data.ok !== false, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }
});
