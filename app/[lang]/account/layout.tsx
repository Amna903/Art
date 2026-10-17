import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Collector's Circle | NUA-ARTE"),
    description: t("NUA-ARTE — contemporary African art movement."),
  };
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
