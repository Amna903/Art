import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "@/components/i18n/Link";
import { getI18n } from "@/lib/i18n/server";

/**
 * Legal pages (/privacy, /terms, /cookies, /returns, /shipping), rendered from
 * the Markdown drafts in content/legal. Edit those files to change the text.
 *
 * The drafts are still waiting on attorney review and contain [PLACEHOLDER]s,
 * so every page shows a "draft" notice and the pages stay out of search
 * results until LEGAL_REVIEWED is set to true.
 *
 * The renderer covers only what the drafts use: #/## headings, paragraphs,
 * "- " lists, "| " tables, "> " quotes, "---" rules, **bold**, `code` and
 * [links](/path).
 */
export const LEGAL_REVIEWED = false;

export type LegalDoc = "privacy" | "terms" | "cookies" | "returns" | "shipping";

export const LEGAL_TITLES: Record<LegalDoc, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service & Sale",
  cookies: "Cookie Policy",
  returns: "Returns & Refunds",
  shipping: "Shipping Policy",
};

type Params = Promise<{ lang: string }>;

export function legalMetadata(doc: LegalDoc) {
  return async ({ params }: { params: Params }): Promise<Metadata> => {
    const { t } = await getI18n(params);
    return {
      title: `${t(LEGAL_TITLES[doc])} | NUA-ARTE`,
      description: `NUA-ARTE — ${t(LEGAL_TITLES[doc])}.`,
      robots: LEGAL_REVIEWED ? undefined : { index: false, follow: true },
    };
  };
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{inline(m[1], k)}</strong>);
    else if (m[2] !== undefined) out.push(<code key={k} className="font-mono text-[0.9em]">{m[2]}</code>);
    else {
      const href = m[4];
      out.push(
        href.startsWith("/") ? (
          <Link key={k} href={href} className="text-secondary underline underline-offset-2">{inline(m[3], k)}</Link>
        ) : (
          <a key={k} href={href} className="text-secondary underline underline-offset-2">{inline(m[3], k)}</a>
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function render(md: string): ReactNode[] {
  // Drop the "Note for NUA-ARTE / developer" quote; the page shows its own draft notice.
  const lines = md.split("\n").filter((l) => !/^>\s*⚠️/.test(l));
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const k = `b${i}`;
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("# ")) { i++; continue; } // title comes from the page header
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={k} className="font-headline-sm text-headline-sm mt-12 mb-4">{inline(line.slice(3), k)}</h2>);
      i++;
    } else if (line.trim() === "---") {
      blocks.push(<hr key={k} className="my-10 border-outline/15" />);
      i++;
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      blocks.push(
        <ul key={k} className="list-disc pl-6 space-y-2 mb-5">
          {items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
        </ul>,
      );
    } else if (line.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const [head, , ...body] = rows;
      blocks.push(
        <div key={k} className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>{cells(head).map((c, j) => <th key={j} className="text-left p-2 border-b border-outline/30 font-semibold">{inline(c, `${k}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>{cells(r).map((c, j) => <td key={j} className="p-2 border-b border-outline/10 align-top">{inline(c, `${k}r${ri}c${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (line.startsWith(">")) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) parts.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={k} className="border-l-2 border-secondary pl-4 my-5 text-on-surface-variant">{inline(parts.join(" "), k)}</blockquote>);
    } else {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#|- |\||>|---)/.test(lines[i])) parts.push(lines[i++]);
      // Markdown hard breaks (two trailing spaces) become <br>.
      const nodes: ReactNode[] = [];
      parts.forEach((p, j) => {
        if (j) nodes.push(/ {2}$/.test(parts[j - 1]) ? <br key={`br${j}`} /> : " ");
        nodes.push(...inline(p.trimEnd(), `${k}-${j}`));
      });
      blocks.push(<p key={k} className="mb-5">{nodes}</p>);
    }
  }
  return blocks;
}

export async function LegalPage({ doc, params }: { doc: LegalDoc; params: Params }) {
  const { lang, t } = await getI18n(params);
  // content/legal/<lang>/<doc>.md when a translation exists, else the English original.
  const dir = path.join(process.cwd(), "content/legal");
  const translated = lang === "en" ? null : await readFile(path.join(dir, lang, `${doc}.md`), "utf8").catch(() => null);
  const md = translated ?? (await readFile(path.join(dir, `${doc}.md`), "utf8"));
  return (
    <div className="max-w-3xl mx-auto px-gutter-page pt-28 md:pt-32 pb-16">
      <p className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-3">{t("Legal")}</p>
      <h1 className="font-headline-md text-headline-md mb-8">{t(LEGAL_TITLES[doc])}</h1>
      {!LEGAL_REVIEWED && (
        <div role="note" className="mb-10 p-4 border border-secondary/40 bg-secondary/5 text-sm">
          {t("Draft — this policy is under legal review. Bracketed items such as [DATE] are still to be completed.")}
        </div>
      )}
      {lang !== "en" && (
        <p className="mb-10 text-sm text-on-surface-variant">
          {translated
            ? t("This translation is provided for convenience. If it differs from the English version, the English version prevails.")
            : t("This policy is currently available in English only. The English version is the binding text.")}
        </p>
      )}
      <div className="font-body-md text-body-md leading-relaxed">{render(md)}</div>
      <nav aria-label={t("Legal")} className="mt-16 pt-6 border-t border-outline/15 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {(Object.keys(LEGAL_TITLES) as LegalDoc[]).filter((d) => d !== doc).map((d) => (
          <Link key={d} href={`/${d}`} className="hover:text-secondary">{t(LEGAL_TITLES[d])}</Link>
        ))}
      </nav>
    </div>
  );
}
