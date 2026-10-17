import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("FAQ | NUA-ARTE"),
    description: t("Frequently asked questions about NUA-ARTE Collective."),
  };
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
