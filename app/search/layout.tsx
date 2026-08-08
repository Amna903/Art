import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | NU-ART",
  description: "Search artists, countries, and artworks across the NU-ART Collective.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
