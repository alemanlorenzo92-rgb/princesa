import { SupabaseClient } from "@supabase/supabase-js";

import { BillingEventRecord, PlanId } from "@/types";

export async function createBillingEvent(
  supabase: SupabaseClient,
  input: {
    userId?: string | null;
    planId?: PlanId | null;
    providerEventId?: string | null;
    providerPaymentId?: string | null;
    status?: string | null;
    rawEvent?: Record<string, unknown> | null;
  },
) {
  const { data, error } = await supabase
    .from("billing_events")
    .insert({
      user_id: input.userId || null,
      plan_id: input.planId || null,
      provider: "mercadopago",
      provider_event_id: input.providerEventId || null,
      provider_payment_id: input.providerPaymentId || null,
      status: input.status || null,
      raw_event: input.rawEvent || null,
    })
    .select("*")
    .maybeSingle<BillingEventRecord>();

  if (error) throw error;
  return data;
}
