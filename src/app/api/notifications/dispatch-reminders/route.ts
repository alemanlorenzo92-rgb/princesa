import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profile";
import { resolveUserRole } from "@/lib/server/admin-access";
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/server/web-push";
import { AcademicEventRecord, PushSubscriptionRecord } from "@/types";

function getEventDateTime(record: AcademicEventRecord) {
  const time = record.event_time || "09:00:00";
  return new Date(`${record.event_date}T${time}`);
}

async function hasDispatchAccess(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const profile = await getProfile(supabase, user.id).catch(() => null);
  return resolveUserRole(user.email, profile?.role) === "admin";
}

export async function POST(request: NextRequest) {
  if (!(await hasDispatchAccess(request))) {
    return NextResponse.json(
      { error: "No tienes permisos para despachar recordatorios." },
      { status: 403 },
    );
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Las notificaciones push no estan configuradas en el servidor." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: events, error: eventsError } = await admin
    .from("academic_events")
    .select("*")
    .not("reminder_offset_minutes", "is", null)
    .is("reminder_sent_at", null)
    .eq("status", "pending")
    .order("event_date", { ascending: true })
    .limit(100);

  if (eventsError) {
    return NextResponse.json(
      { error: "No se pudieron cargar los eventos pendientes." },
      { status: 500 },
    );
  }

  const dueEvents = (events || []).filter((entry) => {
    const record = entry as AcademicEventRecord;
    if (record.reminder_offset_minutes === null) {
      return false;
    }

    const eventDate = getEventDateTime(record);
    const reminderDate = new Date(
      eventDate.getTime() - record.reminder_offset_minutes * 60 * 1000,
    );

    return reminderDate <= now;
  }) as AcademicEventRecord[];

  let sent = 0;
  let deactivated = 0;

  for (const event of dueEvents) {
    const { data: subscriptions, error: subscriptionsError } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", event.user_id)
      .eq("is_active", true);

    if (subscriptionsError || !subscriptions?.length) {
      continue;
    }

    let delivered = false;

    for (const subscription of subscriptions as PushSubscriptionRecord[]) {
      try {
        await sendWebPushNotification(subscription, {
          title: "Tienes un recordatorio pendiente",
          body: `No olvides: ${event.title} el ${event.event_date}.`,
          url: "/calendar",
          tag: `event-${event.id}`,
        });
        delivered = true;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);
          deactivated += 1;
        }
      }
    }

    if (delivered) {
      await admin
        .from("academic_events")
        .update({
          reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
      sent += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: events?.length || 0,
    due: dueEvents.length,
    sent,
    deactivated,
  });
}
