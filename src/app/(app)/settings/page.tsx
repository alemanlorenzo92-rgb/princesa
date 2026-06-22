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
  const { logout, user, setPlanForDevelopment, resetTrialForDevelopment } = useAuth();
  const isDevelopment = process.env.NODE_ENV !== "production";

  return (
    <div>
      <PageHeader
        eyebrow="Configuracion"
        title="Perfil y ajustes"
        description="Revisá tu cuenta, tu plan y la experiencia en la app desde un solo lugar."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Cuenta</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tu sesión se mantiene sincronizada entre web, app y accesos seguros.
          </p>
        </CardSection>
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">IA</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Cada cuenta tiene una prueba gratuita única y después necesita un plan activo para seguir usando IA.
          </p>
        </CardSection>
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">PWA</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Incluye `manifest`, iconos y `service worker` ajustados para una experiencia móvil más limpia.
          </p>
        </CardSection>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Estado actual</h2>
          <p className="mt-3 text-sm text-slate-600">
            Plan actual: {getPlanConfig(user?.aiState.planId || "expired_trial").label}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            La activación del plan sigue dependiendo de la validación del pago aprobado.
          </p>
        </CardSection>

        {isDevelopment ? (
          <CardSection>
            <h2 className="text-lg font-semibold text-slate-950">Modo desarrollo</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Modo desarrollo: esto no aparece en producción.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PLAN_ORDER.map((planId) => (
                <SecondaryButton key={planId} type="button" onClick={() => setPlanForDevelopment(planId)}>
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
          Cerrar sesión
        </SecondaryButton>
      </div>
    </div>
  );
}
