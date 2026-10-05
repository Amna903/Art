"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/types";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { ListRowSkeleton } from "@/components/ui/Skeleton";

type Artwork = Database["public"]["Tables"]["artworks"]["Row"];

type Report = {
  note?: string;
  matches?: Array<{
    source: "platform" | "web";
    title?: string;
    url?: string;
    similarity: number;
  }>;
  webSearch?: string;
};

function asReport(value: Json | null): Report {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Report;
}

export function OriginalityReviewAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("artworks")
      .select("*")
      .in("originality_status", ["review", "blocked"])
      .order("originality_checked_at", { ascending: false });
    if (error) console.error("[Originality] Failed to load queue:", error.message);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (
    artwork: Artwork,
    next: { status: Artwork["status"]; originality_status: Artwork["originality_status"] },
  ) => {
    setBusyId(artwork.id);
    const { error } = await supabase
      .from("artworks")
      .update({
        status: next.status,
        originality_status: next.originality_status,
      })
      .eq("id", artwork.id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    await load();
    await pingRevalidate("artworks");
    router.refresh();
  };

  if (loading) return <ListRowSkeleton count={4} />;

  if (items.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">
        No flagged or uncertain originality matches in the queue.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <p className="text-sm text-on-surface-variant max-w-2xl">
        Clear matches are blocked automatically. Uncertain matches wait here for a human decision.
        Public reverse-image search cannot cover every unindexed page or private social post.
      </p>

      <div className="space-y-4">
        {items.map((a) => {
          const report = asReport(a.originality_report);
          const busy = busyId === a.id;
          return (
            <article
              key={a.id}
              className="border border-primary/10 bg-surface-container-low p-4 md:p-5 grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4"
            >
              <div className="relative aspect-[4/5] bg-surface-variant overflow-hidden">
                {a.image_url ? (
                  <Image src={a.image_url} alt={a.title} fill sizes="120px" className="object-cover" />
                ) : null}
              </div>

              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-primary">{a.title}</h3>
                    <p className="text-xs uppercase tracking-widest text-secondary mt-1">
                      {a.originality_status} · status {a.status}
                      {a.originality_score != null
                        ? ` · score ${(a.originality_score * 100).toFixed(0)}%`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() =>
                        resolve(a, { status: "published", originality_status: "clear" })
                      }
                      className="text-[10px] uppercase tracking-widest px-3 py-2 border border-primary/20 hover:border-primary disabled:opacity-50"
                    >
                      Approve & publish
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        resolve(a, { status: "draft", originality_status: "clear" })
                      }
                      className="text-[10px] uppercase tracking-widest px-3 py-2 border border-primary/20 hover:border-primary disabled:opacity-50"
                    >
                      Clear flag
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        resolve(a, { status: "blocked", originality_status: "blocked" })
                      }
                      className="text-[10px] uppercase tracking-widest px-3 py-2 border border-secondary text-secondary hover:bg-secondary hover:text-on-primary disabled:opacity-50"
                    >
                      Keep blocked
                    </button>
                  </div>
                </div>

                {report.note ? (
                  <p className="text-sm text-on-surface-variant">{report.note}</p>
                ) : null}

                {(report.matches ?? []).length > 0 ? (
                  <ul className="text-sm space-y-1">
                    {(report.matches ?? []).slice(0, 6).map((m, i) => (
                      <li key={`${m.url ?? m.title ?? i}`} className="text-on-surface-variant">
                        <span className="uppercase tracking-widest text-[10px] text-secondary mr-2">
                          {m.source}
                        </span>
                        {m.url ? (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            {m.title || m.url}
                          </a>
                        ) : (
                          <span>{m.title || "Match"}</span>
                        )}
                        <span className="ml-2 text-xs">
                          {(m.similarity * 100).toFixed(0)}% similar
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
