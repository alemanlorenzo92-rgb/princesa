import { NextRequest, NextResponse } from "next/server";

import {
  getUserPushSubscriptions,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/services/push-subscriptions";
import { createClient } from "@/lib/supabase/server";
import { isWebPushConfigured } from "@/lib/server/web-push";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: "Necesitas iniciar sesion para configurar notificaciones." },
        { status: 401 },
      ),
      supabase,
      user: null,
    };
  }

  return { error: null, supabase, user };
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const subscriptions = await getUserPushSubscriptions(auth.supabase, auth.user.id);

  return NextResponse.json({
    supported: true,
    configured: isWebPushConfigured(),
    subscriptions,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error || !auth.user) {
    return auth.error;
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Las notificaciones push no estan configuradas en el servidor." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        endpoint?: string;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      }
    | null;

  const endpoint = body?.endpoint?.trim();
  const p256dh = body?.keys?.p256dh?.trim();
  const authKey = body?.keys?.auth?.trim();

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "La suscripcion push es invalida o esta incompleta." },
      { status: 400 },
    );
  }

  const subscription = await savePushSubscription(auth.supabase, auth.user.id, {
    endpoint,
    p256dh,
    auth: authKey,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({
    ok: true,
    subscription,
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        endpoint?: string;
      }
    | null;

  const endpoint = body?.endpoint?.trim();

  if (!endpoint) {
    return NextResponse.json(
      { error: "Falta el endpoint de la suscripcion a eliminar." },
      { status: 400 },
    );
  }

  await removePushSubscription(auth.supabase, auth.user.id, endpoint);

  return NextResponse.json({ ok: true });
}
