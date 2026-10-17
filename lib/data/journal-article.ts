import type { Database } from "@/lib/supabase/types";
import type { Language } from "@/lib/i18n/config";
import { localizeRow } from "@/lib/i18n/content";
import { formatDate, type Translator } from "@/lib/i18n/translate";

type JournalPost = Database["public"]["Tables"]["journal_posts"]["Row"];

export type JournalArticleData = {
  tag: string;
  date: string;
  read: string;
  title: string;
  /** Full body, split into paragraphs — first one renders as the drop-cap lead. */
  paragraphs: string[];
  /** Right-rail pull quote — a distinct excerpt when one exists, otherwise pulled from the lead paragraph. */
  quote: string;
  /** Cite under the pull quote — a real attribution when the post has one, otherwise the category. */
  quoteAuthor: string;
  img: string;
  alt: string;
};

export const JOURNAL_FALLBACK_IMAGE =
  "https://nu-artcollective.lovable.app/__l5e/assets-v1/0622c489-71d0-4a78-a45d-29fb5bb45e68/afr-charcoal.jpg";

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Pulls a quotable line out of the lead paragraph when no distinct excerpt is available. */
export function deriveQuote(lead: string | undefined): string {
  if (!lead) return "";
  const sentence = lead.match(/^.{20,180}?[.!?](?=\s|$)/);
  return sentence ? sentence[0].trim() : lead.length > 160 ? `${lead.slice(0, 157).trim()}…` : lead;
}

/** Converts a real Supabase journal_posts row into the shared article shape,
 * in `lang` where the admin has entered a translation. */
export function toJournalArticleData(row: JournalPost, lang: Language = "en", t: Translator = (s) => s): JournalArticleData {
  const post = localizeRow(row, ["title", "excerpt", "content"], lang);
  const body = post.content?.trim() || post.excerpt || "";
  const paragraphs = splitParagraphs(body);
  // A distinct excerpt (not just the body echoed back) makes a better quote than a truncated sentence.
  const distinctExcerpt =
    post.excerpt && post.excerpt.trim() && post.excerpt.trim() !== body.trim() ? post.excerpt.trim() : null;
  return {
    tag: t(post.category),
    date: formatDate(post.created_at, lang),
    read: post.read_minutes ? t("{count} Min Read", { count: post.read_minutes }) : "",
    title: post.title,
    paragraphs,
    quote: distinctExcerpt ?? deriveQuote(paragraphs[0]),
    quoteAuthor: post.quote_author?.trim() || t(post.category),
    img: post.cover_image_url || JOURNAL_FALLBACK_IMAGE,
    alt: post.title,
  };
}
