import { SupabaseClient } from "@supabase/supabase-js";

import { AiConversation, AiConversationRecord } from "@/types";

function mapConversation(record: AiConversationRecord): AiConversation {
  return {
    id: record.id,
    userId: record.user_id,
    subjectId: record.subject_id || undefined,
    fileId: record.file_id || undefined,
    title: record.title,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function getConversations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((entry) => mapConversation(entry as AiConversationRecord));
}

export async function getConversationById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapConversation(data as AiConversationRecord) : null;
}

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<AiConversation, "id" | "userId" | "createdAt" | "updatedAt">,
) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      subject_id: input.subjectId || null,
      file_id: input.fileId || null,
      title: input.title,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapConversation(data as AiConversationRecord);
}

export async function updateConversation(
  supabase: SupabaseClient,
  id: string,
  input: Partial<Omit<AiConversation, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .update({
      subject_id: input.subjectId === undefined ? undefined : input.subjectId || null,
      file_id: input.fileId === undefined ? undefined : input.fileId || null,
      title: input.title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? mapConversation(data as AiConversationRecord) : null;
}

export async function deleteConversation(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) throw error;
}
