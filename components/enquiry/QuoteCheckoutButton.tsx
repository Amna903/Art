"use client";

import { useEffect, useState } from "react";
import Link from "@/components/i18n/Link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { addToCart, getCart, CART_EVENT, type CartItem } from "@/lib/data/cart";

export function QuoteCheckoutButton({ quoteToken, item }: { quoteToken: string; item: CartItem }) {
  const { session, user } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inBasket, setInBasket] = useState(false);

  useEffect(() => {
    const sync = () => setInBasket(getCart().some((c) => c.quoteToken === quoteToken));
    sync();
    window.addEventListener(CART_EVENT, sync);
    return () => window.removeEventListener(CART_EVENT, sync);
  }, [quoteToken]);

  if (!user) {
    return (
      <Link
        href={`/auth?next=${encodeURIComponent(`/quote/${quoteToken}`)}`}
        className="inline-block bg-primary text-on-primary px-6 py-3 text-xs uppercase tracking-widest"
      >
        {t("Sign in to purchase")}
      </Link>
    );
  }
  const checkout = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ quoteToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (body.url) window.location.assign(body.url);
    else {
      setError(body.error || t("Unable to start checkout."));
      setBusy(false);
    }
  };
  return (
    <div className="mt-7">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={checkout}
          disabled={busy}
          className="bg-primary text-on-primary px-6 py-3 text-xs uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? t("Opening secure checkout…") : t("Buy now")}
        </button>
        {inBasket ? (
          <Link href="/basket" className="border border-primary px-6 py-3 text-xs uppercase tracking-widest">
            {t("View basket")}
          </Link>
        ) : (
          <button
            onClick={() => addToCart(item)}
            className="border border-primary px-6 py-3 text-xs uppercase tracking-widest"
          >
            {t("Add to basket")}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-secondary">{error}</p>}
    </div>
  );
}
