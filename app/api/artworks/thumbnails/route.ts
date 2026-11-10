import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { serviceClient } from "@/lib/originality/check";
import { generateMissingThumbnails, generateThumbnails } from "@/lib/images/thumbnails";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { ids: string[] }  — (re)generate thumbnails for these artworks.
 *   Admins: any artwork. Artists: only their own.
 * POST { missing: true }  — admins: generate up to 20 artworks that have none
 *   yet; returns how many remain (the dashboard calls it until 0).
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Thumbnails are not configured." }, { status: 501 });
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

  const caller = createClient<Database>(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const {
    data: { user },
  } = await caller.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", user.id);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");

  let body: { ids?: unknown; missing?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.missing === true) {
    if (!isAdmin) return NextResponse.json({ error: "Admin role required." }, { status: 403 });
    return NextResponse.json(await generateMissingThumbnails(20));
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string").slice(0, 20) : [];
  if (ids.length === 0) return NextResponse.json({ error: "No artwork ids." }, { status: 400 });

  if (!isAdmin) {
    const { data: own } = await serviceClient().from("artworks").select("id").in("id", ids).eq("artist_id", user.id);
    if ((own ?? []).length !== ids.length) {
      return NextResponse.json({ error: "You can only generate thumbnails for your own artworks." }, { status: 403 });
    }
  }
  return NextResponse.json({ done: await generateThumbnails(ids) });
}
