import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

function validSignature(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

// Subscribe this endpoint to checkout.session.completed and checkout.session.expired.
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature") || "";
  if (!secret || !validSignature(raw, signature, secret)) return new Response("Invalid signature", { status: 400 });
  const event = JSON.parse(raw);
  const session = event.data?.object;
  const orderId = session?.metadata?.order_id;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!orderId || !url || !serviceKey) return new Response("ok");
  const db = createClient(url, serviceKey);

  if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
    const shipping = session.collected_information?.shipping_details || session.shipping_details || null;
    const { error } = await db.from("orders")
      .update({ status: "paid", stripe_checkout_session_id: session.id, ...(shipping ? { shipping_address: shipping } : {}) })
      .eq("id", orderId);
    if (error) return new Response("Order update failed", { status: 500 });
    const { data: items } = await db.from("order_items").select("artwork_id").eq("order_id", orderId);
    const artworkIds = (items || []).map((i) => i.artwork_id);
    if (artworkIds.length) await db.from("artworks").update({ status: "sold" }).in("id", artworkIds);
    // Closing the enquiry retires its quote link so it can't be paid twice.
    await db.from("enquiries").update({ status: "closed" }).eq("checkout_order_id", orderId);
  } else if (event.type === "checkout.session.expired") {
    await db.from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
  }
  return new Response("ok");
}
