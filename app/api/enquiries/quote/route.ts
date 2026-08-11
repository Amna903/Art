import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Admins quote a price for an enquiry from the admin console. This writes
// quoted_price/quote_token as the caller (not service_role) so the existing
// RLS policy ("Admins update enquiries") is what actually enforces the
// admin-only check — the token verification below only decides whether we
// bother emailing the buyer their private quote link (/quote/[token] — a
// read-only price view, not a checkout/payment flow).
const QUOTE_VALIDITY_DAYS = 14;

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !ANON_KEY) {
    return NextResponse.json({ error: "Supabase isn't configured on the server." }, { status: 501 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  let body: { enquiryId?: string; quotedPrice?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { enquiryId, quotedPrice } = body;
  if (!enquiryId || typeof quotedPrice !== "number" || !(quotedPrice > 0)) {
    return NextResponse.json({ error: "enquiryId and a positive quotedPrice are required." }, { status: 400 });
  }

  // Runs as the caller (their bearer token), so RLS applies exactly as it
  // would for any other client-side call — this route exists only because
  // sending the follow-up email needs the server-side RESEND_API_KEY.
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

  const quoteToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: updated, error: updateErr } = await callerClient
    .from("enquiries")
    .update({
      quoted_price: quotedPrice,
      quote_token: quoteToken,
      quote_token_expires_at: expiresAt,
      status: "quoted",
    } as never)
    .eq("id", enquiryId)
    .select("id, name, email, artwork_title")
    .single();

  if (updateErr || !updated) {
    // RLS silently returns 0 rows for non-admins rather than an error, so a
    // missing row here means either a bad id or the caller wasn't an admin.
    return NextResponse.json({ error: updateErr?.message || "Enquiry not found or update not permitted." }, { status: 403 });
  }

  const quoteUrl = `${new URL(req.url).origin}/quote/${quoteToken}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  let emailSent = false;
  let emailNote = "";

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "nuarte51@gmail.com";

  if (resendApiKey) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NU-ART Concierge <onboarding@resend.dev>",
          to: [updated.email],
          reply_to: adminEmail,
          subject: `Your quote for "${updated.artwork_title}" is ready`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #1a1615; color: #f4efe6; padding: 24px 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">NU-ART COLLECTIVE</h1>
                <p style="margin: 4px 0 0; font-size: 11px; opacity: 0.7; letter-spacing: 1.5px; text-transform: uppercase;">Your Private Quote</p>
              </div>
              <div style="padding: 32px;">
                <p style="font-size: 14px; color: #1a1615;">Hi ${updated.name},</p>
                <p style="font-size: 14px; color: #444; line-height: 1.6;">
                  Thank you for your interest in <strong>${updated.artwork_title}</strong>. One of our curators has
                  prepared a private quote for you.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${quoteUrl}" style="background-color: #1a1615; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px; display: inline-block;">
                    View Your Quote
                  </a>
                </div>
                <p style="font-size: 12px; color: #999;">This private link expires in ${QUOTE_VALIDITY_DAYS} days.</p>
              </div>
            </div>
          `,
        }),
      });
      if (resendRes.ok) {
        emailSent = true;
      } else {
        const errData = await resendRes.json().catch(() => ({}));
        emailNote = errData?.message || "Resend email dispatch failed";
      }
    } catch (err) {
      emailNote = err instanceof Error ? err.message : "Failed to send quote email.";
    }
  } else {
    console.log(`[DEV QUOTE NOTIFICATION] To: ${updated.email} | Quote link: ${quoteUrl}`);
    emailNote = "RESEND_API_KEY not configured — logged to console.";
  }

  return NextResponse.json({ success: true, quoteUrl, emailSent, emailNote });
}
