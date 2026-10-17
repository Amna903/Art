import Link from "@/components/i18n/Link";
import { getI18n } from "@/lib/i18n/server";

export default async function CheckoutSuccessPage({ params }: PageProps<"/[lang]/checkout/success">) {
  const { t } = await getI18n(params);
  return <main className="max-w-2xl mx-auto px-gutter-page py-28 text-center"><p className="text-secondary text-xs uppercase tracking-widest mb-3">{t("Payment received")}</p><h1 className="font-display-lg text-display-lg text-primary mb-4">{t("Thank you for your acquisition.")}</h1><p className="text-on-surface-variant mb-8">{t("Your order is confirmed and will appear in your dashboard shortly.")}</p><Link href="/dashboard" className="bg-primary text-on-primary px-6 py-3 text-xs uppercase tracking-widest">{t("View my orders")}</Link></main>;
}
