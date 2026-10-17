import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Admin Console | NUA-ARTE"),
    robots: { index: false, follow: false },
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
