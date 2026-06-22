import { NextResponse } from "next/server";

import { getUserPushSubscriptions } from "@/lib/services/push-subscriptions";
import { createClient } from "@/lib/supabase/server";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/server/web-push";

export async function POST() {
  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Las notificaciones push no estan configuradas en el servidor." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Necesitas iniciar sesion para enviar una prueba." },
      { status: 401 },
    );
  }

  const subscriptions = await getUserPushSubscriptions(supabase, user.id);

  if (!subscriptions.length) {
    return NextResponse.json(
      { error: "Primero activa las notificaciones en este dispositivo." },
      { status: 400 },
    );
  }

  await Promise.all(
    subscriptions.map((subscription) =>
      sendWebPushNotification(subscription, {
        title: "Recordatorios activados",
        body: "Proyecto Princesa ya puede avisarte sobre tus proximos eventos.",
        url: "/calendar",
        tag: "test-notification",
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
