import { CardSection } from "@/components/card-section";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getAdminDashboardData } from "@/lib/server/admin-dashboard";
import { requireAdminAccess } from "@/lib/server/admin-access";

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function AdminPage() {
  const adminState = await requireAdminAccess();
  const data = await getAdminDashboardData();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Panel administrativo"
        description="Vista interna de usuarios, planes, actividad de IA, pagos y acceso reciente."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Usuarios totales"
          value={formatNumber(data.summary.totalUsers)}
          helper={`${data.summary.adminUsers} administradores configurados.`}
        />
        <StatCard
          label="Inicios ultimos 7 dias"
          value={formatNumber(data.summary.signInsLast7Days)}
          helper="Usuarios que iniciaron sesion recientemente."
          accent="from-sky-400 to-cyan-300"
        />
        <StatCard
          label={`Tokens ${data.month}`}
          value={formatNumber(data.summary.currentMonthTokens)}
          helper={`${formatNumber(data.summary.currentMonthOpenAiUses)} usos de OpenAI en el mes.`}
          accent="from-emerald-400 to-teal-300"
        />
        <StatCard
          label="Costo IA del mes"
          value={formatCurrency(data.summary.currentMonthEstimatedCostUsd)}
          helper={`${formatNumber(data.summary.totalMaterialsGenerated)} materiales y ${formatNumber(data.summary.totalFilesUploaded)} archivos.`}
          accent="from-violet-400 to-fuchsia-300"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <CardSection>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Estado de planes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Distribucion actual entre trial, student, pro y trial vencido.
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-700">
              Admin activo: <span className="font-semibold">{adminState.user.email}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Trial</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(data.summary.planCounts.trial)}
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-sm text-slate-500">Student</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(data.summary.planCounts.student)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-slate-500">Pro</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(data.summary.planCounts.pro)}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-sm text-slate-500">Trial vencido</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(data.summary.planCounts.expired_trial)}
              </p>
            </div>
          </div>
        </CardSection>

        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Usuarios con mas consumo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ranking mensual para detectar cuentas intensivas y revisar costos.
          </p>

          <div className="mt-5 space-y-3">
            {data.topUsage.length ? (
              data.topUsage.map((entry) => (
                <article key={entry.userId} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{entry.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{entry.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {entry.planId}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p>Tokens: {formatNumber(entry.totalTokens)}</p>
                    <p>Usos: {formatNumber(entry.openAiUses)}</p>
                    <p>Costo: {formatCurrency(entry.estimatedCostUsd)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Todavia no hay consumo de IA registrado para este mes.
              </div>
            )}
          </div>
        </CardSection>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Usuarios recientes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Altas, plan actual, confirmacion de email y ultimo acceso.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Usuario</th>
                  <th className="pb-3 font-medium">Rol</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Creado</th>
                  <th className="pb-3 font-medium">Ultimo login</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {data.users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-950">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900">{user.planId}</p>
                      <p className="text-xs text-slate-500">{user.subscriptionStatus}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{formatDateTime(user.createdAt)}</td>
                    <td className="py-3 text-slate-600">{formatDateTime(user.lastSignInAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSection>

        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Ultimos inicios de sesion</h2>
          <p className="mt-1 text-sm text-slate-500">
            Historial rapido de los accesos mas recientes detectados por Supabase Auth.
          </p>

          <div className="mt-5 space-y-3">
            {data.recentLogins.length ? (
              data.recentLogins.map((user) => (
                <article key={user.id} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {user.planId}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Login: {formatDateTime(user.lastSignInAt)}</p>
                    <p>Email confirmado: {formatDateTime(user.emailConfirmedAt)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Supabase todavia no devolvio inicios de sesion recientes.
              </div>
            )}
          </div>
        </CardSection>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Actividad reciente de IA</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ultimas operaciones registradas con tokens, feature y modelo usado.
          </p>

          <div className="mt-5 space-y-3">
            {data.recentActivity.length ? (
              data.recentActivity.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{entry.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.featureKey} • {entry.model}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {entry.planId}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <p>Tokens: {formatNumber(entry.totalTokens)}</p>
                    <p>Costo: {formatCurrency(entry.estimatedCostUsd)}</p>
                    <p>Fecha: {formatDateTime(entry.createdAt)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Aun no hay actividad de IA para mostrar.
              </div>
            )}
          </div>
        </CardSection>

        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">Eventos de cobro recientes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Seguimiento de pagos y webhooks asociados a la facturacion.
          </p>

          <div className="mt-5 space-y-3">
            {data.recentBilling.length ? (
              data.recentBilling.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{entry.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.provider} • pago {entry.paymentId || "-"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {entry.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Plan: {entry.planId}</p>
                    <p>Fecha: {formatDateTime(entry.createdAt)}</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Todavia no hay eventos de billing guardados.
              </div>
            )}
          </div>
        </CardSection>
      </div>
    </div>
  );
}
