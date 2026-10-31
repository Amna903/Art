"use client";

import { useEffect, useState } from "react";
import Link from "@/components/i18n/Link";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { formatUsd } from "@/lib/i18n/translate";
import { getCart, removeFromCart, CART_EVENT, type CartItem } from "@/lib/data/cart";

export function BasketView() {
  const { session, user } = useAuth();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<CartItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setItems(getCart());
    sync();
    window.addEventListener(CART_EVENT, sync);
    return () => window.removeEventListener(CART_EVENT, sync);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price, 0);

  const checkout = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/checkout/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ quoteTokens: items.map((i) => i.quoteToken) }),
    });
    const body = await res.json().catch(() => ({}));
    if (body.url) window.location.assign(body.url);
    else {
      setError(body.error || t("Unable to start checkout."));
      setBusy(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-gutter-page py-24">
      <h1 className="font-headline-md text-headline-md mb-8">{t("Your Basket")}</h1>
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-on-surface-variant mb-6">
            {t("Your basket is empty. Artworks appear here once a curator has confirmed your price.")}
          </p>
          <Link href="/artists" className="bg-primary text-on-primary px-6 py-3 text-xs uppercase tracking-widest">
            {t("Browse Artists")}
          </Link>
        </div>
      ) : (
        <>
          <ul className="border-t border-primary/10">
            {items.map((item) => (
              <li key={item.quoteToken} className="flex items-center gap-4 py-5 border-b border-primary/10">
                <div className="min-w-0 flex-1">
                  <Link href={`/quote/${item.quoteToken}`} className="font-medium text-primary hover:text-secondary">
                    {item.title}
                  </Link>
                  {item.artist && <p className="text-sm text-on-surface-variant italic">{item.artist}</p>}
                </div>
                <span className="text-primary">{formatUsd(item.price, language)}</span>
                <button
                  onClick={() => removeFromCart(item.quoteToken)}
                  aria-label={t("Remove")}
                  className="material-symbols-outlined text-on-surface-variant hover:text-secondary"
                >
                  close
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between py-6">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">{t("Total")}</span>
            <span className="font-headline-md text-headline-md text-primary">{formatUsd(total, language)}</span>
          </div>
          {user ? (
            <button
              onClick={checkout}
              disabled={busy}
              className="w-full bg-primary text-on-primary px-6 py-3 text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {busy ? t("Opening secure checkout…") : t("Checkout")}
            </button>
          ) : (
            <Link
              href={`/auth?next=${encodeURIComponent("/basket")}`}
              className="block text-center bg-primary text-on-primary px-6 py-3 text-xs uppercase tracking-widest"
            >
              {t("Sign in to purchase")}
            </Link>
          )}
          {error && <p className="mt-3 text-xs text-secondary">{error}</p>}
        </>
      )}
    </main>
  );
}
