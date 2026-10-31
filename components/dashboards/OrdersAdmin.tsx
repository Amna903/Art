"use client";

import { useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ListRowSkeleton } from "@/components/ui/Skeleton";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  stripe_checkout_session_id?: string | null;
  order_items?: { id: string; artwork_id: string; price_usd: number; artworks: { title: string; slug: string } | null }[];
};
type OrderStatus = Order["status"];
// Written by the Stripe webhook when a payment completes.
type Buyer = { name?: string | null; email?: string | null; phone?: string | null; address?: Record<string, string | null> | null };

const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "completed", "cancelled"] as OrderStatus[];
const STATUS_STYLE: Record<string, string> = {
  paid: "bg-green-600/10 text-green-700 border-green-600/30",
  shipped: "bg-secondary/10 text-secondary border-secondary/30",
  completed: "bg-primary/10 text-primary border-primary/30",
  pending: "text-on-surface-variant border-primary/20",
  cancelled: "text-on-surface-variant/60 border-primary/10",
};

export function OrdersAdmin() {
  const { t, formatShortDate, formatUsd } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // Abandoned checkouts are noise for day-to-day fulfilment.
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(id, artwork_id, price_usd, artworks(title, slug))")
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: OrderStatus) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    load();
  };

  const visible = showAll ? orders : orders.filter((o) => o.status !== "pending" && o.status !== "cancelled");
  const received = orders
    .filter((o) => o.status !== "pending" && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_usd), 0);
  const stripeBase = `https://dashboard.stripe.com${process.env.NEXT_PUBLIC_STRIPE_LIVE === "true" ? "" : "/test"}`;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-on-surface-variant">
          {t("Payments received")}: <span className="text-primary font-medium">{formatUsd(received)}</span>
        </p>
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-on-surface-variant">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          {t("Show unpaid & cancelled")}
        </label>
      </div>

      {loading ? (
        <ListRowSkeleton count={4} />
      ) : visible.length === 0 ? (
        <p className="text-on-surface-variant text-sm">{t("No orders yet.")}</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((o) => {
            const buyer = (o.shipping_address ?? null) as Buyer | null;
            const address = buyer?.address ? Object.values(buyer.address).filter(Boolean).join(", ") : "";
            return (
              <li key={o.id} className="border border-primary/10 p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-primary">{o.id.slice(0, 8)}…</span>
                  <span className="text-xs text-on-surface-variant">{formatShortDate(o.created_at)}</span>
                  <span className="ml-auto font-medium">{formatUsd(Number(o.total_usd))}</span>
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                    className={`border text-xs px-2 py-1 uppercase tracking-widest bg-transparent ${STATUS_STYLE[o.status] ?? ""}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(s)}
                      </option>
                    ))}
                  </select>
                </div>

                <ul className="text-sm">
                  {o.order_items?.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span>{i.artworks?.title ?? i.artwork_id.slice(0, 8)}</span>
                      <span className="text-on-surface-variant">{formatUsd(Number(i.price_usd))}</span>
                    </li>
                  ))}
                </ul>

                {buyer && (
                  <div className="text-sm text-on-surface-variant border-t border-primary/5 pt-3 grid gap-1 sm:grid-cols-2">
                    <p>
                      <span className="text-primary">{buyer.name || t("Buyer")}</span>
                      {buyer.email && (
                        <>
                          {" · "}
                          <a href={`mailto:${buyer.email}`} className="underline hover:text-secondary">
                            {buyer.email}
                          </a>
                        </>
                      )}
                      {buyer.phone && ` · ${buyer.phone}`}
                    </p>
                    {address && <p>{t("Ship to")}: {address}</p>}
                  </div>
                )}

                {o.stripe_checkout_session_id && o.status !== "pending" && o.status !== "cancelled" && (
                  <a
                    href={`${stripeBase}/search?query=${o.stripe_checkout_session_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs uppercase tracking-widest underline text-on-surface-variant hover:text-secondary"
                  >
                    {t("View payment in Stripe")}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
