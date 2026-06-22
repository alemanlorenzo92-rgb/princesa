import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateMercadoPagoWebhookSignature,
} from "@/lib/server/mercadopago";
import { processMercadoPagoPayment } from "@/lib/server/mercadopago-payment";

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
    const result = await processMercadoPagoPayment({
      admin,
      paymentId: dataId,
      payload,
      query: Object.fromEntries(url.searchParams.entries()),
    });

    return NextResponse.json({
      received: true,
      activated: result.activated,
      status: result.status,
    });
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
