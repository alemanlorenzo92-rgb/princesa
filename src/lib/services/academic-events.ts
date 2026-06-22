import { SupabaseClient } from "@supabase/supabase-js";

import { AcademicEventRecord, CalendarEvent } from "@/types";

function mapAcademicEvent(record: AcademicEventRecord): CalendarEvent {
  return {
    id: record.id,
    userId: record.user_id,
    subjectId: record.subject_id || "",
    title: record.title,
    description: record.description || "",
    type: record.type || "custom",
    date: record.event_date,
    time: record.event_time || undefined,
    reminderOffsetMinutes:
      record.reminder_offset_minutes === null
        ? undefined
        : record.reminder_offset_minutes,
    priority: record.priority || "medium",
    status: record.status || "pending",
    createdAt: record.created_at,
  };
}

function normalizeReminderOffsetMinutes(
  reminderOffsetMinutes: CalendarEvent["reminderOffsetMinutes"],
) {
  if (
    typeof reminderOffsetMinutes === "number" &&
    Number.isInteger(reminderOffsetMinutes) &&
    reminderOffsetMinutes >= 0 &&
    reminderOffsetMinutes <= 525600
  ) {
    return reminderOffsetMinutes;
  }

  return null;
}

export async function getAllAcademicEvents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("academic_events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data || []).map((entry) => mapAcademicEvent(entry as AcademicEventRecord));
}

export async function getAcademicEventById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("academic_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapAcademicEvent(data as AcademicEventRecord) : null;
}

export async function getUpcomingEvents(supabase: SupabaseClient) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("academic_events")
    .select("*")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(10);

  if (error) throw error;
  return (data || []).map((entry) => mapAcademicEvent(entry as AcademicEventRecord));
}

export async function getEventsBySubject(supabase: SupabaseClient, subjectId: string) {
  const { data, error } = await supabase
    .from("academic_events")
    .select("*")
    .eq("subject_id", subjectId)
    .order("event_date", { ascending: true });

  if (error) throw error;
  return (data || []).map((entry) => mapAcademicEvent(entry as AcademicEventRecord));
}

export async function createAcademicEvent(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<CalendarEvent, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("academic_events")
    .insert({
      user_id: userId,
      subject_id: input.subjectId || null,
      title: input.title,
      description: input.description,
      type: input.type,
      event_date: input.date,
      event_time: input.time || null,
      reminder_offset_minutes: normalizeReminderOffsetMinutes(
        input.reminderOffsetMinutes,
      ),
      reminder_sent_at: null,
      priority: input.priority,
      status: input.status,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapAcademicEvent(data as AcademicEventRecord);
}

export async function updateAcademicEvent(
  supabase: SupabaseClient,
  id: string,
  input: Omit<CalendarEvent, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("academic_events")
    .update({
      subject_id: input.subjectId || null,
      title: input.title,
      description: input.description,
      type: input.type,
      event_date: input.date,
      event_time: input.time || null,
      reminder_offset_minutes: normalizeReminderOffsetMinutes(
        input.reminderOffsetMinutes,
      ),
      reminder_sent_at: null,
      priority: input.priority,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapAcademicEvent(data as AcademicEventRecord);
}

export async function removeAcademicEvent(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("academic_events").delete().eq("id", id);
  if (error) throw error;
}
