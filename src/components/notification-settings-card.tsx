"use client";

import { useEffect, useState } from "react";

import { CardSection } from "@/components/card-section";
import { PrimaryButton, SecondaryButton } from "@/components/forms";
import {
  DeferredInstallPromptEvent,
  isIosDevice,
  isStandaloneMode,
} from "@/lib/pwa-install";
import { getPublicRuntimeConfig } from "@/lib/public-runtime";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

interface SubscriptionsResponse {
  configured: boolean;
  subscriptions: Array<{
    endpoint: string;
  }>;
}

export function NotificationSettingsCard() {
  const [supported, setSupported] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function refreshInstallState() {
      setIsInstalled(isStandaloneMode());
      setCanInstall(Boolean(window.__PRINCESA_INSTALL_PROMPT__));
      setIsIos(isIosDevice());
    }

    refreshInstallState();
    window.addEventListener("princesa:installprompt", refreshInstallState);
    window.addEventListener("princesa:appinstalled", refreshInstallState);

    async function loadState() {
      const browserSupported =
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;

      setSupported(browserSupported);

      if (!browserSupported) {
        setLoading(false);
        return;
      }

      setPermission(Notification.permission);

      try {
        const [registration, response] = await Promise.all([
          navigator.serviceWorker.ready,
          fetch("/api/notifications/subscriptions", {
            cache: "no-store",
          }),
        ]);

        const currentSubscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(currentSubscription));

        if (response.ok) {
          const data = (await response.json()) as SubscriptionsResponse;
          setServerConfigured(data.configured);
        }
      } catch {
        setError("No se pudo verificar el estado actual de las notificaciones.");
      } finally {
        setLoading(false);
      }
    }

    void loadState();

    return () => {
      window.removeEventListener("princesa:installprompt", refreshInstallState);
      window.removeEventListener("princesa:appinstalled", refreshInstallState);
    };
  }, []);

  async function installApp() {
    const promptEvent = window.__PRINCESA_INSTALL_PROMPT__ as
      | DeferredInstallPromptEvent
      | undefined;

    if (!promptEvent) {
      setError("Este dispositivo no mostro un instalador automatico en este momento.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice.outcome === "accepted") {
        window.__PRINCESA_INSTALL_PROMPT__ = undefined;
        setCanInstall(false);
        setMessage("Instalacion aceptada. Cuando termine, vuelve a activar las notificaciones si hace falta.");
      } else {
        setMessage("La instalacion se cancelo. Puedes volver a intentarlo cuando quieras.");
      }
    } catch {
      setError("No se pudo abrir el instalador de la app.");
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    const { vapidPublicKey } = getPublicRuntimeConfig();

    if (!vapidPublicKey) {
      setError("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en el entorno publico.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        throw new Error("Necesitas aceptar el permiso del navegador.");
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch {
        throw new Error(
          "Tu navegador no pudo activar las notificaciones. Instala la app o prueba en Chrome/Edge.",
        );
      }

      const response = await fetch("/api/notifications/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo guardar la suscripcion.");
      }

      setEnabled(true);
      setServerConfigured(true);
      setMessage("Las notificaciones quedaron activadas en este dispositivo.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudieron activar las notificaciones.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/notifications/subscriptions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
        await subscription.unsubscribe();
      }

      setEnabled(false);
      setMessage("Las notificaciones quedaron desactivadas en este dispositivo.");
    } catch {
      setError("No se pudieron desactivar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestNotification() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo enviar la notificacion de prueba.");
      }

      setMessage("Te mandamos una notificacion de prueba.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo enviar la prueba.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetNotifications() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/notifications/subscriptions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
        await subscription.unsubscribe();
      }

      setEnabled(false);
      setPermission(Notification.permission);

      await enableNotifications();
      setMessage("Reiniciamos las notificaciones en este dispositivo.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo reiniciar las notificaciones.",
      );
    } finally {
      setBusy(false);
    }
  }

  const installationStatus = isInstalled
    ? "app instalada"
    : canInstall
      ? "lista para instalar"
      : "usando navegador";

  const recommendation = isInstalled
    ? "Este es el mejor escenario para recibir recordatorios."
    : supported
      ? "Conviene instalar la app para que los recordatorios sean mas confiables."
      : "Este dispositivo tiene soporte limitado para notificaciones push.";

  const installHint = isInstalled
    ? "Estás usando la app instalada. Desde aquí podés activar las notificaciones."
    : "Descarga la app para activar notificaciones más estables y confiables.";

  return (
    <CardSection>
      <h2 className="text-lg font-semibold text-slate-950">Notificaciones</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Puedes recibir avisos push de tus proximos eventos aunque no tengas la app
        abierta, siempre que el navegador y el dispositivo lo soporten.
      </p>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {installHint}
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>Modo actual: {installationStatus}</p>
        <p>Soporte del navegador: {supported ? "si" : "no"}</p>
        <p>Permiso actual: {permission}</p>
        <p>Servidor listo: {serverConfigured ? "si" : "no"}</p>
        <p>Estado en este dispositivo: {enabled ? "activado" : "desactivado"}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Recomendacion</p>
        <p className="mt-1">{recommendation}</p>
        {!isInstalled && canInstall ? (
          <p className="mt-2 text-slate-600">
            Si la instalas, las notificaciones suelen verse mejor y ser mas estables.
          </p>
        ) : null}
        {!isInstalled && !canInstall && isIos ? (
          <p className="mt-2 text-slate-600">
            En iPhone o iPad, abre compartir y elige &quot;Agregar a pantalla de inicio&quot;
            para usarla como app y mejorar las notificaciones.
          </p>
        ) : null}
      </div>

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <PrimaryButton
          type="button"
          onClick={installApp}
          disabled={loading || busy || isInstalled || !canInstall}
        >
          Instalar app
        </PrimaryButton>
        <PrimaryButton
          type="button"
          onClick={enableNotifications}
          disabled={!supported || loading || busy || enabled}
        >
          Activar notificaciones
        </PrimaryButton>
        <SecondaryButton
          type="button"
          onClick={disableNotifications}
          disabled={!supported || loading || busy || !enabled}
        >
          Desactivar
        </SecondaryButton>
        <SecondaryButton
          type="button"
          onClick={resetNotifications}
          disabled={!supported || loading || busy}
        >
          Reiniciar notificaciones
        </SecondaryButton>
        <SecondaryButton
          type="button"
          onClick={sendTestNotification}
          disabled={!supported || loading || busy || !enabled}
        >
          Enviar prueba
        </SecondaryButton>
      </div>
    </CardSection>
  );
}
