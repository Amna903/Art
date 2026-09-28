import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

function validSignature(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature") || "";
  if (!secret || !validSignature(raw, signature, secret)) return new Response("Invalid signature", { status: 400 });
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed" && event.data?.object?.payment_status === "paid") {
    const orderId = event.data.object.metadata?.order_id;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (orderId && url && serviceKey) {
      const db = createClient(url, serviceKey);
      await db.from("orders").update({ status: "paid", stripe_checkout_session_id: event.data.object.id }).eq("id", orderId);
    }
  }
  return new Response("ok");
}
