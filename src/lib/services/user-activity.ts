import { SupabaseClient } from "@supabase/supabase-js";

import {
  UserActivityAction,
  UserActivityLog,
  UserActivityLogRecord,
} from "@/types";

function mapUserActivityLog(record: UserActivityLogRecord): UserActivityLog {
  return {
    id: record.id,
    userId: record.user_id,
    action: record.action_key,
    entityType: record.entity_type || undefined,
    entityId: record.entity_id || undefined,
    title: record.title,
    detail: record.detail || undefined,
    metadata: record.metadata || undefined,
    createdAt: record.created_at,
  };
}

export async function getUserActivityLogs(
  supabase: SupabaseClient,
  limit = 100,
) {
  const { data, error } = await supabase
    .from("user_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((entry) => mapUserActivityLog(entry as UserActivityLogRecord));
}

export async function createUserActivityLog(
  supabase: SupabaseClient,
  {
    userId,
    action,
    entityType,
    entityId,
    title,
    detail,
    metadata,
  }: {
    userId: string;
    action: UserActivityAction;
    entityType?: string;
    entityId?: string;
    title: string;
    detail?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("user_activity_logs")
    .insert({
      user_id: userId,
      action_key: action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      title,
      detail: detail || null,
      metadata: metadata || null,
    })
    .select("*")
    .maybeSingle<UserActivityLogRecord>();

  if (error) throw error;
  return data ? mapUserActivityLog(data) : null;
}
