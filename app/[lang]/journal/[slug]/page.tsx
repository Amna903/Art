import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJournalPostBySlug } from "@/lib/sanity/queries";
import { getPublishedJournalPostBySlug } from "@/lib/data/journal";
import { JOURNAL_FALLBACK_STORIES } from "@/lib/data/journal-fallback";
import { splitParagraphs, deriveQuote, toJournalArticleData, JOURNAL_FALLBACK_IMAGE, type JournalArticleData } from "@/lib/data/journal-article";
import { LatestFromJournal } from "@/components/sections/journal/LatestFromJournal";
import { JournalArticle } from "@/components/journal/JournalArticle";
import { getI18n } from "@/lib/i18n/server";
import type { Language } from "@/lib/i18n/config";
import { formatDate, type Translator } from "@/lib/i18n/translate";

type Props = { params: Promise<{ lang: string; slug: string }> };

export const revalidate = 60;

/** Priority: Sanity CMS → real Supabase post → static demo story, same chain as artworks/collections. */
async function resolvePost(slug: string, lang: Language, t: Translator): Promise<JournalArticleData | null> {
  const cms = await getJournalPostBySlug(slug);
  if (cms) {
    const paragraphs = splitParagraphs(cms.excerpt ?? "");
    return {
      tag: t(cms.tag ?? "Journal"),
      date: cms.publishedAt ? formatDate(cms.publishedAt, lang) : "",
      read: cms.readMinutes ? t("{count} Min Read", { count: cms.readMinutes }) : "",
      title: cms.title,
      paragraphs,
      quote: deriveQuote(paragraphs[0]),
      quoteAuthor: t(cms.tag ?? "Journal"),
      img: cms.imageUrl ?? JOURNAL_FALLBACK_IMAGE,
      alt: cms.imageAlt ?? cms.title,
    };
  }

  const real = await getPublishedJournalPostBySlug(slug);
  if (real) return toJournalArticleData(real, lang, t);

  const staticStory = JOURNAL_FALLBACK_STORIES.find((s) => s.slug === slug);
  if (staticStory) {
    // Built-in demo stories are site copy, so they go through the dictionary.
    const paragraphs = splitParagraphs(staticStory.body).map((p) => t(p));
    const minutes = parseInt(staticStory.read, 10);
    return {
      tag: t(staticStory.tag),
      date: formatDate(staticStory.date, lang) || staticStory.date,
      read: Number.isNaN(minutes) ? t(staticStory.read) : t("{count} Min Read", { count: minutes }),
      title: t(staticStory.title),
      paragraphs,
      quote: deriveQuote(paragraphs[0]),
      quoteAuthor: t(staticStory.tag),
      img: staticStory.img,
      alt: t(staticStory.alt),
    };
  }

  return null;
}

export function generateStaticParams() {
  return JOURNAL_FALLBACK_STORIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang, t } = await getI18n(params);
  const post = await resolvePost(slug, lang, t);
  if (!post) return { title: t("Journal | NUA-ARTE") };
  return {
    title: t("{title} | NUA-ARTE Journal", { title: post.title }),
    description: post.paragraphs[0] ?? "",
  };
}

export default async function JournalPostPage({ params }: Props) {
  const { slug } = await params;
  const { lang, t } = await getI18n(params);
  const post = await resolvePost(slug, lang, t);
  if (!post) notFound();

  return (
    <main>
      <JournalArticle post={post} lang={lang} />

      <div className="w-full h-[1px] bg-secondary/20 mb-section-gap relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-1 bg-secondary" />
      </div>

      <LatestFromJournal excludeSlug={slug} lang={lang} />
    </main>
  );
}
