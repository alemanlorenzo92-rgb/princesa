"use client";

import { useEffect, useState } from "react";

import { CardSection } from "@/components/card-section";
import { PrimaryButton } from "@/components/forms";
import { useAuth } from "@/hooks/use-auth";
import { getPlanConfig } from "@/lib/plans";
import { PlanId } from "@/types";

interface BillingPlanPrice {
  planId: Extract<PlanId, "student" | "pro">;
  amount: number;
}

const BILLING_FEATURES: Record<Extract<PlanId, "student" | "pro">, string[]> = {
  student: [
    "Generacion IA completa de nivel estudiante",
    "Chat IA",
    "Chat con PDFs",
    "300.000 tokens de entrada por mes",
    "100.000 tokens de salida por mes",
  ],
  pro: [
    "Todo lo incluido en Estudiante",
    "Funciones avanzadas",
    "Contexto mas amplio para chat y PDFs",
    "1.500.000 tokens de entrada por mes",
    "500.000 tokens de salida por mes",
  ],
};

export function BillingPlanCards() {
  const { user } = useAuth();
  const [prices, setPrices] = useState<BillingPlanPrice[]>([]);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPrices() {
      try {
        const response = await fetch("/api/billing/plans");
        if (!response.ok) {
          throw new Error("No se pudieron cargar los precios.");
        }

        const data = (await response.json()) as { plans: BillingPlanPrice[] };
        setPrices(data.plans);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los planes.",
        );
      }
    }

    void loadPrices();
  }, []);

  async function handleCheckout(planId: Extract<PlanId, "student" | "pro">) {
    try {
      setLoadingPlanId(planId);
      setError("");
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "No se pudo iniciar el checkout.");
      }

      const payload = (await response.json()) as {
        initPoint?: string;
        sandboxInitPoint?: string;
      };
      const redirectUrl = payload.sandboxInitPoint || payload.initPoint;

      if (!redirectUrl) {
        throw new Error("Mercado Pago no devolvio una URL de checkout.");
      }

      window.location.assign(redirectUrl);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "No se pudo iniciar el checkout.",
      );
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <CardSection>
        <p className="text-sm text-slate-500">Prueba gratuita</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">
          {getPlanConfig("trial").label}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Ideal para probar el flujo de IA. No se renueva mensualmente.
        </p>
      </CardSection>

      {(["student", "pro"] as const).map((planId) => {
        const planConfig = getPlanConfig(planId);
        const price = prices.find((entry) => entry.planId === planId)?.amount;
        const isCurrent = user?.aiState.planId === planId;

        return (
          <CardSection key={planId}>
            <p className="text-sm text-slate-500">{planConfig.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {price ? `$${price.toLocaleString("es-AR")} / mes` : "Precio configurable"}
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {BILLING_FEATURES[planId].map((feature) => (
                <p key={feature}>{feature}</p>
              ))}
            </div>
            <PrimaryButton
              type="button"
              className="mt-5"
              onClick={() => void handleCheckout(planId)}
              disabled={loadingPlanId === planId || isCurrent}
            >
              {isCurrent
                ? "Plan actual"
                : loadingPlanId === planId
                  ? "Redirigiendo..."
                  : planId === "student"
                    ? "Elegir Plan Estudiante"
                    : "Elegir Plan Pro"}
            </PrimaryButton>
          </CardSection>
        );
      })}

      {error ? (
        <CardSection className="lg:col-span-3">
          <p className="text-sm text-red-600">{error}</p>
        </CardSection>
      ) : null}
    </div>
  );
}
