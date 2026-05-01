"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

/**
 * Registers the service worker and subscribes the user to Web Push.
 * Call this hook once the user's session is confirmed (pass userId).
 * Automatically re-subscribes if the subscription was lost.
 */
export function usePushNotifications(userId: string | undefined) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setIsSupported(true);

    async function init() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Wait for the service worker to be ready before accessing pushManager
        await navigator.serviceWorker.ready;

        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          setIsSubscribed(true);
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
          return;
        }

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // Persist to server
        const parsed = sub.toJSON();
        await fetch("/api/push-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: parsed.endpoint,
            keys: parsed.keys,
          }),
        });

        setIsSubscribed(true);
      } catch (err) {
        // Notification permission denied or service worker error — silent fail
        console.warn("[Push] Could not subscribe:", err);
      }
    }

    init();
  }, [userId]);

  return { isSupported, isSubscribed };
}
