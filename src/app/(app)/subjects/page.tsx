"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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
import { SUBJECT_COLORS } from "@/lib/constants";
import { Subject } from "@/types";

const initialForm = {
  name: "",
  description: "",
  professor: "",
  schedule: "",
  color: SUBJECT_COLORS[0],
};

export default function SubjectsPage() {
  const { subjects, addSubject, updateSubject, deleteSubject, loading, error } =
    useAppData();
  const [editing, setEditing] = useState<Subject | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      professor: String(formData.get("professor") || ""),
      schedule: String(formData.get("schedule") || ""),
      color: String(formData.get("color") || SUBJECT_COLORS[0]),
    };

    if (editing) {
      await updateSubject(editing.id, payload);
      setEditing(null);
    } else {
      await addSubject(payload);
    }

    event.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Materias"
        title="Mis materias"
        description="Crea, edita y organiza cada materia con profesor, horario, descripcion y color."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">
            {editing ? "Editar materia" : "Nueva materia"}
          </h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <Field label="Nombre">
              <input
                name="name"
                required
                defaultValue={editing?.name || initialForm.name}
                className={inputClassName()}
              />
            </Field>
            <Field label="Profesor">
              <input
                name="professor"
                defaultValue={editing?.professor || initialForm.professor}
                className={inputClassName()}
              />
            </Field>
            <Field label="Horario">
              <input
                name="schedule"
                placeholder="Lunes y miercoles 18:00"
                defaultValue={editing?.schedule || initialForm.schedule}
                className={inputClassName()}
              />
            </Field>
            <Field label="Descripcion">
              <textarea
                name="description"
                defaultValue={editing?.description || initialForm.description}
                className={textareaClassName()}
              />
            </Field>
            <Field label="Color">
              <select
                name="color"
                defaultValue={editing?.color || initialForm.color}
                className={inputClassName()}
              >
                {SUBJECT_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-3">
              <PrimaryButton type="submit">
                {editing ? "Guardar cambios" : "Crear materia"}
              </PrimaryButton>
              {editing ? (
                <SecondaryButton type="button" onClick={() => setEditing(null)}>
                  Cancelar
                </SecondaryButton>
              ) : null}
            </div>
          </form>
        </CardSection>

        <div className="space-y-4">
          {error ? <EmptyState title="No se pudieron cargar las materias" description={error} /> : null}
          {!error && loading ? (
            <EmptyState
              title="Cargando materias"
              description="Estamos trayendo tus materias desde Supabase."
            />
          ) : null}
          {!error && !loading && subjects.length
            ? subjects.map((subject) => (
                <CardSection key={subject.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 h-4 w-4 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">{subject.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {subject.professor || "Profesor sin cargar"} -{" "}
                          {subject.schedule || "Horario sin cargar"}
                        </p>
                        <p className="mt-3 text-sm text-slate-600">{subject.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <SecondaryButton type="button" onClick={() => setEditing(subject)}>
                        Editar
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => void deleteSubject(subject.id)}
                      >
                        Eliminar
                      </SecondaryButton>
                    </div>
                  </div>
                  <Link
                    href={`/subjects/${subject.id}`}
                    className="mt-4 inline-block text-sm font-semibold text-slate-900"
                  >
                    Ver detalle
                  </Link>
                </CardSection>
              ))
            : null}
          {!error && !loading && !subjects.length ? (
            <EmptyState
              title="No hay materias todavia"
              description="Crea tu primera materia para vincular eventos, archivos y materiales generados."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
