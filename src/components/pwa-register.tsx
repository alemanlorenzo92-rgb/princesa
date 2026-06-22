"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      window.__PRINCESA_INSTALL_PROMPT__ = event as typeof window.__PRINCESA_INSTALL_PROMPT__;
      window.dispatchEvent(new Event("princesa:installprompt"));
    }

    function handleAppInstalled() {
      window.__PRINCESA_INSTALL_PROMPT__ = undefined;
      window.dispatchEvent(new Event("princesa:appinstalled"));
    }

    async function notifyIfUpdateAvailable() {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        window.dispatchEvent(new Event("princesa:pwa-update-available"));
      }
    }

    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then(() => void notifyIfUpdateAvailable()).catch(() => undefined);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
