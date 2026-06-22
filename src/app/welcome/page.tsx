"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { BillingPlanCards } from "@/components/billing-plan-cards";
import { CardSection } from "@/components/card-section";
import { PrimaryButton, SecondaryButton } from "@/components/forms";
import { getPlanConfig } from "@/lib/plans";

const FEATURES = [
  "Organizá materias, fechas y archivos en una sola app.",
  "Usá IA para resumir, explicar y estudiar más rápido.",
  "Elegí un plan gratis o pasá a un plan con más IA y más contexto.",
];

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  function continueWithFreePlan() {
    window.localStorage.setItem("estudioai_onboarding_done", "true");
    router.replace(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <CardSection className="p-7 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-coral-600">EstudioAI</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
            Bienvenido. Primero te mostramos cómo funciona.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Antes de entrar a tu espacio de estudio, te mostramos lo esencial para que empieces con claridad.
          </p>

          <div className="mt-6 space-y-3">
            {FEATURES.map((feature) => (
              <div key={feature} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-sm font-semibold text-emerald-800">Plan recomendado para empezar</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              {getPlanConfig("trial").label} te deja probar la app y entrar al flujo base sin pagar.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton type="button" onClick={continueWithFreePlan} className="sm:min-w-56">
              Continuar con plan gratis
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => document.getElementById("paid-plans")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="sm:min-w-56">
              Ver planes pagos
            </SecondaryButton>
          </div>
        </CardSection>

        <div className="grid gap-4">
          <CardSection>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Qué vas a encontrar</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>• Dashboard con próximas fechas, materias y accesos rápidos.</p>
              <p>• Sección de archivos para subir PDFs y estudiar desde ahí.</p>
              <p>• IA y chat para resumir, explicar y practicar.</p>
              <p>• Notificaciones y app instalada para acompañarte en el día a día.</p>
            </div>
          </CardSection>

          <CardSection>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Si querés más</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Los planes pagos amplían límites, chat y materiales, y te muestran siempre el beneficio del descuento de lanzamiento.
            </p>
          </CardSection>
        </div>
      </div>

      <section id="paid-plans" className="mt-6 space-y-4">
        <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-soft backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral-600">Elegí cómo seguir</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Comprar un plan o seguir gratis</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Acá podés comparar rápido y decidir sin salir de la bienvenida. Si no querés pagar ahora, seguí con el plan gratis.
          </p>
        </div>
        <BillingPlanCards />
      </section>
    </main>
  );
}
