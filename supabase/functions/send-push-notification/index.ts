/**
 * Supabase Edge Function to Send Push Notifications
 * Uses Web Push Protocol (no third-party accounts needed)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as webpush from "https://deno.land/x/webpush@v1.0.0/mod.ts";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:your-email@example.com";

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  message: string;
  notification_type?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys are not configured");
    }

    const { subscription, payload } = await req.json();

    if (!subscription || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing subscription or payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Convert base64 keys to Uint8Array
    const p256dh = Uint8Array.from(atob(subscription.keys.p256dh), (c) => c.charCodeAt(0));
    const auth = Uint8Array.from(atob(subscription.keys.auth), (c) => c.charCodeAt(0));

    const pushSubscription: webpush.PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: p256dh,
        auth: auth,
      },
    };

    // Prepare notification payload
    const notificationPayload: NotificationPayload = {
      title: payload.title || "Bean Scene",
      message: payload.message || "You have a new notification",
      ...payload,
    };

    // Send push notification
    const result = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(notificationPayload),
      {
        vapidDetails: {
          subject: VAPID_SUBJECT,
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
        },
      }
    );

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send push notification" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
