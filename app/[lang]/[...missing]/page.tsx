import { notFound } from "next/navigation";

// Unmatched URLs render the localized not-found page inside the root layout.
export default function MissingPage() {
  notFound();
}
