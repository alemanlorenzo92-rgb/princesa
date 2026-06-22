import "server-only";

import webpush, { PushSubscription } from "web-push";

let configured = false;

function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "";

  return {
    publicKey,
    privateKey,
    subject,
    ready: Boolean(publicKey && privateKey && subject),
  };
}

export function isWebPushConfigured() {
  return getWebPushConfig().ready;
}

function ensureWebPushConfigured() {
  const config = getWebPushConfig();

  if (!config.ready) {
    throw new Error(
      "Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT para las notificaciones push.",
    );
  }

  if (!configured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }
}

export interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendWebPushNotification(
  subscription: StoredPushSubscription,
  payload: Record<string, unknown>,
) {
  ensureWebPushConfigured();

  const webPushSubscription: PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  return webpush.sendNotification(webPushSubscription, JSON.stringify(payload));
}
