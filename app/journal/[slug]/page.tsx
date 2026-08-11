import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJournalPostBySlug } from "@/lib/sanity/queries";
import { getPublishedJournalPostBySlug } from "@/lib/data/journal";
import { JOURNAL_FALLBACK_STORIES } from "@/lib/data/journal-fallback";
import { splitParagraphs, deriveQuote, toJournalArticleData, JOURNAL_FALLBACK_IMAGE, type JournalArticleData } from "@/lib/data/journal-article";
import { LatestFromJournal } from "@/components/sections/journal/LatestFromJournal";
import { JournalArticle } from "@/components/journal/JournalArticle";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

/** Priority: Sanity CMS → real Supabase post → static demo story, same chain as artworks/collections. */
async function resolvePost(slug: string): Promise<JournalArticleData | null> {
  const cms = await getJournalPostBySlug(slug);
  if (cms) {
    const paragraphs = splitParagraphs(cms.excerpt ?? "");
    return {
      tag: cms.tag ?? "Journal",
      date: cms.publishedAt
        ? new Date(cms.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "",
      read: cms.readMinutes ? `${cms.readMinutes} Min Read` : "",
      title: cms.title,
      paragraphs,
      quote: deriveQuote(paragraphs[0]),
      quoteAuthor: cms.tag ?? "Journal",
      img: cms.imageUrl ?? JOURNAL_FALLBACK_IMAGE,
      alt: cms.imageAlt ?? cms.title,
    };
  }

  const real = await getPublishedJournalPostBySlug(slug);
  if (real) return toJournalArticleData(real);

  const staticStory = JOURNAL_FALLBACK_STORIES.find((s) => s.slug === slug);
  if (staticStory) {
    const paragraphs = splitParagraphs(staticStory.body);
    return {
      tag: staticStory.tag,
      date: staticStory.date,
      read: staticStory.read,
      title: staticStory.title,
      paragraphs,
      quote: deriveQuote(paragraphs[0]),
      quoteAuthor: staticStory.tag,
      img: staticStory.img,
      alt: staticStory.alt,
    };
  }

  return null;
}

export function generateStaticParams() {
  return JOURNAL_FALLBACK_STORIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) return { title: "Journal | NU-ART" };
  return {
    title: `${post.title} | NU-ART Journal`,
    description: post.paragraphs[0] ?? "",
  };
}

export default async function JournalPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) notFound();

  return (
    <main>
      <JournalArticle post={post} />

      <div className="w-full h-[1px] bg-secondary/20 mb-section-gap relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-1 bg-secondary" />
      </div>

      <LatestFromJournal excludeSlug={slug} />
    </main>
  );
}
