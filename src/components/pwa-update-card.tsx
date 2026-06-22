"use client";

import { useEffect, useState } from "react";

import { CardSection } from "@/components/card-section";
import { PrimaryButton } from "@/components/forms";

export function PwaUpdateCard() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    function handleUpdateAvailable() {
      setUpdateAvailable(true);
    }

    async function checkRegistration() {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      if (registration?.waiting) {
        setUpdateAvailable(true);
      }
    }

    window.addEventListener("princesa:pwa-update-available", handleUpdateAvailable);
    void checkRegistration();

    return () => {
      window.removeEventListener("princesa:pwa-update-available", handleUpdateAvailable);
    };
  }, []);

  async function applyUpdate() {
    setUpdating(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      }, { once: true });

      window.location.reload();
    } finally {
      setUpdating(false);
    }
  }

  if (!updateAvailable) return null;

  return (
    <CardSection>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Nueva versión disponible</h2>
          <p className="mt-1 text-sm text-slate-600">
            Actualizá la app para ver los últimos cambios sin reinstalar nada.
          </p>
        </div>
        <PrimaryButton type="button" onClick={() => void applyUpdate()} disabled={updating}>
          {updating ? "Actualizando..." : "Actualizar app"}
        </PrimaryButton>
      </div>
    </CardSection>
  );
}
