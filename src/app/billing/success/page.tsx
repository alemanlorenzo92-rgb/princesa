import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-3xl bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Billing
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Pago recibido
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Estamos activando tu plan. Si el webhook tarda unos segundos, actualiza Perfil o Configuracion en un momento.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Ir a perfil
          </Link>
          <Link
            href="/settings"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Ir a configuracion
          </Link>
        </div>
      </section>
    </main>
  );
}
