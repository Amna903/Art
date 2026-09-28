import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | NUA-ARTE",
  description: "Frequently asked questions about NUA-ARTE Collective.",
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
