"use client";

import { useState } from "react";
import Link from "next/link";

const FAQS = [
  {
    q: "How does pricing work?",
    a: "All prices are Upon Request. Submit an enquiry from any artwork page and one of our curators will follow up directly with pricing, availability, and shipping details — usually within 1–2 business days.",
  },
  {
    q: "Are the artworks authenticated?",
    a: "Yes. Every acquisition ships with a hand-signed Certificate of Authenticity, and provenance is documented from the artist's studio through to delivery.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes — insured, white-glove shipping in custom-built wooden crates is available worldwide. Shipping is quoted alongside your price after an enquiry.",
  },
  {
    q: "How are artists selected?",
    a: "Our curators travel to source work directly — nothing on NU-ART is submitted through an open call. Every artist is discovered, vetted, and onboarded by our team before their work appears on the platform.",
  },
  {
    q: "Do artists get paid directly?",
    a: "Yes. NU-ART pays artists directly rather than routing sales through traditional gallery margins, so more of every acquisition supports the artist's practice.",
  },
  {
    q: "Can I become an artist on NU-ART?",
    a: "Sign up at /auth and choose the 'artist' role to set up a studio profile. Our curatorial team reviews new artist accounts before their work goes live.",
  },
  {
    q: "What's the difference between the Virtual Gallery and Discover pages?",
    a: "The Virtual Gallery is a fully 3D, walkable museum experience. Discover pages are editorial, country-by-country spotlights with curated works, artist stories, and stats — both link back to the same artist and artwork detail pages.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main className="max-w-3xl mx-auto px-gutter-page py-16 md:py-24">
      <span className="font-label-caps text-label-caps text-secondary uppercase block mb-4">Support</span>
      <h1 className="font-display-lg text-display-lg mb-6">Frequently Asked Questions</h1>
      <p className="text-on-surface-variant mb-14">
        Can&apos;t find what you&apos;re looking for?{" "}
        <Link href="/about" className="text-secondary underline underline-offset-4">
          Learn more about us
        </Link>{" "}
        or reach out through any artwork&apos;s enquiry form.
      </p>

      <div className="divide-y divide-outline-variant border-t border-b border-outline-variant">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 py-6 text-left min-h-[44px]"
              >
                <span className="font-headline-sm text-headline-sm">{item.q}</span>
                <span
                  className={`material-symbols-outlined text-secondary shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  add
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"
                }`}
                style={{ display: "grid" }}
              >
                <div className="overflow-hidden">
                  <p className="text-on-surface-variant leading-relaxed max-w-xl">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
