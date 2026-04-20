import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Called daily by Vercel Cron (see vercel.json) at 9am
export async function GET() {
  try {
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("subscription");

    if (error || !subs) {
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    const payload = JSON.stringify({
      title: "Nihongo 🎌",
      body: "¡Tienes kana por repasar hoy! Sigue tu racha.",
    });

    const results = await Promise.allSettled(
      subs.map((row) =>
        webpush.sendNotification(
          row.subscription as webpush.PushSubscription,
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ sent, failed });
  } catch {
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
