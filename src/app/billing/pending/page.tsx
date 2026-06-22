import Link from "next/link";

export default function BillingPendingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-3xl bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Billing
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Tu pago esta pendiente
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Estamos esperando la confirmacion de Mercado Pago para activar el plan.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Volver a perfil
          </Link>
        </div>
      </section>
    </main>
  );
}
