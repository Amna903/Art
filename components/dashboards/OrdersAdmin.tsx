"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ListRowSkeleton } from "@/components/ui/Skeleton";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items?: { id: string; artwork_id: string; price_usd: number }[];
};
type OrderStatus = Order["status"];

const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "completed", "cancelled"] as OrderStatus[];

export function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(id, artwork_id, price_usd)")
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

  return (
    <section>
      {loading ? (
        <ListRowSkeleton count={4} />
      ) : orders.length === 0 ? (
        <p className="text-on-surface-variant text-sm">No orders yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-on-surface-variant">
            <tr className="border-b border-primary/10">
              <th className="text-left py-3">Order</th>
              <th className="text-left py-3">Items</th>
              <th className="text-left py-3">Total</th>
              <th className="text-left py-3">Date</th>
              <th className="text-right py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-primary/5 align-top">
                <td className="py-3 text-primary font-mono text-xs">{o.id.slice(0, 8)}…</td>
                <td className="py-3 text-on-surface-variant">{o.order_items?.length ?? 0}</td>
                <td className="py-3">${Number(o.total_usd).toLocaleString()}</td>
                <td className="py-3 text-on-surface-variant">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 text-right">
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                    className="bg-transparent border border-primary/20 text-xs px-2 py-1 uppercase tracking-widest"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
