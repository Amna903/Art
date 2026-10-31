"use client";

import { useEffect, useState } from "react";
import Link from "@/components/i18n/Link";
import { useLanguage } from "@/lib/i18n";
import { cartCount, CART_EVENT } from "@/lib/data/cart";

export function BasketLink() {
  const { t } = useLanguage();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(cartCount());
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (!count) return null;
  return (
    <Link
      href="/basket"
      aria-label={t("Basket")}
      className="relative w-10 h-10 flex items-center justify-center text-on-surface hover:text-secondary transition-colors shrink-0"
    >
      <span className="material-symbols-outlined">shopping_bag</span>
      <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-secondary text-on-secondary text-[10px] leading-4 text-center">
        {count}
      </span>
    </Link>
  );
}
