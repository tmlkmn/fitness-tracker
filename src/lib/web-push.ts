import webPush from "web-push";

webPush.setVapidDetails(
  "mailto:" +
    (process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? "noreply@fitmusc.com"),
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      console.warn(`Push subscription expired (${statusCode}):`, subscription.endpoint.slice(0, 60));
      return false;
    }
    console.error(`Push send failed (status=${statusCode}):`, subscription.endpoint.slice(0, 60), err);
    // Don't remove subscription on transient errors — only on 410/404
    return true;
  }
}
