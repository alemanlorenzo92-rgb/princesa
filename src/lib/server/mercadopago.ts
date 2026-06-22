import "server-only";

import MercadoPagoConfig, {
  Payment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";

import { PlanId } from "@/types";

const BILLABLE_PLAN_IDS: Array<Extract<PlanId, "student" | "pro">> = ["student", "pro"];

function requireAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL no esta configurada.");
  }

  return appUrl.replace(/\/$/, "");
}

export function getMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no esta configurado en el servidor.");
  }

  return new MercadoPagoConfig({
    accessToken,
  });
}

export function getBillablePlanPrice(planId: string) {
  if (!BILLABLE_PLAN_IDS.includes(planId as Extract<PlanId, "student" | "pro">)) {
    throw new Error("Plan invalido para facturacion.");
  }

  const envKey =
    planId === "student" ? "MERCADOPAGO_STUDENT_PRICE" : "MERCADOPAGO_PRO_PRICE";
  const rawPrice = process.env[envKey];
  const amount = Number(rawPrice);

  if (!rawPrice || Number.isNaN(amount) || amount <= 0) {
    throw new Error(`El precio de ${planId} no esta configurado correctamente en ${envKey}.`);
  }

  return amount;
}

export function getBillingPlanCatalog() {
  return BILLABLE_PLAN_IDS.map((planId) => ({
    planId,
    amount: getBillablePlanPrice(planId),
  }));
}

export async function createCheckoutPreference({
  userId,
  planId,
  payerEmail,
}: {
  userId: string;
  planId: Extract<PlanId, "student" | "pro">;
  payerEmail: string;
}) {
  const client = getMercadoPagoConfig();
  const preference = new Preference(client);
  const appUrl = requireAppUrl();
  const amount = getBillablePlanPrice(planId);

  const response = await preference.create({
    body: {
      items: [
        {
          id: `plan-${planId}`,
          title: planId === "student" ? "Plan Estudiante" : "Plan Pro",
          quantity: 1,
          unit_price: amount,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: payerEmail,
      },
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
      external_reference: `${userId}:${planId}`,
      back_urls: {
        success: `${appUrl}/billing/success`,
        failure: `${appUrl}/billing/failure`,
        pending: `${appUrl}/billing/pending`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/billing/webhook`,
    },
  });

  return {
    initPoint: response.init_point,
    sandboxInitPoint: response.sandbox_init_point,
    preferenceId: response.id,
  };
}

export async function getPaymentById(paymentId: string | number) {
  const client = getMercadoPagoConfig();
  const payment = new Payment(client);
  return payment.get({ id: String(paymentId) });
}

export function validateMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    return;
  }

  WebhookSignatureValidator.validate({
    xSignature,
    xRequestId,
    dataId,
    secret,
    toleranceSeconds: 300,
  });
}
