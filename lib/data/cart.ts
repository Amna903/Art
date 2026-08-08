// Tiny localStorage cart for the demo.

export type CartItem = {
  id: string;
  title: string;
  artist: string;
  price: number;
  country: string;
  swatch: string;
};

const KEY = "nuart:cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  if (cart.find((c) => c.id === item.id)) return cart;
  cart.push(item);
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("nuart:cart-change"));
  return cart;
}

export function removeFromCart(id: string) {
  const cart = getCart().filter((c) => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("nuart:cart-change"));
  return cart;
}

export function cartCount(): number {
  return getCart().length;
}
