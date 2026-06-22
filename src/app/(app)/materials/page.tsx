"use client";

import { useState } from "react";

import { CardSection } from "@/components/card-section";
import { EmptyState } from "@/components/empty-state";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  inputClassName,
  textareaClassName,
} from "@/components/forms";
import { PageHeader } from "@/components/page-header";
import { useAppData } from "@/hooks/use-app-data";
import { exportMaterialToPdf } from "@/lib/pdf";
import { formatDate, truncateText } from "@/lib/utils";
import { StudyMaterial } from "@/types";

export default function MaterialsPage() {
  const { subjects, materials, updateMaterial, deleteMaterial, loading, error } =
    useAppData();
  const [editing, setEditing] = useState<StudyMaterial | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow="Biblioteca"
        title="Materiales guardados"
        description="Revisá, editá, eliminá y exportá tus materiales sin salir de tu biblioteca."
      />

      {editing ? (
        <CardSection className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">Editar material</h2>
          <div className="mt-4 space-y-4">
            <Field label="Título">
              <input
                value={editing.title}
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                className={inputClassName()}
              />
            </Field>
            <Field label="Contenido">
              <textarea
                value={editing.content}
                onChange={(event) => setEditing({ ...editing, content: event.target.value })}
                className={textareaClassName("min-h-64")}
              />
            </Field>
            <div className="flex gap-3">
              <PrimaryButton
                type="button"
                onClick={async () => {
                  await updateMaterial(editing.id, {
                    subjectId: editing.subjectId,
                    documentId: editing.documentId,
                    title: editing.title,
                    type: editing.type,
                    detailLevel: editing.detailLevel,
                    style: editing.style,
                    content: editing.content,
                  });
                  setEditing(null);
                }}
              >
                Guardar cambios
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Cancelar
              </SecondaryButton>
            </div>
          </div>
        </CardSection>
      ) : null}

      <div className="space-y-4">
        {error ? <EmptyState title="No se pudieron cargar los materiales" description={error} /> : null}
        {!error && loading ? (
          <EmptyState title="Cargando materiales" description="Estamos trayendo tu biblioteca desde Supabase." />
        ) : null}
        {!error && !loading && materials.length
          ? materials.map((material) => {
              const subject = subjects.find((entry) => entry.id === material.subjectId);
              return (
                <CardSection key={material.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{material.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {subject?.name || "Sin materia"} - {formatDate(material.createdAt)}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {truncateText(material.content, 240)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton type="button" onClick={() => setEditing(material)}>
                        Editar
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          exportMaterialToPdf({
                            appName: "EstudioAI",
                          subjectName: subject?.name || "Materia sin nombre",
                          title: material.title,
                          createdAt: formatDate(material.createdAt),
                          content: material.content,
                        })
                      }
                      >
                        PDF
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => void deleteMaterial(material.id)}
                      >
                        Eliminar
                      </SecondaryButton>
                    </div>
                  </div>
                </CardSection>
              );
            })
          : null}
        {!error && !loading && !materials.length ? (
          <EmptyState
            title="No hay materiales guardados"
            description="Generá tu primer resumen desde la pantalla de IA y aparecerá acá."
          />
        ) : null}
      </div>
    </div>
  );
}
