import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Deleting an auth.users row can only be done via the Supabase Admin API
// (service_role key) — RLS/the anon key can never do this, since auth.users
// isn't exposed through PostgREST. This route runs server-side only.

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Add it to .env.local (see BACKEND_SETUP.md)." },
      { status: 501 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  // Verify the caller's own token, then check *their* role — never trust a
  // client-supplied "am I admin" flag. The Authorization header makes
  // subsequent .from() calls run as this user, so RLS applies correctly.
  const callerClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user: caller },
    error: callerErr,
  } = await callerClient.auth.getUser(token);
  if (callerErr || !caller) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { data: callerRoles } = await callerClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id);
  const isAdmin = (callerRoles ?? []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  if (caller.id === targetUserId) {
    return NextResponse.json({ error: "You can't delete your own account from here." }, { status: 400 });
  }

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
