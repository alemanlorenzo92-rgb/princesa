import { SupabaseClient } from "@supabase/supabase-js";

import { PlanId, SubscriptionRecord } from "@/types";

function isExpiredPaidSubscription(subscription: SubscriptionRecord | null) {
  if (!subscription) return false;
  if (!(subscription.plan_id === "student" || subscription.plan_id === "pro")) return false;
  if (!subscription.current_period_end) return false;
  return new Date(subscription.current_period_end).getTime() < Date.now();
}

async function normalizeExpiredSubscription(
  supabase: SupabaseClient,
  subscription: SubscriptionRecord | null,
) {
  if (!subscription) {
    return subscription;
  }

  if (!isExpiredPaidSubscription(subscription)) {
    return subscription;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: "expired_trial",
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)
    .select("*")
    .maybeSingle<SubscriptionRecord>();

  if (error) throw error;
  return data;
}

export async function getCurrentSubscription(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRecord>();

  if (error) throw error;
  return normalizeExpiredSubscription(supabase, data);
}

export async function updateSubscriptionPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: PlanId,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: planId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle<SubscriptionRecord>();

  if (error) throw error;
  return data;
}

export async function activateSubscriptionPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: Extract<PlanId, "student" | "pro">,
) {
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: planId,
      status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle<SubscriptionRecord>();

  if (error) throw error;
  return data;
}
