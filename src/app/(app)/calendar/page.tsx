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
  formatReminderOffsetMinutes,
  PRIORITY_LABELS,
  REMINDER_OPTIONS,
  STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, sortUpcomingEvents } from "@/lib/utils";
import { CalendarEvent, ReminderUnit } from "@/types";

const eventTypes = ["exam", "assignment", "delivery", "class", "custom"] as const;
const priorities = ["low", "medium", "high"] as const;
const statuses = ["pending", "completed", "overdue"] as const;

function decomposeReminderOffsetMinutes(value?: number) {
  if (value === undefined) {
    return {
      selection: "",
      customAmount: "1",
      customUnit: "days" as ReminderUnit,
    };
  }

  if (REMINDER_OPTIONS.some((option) => option.value === value)) {
    return {
      selection: String(value),
      customAmount: "1",
      customUnit: "days" as ReminderUnit,
    };
  }

  if (value % 1440 === 0) {
    return {
      selection: "custom",
      customAmount: String(value / 1440),
      customUnit: "days" as ReminderUnit,
    };
  }

  if (value % 60 === 0) {
    return {
      selection: "custom",
      customAmount: String(value / 60),
      customUnit: "hours" as ReminderUnit,
    };
  }

  return {
    selection: "custom",
    customAmount: String(value),
    customUnit: "minutes" as ReminderUnit,
  };
}

function buildReminderOffsetMinutes(
  selection: string,
  customAmount: string,
  customUnit: ReminderUnit,
) {
  if (!selection) {
    return undefined;
  }

  if (selection !== "custom") {
    const parsed = Number(selection);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  }

  const amount = Number(customAmount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return undefined;
  }

  if (customUnit === "days") {
    return amount * 1440;
  }

  if (customUnit === "hours") {
    return amount * 60;
  }

  return amount;
}

function EventForm({
  editing,
  subjects,
  onSubmit,
  onCancel,
}: {
  editing: CalendarEvent | null;
  subjects: Array<{ id: string; name: string }>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCancel: () => void;
}) {
  const initialReminder = decomposeReminderOffsetMinutes(
    editing?.reminderOffsetMinutes,
  );
  const [reminderSelection, setReminderSelection] = useState(
    initialReminder.selection,
  );
  const [customReminderAmount, setCustomReminderAmount] = useState(
    initialReminder.customAmount,
  );
  const [customReminderUnit, setCustomReminderUnit] = useState<ReminderUnit>(
    initialReminder.customUnit,
  );

  return (
    <form
      key={editing?.id || "new"}
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const reminderOffsetMinutes = buildReminderOffsetMinutes(
          reminderSelection,
          customReminderAmount,
          customReminderUnit,
        );

        if (reminderSelection === "custom" && reminderOffsetMinutes === undefined) {
          event.preventDefault();
          return;
        }

        if (reminderOffsetMinutes === undefined) {
          form.dataset.reminderOffsetMinutes = "";
        } else {
          form.dataset.reminderOffsetMinutes = String(reminderOffsetMinutes);
        }

        void onSubmit(event);
      }}
    >
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
      <Field label="Título">
        <input name="title" required defaultValue={editing?.title || ""} className={inputClassName()} />
      </Field>
      <Field label="Descripción">
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
        <Field label="Recordatorio">
          <select
            value={reminderSelection}
            onChange={(inputEvent) => setReminderSelection(inputEvent.target.value)}
            className={inputClassName()}
          >
            <option value="">Sin recordatorio</option>
            {REMINDER_OPTIONS.map((reminder) => (
              <option key={reminder.value} value={reminder.value}>
                {reminder.label}
              </option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
        </Field>
        {reminderSelection === "custom" ? (
          <>
            <Field label="Cantidad">
              <input
                type="number"
                min="1"
                step="1"
                value={customReminderAmount}
                onChange={(inputEvent) =>
                  setCustomReminderAmount(inputEvent.target.value)
                }
                className={inputClassName()}
              />
            </Field>
            <Field label="Unidad">
              <select
                value={customReminderUnit}
                onChange={(inputEvent) =>
                  setCustomReminderUnit(inputEvent.target.value as ReminderUnit)
                }
                className={inputClassName()}
              >
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
                <option value="days">Días</option>
              </select>
            </Field>
          </>
        ) : null}
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
          <SecondaryButton type="button" onClick={onCancel}>
            Cancelar
          </SecondaryButton>
        ) : null}
      </div>
    </form>
  );
}

export default function CalendarPage() {
  const { subjects, events, addEvent, updateEvent, deleteEvent, loading, error } =
    useAppData();
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const sortedEvents = sortUpcomingEvents(events);

  function stopEditing() {
    setEditing(null);
  }

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
      reminderOffsetMinutes: (() => {
        const rawValue = event.currentTarget.dataset.reminderOffsetMinutes;
        const parsed = Number(rawValue);

        return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
      })(),
      priority: String(formData.get("priority") || "medium") as CalendarEvent["priority"],
      status: String(formData.get("status") || "pending") as CalendarEvent["status"],
    };

    if (editing) {
      await updateEvent(editing.id, payload);
      stopEditing();
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
          <EventForm
            key={editing?.id || "new"}
            editing={editing}
            subjects={subjects}
            onSubmit={handleSubmit}
            onCancel={stopEditing}
          />
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
                        <p className="mt-2 text-sm text-slate-600">
                          Recordatorio:{" "}
                          {event.reminderOffsetMinutes !== undefined
                            ? formatReminderOffsetMinutes(event.reminderOffsetMinutes)
                            : "Sin recordatorio"}
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
