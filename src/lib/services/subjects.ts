import { SupabaseClient } from "@supabase/supabase-js";

import { Subject, SubjectRecord } from "@/types";

function mapSubject(record: SubjectRecord): Subject {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.name,
    description: record.description || "",
    professor: record.teacher || "",
    schedule: record.schedule || "",
    color: record.color || "#FF8A65",
    createdAt: record.created_at,
  };
}

export async function getAllSubjects(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((entry) => mapSubject(entry as SubjectRecord));
}

export async function getSubjectsByUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((entry) => mapSubject(entry as SubjectRecord));
}

export async function getSubjectById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSubject(data as SubjectRecord) : null;
}

export async function createSubject(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<Subject, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description,
      teacher: input.professor,
      schedule: input.schedule,
      color: input.color,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapSubject(data as SubjectRecord);
}

export async function updateSubject(
  supabase: SupabaseClient,
  id: string,
  input: Omit<Subject, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("subjects")
    .update({
      name: input.name,
      description: input.description,
      teacher: input.professor,
      schedule: input.schedule,
      color: input.color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapSubject(data as SubjectRecord);
}

export async function removeSubject(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}
