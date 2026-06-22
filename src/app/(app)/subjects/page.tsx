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

const SUBJECT_COLOR_LABELS = {
  "#FF8A65": "Coral",
  "#4DB6AC": "Menta",
  "#64B5F6": "Azul",
  "#9575CD": "Lavanda",
  "#F6BF26": "Dorado",
  "#81C784": "Verde",
  "#F06292": "Rosa",
  "#26C6DA": "Turquesa",
  "#FFD54F": "Amarillo",
  "#A1887F": "Taupe",
  "#7986CB": "Indigo",
  "#AED581": "Lima",
  "#FFB74D": "Naranja",
  "#90A4AE": "Gris",
  "#E57373": "Rojo",
} as const;

const SUBJECT_COLOR_OPTIONS = SUBJECT_COLORS.map((color) => ({
  value: color,
  label: SUBJECT_COLOR_LABELS[color as keyof typeof SUBJECT_COLOR_LABELS] || "Color",
}));

const initialForm = {
  name: "",
  description: "",
  professor: "",
  schedule: "",
  color: SUBJECT_COLORS[0],
};

export default function SubjectsPage() {
  const { subjects, addSubject, updateSubject, deleteSubject, loading, error } = useAppData();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [selectedColor, setSelectedColor] = useState(initialForm.color);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);

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
        description="Creá, editá y organizá cada materia con profesor, horario, descripción y color."
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
                placeholder="Lunes y miércoles 18:00"
                defaultValue={editing?.schedule || initialForm.schedule}
                className={inputClassName()}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                name="description"
                defaultValue={editing?.description || initialForm.description}
                className={textareaClassName()}
              />
            </Field>
            <Field label="Color">
              <input type="hidden" name="color" value={selectedColor} />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setColorMenuOpen((value) => !value)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full ring-2 ring-white/80"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {SUBJECT_COLOR_LABELS[selectedColor as keyof typeof SUBJECT_COLOR_LABELS] || "Color"}
                    </span>
                  </span>
                  <span className="text-sm text-slate-400">{colorMenuOpen ? "Cerrar" : "Elegir"}</span>
                </button>

                {colorMenuOpen ? (
                  <div className="absolute z-10 mt-2 w-full rounded-3xl border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="space-y-2">
                      {SUBJECT_COLOR_OPTIONS.map((option) => {
                        const selected = selectedColor === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setSelectedColor(option.value);
                              setColorMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-4 rounded-2xl border px-3 py-2 text-xs font-medium transition ${
                              selected
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <span
                              className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white/70"
                              style={{ backgroundColor: option.value }}
                            />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </Field>
            <div className="flex gap-3">
              <PrimaryButton type="submit">
                {editing ? "Guardar cambios" : "Crear materia"}
              </PrimaryButton>
              {editing ? (
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setSelectedColor(initialForm.color);
                    setColorMenuOpen(false);
                  }}
                >
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
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span>
                            {subject.color
                              ? SUBJECT_COLOR_LABELS[subject.color as keyof typeof SUBJECT_COLOR_LABELS] || "Color"
                              : "Color"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {subject.professor || "Profesor sin cargar"} -{" "}
                          {subject.schedule || "Horario sin cargar"}
                        </p>
                        <p className="mt-3 text-sm text-slate-600">{subject.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <SecondaryButton
                        type="button"
                        onClick={() => {
                          setEditing(subject);
                          setSelectedColor(subject.color || initialForm.color);
                          setColorMenuOpen(false);
                        }}
                      >
                        Editar
                      </SecondaryButton>
                      <SecondaryButton type="button" onClick={() => void deleteSubject(subject.id)}>
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
              title="Todavía no hay materias"
              description="Creá tu primera materia para vincular eventos, archivos y materiales generados."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
