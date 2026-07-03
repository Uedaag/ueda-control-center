(function uedaPopupOverride() {
  let approvedActivation = false;

  function isActive(config) {
    return Boolean(config && (config.keyValid === true || Boolean(config.licenseKey) || config.authStatus === "success" || config.authStatus === "valid" || config.authStatus === "ueda_custom_active" || (typeof config.authStatus === "object" && config.authStatus?.valid === true)));
  }

  function setMessage(text) {
    const message = document.getElementById("loginMsg");
    if (message) message.textContent = text;
  }

  function enforcePopupLayout() {
    if (document.documentElement.getAttribute("data-ueda-popup") !== "forced") {
      document.documentElement.setAttribute("data-ueda-popup", "forced");
    }
    document.body?.classList.add("ueda-popup-forced");
    const loginView = document.getElementById("loginView");
    const homeView = document.getElementById("homeView");
    const status = document.getElementById("status");
    if (loginView) { loginView.hidden = false; loginView.style.display = "grid"; }
    if (homeView) { homeView.hidden = true; homeView.style.display = "none"; }
    if (status) status.style.display = "none";
  }

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("#loginButton");
    if (!button || approvedActivation) return;
    const input = document.getElementById("keyInput");
    const key = input?.value?.trim?.() || "";
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!key) { setMessage("Informe uma chave para continuar."); input?.focus?.(); return; }
    if (!window.confirm("OK")) return;
    approvedActivation = true;
    button.click();
    window.setTimeout(() => { approvedActivation = false; }, 600);
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    enforcePopupLayout();
    chrome.storage.local.get(["licenseKey", "keyValid", "authStatus"], (config) => {
      if (isActive(config)) setMessage("Ativada. Use o ícone UEDA na extrema esquerda da página.");
    });
    const observer = new MutationObserver(() => window.requestAnimationFrame(enforcePopupLayout));
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
