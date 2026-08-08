import Link from "next/link";
import Image from "next/image";
import type { JournalArticleData } from "@/lib/data/journal-article";
import { ShareLinks } from "@/components/journal/ShareLinks";

/** The full magazine-style article layout — sticky sidebar, drop-cap lead, quote rail — shared by
 * the /journal/[slug] detail page and the pinned "main story" on /journal itself. */
export function JournalArticle({ post, showBackLink = true }: { post: JournalArticleData; showBackLink?: boolean }) {
  const [lead, ...rest] = post.paragraphs;

  return (
    <article className="px-gutter-page max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter mb-section-gap pt-16">
      <aside className="hidden md:block md:col-span-2">
        <div className="sticky top-32 space-y-12">
          {showBackLink && (
            <div>
              <Link
                href="/journal"
                className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant hover:text-secondary transition-colors inline-flex items-center gap-2 mb-12"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Journal
              </Link>
            </div>
          )}
          {post.read && (
            <div>
              <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">Read Time</h4>
              <p className="font-body-md text-body-md">{post.read}</p>
            </div>
          )}
          <div>
            <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">Topic</h4>
            <p className="font-body-md text-body-md">{post.tag}</p>
          </div>
          <div>
            <h4 className="font-label-caps text-label-caps uppercase text-secondary mb-4">Share</h4>
            <ShareLinks title={post.title} />
          </div>
        </div>
      </aside>

      <div className="md:col-span-7 space-y-12">
        <div>
          <span className="font-label-caps text-label-caps uppercase text-secondary mb-4 block md:hidden">{post.tag}</span>
          <h1 className="font-headline-md text-headline-md mb-6">{post.title}</h1>
          {post.date && (
            <p className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">{post.date}</p>
          )}
        </div>

        {lead && (
          <p className="font-serif text-xl md:text-2xl leading-relaxed text-on-surface drop-cap">{lead}</p>
        )}

        <div className="relative aspect-[16/9] overflow-hidden">
          <Image fill sizes="(max-width: 768px) 100vw, 58vw" className="object-cover" alt={post.alt} src={post.img} />
        </div>

        {rest.map((paragraph, i) => (
          <p key={i} className="font-serif text-lg md:text-xl leading-relaxed text-on-surface-variant">
            {paragraph}
          </p>
        ))}

        {post.quote && (
          <div className="md:hidden border-l-2 border-secondary pl-6 my-12 italic text-2xl font-serif">
            {post.quote}
          </div>
        )}
      </div>

      <aside className="hidden md:block md:col-span-3">
        {post.quote && (
          <div className="sticky top-1/3">
            <div className="border-l border-secondary pl-8">
              <span className="material-symbols-outlined text-secondary text-5xl mb-6">format_quote</span>
              <blockquote className="font-serif text-3xl leading-tight mb-6">{post.quote}</blockquote>
              <cite className="font-label-caps text-label-caps uppercase text-on-surface-variant not-italic block">
                — {post.quoteAuthor}
              </cite>
            </div>
          </div>
        )}
      </aside>
    </article>
  );
}
