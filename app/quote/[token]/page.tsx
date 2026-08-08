import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export const metadata: Metadata = {
  title: "Your Quote | NU-ART",
  description: "NU-ART — contemporary African art movement.",
};

type Props = { params: Promise<{ token: string }> };

const GALLERY_IMAGE =
  "https://nu-artcollective.lovable.app/__l5e/assets-v1/8170e7d1-3e87-4dfd-984d-5c50a5625187/afr-gallery-room.jpg";

function InvalidLink({ reason }: { reason: string }) {
  return (
    <main className="max-w-2xl mx-auto px-gutter-page py-24 text-center">
      <span className="material-symbols-outlined text-secondary text-4xl mb-4 block">error</span>
      <h1 className="font-headline-md text-headline-md mb-4">{reason}</h1>
      <p className="text-on-surface-variant mb-8">
        Quote links expire after 14 days for security. If you&apos;d still like to proceed, send us a new enquiry
        and we&apos;ll get a fresh link over to you.
      </p>
      <Link
        href="/artists"
        className="inline-flex items-center justify-center bg-primary text-on-primary px-8 py-3 font-navigation text-navigation uppercase tracking-widest"
      >
        Browse Artists
      </Link>
    </main>
  );
}

export default async function QuotePage({ params }: Props) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return <InvalidLink reason="Quotes aren't connected yet." />;
  }

  // get_quote_by_token is a SECURITY DEFINER RPC (see supabase/migrations/
  // 20260727000000_quotes.sql) — it only ever returns the single row whose
  // quote_token matches exactly and hasn't expired, so an anonymous visitor
  // can resolve their own quote without being able to browse anyone else's.
  const { data, error } = await supabase.rpc("get_quote_by_token", { p_token: token });
  const quote = data?.[0];

  if (error || !quote || quote.quoted_price == null) {
    return <InvalidLink reason="This link is invalid or has expired." />;
  }

  return (
    <main className="max-w-2xl mx-auto px-gutter-page py-24">
      <div className="mb-10 border border-secondary/30 bg-secondary/5 px-6 py-4 text-sm text-on-surface-variant">
        <span className="text-secondary font-bold">Private quote.</span> This page is reached only via the link a
        curator sends after quoting a price for your enquiry — it isn&apos;t linked from public browsing, since all
        our prices are Upon Request.
      </div>

      <div className="border border-primary/10 overflow-hidden">
        <div className="relative aspect-[16/9]">
          <Image fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" alt="" src={GALLERY_IMAGE} />
        </div>
        <div className="p-8">
          <p className="font-label-caps text-label-caps uppercase text-secondary mb-2">Your Private Quote</p>
          <h1 className="font-headline-md text-headline-md mb-1">{quote.artwork_title}</h1>
          {quote.artist_name && <p className="text-on-surface-variant italic mb-6">By {quote.artist_name}</p>}

          <div className="flex items-baseline gap-2 py-6 border-y border-primary/10 mb-6">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Quoted Price</span>
            <span className="font-headline-md text-headline-md text-primary ml-auto">
              ${Number(quote.quoted_price).toLocaleString()}
            </span>
          </div>

          <p className="text-on-surface-variant leading-relaxed mb-2">
            Hi {quote.name}, one of our curators has prepared this quote for {quote.artwork_title}. Reply to the
            email this link came from, or contact our curator office, to arrange payment and shipping.
          </p>
        </div>
      </div>
    </main>
  );
}
