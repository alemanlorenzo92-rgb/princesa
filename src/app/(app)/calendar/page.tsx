"use client";

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
import {
  EVENT_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, sortUpcomingEvents } from "@/lib/utils";
import { CalendarEvent } from "@/types";

const eventTypes = ["exam", "assignment", "delivery", "class", "custom"] as const;
const priorities = ["low", "medium", "high"] as const;
const statuses = ["pending", "completed", "overdue"] as const;

export default function CalendarPage() {
  const { subjects, events, addEvent, updateEvent, deleteEvent, loading, error } =
    useAppData();
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const sortedEvents = sortUpcomingEvents(events);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      subjectId: String(formData.get("subjectId") || ""),
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      type: String(formData.get("type") || "custom") as CalendarEvent["type"],
      date: String(formData.get("date") || ""),
      time: String(formData.get("time") || ""),
      priority: String(formData.get("priority") || "medium") as CalendarEvent["priority"],
      status: String(formData.get("status") || "pending") as CalendarEvent["status"],
    };

    if (editing) {
      await updateEvent(editing.id, payload);
      setEditing(null);
    } else {
      await addEvent(payload);
    }

    event.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Calendario"
        title="Fechas y recordatorios"
        description="Centraliza examenes, trabajos practicos, entregas y fechas personalizadas."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CardSection>
          <h2 className="text-lg font-semibold text-slate-950">
            {editing ? "Editar evento" : "Nuevo evento"}
          </h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <Field label="Materia">
              <select
                name="subjectId"
                required
                defaultValue={editing?.subjectId || ""}
                className={inputClassName()}
              >
                <option value="" disabled>
                  Seleccionar materia
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Titulo">
              <input name="title" required defaultValue={editing?.title || ""} className={inputClassName()} />
            </Field>
            <Field label="Descripcion">
              <textarea
                name="description"
                defaultValue={editing?.description || ""}
                className={textareaClassName()}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <select name="type" defaultValue={editing?.type || "exam"} className={inputClassName()}>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha">
                <input name="date" type="date" required defaultValue={editing?.date || ""} className={inputClassName()} />
              </Field>
              <Field label="Hora opcional">
                <input name="time" type="time" defaultValue={editing?.time || ""} className={inputClassName()} />
              </Field>
              <Field label="Prioridad">
                <select name="priority" defaultValue={editing?.priority || "medium"} className={inputClassName()}>
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <select name="status" defaultValue={editing?.status || "pending"} className={inputClassName()}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex gap-3">
              <PrimaryButton type="submit">
                {editing ? "Guardar evento" : "Crear evento"}
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
          {error ? <EmptyState title="No se pudieron cargar los eventos" description={error} /> : null}
          {!error && loading ? (
            <EmptyState title="Cargando calendario" description="Estamos trayendo tus eventos desde Supabase." />
          ) : null}
          {!error && !loading && sortedEvents.length
            ? sortedEvents.map((event) => {
                const subject = subjects.find((entry) => entry.id === event.subjectId);
                return (
                  <CardSection key={event.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">{event.title}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {subject?.name || "Sin materia"} - {EVENT_TYPE_LABELS[event.type]}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          {formatDate(event.date)}
                          {event.time ? ` - ${event.time}` : ""}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <SecondaryButton type="button" onClick={() => setEditing(event)}>
                          Editar
                        </SecondaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() => void deleteEvent(event.id)}
                        >
                          Eliminar
                        </SecondaryButton>
                      </div>
                    </div>
                  </CardSection>
                );
              })
            : null}
          {!error && !loading && !sortedEvents.length ? (
            <EmptyState
              title="Tu calendario esta vacio"
              description="Agrega una fecha importante para empezar a ver el tablero semanal."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
