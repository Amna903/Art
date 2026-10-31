import { NextResponse } from "next/server";
import { startCheckout } from "@/lib/checkout";

// "Buy now" from a private quote page — a one-item checkout.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.quoteToken) return NextResponse.json({ error: "Missing quote." }, { status: 400 });
  const result = await startCheckout(req, [body.quoteToken], `/quote/${body.quoteToken}`);
  return "url" in result ? NextResponse.json(result) : NextResponse.json({ error: result.error }, { status: result.status });
}
