"use client";

import { useEffect, useState } from "react";

import { CardSection } from "@/components/card-section";

interface ConfigStatusResponse {
  ok: boolean;
  message: string;
  details: Array<{
    key: string;
    visibility: "public" | "private";
    category:
      | "supabase"
      | "openai"
      | "mercadopago"
      | "storage"
      | "notifications";
    configured: boolean;
  }>;
}

export function ConfigStatusCard() {
  const [status, setStatus] = useState<ConfigStatusResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch("/api/config/status", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudo verificar la configuracion del entorno.");
        }

        const data = (await response.json()) as ConfigStatusResponse;
        setStatus(data);
      } catch {
        setLoadError(
          process.env.NODE_ENV !== "production"
            ? "No se pudo consultar /api/config/status durante el desarrollo."
            : "No se pudo verificar la configuracion principal de la app.",
        );
      }
    }

    void loadStatus();
  }, []);

  if (loadError) {
    return (
      <CardSection>
        <h2 className="text-lg font-semibold text-slate-950">Configuracion del entorno</h2>
        <p className="mt-3 text-sm text-slate-600">{loadError}</p>
      </CardSection>
    );
  }

  if (!status || status.ok) {
    return null;
  }

  const missingDetails = status.details.filter((item) => !item.configured);

  return (
    <CardSection>
      <h2 className="text-lg font-semibold text-slate-950">Configuracion del entorno</h2>
      <p className="mt-3 text-sm text-slate-600">{status.message}</p>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {missingDetails.map((item) => (
          <p key={item.key}>
            {item.key} - {item.visibility === "public" ? "publica" : "privada"}
          </p>
        ))}
      </div>
    </CardSection>
  );
}
