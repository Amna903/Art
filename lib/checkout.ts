import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Shared by Buy Now (/api/checkout/quote) and the basket (/api/checkout/cart).
// Every price comes from the admin-confirmed enquiry row, never the browser.
// Writes run as service_role because buyers can't update enquiries/artworks
// under RLS — the caller's identity is verified first.

// Stripe's minimum Checkout Session lifetime. While a session is open its
// artworks count as reserved, so nobody else can start paying for them.
const RESERVATION_MINUTES = 30;

type Result = { url: string } | { error: string; status: number };

export async function startCheckout(req: Request, quoteTokens: string[], cancelPath: string): Promise<Result> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!url || !anonKey || !serviceKey || !stripeKey) return { error: "Checkout is not configured yet.", status: 501 };
  if (!token) return { error: "Please sign in to complete your purchase.", status: 401 };

  const tokens = [...new Set(quoteTokens.filter((t) => typeof t === "string" && t))];
  if (!tokens.length) return { error: "Your basket is empty.", status: 400 };

  const caller = createClient<Database>(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: auth } = await caller.auth.getUser(token);
  if (!auth.user) return { error: "Your session has expired.", status: 401 };
  const buyerId = auth.user.id;
  const db = createClient(url, serviceKey);

  const { data: enquiries } = await db.from("enquiries")
    .select("id, artwork_slug, artwork_title, quoted_price, quote_token_expires_at, status, user_id")
    .in("quote_token", tokens);
  const now = new Date();
  const valid = (enquiries || []).filter((e) =>
    e.user_id === buyerId && e.status === "quoted" && e.quoted_price && e.quote_token_expires_at && new Date(e.quote_token_expires_at) > now);
  if (valid.length !== tokens.length) {
    return { error: "One or more quotes are unavailable, expired or belong to another account.", status: 400 };
  }

  const { data: artworks } = await db.from("artworks").select("id, slug, artist_id, status").in("slug", valid.map((e) => e.artwork_slug));
  const bySlug = new Map((artworks || []).map((a) => [a.slug, a]));
  const items = valid.map((e) => ({ enquiry: e, artwork: bySlug.get(e.artwork_slug) }));
  const unavailable = items.find((i) => !i.artwork || i.artwork.status !== "published");
  if (unavailable) return { error: `"${unavailable.enquiry.artwork_title}" is no longer available.`, status: 409 };
  const artworkIds = items.map((i) => i.artwork!.id);

  // Drop this buyer's own abandoned attempts for these pieces, then refuse if
  // anyone else currently has one of them open in Stripe.
  const since = new Date(now.getTime() - RESERVATION_MINUTES * 60_000).toISOString();
  const { data: openItems } = await db.from("order_items")
    .select("artwork_id, orders!inner(id, buyer_id, status, created_at)")
    .in("artwork_id", artworkIds).eq("orders.status", "pending");
  const mine = new Set<string>();
  for (const row of (openItems || []) as unknown as { orders: { id: string; buyer_id: string; created_at: string } }[]) {
    if (row.orders.buyer_id === buyerId) mine.add(row.orders.id);
    else if (row.orders.created_at > since) return { error: "Another collector is currently checking out one of these pieces. Please try again shortly.", status: 409 };
  }
  if (mine.size) await db.from("orders").update({ status: "cancelled" }).in("id", [...mine]);

  const total = items.reduce((sum, i) => sum + Number(i.enquiry.quoted_price), 0);
  const { data: order, error: orderError } = await db.from("orders")
    .insert({ buyer_id: buyerId, total_usd: total, enquiry_id: items.length === 1 ? items[0].enquiry.id : null })
    .select("id").single();
  if (orderError || !order) return { error: "Could not start your order.", status: 500 };
  const { error: itemError } = await db.from("order_items").insert(items.map((i) => ({
    order_id: order.id, artwork_id: i.artwork!.id, artist_id: i.artwork!.artist_id, price_usd: i.enquiry.quoted_price,
  })));
  if (itemError) {
    await db.from("orders").delete().eq("id", order.id);
    return { error: "Could not add the artworks to your order.", status: 500 };
  }
  await db.from("enquiries").update({ checkout_order_id: order.id }).in("id", items.map((i) => i.enquiry.id));

  const origin = new URL(req.url).origin;
  const form = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${cancelPath}`,
    expires_at: String(Math.floor(now.getTime() / 1000) + RESERVATION_MINUTES * 60 + 60),
    "metadata[order_id]": order.id,
  });
  if (auth.user.email) form.set("customer_email", auth.user.email);
  // e.g. "GB,FR,US" — when set, Stripe collects a shipping address for those countries.
  (process.env.STRIPE_SHIPPING_COUNTRIES || "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
    .forEach((c, n) => form.set(`shipping_address_collection[allowed_countries][${n}]`, c));
  items.forEach((i, n) => {
    form.set(`line_items[${n}][price_data][currency]`, currency);
    form.set(`line_items[${n}][price_data][product_data][name]`, i.enquiry.artwork_title);
    form.set(`line_items[${n}][price_data][unit_amount]`, String(Math.round(Number(i.enquiry.quoted_price) * 100)));
    form.set(`line_items[${n}][quantity]`, "1");
  });

  const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const session = await stripe.json();
  if (!stripe.ok || !session.url) {
    await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return { error: session.error?.message || "Could not start Stripe checkout.", status: 502 };
  }
  await db.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
  return { url: session.url };
}
