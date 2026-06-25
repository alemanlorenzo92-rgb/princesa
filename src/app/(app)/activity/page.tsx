"use client";

import { useEffect } from "react";

import { CardSection } from "@/components/card-section";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useAppData } from "@/hooks/use-app-data";
import { formatDate } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  subject_created: "Materia creada",
  subject_deleted: "Materia eliminada",
  file_uploaded: "Archivo cargado",
  file_deleted: "Archivo eliminado",
  file_text_extracted: "Texto extraido",
  material_generated: "Material generado",
  material_saved: "Material guardado",
  material_deleted: "Material eliminado",
  chat_message_sent: "Pregunta enviada",
  chat_conversation_created: "Conversacion creada",
  chat_conversation_deleted: "Conversacion eliminada",
};

export default function ActivityPage() {
  const { activityLogs, loading, error, refresh } = useAppData();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div>
      <PageHeader
        eyebrow="Actividad"
        title="Tu historial"
        description="Aca ves un registro de lo que fuiste haciendo: archivos, materiales, chat y cambios importantes."
      />

      <div className="space-y-4">
        {error ? <EmptyState title="No se pudo cargar la actividad" description={error} /> : null}
        {!error && loading ? (
          <EmptyState
            title="Cargando actividad"
            description="Estamos trayendo tu historial desde Supabase."
          />
        ) : null}
        {!error && !loading && activityLogs.length
          ? activityLogs.map((entry) => (
              <CardSection key={entry.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{entry.title}</p>
                    {entry.detail ? (
                      <p className="mt-2 text-sm text-slate-600">{entry.detail}</p>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-500">{formatDate(entry.createdAt, true)}</p>
                </div>
              </CardSection>
            ))
          : null}
        {!error && !loading && !activityLogs.length ? (
          <EmptyState
            title="Todavia no hay actividad registrada"
            description="Cuando subas archivos, generes materiales o uses el chat, te va a aparecer todo aca."
          />
        ) : null}
      </div>
    </div>
  );
}
