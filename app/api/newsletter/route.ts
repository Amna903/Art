import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Saves a newsletter sign-up. Signing up twice is treated as success. */
export async function POST(req: Request) {
  let body: { email?: unknown; source?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 320) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sign-up is not available right now." }, { status: 503 });
  }

  const { error } = await supabase.from("newsletter_subscribers" as never).insert({
    email,
    source: typeof body.source === "string" ? body.source.slice(0, 40) : null,
    language: typeof body.language === "string" ? body.language.slice(0, 8) : null,
  } as never);

  // 23505 = already subscribed: same answer as a new sign-up.
  if (error && error.code !== "23505") {
    console.error("[newsletter] insert failed:", error.message);
    return NextResponse.json({ error: "Could not sign you up. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
