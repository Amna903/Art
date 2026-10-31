"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/data/cart";

// Rendered on the checkout success page — the paid items are now sold.
export function ClearBasket() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
