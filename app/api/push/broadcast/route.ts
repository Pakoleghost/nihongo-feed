import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin } from "../../admin/_lib";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/push/broadcast
 * Admin-only. Sends a push notification to all subscribers or to users of
 * specific groups.
 *
 * Body: { title, body, url?, groups? }
 *   groups — if provided and non-empty, only send to approved users in those
 *            groups. If omitted or empty, send to everyone.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    await assertAdmin(authHeader);

    const { title, body, url, groups } = (await req.json()) as {
      title: string;
      body: string;
      url?: string;
      groups?: string[];
    };

    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

    // Build subscription query — optionally scoped to groups
    let userIds: string[] | null = null;

    if (groups && groups.length > 0) {
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .in("group_name", groups)
        .eq("is_approved", true);

      userIds = (users ?? []).map((u: { id: string }) => u.id);

      if (userIds.length === 0) {
        return NextResponse.json({ sent: 0, failed: 0, note: "No subscribers found in specified groups" });
      }
    }

    const subsQ = supabase.from("push_subscriptions").select("subscription");
    const { data: subs, error } = userIds
      ? await subsQ.in("user_id", userIds)
      : await subsQ;

    if (error || !subs) {
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    if (subs.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, note: "No push subscriptions found" });
    }

    const payload = JSON.stringify({ title, body, ...(url ? { url } : {}) });

    const results = await Promise.allSettled(
      subs.map((row) =>
        webpush.sendNotification(row.subscription as webpush.PushSubscription, payload)
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ sent, failed });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
