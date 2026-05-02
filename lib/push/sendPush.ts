import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

function getWebPush() {
  webpush.setVapidDetails(
    "mailto:taskme@yourdomain.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to all subscriptions for a given user.
 * Uses the service role key so RLS is bypassed — safe for server-only use.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) return;

  const message = JSON.stringify(payload);
  const wp = getWebPush();

  await Promise.allSettled(
    subscriptions.map((sub) =>
      wp.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message
      ).catch(async (err) => {
        // 410 Gone = subscription expired → remove it
        if (err.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      })
    )
  );
}
