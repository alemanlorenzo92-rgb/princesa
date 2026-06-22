import { NextResponse } from "next/server";

import { getBillingPlanCatalog } from "@/lib/server/mercadopago";

export async function GET() {
  try {
    return NextResponse.json({
      plans: getBillingPlanCatalog(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los planes de facturacion.",
      },
      { status: 500 },
    );
  }
}
