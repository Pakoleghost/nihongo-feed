import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "../admin/_lib";

const FOLDER_MARKER_TITLE = "__folder__";

type CreateResourceBody = {
  action?: "create_resource" | "create_folder";
  title?: string;
  url?: string | null;
  category?: string | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const { service } = await assertAdmin(authHeader);
    const body = (await req.json()) as CreateResourceBody;
    const action = body.action;

    if (action === "create_folder") {
      const category = cleanText(body.category);
      if (!category) {
        return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
      }

      const { data: existing, error: existingError } = await service
        .from("resources")
        .select("id")
        .eq("category", category)
        .eq("title", FOLDER_MARKER_TITLE)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ error: "Could not check folder" }, { status: 500 });
      }

      if (existing) {
        return NextResponse.json({ ok: true, folder: category });
      }

      const { error } = await service
        .from("resources")
        .insert([{ title: FOLDER_MARKER_TITLE, url: null, category }]);

      if (error) {
        return NextResponse.json({ error: "Could not create folder" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, folder: category });
    }

    if (action === "create_resource") {
      const title = cleanText(body.title);
      const url = cleanText(body.url);
      const category = cleanText(body.category) || "General";

      if (!title || !url) {
        return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
      }

      const { data, error } = await service
        .from("resources")
        .insert([{ title, url, category }])
        .select("id, title, url, category")
        .single();

      if (error) {
        return NextResponse.json({ error: "Could not create resource" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, resource: data });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to save resource" }, { status: 500 });
  }
}
