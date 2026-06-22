"use client";

import Link from "next/link";

import { BillingPlanCards } from "@/components/billing-plan-cards";
import { CardSection } from "@/components/card-section";
import { ConfigStatusCard } from "@/components/config-status-card";
import { NotificationSettingsCard } from "@/components/notification-settings-card";
import { PwaUpdateCard } from "@/components/pwa-update-card";
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
        eyebrow="EstudioAI"
        title="Perfil, planes y accesos"
        description="Centralizá tu cuenta, activá mejoras y descubrí qué desbloquea cada plan desde un solo lugar."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Tu cuenta</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tu sesión se mantiene sincronizada entre web, app y accesos seguros.
          </p>
        </CardSection>
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Desbloqueos</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            La prueba gratuita es limitada y después necesitás un plan activo para seguir usando IA y chat.
          </p>
        </CardSection>
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">App instalada</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Incluye `manifest`, iconos y `service worker` para una experiencia móvil más limpia y estable.
          </p>
        </CardSection>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CardSection className="border-emerald-200 bg-emerald-50/70">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Mejor plan recomendado
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Más IA, más contexto, menos límites</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Si querés usar chat, PDFs y materiales sin fricción, los planes pagos están pensados para eso.
            Ahora mostramos el descuento de lanzamiento para que sea más fácil decidir.
          </p>
        </CardSection>

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
            <p className="mt-3 text-sm leading-6 text-slate-600">Esto no aparece en producción.</p>
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
        <PwaUpdateCard />
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
