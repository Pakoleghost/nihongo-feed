import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "../_lib";

type BasicProfile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  group_name?: string | null;
  is_approved?: boolean | null;
  is_admin?: boolean | null;
  created_at?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const { service } = await assertAdmin(authHeader);

    const [{ data: pending }, { data: past }, usersResult] = await Promise.all([
      service
        .from("profiles")
        .select("id, username, full_name, group_name, is_approved, is_admin, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false }),
      service
        .from("profiles")
        .select("id, username, full_name, group_name, is_approved, is_admin, created_at")
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
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

