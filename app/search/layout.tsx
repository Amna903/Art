import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | NUA-ARTE",
  description: "Search artists, countries, and artworks across the NUA-ARTE Collective.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
