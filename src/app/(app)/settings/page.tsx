"use client";

import Link from "next/link";

import { BillingPlanCards } from "@/components/billing-plan-cards";
import { CardSection } from "@/components/card-section";
import { ConfigStatusCard } from "@/components/config-status-card";
import { NotificationSettingsCard } from "@/components/notification-settings-card";
import { PageHeader } from "@/components/page-header";
import { PrimaryButton, SecondaryButton } from "@/components/forms";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_ORDER, getPlanConfig } from "@/lib/plans";

export default function SettingsPage() {
  const {
    logout,
    user,
    setPlanForDevelopment,
    resetTrialForDevelopment,
  } = useAuth();
  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <div>
      <PageHeader
        eyebrow="Configuracion"
        title="Estado tecnico del proyecto"
        description="La logica de IA ya distingue prueba unica, planes pagos y limites mensuales, con OpenAI API siempre desde backend."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Autenticacion</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            La app usa Supabase Auth con sesion compartida entre cliente, SSR y endpoints server-side.
          </p>
        </CardSection>
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">IA</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            No existe plan gratis mensual. Cada cuenta recibe una prueba gratuita unica y luego necesita un plan pago para seguir usando OpenAI API.
          </p>
        </CardSection>
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">PWA</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Incluye `manifest`, iconos y `service worker` ajustado para no cachear rutas API ni respuestas sensibles.
          </p>
        </CardSection>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Estado actual del usuario</h2>
          <p className="mt-3 text-sm text-slate-600">
            Plan actual: {getPlanConfig(user?.aiState.planId || "expired_trial").label}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            La activacion real del plan se hace desde backend despues de validar el pago aprobado en Mercado Pago.
          </p>
        </CardSection>

        {isDevelopment ? (
          <CardSection>
            <h2 className="text-lg font-semibold text-slate-950">Modo desarrollo</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Modo desarrollo: esto no existira en produccion.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PLAN_ORDER.map((planId) => (
                <SecondaryButton
                  key={planId}
                  type="button"
                  onClick={() => setPlanForDevelopment(planId)}
                >
                  {getPlanConfig(planId).label}
                </SecondaryButton>
              ))}
            </div>
            <div className="mt-4">
              <PrimaryButton type="button" onClick={resetTrialForDevelopment}>
                Reiniciar datos de prueba
              </PrimaryButton>
            </div>
          </CardSection>
        ) : null}
      </div>

      <div className="mt-4">
        <ConfigStatusCard />
      </div>

      <div className="mt-4">
        <NotificationSettingsCard />
      </div>

      <div className="mt-6">
        <BillingPlanCards />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/profile" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
          Ver perfil
        </Link>
        <SecondaryButton type="button" onClick={logout}>
          Cerrar sesion
        </SecondaryButton>
      </div>
    </div>
  );
}
