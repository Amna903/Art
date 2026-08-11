import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCollectionBySlug, COLLECTIONS } from "@/lib/data/collections";
import { ARTWORKS } from "@/lib/data/content";
import { getCollectionWithArtworksBySlug } from "@/lib/data/supabase-collections";
import { RequestPriceButton } from "@/components/enquiry/RequestPriceButton";
import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { SaveButton } from "@/components/artwork/SaveButton";

type Props = { params: Promise<{ slug: string }> };

type ViewCollection = {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  tag?: string;
  country?: string;
  medium?: string;
  artists?: string;
};

type ViewArtwork = {
  slug: string;
  title: string;
  image: string;
  artist: string;
  medium: string;
  year: number | string;
};

async function resolveCollection(slug: string): Promise<{ collection: ViewCollection; artworks: ViewArtwork[] } | null> {
  const real = await getCollectionWithArtworksBySlug(slug);
  if (real) {
    return {
      collection: {
        slug: real.collection.slug,
        title: real.collection.title,
        description: real.collection.description ?? "",
        image: real.collection.coverImageUrl,
        imageAlt: real.collection.title,
      },
      artworks: real.artworks.map((a) => ({
        slug: a.slug,
        title: a.title,
        image: a.imageUrl,
        artist: a.artistName,
        medium: a.medium ?? "",
        year: a.year ?? "",
      })),
    };
  }

  const staticCollection = getCollectionBySlug(slug);
  if (!staticCollection) return null;
  return {
    collection: staticCollection,
    artworks: ARTWORKS.filter((w) => w.collections?.includes(slug)).map((w) => ({
      slug: w.slug,
      title: w.title,
      image: w.image,
      artist: w.artist,
      medium: w.medium,
      year: w.year,
    })),
  };
}

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

// ISR so cover/artwork swaps from the admin portal aren't stuck on the
// build-time snapshot (Vercel) while localhost (always dynamic in dev) looks fine.
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveCollection(slug);
  if (!resolved) return { title: "Collection | NU-ART" };
  return {
    title: `${resolved.collection.title} | NU-ART`,
    description: resolved.collection.description,
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { slug } = await params;
  const resolved = await resolveCollection(slug);
  if (!resolved) notFound();
  const { collection, artworks } = resolved;

  return (
    <main className="max-w-container-max mx-auto px-gutter-page">
      <nav className="pt-8 mb-8">
        <Link
          href="/collections"
          className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant hover:text-secondary transition-colors inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          All Collections
        </Link>
      </nav>

      <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-section-gap items-end border-b border-primary/10 pb-10">
        <div className="md:col-span-7">
          {collection.tag && (
            <span className="font-label-caps text-label-caps uppercase text-secondary mb-4 block">
              {collection.tag}
            </span>
          )}
          <h1 className="font-headline-md text-headline-md mb-6">{collection.title}</h1>
          <p className="font-body-lg text-on-surface-variant max-w-2xl">{collection.description}</p>
        </div>
        <div className="md:col-span-5 flex flex-wrap gap-8 md:justify-end">
          {collection.country && <Meta label="Country" value={collection.country} />}
          {collection.medium && <Meta label="Medium" value={collection.medium} />}
          <Meta label="Artworks" value={collection.artists ?? `${artworks.length}`} />
          <div>
            <p className="font-label-caps text-[10px] uppercase text-primary/40">Pricing</p>
            <PriceUponRequest className="font-body-md text-primary" />
          </div>
        </div>
      </section>

      <section className="mb-section-gap">
        <div className="relative overflow-hidden aspect-[21/9] mb-section-gap">
          <Image
            fill
            sizes="100vw"
            className="object-cover"
            alt={collection.imageAlt}
            src={collection.image}
          />
        </div>

        {artworks.length === 0 ? (
          <div className="py-24 text-center border-t border-primary/10">
            <p className="font-body-lg text-on-surface-variant mb-2">
              New works from this collection are being catalogued.
            </p>
            <p className="font-body-md text-on-surface-variant/70">
              Check back soon, or contact us for a private preview.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-gutter gap-y-16">
            {artworks.map((artwork) => (
              <article key={artwork.slug} className="group flex flex-col">
                <div className="relative mb-6 overflow-hidden aspect-[3/4] bg-surface-container group/card">
                  <Link href={`/artworks/${artwork.slug}`} className="block w-full h-full">
                    <Image
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                      alt={artwork.title}
                      src={artwork.image}
                    />
                  </Link>
                  <SaveButton
                    artworkSlug={artwork.slug}
                    artworkTitle={artwork.title}
                    artistName={artwork.artist}
                    artworkImage={artwork.image}
                    className="absolute top-4 right-4 z-10 p-2.5 bg-background/90 backdrop-blur rounded-full hover:bg-secondary group/heart transition-colors"
                  />
                </div>
                <Link href={`/artworks/${artwork.slug}`} className="block">
                  <h2 className="font-headline-sm text-headline-sm mb-1 group-hover:text-secondary transition-colors">
                    {artwork.title}
                  </h2>
                  <p className="font-body-md text-on-surface-variant italic mb-1">{artwork.artist}</p>
                  <p className="font-label-caps text-[11px] uppercase text-on-surface-variant/60">
                    {artwork.medium} · {artwork.year}
                  </p>
                </Link>
                <div className="mt-4">
                  <RequestPriceButton
                    artworkSlug={artwork.slug}
                    artworkTitle={artwork.title}
                    artistName={artwork.artist}
                    artworkImage={artwork.image}
                    className="font-navigation text-[11px] uppercase tracking-widest text-secondary hover:text-primary border-b border-secondary/30 hover:border-primary transition-all pb-0.5"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-label-caps text-[10px] uppercase text-primary/40">{label}</p>
      <p className="font-body-md text-primary">{value}</p>
    </div>
  );
}
