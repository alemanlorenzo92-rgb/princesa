"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

type BillingReturnMode = "success" | "pending" | "failure";

interface BillingReturnStatusProps {
  mode: BillingReturnMode;
}

interface ConfirmPaymentResponse {
  paymentId?: string;
  status?: string;
  planId?: string | null;
  activated?: boolean;
  error?: string;
}

function getDefaultContent(mode: BillingReturnMode) {
  if (mode === "success") {
    return {
      title: "Pago recibido",
      description:
        "Estamos validando tu pago y activando tu plan para que veas el cambio enseguida.",
    };
  }

  if (mode === "pending") {
    return {
      title: "Tu pago esta pendiente",
      description:
        "Mercado Pago todavia no marco la operacion como aprobada. Si cambia, tu plan se activara automaticamente.",
    };
  }

  return {
    title: "No se pudo completar el pago",
    description:
      "Mercado Pago no confirmo el cobro. Puedes volver a intentar desde la pantalla de planes.",
  };
}

export function BillingReturnStatus({ mode }: BillingReturnStatusProps) {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [message, setMessage] = useState(getDefaultContent(mode).description);
  const [loading, setLoading] = useState(mode !== "failure");
  const [detail, setDetail] = useState("");

  const paymentId = useMemo(
    () =>
      searchParams.get("payment_id") ||
      searchParams.get("collection_id") ||
      "",
    [searchParams],
  );
  const queryStatus = useMemo(
    () =>
      searchParams.get("status") ||
      searchParams.get("collection_status") ||
      "",
    [searchParams],
  );
  const title = getDefaultContent(mode).title;
  const fallbackDetail = queryStatus
    ? `Estado devuelto por Mercado Pago: ${queryStatus}.`
    : "";
  const shouldConfirm = mode !== "failure" && Boolean(paymentId);

  useEffect(() => {
    if (!shouldConfirm) {
      return;
    }

    let active = true;

    async function confirmPayment() {
      try {
        const response = await fetch(
          `/api/billing/confirm-payment?payment_id=${encodeURIComponent(paymentId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = (await response.json().catch(() => null)) as ConfirmPaymentResponse | null;

        if (!active) return;

        if (!response.ok) {
          throw new Error(payload?.error || "No se pudo confirmar el pago.");
        }

        if (payload?.activated && payload.planId) {
          setMessage(`Tu plan ${payload.planId} ya esta activo.`);
          setDetail(`Pago ${payload.paymentId || paymentId} aprobado correctamente.`);
          await refreshUser();
          return;
        }

        if (payload?.status === "approved") {
          setMessage("Mercado Pago aprobo el pago y estamos sincronizando tu plan.");
          setDetail(`Pago ${payload.paymentId || paymentId} aprobado.`);
          await refreshUser();
          return;
        }

        if (payload?.status) {
          setMessage(
            payload.status === "pending" || payload.status === "in_process"
              ? "El pago sigue pendiente de confirmacion."
              : "Mercado Pago devolvio un estado distinto al aprobado.",
          );
          setDetail(`Estado actual: ${payload.status}.`);
          return;
        }

        setDetail(`Pago ${paymentId} registrado.`);
      } catch (error) {
        if (!active) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudo validar el pago con Mercado Pago.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void confirmPayment();

    return () => {
      active = false;
    };
  }, [paymentId, refreshUser, shouldConfirm]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-3xl bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Billing
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        {detail || fallbackDetail ? (
          <p className="mt-3 text-sm text-slate-500">{detail || fallbackDetail}</p>
        ) : null}
        {shouldConfirm && loading ? (
          <p className="mt-4 text-sm font-medium text-coral-600">
            Validando el estado del pago...
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Ir a perfil
          </Link>
          <Link
            href="/settings"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Ver planes
          </Link>
        </div>
      </section>
    </main>
  );
}
