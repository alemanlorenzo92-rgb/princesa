import { SupabaseClient } from "@supabase/supabase-js";

import { AiMessage, AiMessageRecord } from "@/types";

function mapMessage(record: AiMessageRecord): AiMessage {
  return {
    id: record.id,
    userId: record.user_id,
    conversationId: record.conversation_id,
    role: record.role,
    content: record.content,
    model: record.model || undefined,
    inputTokens: record.input_tokens || undefined,
    outputTokens: record.output_tokens || undefined,
    totalTokens: record.total_tokens || undefined,
    createdAt: record.created_at,
  };
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit?: number,
) {
  let query = supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((entry) => mapMessage(entry as AiMessageRecord));
}

export async function createMessage(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<AiMessage, "id" | "userId" | "createdAt">,
) {
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      user_id: userId,
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      model: input.model || null,
      input_tokens: input.inputTokens || 0,
      output_tokens: input.outputTokens || 0,
      total_tokens: input.totalTokens || 0,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapMessage(data as AiMessageRecord);
}

export async function deleteMessagesByConversation(
  supabase: SupabaseClient,
  conversationId: string,
) {
  const { error } = await supabase
    .from("ai_messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (error) throw error;
}
