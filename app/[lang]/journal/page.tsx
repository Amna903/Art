import type { Metadata } from "next";
import { getPageBlocks, blockText } from "@/lib/data/pageBlocks";
import { getPublishedJournalPosts } from "@/lib/data/journal";
import { toJournalArticleData } from "@/lib/data/journal-article";
import { EditableText } from "@/components/editing/EditableText";
import { LatestFromJournal } from "@/components/sections/journal/LatestFromJournal";
import { ShareLinks } from "@/components/journal/ShareLinks";
import { JournalArticle } from "@/components/journal/JournalArticle";
import { getI18n } from "@/lib/i18n/server";
import { QuoteBlock } from "@/components/sections/QuoteBlock";
import { quoteFor } from "@/lib/data/quotes";

export async function generateMetadata({ params }: PageProps<"/[lang]/journal">): Promise<Metadata> {
  const { t } = await getI18n(params);
  return { title: t("Journal | NUA-ARTE"), description: t("NUA-ARTE — contemporary African art movement.") };
}

// Matches the 60s window the underlying Supabase/Sanity reads are cached at.
export const revalidate = 60;

const IMAGE_HOLDS_PARAGRAPHS = [
  "Every time I look at this photograph, I am back at the funeral of my aunt, Catarina Pinto.",
  "She was my best aunt. I say it plainly, the way a child would, because that is how I still feel it.",
  "She was the woman who delivered me. I was born in precarious conditions, and hers were the first hands to hold me.",
  "I took this photograph myself, at her funeral. It is my tribute to her, and to the Bantu family that gathered to honour her.",
  "In the photograph, they sit on the ground in a row, their backs to us. Strings of beads cross their shoulders. Skins are tied at the waist. A long drum rests beside them.",
  "Behind them, people stand and talk. Life carries on at the edges, as it always does.",
  "No one in the frame is looking at the camera. Nothing in it explains itself.",
  "Someone who was not there will see a composition. Light on skin. The rhythm of backs in a line. A beautiful image in black and white.",
  "I see something else.",
  "I see the weight of that day. I hear what the picture cannot hold. I think of the one person who is missing from the crowd, because she was the reason all of us had come.",
  "That is the distance between an image and its story.",
  "It is the same distance I kept thinking about when Anané came home from Luanda with twenty pieces of art.",
  "She had chosen them by instinct. Something in each work had reached her before she knew anything about the hands that made it. When I approached her about working together, we began with the simplest questions.",
  "Who made this? Where did they come from? What were they carrying when they made it?",
  "I knew why those questions mattered, because I knew this photograph.",
  "An artwork can be admired without its story. Many are. They are bought, hung and praised by people who will never learn the name of the person who made them.",
  "Something is lost in that silence. For the viewer, a deeper way of seeing. For the artist, the dignity of being known.",
  "My aunt does not appear in this photograph. And yet, for me, she is all of it.",
  "I believe the same is true of most art made far from the galleries. There is someone in it who does not appear. A mother. A teacher. A village. A loss. A reason.",
  "NUA-ARTE exists to shorten that distance. To let the artist say, in their own words, what the work holds. To give the person who stops in front of a painting the chance to meet whoever stands behind it.",
  "I cannot give you my aunt. I can only tell you that her name was Catarina Pinto, that she was loved, and that this photograph is one of the ways I carry her.",
  "The artists we work with carry people too.",
  "This Journal is where we will ask them, with care, who those people are.",
  "A stranger sees beads, bare shoulders and a drum.",
  "I see my aunt.",
  "Now, when you look again, perhaps you will see her too.",
];


export default async function JournalPage({ params }: PageProps<"/[lang]/journal">) {
  const { lang, t } = await getI18n(params);
  const [blocks, posts] = await Promise.all([getPageBlocks("journal", lang), getPublishedJournalPosts()]);
  // An admin can pin one real post (★ in the journal grid below) to take over this
  // top slot entirely — same "real replaces static" exchange as everywhere else,
  // just a single admin-chosen slot instead of an auto-ranked or slot-filled list.
  const pinnedPost = posts.find((p) => p.is_pinned);

  const quote = quoteFor("journal");

  return (
    <main>
      <header className="px-gutter-page max-w-container-max mx-auto pt-16 md:pt-24">
        <span className="font-label-caps tracking-widest text-secondary">{t("Journal")}</span>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] md:text-6xl">{t("Closer to the story")}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-[1.6] text-on-surface">
          {t("Spend time with the people, places and encounters behind NUA-ARTE. Here we share artists’ words, moments from our travels and the details that deepen a connection to the work.")}
        </p>
        <a href="#stories" className="mt-5 inline-block border-b border-current pb-1 text-base hover:border-[var(--nua-red)] hover:text-[var(--nua-red)]">
          {t("Read the stories")}
        </a>
      </header>
      <div id="stories" />
      {pinnedPost ? (
        <JournalArticle post={toJournalArticleData(pinnedPost, lang, t)} showBackLink={false} lang={lang} />
      ) : (
      <article className="px-gutter-page max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter mb-section-gap pt-16">
        {/* First-person account of the Luanda art market (client direction):
            Anané's own words from the website copy document. New block keys,
            so edits of the earlier template article do not override it. */}
        <aside className="hidden md:block md:col-span-2">
          <div className="sticky top-32 space-y-12">
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">{t("Read Time")}</h4>
              <EditableText page="journal" blockKey="luanda_read_time" value={blockText(blocks, "luanda_read_time", "3 Minutes")} as="p" className="font-body-md text-body-md" multiline={false} />
            </div>
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">{t("Topic")}</h4>
              <EditableText page="journal" blockKey="luanda_topic" value={blockText(blocks, "luanda_topic", "The beginning")} as="p" className="font-body-md text-body-md" multiline={false} />
            </div>
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">{t("Share")}</h4>
              <ShareLinks />
            </div>
          </div>
        </aside>

        <div className="md:col-span-7 space-y-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">{t("A first-hand account")}</p>
            <EditableText
              page="journal"
              blockKey="luanda_title"
              value={blockText(blocks, "luanda_title", "Twenty works from the art market in Luanda")}
              as="h2"
              className="mt-3 font-display text-4xl md:text-5xl leading-[1.08]"
              multiline={false}
            />
            <p className="mt-4 text-base text-on-surface-variant">
              <span translate="no">Anané Vega</span> · {t("Founder and Curator")}
            </p>
          </div>
          <EditableText
            page="journal"
            blockKey="luanda_body_1"
            value={blockText(blocks, "luanda_body_1", "When I travel for music, I often look for art to bring home. During a visit to Luanda, I asked to be taken to the art market. I went to collect, drawn by the works that made me stop and feel something.")}
            as="p"
            className="text-lg md:text-xl leading-[1.6] text-on-surface"
          />
          <EditableText
            page="journal"
            blockKey="luanda_body_2"
            value={blockText(blocks, "luanda_body_2", "I purchased twenty pieces, imagining them in my homes, living with them and moving them from one space to another. I had no idea they would become the beginning of a platform.")}
            as="p"
            className="text-lg md:text-xl leading-[1.6] text-on-surface"
          />
          <EditableText
            page="journal"
            blockKey="luanda_body_3"
            value={blockText(blocks, "luanda_body_3", "After I returned home, Nilton approached me about a collaboration. We began learning more about the people behind the work. Some of the paintings I had felt most connected to carried stories I had not known when I chose them. That discovery deepened everything.")}
            as="p"
            className="text-lg md:text-xl leading-[1.6] text-on-surface"
          />
          <EditableText
            page="journal"
            blockKey="luanda_body_4"
            value={blockText(blocks, "luanda_body_4", "I wanted to share that feeling: the first spark of connection, followed by the curiosity to know more. NUA-ARTE is the space we are building for it.")}
            as="p"
            className="text-lg md:text-xl leading-[1.6] text-on-surface"
          />
        </div>

        <aside className="hidden md:block md:col-span-3">
          <div className="sticky top-1/3 border-l border-secondary pl-8">
            <EditableText
              page="journal"
              blockKey="luanda_pull_quote"
              value={blockText(blocks, "luanda_pull_quote", "I went to collect, drawn by the works that made me stop and feel something.")}
              as="blockquote"
              className="font-display text-3xl leading-tight mb-6"
            />
            <p className="text-sm uppercase tracking-widest text-on-surface-variant" translate="no">Anané Vega</p>
          </div>
        </aside>
      </article>
      )}

      {/* Journal 02 — Nilton's photograph from the funeral of Catarina Pinto,
          from the "What an Image Holds" document. */}
      <article className="px-gutter-page max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter mb-section-gap pt-16 border-t border-[var(--nua-line)] dark:border-[var(--nua-line-dark)]">
        <aside className="hidden md:block md:col-span-2">
          <div className="sticky top-32 space-y-12">
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">{t("Read Time")}</h4>
              <EditableText page="journal" blockKey="image_holds_read_time" value={blockText(blocks, "image_holds_read_time", "4 Minutes")} as="p" className="font-body-md text-body-md" multiline={false} />
            </div>
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">{t("Topic")}</h4>
              <EditableText page="journal" blockKey="image_holds_topic" value={blockText(blocks, "image_holds_topic", "Memory")} as="p" className="font-body-md text-body-md" multiline={false} />
            </div>
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">{t("Share")}</h4>
              <ShareLinks />
            </div>
          </div>
        </aside>

        <div className="md:col-span-7 space-y-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">{t("Journal 02")}</p>
            <EditableText
              page="journal"
              blockKey="image_holds_title"
              value={blockText(blocks, "image_holds_title", "What an Image Holds")}
              as="h2"
              className="mt-3 font-display text-4xl md:text-5xl leading-[1.08]"
              multiline={false}
            />
            <p className="mt-4 text-base text-on-surface-variant">
              <span translate="no">Nilton Viana</span> · {t("Words and photograph")}
            </p>
          </div>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/journal-02-what-an-image-holds.jpg"
              alt={t("Members of a Bantu family seated in a row with their backs to the camera, beads across their shoulders and a long drum beside them.")}
              className="w-full max-w-md mx-auto grayscale"
            />
            <figcaption className="mt-3 text-sm text-on-surface-variant text-center">
              {t("Photograph taken at the funeral of Catarina Pinto.")}
            </figcaption>
          </figure>
          {IMAGE_HOLDS_PARAGRAPHS.map((text, i) => (
            <EditableText
              key={i}
              page="journal"
              blockKey={`image_holds_body_${i + 1}`}
              value={blockText(blocks, `image_holds_body_${i + 1}`, text)}
              as="p"
              className="text-lg md:text-xl leading-[1.6] text-on-surface"
            />
          ))}
        </div>

        <aside className="hidden md:block md:col-span-3">
          <div className="sticky top-1/3 border-l border-secondary pl-8">
            <EditableText
              page="journal"
              blockKey="image_holds_pull_quote"
              value={blockText(blocks, "image_holds_pull_quote", "A stranger sees beads, bare shoulders and a drum. I see the woman who brought me into the world. NUA-ARTE exists for that distance: the one between what an image shows and what it holds.")}
              as="blockquote"
              className="font-display text-3xl leading-tight mb-6"
            />
            <p className="text-sm uppercase tracking-widest text-on-surface-variant" translate="no">Nilton Viana</p>
          </div>
        </aside>
      </article>

      {/* The quote closes the main story and leads into the other stories,
          instead of sitting between the header and the story. */}
      {quote ? (
        <div className="border-t border-[var(--nua-line)] dark:border-[var(--nua-line-dark)]">
          <QuoteBlock quote={quote} />
        </div>
      ) : (
        <div className="w-full h-[1px] bg-secondary/20 mb-section-gap relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-1 bg-secondary" />
        </div>
      )}

      <LatestFromJournal lang={lang} />

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
              {t("Inquire About Pieces")}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
