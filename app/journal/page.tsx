import type { Metadata } from "next";
import { getPageBlocks, blockText, blockImage } from "@/lib/data/pageBlocks";
import { getPublishedJournalPosts } from "@/lib/data/journal";
import { toJournalArticleData } from "@/lib/data/journal-article";
import { EditableText } from "@/components/editing/EditableText";
import { EditableImage } from "@/components/editing/EditableImage";
import { LatestFromJournal } from "@/components/sections/journal/LatestFromJournal";
import { ShareLinks } from "@/components/journal/ShareLinks";
import { JournalArticle } from "@/components/journal/JournalArticle";

export const metadata: Metadata = {
  title: "Journal | NU-ART",
  description: "NU-ART — contemporary African art movement.",
};

// Matches the 60s window the underlying Supabase/Sanity reads are cached at.
export const revalidate = 60;

const A = "https://nu-artcollective.lovable.app/__l5e/assets-v1";

export default async function JournalPage() {
  const [blocks, posts] = await Promise.all([getPageBlocks("journal"), getPublishedJournalPosts()]);
  // An admin can pin one real post (★ in the journal grid below) to take over this
  // top slot entirely — same "real replaces static" exchange as everywhere else,
  // just a single admin-chosen slot instead of an auto-ranked or slot-filled list.
  const pinnedPost = posts.find((p) => p.is_pinned);

  const image1 = blockImage(blocks, "image_1", {
    src: `${A}/0622c489-71d0-4a78-a45d-29fb5bb45e68/afr-charcoal.jpg`,
    alt: "A detailed close-up shot of hand-woven African fabric with deep black threads and bright red accents, lit by warm, low-angle studio lighting.",
  });
  const image2 = blockImage(blocks, "image_2", {
    src: `${A}/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg`,
    alt: "A minimalist photograph of a weaver's hands working on a traditional wooden loom, with a single striking red thread pulled through the warp.",
  });
  const pullQuote = blockText(
    blocks,
    "pull_quote",
    "“We are not just weaving threads; we are weaving the historical consciousness of a continent.”",
  );

  return (
    <main>
      {pinnedPost ? (
        <JournalArticle post={toJournalArticleData(pinnedPost)} showBackLink={false} />
      ) : (
      <article className="px-gutter-page max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter mb-section-gap pt-16">
        <aside className="hidden md:block md:col-span-2">
          <div className="sticky top-32 space-y-12">
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">Read Time</h4>
              <EditableText
                page="journal"
                blockKey="sidebar_read_time"
                value={blockText(blocks, "sidebar_read_time", "12 Minutes")}
                as="p"
                className="font-body-md text-body-md"
                multiline={false}
              />
            </div>
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">Topic</h4>
              <EditableText
                page="journal"
                blockKey="sidebar_topic"
                value={blockText(blocks, "sidebar_topic", "Textile & Identity")}
                as="p"
                className="font-body-md text-body-md"
                multiline={false}
              />
            </div>
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">Share</h4>
              <ShareLinks title="NU-ART Journal" />
            </div>
          </div>
        </aside>

        <div className="md:col-span-7 space-y-12">
          <EditableText
            page="journal"
            blockKey="hero_lead"
            value={blockText(
              blocks,
              "hero_lead",
              "The conversation around contemporary African art has shifted. No longer confined to the periphery of global discourse, it now dictates the tempo. In this deep dive, we explore how textile artists are reclaiming ancient weaving techniques to narrate stories of migration, digital identity, and ancestral memory.",
            )}
            as="div"
            className="font-serif text-xl md:text-2xl leading-relaxed text-on-surface drop-cap"
          />
          <EditableText
            page="journal"
            blockKey="body_1"
            value={blockText(
              blocks,
              "body_1",
              "Traditionally, weaving was a communal act — a rhythmic dialogue between the weaver and the loom. Today, that rhythm is being reinterpreted through the lens of modern software and political activism. Artists like El Anatsui paved the way, but a new generation is taking the mantle, using everything from discarded copper wire to recycled digital cables to create tapestries that function as both art and archive.",
            )}
            as="p"
            className="font-serif text-lg md:text-xl leading-relaxed text-on-surface-variant"
          />
          <div className="md:hidden border-l-2 border-secondary pl-6 my-12 italic text-2xl font-serif">
            <EditableText page="journal" blockKey="pull_quote" value={pullQuote} as="span" />
          </div>
          <EditableText
            page="journal"
            blockKey="body_2"
            value={blockText(
              blocks,
              "body_2",
              "Sustainability is not a buzzword here; it is an inheritance. The materials chosen by these artists often reflect the environmental realities of their locales. From the e-waste graveyards of Accra to the bustling textile markets of Lagos, the raw matter of their work is infused with the weight of the present moment.",
            )}
            as="p"
            className="font-serif text-lg md:text-xl leading-relaxed text-on-surface-variant"
          />
          <div className="grid grid-cols-2 gap-4 py-8">
            <EditableImage
              page="journal"
              blockKey="image_1"
              bucket="journal"
              src={image1.src}
              alt={image1.alt}
              className="aspect-[3/4] overflow-hidden"
            />
            <EditableImage
              page="journal"
              blockKey="image_2"
              bucket="journal"
              src={image2.src}
              alt={image2.alt}
              className="aspect-[3/4] overflow-hidden mt-12"
            />
          </div>
          <EditableText
            page="journal"
            blockKey="body_3"
            value={blockText(
              blocks,
              "body_3",
              "In our exclusive interview with the collective behind 'The Loom Project', they discuss the tension between preservation and evolution. \"The challenge,\" says lead artist Kofi Mensah, \"is to respect the geometry of the past while building the abstractions of the future.\"",
            )}
            as="p"
            className="font-serif text-lg md:text-xl leading-relaxed text-on-surface-variant"
          />
        </div>

        <aside className="hidden md:block md:col-span-3">
          <div className="sticky top-1/3">
            <div className="border-l border-secondary pl-8">
              <span className="material-symbols-outlined text-secondary text-5xl mb-6">format_quote</span>
              <EditableText page="journal" blockKey="pull_quote" value={pullQuote} as="blockquote" className="font-serif text-3xl leading-tight mb-6" />
              <EditableText
                page="journal"
                blockKey="pull_quote_cite"
                value={blockText(blocks, "pull_quote_cite", "— Kofi Mensah")}
                as="cite"
                className="font-label-caps text-label-caps uppercase text-on-surface-variant not-italic block"
                multiline={false}
              />
            </div>
          </div>
        </aside>
      </article>
      )}

      <div className="w-full h-[1px] bg-secondary/20 mb-section-gap relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-1 bg-secondary" />
      </div>

      <LatestFromJournal />

      <section className="w-full py-section-gap bg-surface-container-low overflow-hidden relative">
        <div className="max-w-container-max mx-auto px-gutter-page text-center relative z-10">
          <EditableText
            page="journal"
            blockKey="cta_heading"
            value={blockText(blocks, "cta_heading", "Support the Movement.")}
            as="h2"
            className="font-display-lg text-display-lg-mobile md:text-display-lg mb-12"
            multiline={false}
          />
          <div className="relative inline-block group">
            <svg
              className="absolute -inset-8 w-[140%] h-[140%] -left-[20%] -top-[20%] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              preserveAspectRatio="none"
              viewBox="0 0 200 100"
            >
              <path
                d="M10,50 Q10,10 100,10 Q190,10 190,50 Q190,90 100,90 Q10,90 10,50"
                fill="none"
                stroke="var(--red-blood)"
                strokeDasharray="600"
                strokeDashoffset="600"
                strokeWidth="2"
              >
                <animate attributeName="stroke-dashoffset" begin="mouseover" dur="0.8s" fill="freeze" from="600" to="0" />
              </path>
            </svg>
            <a className="font-headline-sm text-headline-sm text-primary uppercase tracking-widest px-8 py-4 block" href="#">
              Inquire About Pieces
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
