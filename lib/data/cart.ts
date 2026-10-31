// Basket of admin-confirmed quotes, kept in localStorage. Only the quote token
// matters at checkout — the server re-reads every price from the enquiry, so
// the title/price here are for display only.

export type CartItem = {
  quoteToken: string;
  title: string;
  artist: string | null;
  price: number;
};

const KEY = "nuart:basket";
export const CART_EVENT = "nuart:cart-change";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function save(cart: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {}
  window.dispatchEvent(new CustomEvent(CART_EVENT));
  return cart;
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  if (cart.some((c) => c.quoteToken === item.quoteToken)) return cart;
  return save([...cart, item]);
}

export function removeFromCart(quoteToken: string) {
  return save(getCart().filter((c) => c.quoteToken !== quoteToken));
}

export function clearCart() {
  return save([]);
}

export function cartCount(): number {
  return getCart().length;
}
