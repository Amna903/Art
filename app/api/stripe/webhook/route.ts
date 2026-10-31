import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PAYMENTS_ENABLED } from "@/lib/features";

function validSignature(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

type Buyer = { name: string | null; email: string | null; phone: string | null; address: Record<string, string | null> | null };

// Best-effort "you got paid" email — a failure here must not fail the webhook,
// or Stripe would retry and re-run the order updates.
async function notifyAdmin(orderId: string, session: { amount_total?: number; currency?: string }, buyer: Buyer, items: { price_usd: number; artworks: { title: string } | null }[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const total = `${((session.amount_total || 0) / 100).toFixed(2)} ${(session.currency || "").toUpperCase()}`;
  const address = buyer.address ? Object.values(buyer.address).filter(Boolean).join(", ") : "—";
  const rows = items.map((i) => `<li>${esc(i.artworks?.title || "Artwork")} — ${esc(Number(i.price_usd).toFixed(2))}</li>`).join("");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "NUA-ARTE Concierge <onboarding@resend.dev>",
        to: [process.env.ADMIN_NOTIFICATION_EMAIL || "nuarte51@gmail.com"],
        subject: `New payment received — ${total}`,
        html: `<div style="font-family:sans-serif;font-size:14px;color:#161616">
          <h2 style="font-weight:400">Payment received</h2>
          <p><strong>Order:</strong> ${esc(orderId.slice(0, 8))} · <strong>Total:</strong> ${esc(total)}</p>
          <ul>${rows}</ul>
          <p><strong>Buyer:</strong> ${esc(buyer.name || "—")}<br>${esc(buyer.email || "")} ${esc(buyer.phone || "")}</p>
          <p><strong>Ship to:</strong> ${esc(address)}</p>
          <p>The artwork${items.length > 1 ? "s are" : " is"} now marked as sold. See Admin → Orders for details.</p>
        </div>`,
      }),
    });
  } catch (err) {
    console.error("[stripe/webhook] admin notification failed:", err);
  }
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
    const customer = session.customer_details || {};
    // Buyer contact + delivery details, shown to admins in the Orders tab.
    const buyer = {
      name: shipping?.name || customer.name || null,
      email: customer.email || null,
      phone: customer.phone || null,
      address: shipping?.address || customer.address || null,
    };
    const { error } = await db.from("orders")
      .update({ status: "paid", stripe_checkout_session_id: session.id, shipping_address: buyer })
      .eq("id", orderId);
    if (error) return new Response("Order update failed", { status: 500 });
    const { data: items } = await db.from("order_items").select("artwork_id, price_usd, artworks(title)").eq("order_id", orderId);
    const artworkIds = (items || []).map((i) => i.artwork_id);
    if (artworkIds.length) await db.from("artworks").update({ status: "sold" }).in("id", artworkIds);
    // Closing the enquiry retires its quote link so it can't be paid twice.
    await db.from("enquiries").update({ status: "closed" }).eq("checkout_order_id", orderId);
    if (PAYMENTS_ENABLED) await notifyAdmin(orderId, session, buyer, (items || []) as unknown as { price_usd: number; artworks: { title: string } | null }[]);
  } else if (event.type === "checkout.session.expired") {
    await db.from("orders").update({ status: "cancelled", enquiry_id: null }).eq("id", orderId).eq("status", "pending");
  }
  return new Response("ok");
}
