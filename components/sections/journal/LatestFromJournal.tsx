import { getJournalPosts } from "@/lib/sanity/queries";
import { getPublishedJournalPosts } from "@/lib/data/journal";
import { JOURNAL_FALLBACK_STORIES } from "@/lib/data/journal-fallback";
import { JournalGrid } from "@/components/editing/JournalGrid";

const FALLBACK_IMAGE = "https://nu-artcollective.lovable.app/__l5e/assets-v1/0622c489-71d0-4a78-a45d-29fb5bb45e68/afr-charcoal.jpg";

/** The "Latest from the Journal" grid + category tabs — shared by the /journal listing page and each post's detail page. */
export async function LatestFromJournal({ excludeSlug }: { excludeSlug?: string }) {
  const [supaPosts, cmsPosts] = await Promise.all([getPublishedJournalPosts(), getJournalPosts()]);

  const fallbackItems =
    cmsPosts.length > 0
      ? cmsPosts.map((p) => ({
          slug: p.slug,
          tag: p.tag ?? "Journal",
          date: p.publishedAt
            ? new Date(p.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : "",
          read: p.readMinutes ? `${p.readMinutes} Min Read` : "",
          title: p.title,
          body: p.excerpt ?? "",
          img: p.imageUrl ?? FALLBACK_IMAGE,
          alt: p.imageAlt ?? p.title,
        }))
      : JOURNAL_FALLBACK_STORIES;

  // JournalGrid itself falls back to fallbackItems when this list is empty,
  // so filtering the current post out here (without a re-fallback) is safe.
  const initialItems = supaPosts.filter((p) => p.slug !== excludeSlug);
  const filteredFallback = fallbackItems.filter((p) => p.slug !== excludeSlug);

  return (
    <section className="px-gutter-page max-w-container-max mx-auto mb-section-gap">
      <div className="flex justify-between items-end mb-16">
        <div>
          <h2 className="font-headline-md text-headline-md mb-4">Latest from the Journal</h2>
          <div className="flex gap-8 border-b border-outline-variant pb-2">
            <button className="font-label-caps text-label-caps uppercase text-secondary">All Stories</button>
            <button className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors">
              Artist Stories
            </button>
            <button className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors">
              Curator Notes
            </button>
            <button className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors">
              Market Analysis
            </button>
          </div>
        </div>
        <a className="hidden md:flex items-center gap-2 font-navigation text-navigation uppercase group" href="#">
          View Archive
          <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
        </a>
      </div>

      <JournalGrid initialItems={initialItems} fallbackItems={filteredFallback} />
    </section>
  );
}
