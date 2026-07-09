(() => {
  const VALIDATE_ENDPOINT = 'https://keqgzvcahsvseowfowwu.supabase.co/functions/v1/fn-vl04';

  const fields = {
    loginView: document.getElementById('loginView'),
    homeView: document.getElementById('homeView'),
    keyInput: document.getElementById('keyInput'),
    rememberKey: document.getElementById('rememberKey'),
    loginButton: document.getElementById('loginButton'),
    loginMsg: document.getElementById('loginMsg'),
    enabled: document.getElementById('enabled'),
    showValidity: document.getElementById('showValidity'),
    modeInputs: Array.from(document.querySelectorAll('input[name="mode"]')),
    logoutButton: document.getElementById('logoutButton'),
    countdown: document.getElementById('countdown'),
    userLine: document.getElementById('userLine'),
  };

  function setMessage(message, type = 'info') {
    if (!fields.loginMsg) return;
    fields.loginMsg.textContent = message;
    fields.loginMsg.className = `login-msg ${type ? `is-${type}` : ''}`;
  }

  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function setStorage(values) {
    return new Promise((resolve) => chrome.storage.local.set(values, resolve));
  }

  function clearStorage() {
    return new Promise((resolve) => chrome.storage.local.clear(resolve));
  }

  async function getDeviceId() {
    const existing = await getStorage(['deviceId']);
    if (existing.deviceId) return existing.deviceId;
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await setStorage({ deviceId: id });
    return id;
  }

  function formatValidity(expiresAt) {
    if (!expiresAt || expiresAt === 'Sem validade') return 'Ilimitado';
    const expires = new Date(expiresAt).getTime();
    if (!Number.isFinite(expires)) return 'Ilimitado';
    const days = Math.max(0, Math.ceil((expires - Date.now()) / 86400000));
    return days > 0 ? `${days} dias restantes` : 'Expirado';
  }

  function applyView(state) {
    const valid = !!(state.authStatus === 'success' && state.keyValid === true && state.licenseKey);
    if (fields.loginView) fields.loginView.hidden = valid;
    if (fields.homeView) fields.homeView.hidden = !valid;
    document.body.classList.toggle('is-authenticated', valid);
    if (fields.keyInput && state.licenseKey) fields.keyInput.value = state.licenseKey;
    if (fields.enabled) fields.enabled.checked = state.enabled !== false;
    if (fields.showValidity) fields.showValidity.checked = state.showValidity !== false;
    fields.modeInputs.forEach((input) => { input.checked = input.value === (state.mode || '1'); });
    if (fields.countdown) fields.countdown.textContent = valid ? formatValidity(state.validade) : '';
    if (fields.userLine) fields.userLine.textContent = valid ? (state.userName || 'Licença ativa') : '';
  }

  async function validateLicense() {
    const key = (fields.keyInput?.value || '').trim();
    if (!key) {
      setMessage('Informe uma chave válida.', 'error');
      return;
    }

    try {
      fields.loginButton.disabled = true;
      fields.loginButton.textContent = 'Validando...';
      setMessage('Conectando ao servidor...', 'info');

      const response = await fetch(VALIDATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key, fingerprint: await getDeviceId() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error_display || 'Chave inválida ou expirada.');

      const nextState = {
        licenseKey: key,
        authStatus: 'success',
        keyValid: true,
        validate: true,
        enabled: true,
        mode: '1',
        showValidity: true,
        userName: data.label || 'Minha conta',
        user: data.label || 'Minha conta',
        validade: data.expires_at || 'Sem validade',
        lastValidationAt: Date.now(),
      };
      await setStorage(nextState);
      setMessage('Licença ativada com segurança.', 'success');
      applyView(nextState);
      reloadLovableTabs();
    } catch (error) {
      await setStorage({ authStatus: 'error', keyValid: false, validate: false, enabled: false });
      setMessage(error instanceof Error ? error.message : 'Falha ao validar a licença.', 'error');
    } finally {
      fields.loginButton.disabled = false;
      fields.loginButton.textContent = 'Ativar Licença';
    }
  }

  function reloadLovableTabs() {
    chrome.tabs.query({ url: ['https://lovable.dev/*', 'https://*.lovable.dev/*', 'https://*.lovable.app/*'] }, (tabs) => {
      tabs.forEach((tab) => { if (tab.id) chrome.tabs.reload(tab.id); });
    });
  }

  async function saveToggles() {
    const selectedMode = fields.modeInputs.find((input) => input.checked)?.value || '1';
    await setStorage({
      enabled: fields.enabled?.checked !== false,
      showValidity: fields.showValidity?.checked !== false,
      mode: selectedMode,
    });
    reloadLovableTabs();
  }

  async function logout() {
    await clearStorage();
    applyView({ authStatus: 'signed_out', keyValid: false, enabled: false, mode: '1', showValidity: true });
    reloadLovableTabs();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const state = await getStorage(null);
    applyView(state || {});
  });

  fields.loginButton?.addEventListener('click', validateLicense);
  fields.keyInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') validateLicense();
  });
  fields.enabled?.addEventListener('change', saveToggles);
  fields.showValidity?.addEventListener('change', saveToggles);
  fields.modeInputs.forEach((input) => input.addEventListener('change', saveToggles));
  fields.logoutButton?.addEventListener('click', logout);
})();