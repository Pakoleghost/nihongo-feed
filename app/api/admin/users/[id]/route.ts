import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "../../_lib";

function isIgnorableDbError(error: any) {
  const code = error?.code;
  return code === "42703" || code === "42P01"; // undefined_column | undefined_table
}

async function runSafe(op: PromiseLike<{ error?: any }>) {
  const result: any = await op;
  if (result?.error && !isIgnorableDbError(result.error)) {
    throw result.error;
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { service, adminUserId } = await assertAdmin(authHeader);
    const { id } = await ctx.params;

    const targetId = String(id || "").trim();
    if (!targetId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }
    if (targetId === adminUserId) {
      return NextResponse.json({ error: "No puedes borrarte a ti mismo." }, { status: 400 });
    }

    const { data: targetProfile } = await service
      .from("profiles")
      .select("id, is_admin")
      .eq("id", targetId)
      .maybeSingle();
    if (targetProfile?.is_admin) {
      return NextResponse.json({ error: "No puedes borrar otra cuenta admin." }, { status: 400 });
    }

    const { data: userPosts } = await service.from("posts").select("id").eq("user_id", targetId);
    const postIds = (userPosts || []).map((p: any) => p.id);

    await runSafe(service.from("notifications").delete().eq("user_id", targetId));
    await runSafe(service.from("notifications").delete().eq("from_user_id", targetId));
    await runSafe(service.from("notifications").delete().eq("source_user_id", targetId));
    await runSafe(service.from("notifications").delete().eq("target_user_id", targetId));
    await runSafe(service.from("notifications").delete().eq("actor_user_id", targetId));

    await runSafe(service.from("likes").delete().eq("user_id", targetId));
    if (postIds.length > 0) {
      await runSafe(service.from("likes").delete().in("post_id", postIds));
      await runSafe(service.from("notifications").delete().in("post_id", postIds));
    }

    await runSafe(service.from("posts").delete().eq("user_id", targetId));
    await runSafe(service.from("profiles").delete().eq("id", targetId));
    await runSafe(service.from("applications").delete().eq("user_id", targetId));

    const { error: authDeleteError } = await service.auth.admin.deleteUser(targetId);
    if (authDeleteError) {
      return NextResponse.json(
        { error: `Se borró perfil/datos, pero falló borrar auth user: ${authDeleteError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: `Failed to delete user: ${error?.message || "unknown error"}` }, { status: 500 });
  }
}
