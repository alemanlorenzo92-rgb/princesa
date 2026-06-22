"use client";

import Link from "next/link";

import { CardSection } from "@/components/card-section";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { EVENT_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import {
  formatDate,
  getEventComputedStatus,
  sortUpcomingEvents,
  summarizeWeek,
} from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { subjects, events, materials, documents, loading, error } = useAppData();
  const upcomingEvents = sortUpcomingEvents(events).slice(0, 5);
  const weekly = summarizeWeek(events);

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Hola, ${user?.name || "estudiante"}`}
        description="Tu semana académica resumida, con foco en lo urgente y accesos rápidos."
        action={
          <Link
            href="/study"
            className="rounded-2xl bg-coral-500 px-4 py-3 text-sm font-semibold text-white"
          >
            Abrir Estudio
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Materias activas" value={subjects.length} helper="Tus materias registradas." />
        <StatCard label="Próximos eventos" value={upcomingEvents.length} helper="Lo más urgente a la vista." accent="from-sky-400 to-cyan-300" />
        <StatCard label="Archivos cargados" value={documents.length} helper="PDFs y apuntes vinculados." accent="from-emerald-400 to-teal-300" />
        <StatCard label="Materiales IA" value={materials.length} helper="Resúmenes y guías guardadas." accent="from-violet-400 to-fuchsia-300" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <CardSection>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Proximos eventos</h2>
              <p className="mt-1 text-sm text-slate-500">Exámenes, entregas y recordatorios relevantes.</p>
            </div>
            <Link href="/calendar" className="text-sm font-semibold text-slate-900">
              Ver calendario
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {error ? (
              <EmptyState title="No se pudo cargar el dashboard" description={error} />
            ) : null}
            {!error && loading ? (
              <EmptyState
                title="Cargando resumen"
                description="Estamos trayendo tus materias, eventos y materiales desde Supabase."
              />
            ) : null}
            {!error && !loading && upcomingEvents.length
              ? upcomingEvents.map((event) => {
                  const computedStatus = getEventComputedStatus(event);
                  const subject = subjects.find((entry) => entry.id === event.subjectId);

                  return (
                    <article
                      key={event.id}
                      className="rounded-3xl border border-slate-100 bg-slate-50/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                            {EVENT_TYPE_LABELS[event.type]}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                          {STATUS_LABELS[computedStatus]}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        {subject?.name || "Sin materia"} · {formatDate(event.date)}
                        {event.time ? ` · ${event.time}` : ""}
                      </p>
                    </article>
                  );
                })
              : null}
            {!error && !loading && !upcomingEvents.length ? (
              <EmptyState
                title="Todavía no hay eventos cargados"
                description="Creá tu primera fecha importante para ver alertas y un resumen semanal."
              />
            ) : null}
          </div>
        </CardSection>

        <div className="space-y-4">
          <CardSection>
            <h2 className="text-lg font-semibold text-slate-950">Resumen de la semana</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm text-slate-500">Agenda total</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{weekly.total}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-sm text-slate-500">Pendientes</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{weekly.pending}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-slate-500">Completados</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{weekly.completed}</p>
              </div>
            </div>
          </CardSection>

          <CardSection>
            <h2 className="text-lg font-semibold text-slate-950">Accesos rápidos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link href="/subjects" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                Nueva materia
              </Link>
              <Link href="/calendar" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                Nueva fecha
              </Link>
              <Link href="/study" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                Ir a Estudio
              </Link>
              <Link href="/materials" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                Ver materiales
              </Link>
            </div>
          </CardSection>
        </div>
      </div>
    </div>
  );
}
