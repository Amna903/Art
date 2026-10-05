import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { runOriginalityCheck } from "@/lib/originality/check";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireArtistOrAdmin(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) {
    return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 501 }) };
  }

  const caller = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await caller.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid session." }, { status: 401 }) };
  }

  const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", user.id);
  const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "artist");
  if (!allowed) {
    return { error: NextResponse.json({ error: "Artist or admin role required." }, { status: 403 }) };
  }

  return { user };
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local to enable originality checks.",
      },
      { status: 501 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  const auth = await requireArtistOrAdmin(token);
  if ("error" in auth && auth.error) return auth.error;

  let body: { imageUrl?: string; excludeArtworkId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  try {
    const result = await runOriginalityCheck({
      imageUrl,
      excludeArtworkId: body.excludeArtworkId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Originality check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
