import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createCheckoutPreference } from "@/lib/server/mercadopago";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  planId: z.enum(["student", "pro"]),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json(
      { error: "No se pudo validar la sesion actual." },
      { status: 401 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "Necesitas iniciar sesion para contratar un plan." },
      { status: 401 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es JSON valido." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Plan invalido para facturacion." },
      { status: 400 },
    );
  }

  try {
    const preference = await createCheckoutPreference({
      userId: user.id,
      planId: parsed.data.planId,
      payerEmail: user.email || "",
    });

    return NextResponse.json({
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      preferenceId: preference.preferenceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el checkout de Mercado Pago.",
      },
      { status: 500 },
    );
  }
}
