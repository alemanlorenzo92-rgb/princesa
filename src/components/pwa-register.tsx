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

    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
