import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "../_lib";

type BasicProfile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  group_name?: string | null;
  avatar_url?: string | null;
  is_approved?: boolean | null;
  is_admin?: boolean | null;
  created_at?: string | null;
};

function getRouteErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const { service } = await assertAdmin(authHeader);

    const [{ data: pending }, { data: past }, usersResult] = await Promise.all([
      service
        .from("profiles")
        .select("id, username, full_name, group_name, avatar_url, is_approved, is_admin, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false }),
      service
        .from("profiles")
        .select("id, username, full_name, group_name, avatar_url, is_approved, is_admin, created_at")
        .eq("is_approved", true)
        .eq("is_admin", false)
        .order("created_at", { ascending: false })
        .limit(300),
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const users = usersResult.data?.users || [];
    const emailById = new Map<string, string | null>();
    users.forEach((u) => emailById.set(u.id, u.email ?? null));

    const withEmail = (rows: BasicProfile[] = []) =>
      rows.map((r) => ({
        ...r,
        email: emailById.get(r.id) || null,
      }));

    return NextResponse.json({
      pending: withEmail((pending || []) as BasicProfile[]),
      past: withEmail((past || []) as BasicProfile[]),
    });
  } catch (error: unknown) {
    const message = getRouteErrorMessage(error);
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const { service } = await assertAdmin(authHeader);
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "";
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "createGroup") {
      const groupName = typeof body.groupName === "string" ? body.groupName.trim() : "";
      if (!groupName) {
        return NextResponse.json({ error: "Missing groupName" }, { status: 400 });
      }

      const { error } = await service.from("groups").insert([{ name: groupName }]);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (action === "approve") {
      const groupName = typeof body.groupName === "string" ? body.groupName.trim() : "";
      if (!groupName) {
        return NextResponse.json({ error: "Missing groupName" }, { status: 400 });
      }

      const { error } = await service
        .from("profiles")
        .update({ is_approved: true, group_name: groupName })
        .eq("id", userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "changeGroup") {
      const groupName =
        typeof body.groupName === "string" && body.groupName.trim()
          ? body.groupName.trim()
          : null;

      const { error } = await service
        .from("profiles")
        .update({ group_name: groupName })
        .eq("id", userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: unknown) {
    const message = getRouteErrorMessage(error);
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
