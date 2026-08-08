import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { artworkSlug, artworkTitle, artistName, name, email, phone, message } = body;

    if (!name || !email || !artworkTitle) {
      return NextResponse.json(
        { error: "Name, email, and artwork title are required." },
        { status: 400 }
      );
    }

    // 1. Save to Supabase DB if configured
    let dbError = null;
    if (isSupabaseConfigured()) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const combinedMessage = [
        phone ? `Phone: ${phone}` : null,
        message ?? null,
      ]
        .filter(Boolean)
        .join("\n\n") || null;

      const { error } = await supabase.from("enquiries").insert({
        artwork_slug: artworkSlug,
        artwork_title: artworkTitle,
        artist_name: artistName ?? null,
        name,
        email,
        message: combinedMessage,
        user_id: user?.id ?? null,
      } as any);

      if (error) {
        console.error("Supabase insert error:", error);
        dbError = error.message;
      }
    }

    // 2. Dispatch email to target receiver (aseaamk75@gmail.com)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "aseaamk75@gmail.com";
    const resendApiKey = process.env.RESEND_API_KEY;

    let emailSent = false;
    let emailNote = "";

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
            to: [adminEmail],
            reply_to: email,
            subject: `🎨 Price Inquiry: "${artworkTitle}" — ${name}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #1a1615; color: #f4efe6; padding: 24px 32px; text-align: center;">
                  <h1 style="margin: 0; font-size: 20px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">NU-ART COLLECTIVE</h1>
                  <p style="margin: 4px 0 0; font-size: 11px; opacity: 0.7; letter-spacing: 1.5px; text-transform: uppercase;">Private Curatorial Inquiry</p>
                </div>

                <div style="padding: 32px;">
                  <div style="background-color: #faf7f2; border-left: 4px solid #b85d38; padding: 16px 20px; margin-bottom: 24px;">
                    <span style="font-size: 10px; font-weight: 700; color: #b85d38; letter-spacing: 1px; text-transform: uppercase; display: block; margin-bottom: 4px;">Artwork Information</span>
                    <h2 style="margin: 0 0 4px; font-size: 18px; color: #1a1615;">${artworkTitle}</h2>
                    ${artistName ? `<p style="margin: 0; font-style: italic; color: #666; font-size: 14px;">Artist: ${artistName}</p>` : ''}
                    <p style="margin: 8px 0 0; font-size: 12px; color: #888;">Slug: ${artworkSlug}</p>
                  </div>

                  <h3 style="font-size: 14px; font-weight: 600; color: #1a1615; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Collector Details</h3>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                    <tr>
                      <td style="padding: 8px 0; color: #777; width: 120px;">Name:</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #1a1615;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #777;">Email:</td>
                      <td style="padding: 8px 0; color: #b85d38;"><a href="mailto:${email}" style="color: #b85d38; text-decoration: none;">${email}</a></td>
                    </tr>
                    ${phone ? `
                    <tr>
                      <td style="padding: 8px 0; color: #777;">Phone:</td>
                      <td style="padding: 8px 0; color: #1a1615;">${phone}</td>
                    </tr>
                    ` : ''}
                  </table>

                  ${message ? `
                  <h3 style="font-size: 14px; font-weight: 600; color: #1a1615; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Collector Note</h3>
                  <div style="background-color: #f9f9f9; border: 1px solid #eee; padding: 16px; border-radius: 4px; font-style: italic; color: #444; line-height: 1.6; margin-bottom: 24px;">
                    "${message}"
                  </div>
                  ` : ''}

                  <div style="text-align: center; margin-top: 32px;">
                    <a href="mailto:${email}?subject=RE: Price Request for ${encodeURIComponent(artworkTitle)}" style="background-color: #1a1615; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px; display: inline-block;">
                      Reply to Collector
                    </a>
                  </div>
                </div>

                <div style="background-color: #fafafa; border-top: 1px solid #eee; padding: 16px 32px; text-align: center; font-size: 11px; color: #999;">
                  Sent from NU-ART Concierge • Target Email: <strong>${adminEmail}</strong>
                </div>
              </div>
            `,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
        } else {
          const errData = await resendRes.json();
          console.error("Resend API error:", errData);
          emailNote = errData?.message || "Resend email dispatch failed";
        }
      } catch (err: any) {
        console.error("Error sending email via Resend:", err);
        emailNote = err.message;
      }
    } else {
      console.log(`[DEV ENQUIRY NOTIFICATION] To: ${adminEmail} | Artwork: ${artworkTitle} | Collector: ${name} <${email}>`);
      emailNote = "RESEND_API_KEY not configured in .env.local — logged to console.";
    }

    return NextResponse.json({
      success: true,
      recipient: adminEmail,
      emailSent,
      emailNote,
      dbSaved: !dbError,
    });
  } catch (err: any) {
    console.error("Enquiry API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit price request." },
      { status: 500 }
    );
  }
}
