import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { t } = await getI18n(params);
  return {
    title: t("Dashboard | NUA-ARTE"),
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
