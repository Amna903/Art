import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | NU-ART",
  description: "Frequently asked questions about NU-ART Collective.",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
