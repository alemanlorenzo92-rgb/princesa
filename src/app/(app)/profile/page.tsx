"use client";

import { CardSection } from "@/components/card-section";
import { BillingPlanCards } from "@/components/billing-plan-cards";
import { PageHeader } from "@/components/page-header";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import {
  getCurrentMonthlyUsage,
  getRemainingMonthlyTokens,
  getRemainingTrialTokens,
} from "@/lib/ai-usage";
import { getPlanConfig, isPaidPlan } from "@/lib/plans";

export default function ProfilePage() {
  const { user } = useAuth();
  const { subjects, events, materials } = useAppData();

  const aiState = user?.aiState;
  const planConfig = getPlanConfig(aiState?.planId || "expired_trial");
  const trialRemaining = aiState ? getRemainingTrialTokens(aiState) : null;
  const monthlyRemaining = aiState ? getRemainingMonthlyTokens(aiState) : null;
  const currentMonthlyUsage = aiState ? getCurrentMonthlyUsage(aiState) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Perfil"
        title="Tu cuenta"
        description="Resumen de tu actividad academica, estado actual del plan y uso de IA."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSection>
          <p className="text-sm text-slate-500">Nombre</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{user?.name}</p>
          <p className="mt-4 text-sm text-slate-500">Email</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{user?.email}</p>
          <p className="mt-4 text-sm text-slate-500">Estado de IA</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{planConfig.label}</p>
        </CardSection>
        <CardSection>
          <p className="text-sm text-slate-500">Materias activas</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{subjects.length}</p>
          <p className="mt-4 text-sm text-slate-500">Eventos registrados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{events.length}</p>
          <p className="mt-4 text-sm text-slate-500">Materiales generados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{materials.length}</p>
        </CardSection>
        <CardSection>
          {aiState?.planId === "trial" && aiState.trial && trialRemaining ? (
            <>
              <p className="text-sm text-slate-500">Prueba gratuita activa</p>
              <p className="mt-2 text-sm text-slate-700">
                Entrada usada: {aiState.trial.trialInputTokensUsed} / {aiState.trial.trialInputTokensLimit}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Salida usada: {aiState.trial.trialOutputTokensUsed} / {aiState.trial.trialOutputTokensLimit}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Restantes: {trialRemaining.inputRemaining} entrada - {trialRemaining.outputRemaining} salida
              </p>
            </>
          ) : null}

          {aiState?.planId === "expired_trial" && aiState.trial ? (
            <>
              <p className="text-sm text-slate-500">Prueba gratuita usada</p>
              <p className="mt-2 text-sm text-slate-700">
                Estado final: {aiState.trial.trialStatus}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Consumo total: {aiState.trial.trialTotalTokensUsed} tokens
              </p>
            </>
          ) : null}

          {isPaidPlan(aiState?.planId || "expired_trial") && monthlyRemaining ? (
            <>
              <p className="text-sm text-slate-500">Uso mensual</p>
              <p className="mt-2 text-sm text-slate-700">
                Entrada usada: {currentMonthlyUsage?.monthlyInputTokensUsed || 0} / {planConfig.monthlyInputTokensLimit}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Salida usada: {currentMonthlyUsage?.monthlyOutputTokensUsed || 0} / {planConfig.monthlyOutputTokensLimit}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Restantes: {monthlyRemaining.inputRemaining} entrada - {monthlyRemaining.outputRemaining} salida
              </p>
            </>
          ) : null}
        </CardSection>
      </div>

      <div className="mt-6">
        <BillingPlanCards />
      </div>
    </div>
  );
}
