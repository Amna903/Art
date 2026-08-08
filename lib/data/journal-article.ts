import type { Database } from "@/lib/supabase/types";

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

/** Converts a real Supabase journal_posts row into the shared article shape. */
export function toJournalArticleData(post: JournalPost): JournalArticleData {
  const body = post.content?.trim() || post.excerpt || "";
  const paragraphs = splitParagraphs(body);
  // A distinct excerpt (not just the body echoed back) makes a better quote than a truncated sentence.
  const distinctExcerpt =
    post.excerpt && post.excerpt.trim() && post.excerpt.trim() !== body.trim() ? post.excerpt.trim() : null;
  return {
    tag: post.category,
    date: new Date(post.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    read: post.read_minutes ? `${post.read_minutes} Min Read` : "",
    title: post.title,
    paragraphs,
    quote: distinctExcerpt ?? deriveQuote(paragraphs[0]),
    quoteAuthor: post.quote_author?.trim() || post.category,
    img: post.cover_image_url || JOURNAL_FALLBACK_IMAGE,
    alt: post.title,
  };
}
