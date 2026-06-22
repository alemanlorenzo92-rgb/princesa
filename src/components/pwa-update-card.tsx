"use client";

import { useEffect, useState } from "react";

import { CardSection } from "@/components/card-section";
import { PrimaryButton, SecondaryButton } from "@/components/forms";
import { DeferredInstallPromptEvent } from "@/lib/pwa-install";

export function PwaUpdateCard() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    function handleUpdateAvailable() {
      setUpdateAvailable(true);
    }

    function refreshInstallState() {
      setCanInstall(Boolean(window.__PRINCESA_INSTALL_PROMPT__));
    }

    async function checkRegistration() {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      if (registration?.waiting) {
        setUpdateAvailable(true);
      }
    }

    window.addEventListener("princesa:pwa-update-available", handleUpdateAvailable);
    window.addEventListener("princesa:installprompt", refreshInstallState);
    window.addEventListener("princesa:appinstalled", refreshInstallState);
    void checkRegistration();
    refreshInstallState();

    return () => {
      window.removeEventListener("princesa:pwa-update-available", handleUpdateAvailable);
      window.removeEventListener("princesa:installprompt", refreshInstallState);
      window.removeEventListener("princesa:appinstalled", refreshInstallState);
    };
  }, []);

  async function applyUpdate() {
    setUpdating(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.location.reload();
        },
        { once: true },
      );

      window.location.reload();
    } finally {
      setUpdating(false);
    }
  }

  async function reinstallAccess() {
    const promptEvent = window.__PRINCESA_INSTALL_PROMPT__ as
      | DeferredInstallPromptEvent
      | undefined;

    if (!promptEvent) {
      window.location.reload();
      return;
    }

    await promptEvent.prompt();
  }

  if (!updateAvailable) return null;

  return (
    <CardSection>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Reinstalar acceso</h2>
          <p className="mt-1 text-sm text-slate-600">
            Si seguís viendo un ícono viejo, reinstalá el acceso para tomar el logo y la versión nueva.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={() => void applyUpdate()} disabled={updating}>
            {updating ? "Actualizando..." : "Actualizar"}
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => void reinstallAccess()}>
            {canInstall ? "Reinstalar acceso" : "Recargar acceso"}
          </PrimaryButton>
        </div>
      </div>
    </CardSection>
  );
}
