import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getPaymentIdentity,
  processMercadoPagoPayment,
} from "@/lib/server/mercadopago-payment";
import { getPaymentById } from "@/lib/server/mercadopago";

function getPaymentIdFromRequest(request: NextRequest) {
  const url = new URL(request.url);
  return (
    url.searchParams.get("payment_id") ||
    url.searchParams.get("collection_id") ||
    null
  );
}

export async function GET(request: NextRequest) {
  const paymentId = getPaymentIdFromRequest(request);

  if (!paymentId) {
    return NextResponse.json(
      { error: "Falta payment_id o collection_id en el retorno de Mercado Pago." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Necesitas iniciar sesion para confirmar el pago." },
      { status: 401 },
    );
  }

  try {
    const payment = (await getPaymentById(paymentId)) as unknown as Record<string, unknown>;
    const paymentIdentity = getPaymentIdentity(payment);

    if (paymentIdentity.userId && paymentIdentity.userId !== user.id) {
      return NextResponse.json(
        { error: "Este pago no pertenece a tu cuenta." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const result = await processMercadoPagoPayment({
      admin,
      paymentId,
      query: Object.fromEntries(new URL(request.url).searchParams.entries()),
    });

    return NextResponse.json({
      paymentId: result.paymentId,
      status: result.status,
      planId: result.planId,
      activated: result.activated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar el pago con Mercado Pago.",
      },
      { status: 500 },
    );
  }
}
