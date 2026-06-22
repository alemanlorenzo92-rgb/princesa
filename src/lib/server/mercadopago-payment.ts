import "server-only";

import { SupabaseClient } from "@supabase/supabase-js";

import { createBillingEvent } from "@/lib/services/billing-events";
import { activateSubscriptionPlan } from "@/lib/services/subscription";
import { getPaymentById } from "@/lib/server/mercadopago";
import { PlanId } from "@/types";

function normalizePlanId(planId: unknown) {
  return planId === "student" || planId === "pro"
    ? (planId as Extract<PlanId, "student" | "pro">)
    : null;
}

function parseExternalReference(reference: unknown) {
  if (typeof reference !== "string") {
    return {
      userId: null,
      planId: null,
    };
  }

  const [userId, rawPlanId] = reference.split(":");

  return {
    userId: userId || null,
    planId: normalizePlanId(rawPlanId),
  };
}

function getPaymentMetadata(payment: Record<string, unknown>) {
  const metadata =
    payment.metadata && typeof payment.metadata === "object"
      ? (payment.metadata as Record<string, unknown>)
      : {};
  const external = parseExternalReference(payment.external_reference);

  return {
    userId:
      (typeof metadata.user_id === "string" ? metadata.user_id : null) ||
      external.userId,
    planId: normalizePlanId(metadata.plan_id) || external.planId,
  };
}

export interface ProcessMercadoPagoPaymentResult {
  paymentId: string;
  status: string;
  userId: string | null;
  planId: Extract<PlanId, "student" | "pro"> | null;
  activated: boolean;
  payment: Record<string, unknown>;
}

export async function processMercadoPagoPayment({
  admin,
  paymentId,
  payload,
  query,
}: {
  admin: SupabaseClient;
  paymentId: string;
  payload?: Record<string, unknown> | null;
  query?: Record<string, string> | null;
}): Promise<ProcessMercadoPagoPaymentResult> {
  const payment = (await getPaymentById(paymentId)) as unknown as Record<string, unknown>;
  const { userId, planId } = getPaymentMetadata(payment);
  const status = typeof payment.status === "string" ? payment.status : "unknown";

  await createBillingEvent(admin, {
    userId,
    planId,
    providerEventId: paymentId,
    providerPaymentId:
      typeof payment.id === "string" || typeof payment.id === "number"
        ? String(payment.id)
        : paymentId,
    status,
    rawEvent: {
      query: query || null,
      body: payload || null,
      payment,
    },
  });

  let activated = false;

  if (status === "approved" && userId && planId) {
    await activateSubscriptionPlan(admin, userId, planId);
    activated = true;
  }

  return {
    paymentId:
      typeof payment.id === "string" || typeof payment.id === "number"
        ? String(payment.id)
        : paymentId,
    status,
    userId,
    planId,
    activated,
    payment,
  };
}

export function getPaymentIdentity(payment: Record<string, unknown>) {
  return getPaymentMetadata(payment);
}
