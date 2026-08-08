import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collector's Circle | NU-ART",
  description: "NU-ART — contemporary African art movement.",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
