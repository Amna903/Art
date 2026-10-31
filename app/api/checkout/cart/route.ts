import { NextResponse } from "next/server";
import { startCheckout } from "@/lib/checkout";
import { PAYMENTS_ENABLED } from "@/lib/features";

// Basket checkout — one Stripe session for every confirmed quote in the basket.
export async function POST(req: Request) {
  if (!PAYMENTS_ENABLED) return NextResponse.json({ error: "Online payments are not available yet." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.quoteTokens)) return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  const result = await startCheckout(req, body.quoteTokens, "/basket");
  return "url" in result ? NextResponse.json(result) : NextResponse.json({ error: result.error }, { status: result.status });
}
