import Link from "next/link";

export default function CheckoutSuccessPage() {
  return <main className="max-w-2xl mx-auto px-gutter-page py-28 text-center"><p className="text-secondary text-xs uppercase tracking-widest mb-3">Payment received</p><h1 className="font-display-lg text-display-lg text-primary mb-4">Thank you for your acquisition.</h1><p className="text-on-surface-variant mb-8">Your order is confirmed and will appear in your dashboard shortly.</p><Link href="/dashboard" className="bg-primary text-on-primary px-6 py-3 text-xs uppercase tracking-widest">View my orders</Link></main>;
}
