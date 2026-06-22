import { clsx } from "clsx";
import { format, isAfter, isBefore, isSameWeek, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { CalendarEvent, EventStatus } from "@/types";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function formatDate(value: string, withTime = false) {
  const date = parseISO(value);
  return format(date, withTime ? "d MMM, HH:mm" : "d MMM yyyy", {
    locale: es,
  });
}

export function getEventComputedStatus(event: CalendarEvent): EventStatus {
  if (event.status === "completed") return "completed";
  const baseDate = parseISO(event.date);
  return isBefore(baseDate, new Date()) ? "overdue" : "pending";
}

export function summarizeWeek(events: CalendarEvent[]) {
  const now = new Date();
  const currentWeek = events.filter((event) =>
    isSameWeek(parseISO(event.date), now, { weekStartsOn: 1 }),
  );

  return {
    total: currentWeek.length,
    pending: currentWeek.filter(
      (event) => getEventComputedStatus(event) === "pending",
    ).length,
    completed: currentWeek.filter(
      (event) => getEventComputedStatus(event) === "completed",
    ).length,
  };
}

export function sortUpcomingEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => {
    const aDate = parseISO(a.date);
    const bDate = parseISO(b.date);
    if (isAfter(aDate, bDate)) return 1;
    if (isBefore(aDate, bDate)) return -1;
    return (a.time || "").localeCompare(b.time || "");
  });
}

export function truncateText(value: string, size = 140) {
  if (value.length <= size) return value;
  return `${value.slice(0, size).trim()}...`;
}
