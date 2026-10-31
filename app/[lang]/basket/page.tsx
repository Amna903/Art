import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { BasketView } from "@/components/enquiry/BasketView";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t("Basket | NUA-ARTE"), robots: { index: false } };
}

export default function BasketPage() {
  return <BasketView />;
}
