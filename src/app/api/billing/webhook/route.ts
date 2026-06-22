import { NextRequest, NextResponse } from "next/server";

import { createBillingEvent } from "@/lib/services/billing-events";
import { activateSubscriptionPlan } from "@/lib/services/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPaymentById,
  validateMercadoPagoWebhookSignature,
} from "@/lib/server/mercadopago";
import { PlanId } from "@/types";

function normalizePlanId(planId: unknown) {
  return planId === "student" || planId === "pro" ? (planId as Extract<PlanId, "student" | "pro">) : null;
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    payload = null;
  }

  const bodyData =
    payload && typeof payload.data === "object" && payload.data
      ? (payload.data as Record<string, unknown>)
      : null;
  const dataId =
    url.searchParams.get("data.id") ||
    (typeof bodyData?.id === "string" ? bodyData.id : null);
  const type =
    url.searchParams.get("type") ||
    url.searchParams.get("topic") ||
    (typeof payload?.type === "string" ? payload.type : null);

  if (!dataId || (type && type !== "payment")) {
    return NextResponse.json({ received: true });
  }

  try {
    validateMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "La firma del webhook no es valida.",
      },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  try {
    const payment = await getPaymentById(dataId);
    const metadata = (payment.metadata || {}) as Record<string, unknown>;
    const userId = typeof metadata.user_id === "string" ? metadata.user_id : null;
    const planId = normalizePlanId(metadata.plan_id);

    await createBillingEvent(admin, {
      userId,
      planId,
      providerEventId: dataId,
      providerPaymentId: payment.id ? String(payment.id) : dataId,
      status: payment.status || "unknown",
      rawEvent: {
        query: Object.fromEntries(url.searchParams.entries()),
        body: payload,
        payment,
      },
    });

    if (payment.status !== "approved" || !userId || !planId) {
      return NextResponse.json({ received: true });
    }

    await activateSubscriptionPlan(admin, userId, planId);

    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    console.error("Mercado Pago webhook failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el webhook de Mercado Pago.",
      },
      { status: 500 },
    );
  }
}
