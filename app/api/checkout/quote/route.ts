import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!url || !key || !stripeKey) return NextResponse.json({ error: "Checkout is not configured yet." }, { status: 501 });
  if (!token) return NextResponse.json({ error: "Please sign in to complete your purchase." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.quoteToken) return NextResponse.json({ error: "Missing quote." }, { status: 400 });
  const client = createClient<Database>(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: auth } = await client.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });

  const { data: enquiry } = await client.from("enquiries").select("id, artwork_slug, artwork_title, quoted_price, quote_token_expires_at, status")
    .eq("user_id", auth.user.id).eq("quote_token", body.quoteToken).eq("status", "quoted").maybeSingle();
  if (!enquiry || !enquiry.quoted_price || !enquiry.quote_token_expires_at || new Date(enquiry.quote_token_expires_at) <= new Date()) {
    return NextResponse.json({ error: "This quote is unavailable or has expired." }, { status: 400 });
  }
  const { data: artwork } = await client.from("artworks").select("id, artist_id, status").eq("slug", enquiry.artwork_slug).eq("status", "published").maybeSingle();
  if (!artwork) return NextResponse.json({ error: "This artwork is no longer available." }, { status: 409 });

  const { data: order, error: orderError } = await client.from("orders").insert({ buyer_id: auth.user.id, total_usd: enquiry.quoted_price, enquiry_id: enquiry.id } as never).select("id").single();
  if (orderError || !order) return NextResponse.json({ error: "Could not start your order." }, { status: 500 });
  const { error: itemError } = await client.from("order_items").insert({ order_id: order.id, artwork_id: artwork.id, artist_id: artwork.artist_id, price_usd: enquiry.quoted_price });
  if (itemError) return NextResponse.json({ error: "Could not add the artwork to your order." }, { status: 500 });

  const origin = new URL(req.url).origin;
  const form = new URLSearchParams({
    mode: "payment", "success_url": `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`, "cancel_url": `${origin}/quote/${body.quoteToken}`,
    "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][product_data][name]": enquiry.artwork_title,
    "line_items[0][price_data][unit_amount]": String(Math.round(Number(enquiry.quoted_price) * 100)), "line_items[0][quantity]": "1",
    "metadata[order_id]": order.id,
  });
  const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const session = await stripe.json();
  if (!stripe.ok || !session.url) return NextResponse.json({ error: session.error?.message || "Could not start Stripe checkout." }, { status: 502 });
  await client.from("orders").update({ stripe_checkout_session_id: session.id } as never).eq("id", order.id);
  return NextResponse.json({ url: session.url });
}
