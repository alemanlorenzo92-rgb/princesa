import { SupabaseClient } from "@supabase/supabase-js";

import { PushSubscriptionRecord } from "@/types";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

function mapPushSubscription(record: PushSubscriptionRecord) {
  return {
    id: record.id,
    userId: record.user_id,
    endpoint: record.endpoint,
    p256dh: record.p256dh,
    auth: record.auth,
    userAgent: record.user_agent || undefined,
    isActive: record.is_active,
    lastSeenAt: record.last_seen_at || undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function getUserPushSubscriptions(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((entry) => mapPushSubscription(entry as PushSubscriptionRecord));
}

export async function savePushSubscription(
  supabase: SupabaseClient,
  userId: string,
  input: PushSubscriptionInput,
) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent || null,
        is_active: true,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "endpoint",
      },
    )
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return mapPushSubscription(data as PushSubscriptionRecord);
}

export async function removePushSubscription(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) throw error;
}
