"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slugify";
import { AFRICAN_COUNTRIES } from "@/lib/data/africa";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { F } from "@/components/dashboards/FormField";

type JournalPost = Database["public"]["Tables"]["journal_posts"]["Row"];
type CardData = { slug: string; tag: string; date: string; read: string; title: string; body: string; img: string; alt: string };

const CATEGORIES = ["Curator Notes", "Artist Stories", "Market Analysis", "Exhibitions"] as const;

/** Turns a displayed card (real or fallback) into a draft the editor modal can open — claiming a
 * still-static card just means editing it now inserts a real row using the same slug/content as a starting point. */
function toDraft(card: CardData): Partial<JournalPost> {
  const minutes = parseInt(card.read, 10);
  return {
    slug: card.slug,
    title: card.title,
    category: (CATEGORIES as readonly string[]).includes(card.tag) ? card.tag : CATEGORIES[0],
    excerpt: card.body,
    content: "",
    cover_image_url: card.img,
    read_minutes: Number.isNaN(minutes) ? null : minutes,
    country: null,
    quote_author: null,
  };
}

function toCard(p: JournalPost): CardData {
  return {
    slug: p.slug,
    tag: p.category,
    date: new Date(p.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    read: p.read_minutes ? `${p.read_minutes} Min Read` : "",
    title: p.title,
    body: p.excerpt ?? "",
    img: p.cover_image_url,
    alt: p.title,
  };
}

export function JournalGrid({
  initialItems,
  fallbackItems,
}: {
  initialItems: JournalPost[];
  fallbackItems: CardData[];
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<Partial<JournalPost> | null>(null);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("journal_posts").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }, []);

  const startNew = () =>
    setEditing({ title: "", category: CATEGORIES[0], excerpt: "", content: "", cover_image_url: "", read_minutes: null, country: null, quote_author: null });

  const save = async () => {
    if (!editing?.title) return;
    const payload = {
      title: editing.title,
      slug: editing.slug || `${slugify(editing.title)}-${Math.random().toString(36).slice(2, 6)}`,
      category: editing.category || CATEGORIES[0],
      excerpt: editing.excerpt ?? null,
      content: editing.content ?? "",
      cover_image_url: editing.cover_image_url ?? "",
      read_minutes: editing.read_minutes ?? null,
      country: editing.country ?? null,
      quote_author: editing.quote_author?.trim() || null,
    };
    // Claiming a still-static card carries its slug over so the same /journal/<slug> URL keeps
    // working — but that slug may already belong to a real row (e.g. claimed a moment ago from
    // another tab), so a duplicate-slug conflict is a real possibility here, not just theoretical.
    const { error } = editing.id
      ? await supabase.from("journal_posts").update(payload).eq("id", editing.id)
      : await supabase.from("journal_posts").insert(payload);
    if (error) {
      alert(error.message);
      return;
    }
    setEditing(null);
    reload();
    await pingRevalidate("journal-posts");
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this journal post?")) return;
    await supabase.from("journal_posts").delete().eq("id", id);
    reload();
    await pingRevalidate("journal-posts");
    router.refresh();
  };

  const setAsMainStory = async (id: string) => {
    // Unset whichever post currently holds the pinned slot before claiming it, so the
    // "at most one pinned post" partial unique index never sees two true rows at once.
    await supabase.from("journal_posts").update({ is_pinned: false }).eq("is_pinned", true);
    const { error } = await supabase.from("journal_posts").update({ is_pinned: true }).eq("id", id);
    if (error) alert(error.message);
    reload();
    await pingRevalidate("journal-posts");
    router.refresh();
  };

  const upload = async (file: File) => {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("journal").upload(path, file);
    if (upErr) {
      alert(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("journal").getPublicUrl(path);
    setEditing((e) => ({ ...e!, cover_image_url: data.publicUrl }));
    setUploading(false);
  };

  const cards = items.length > 0 ? items.map(toCard) : fallbackItems;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {cards.map((s, i) => {
          // Defined only when this card came from a real Supabase row — cards and items are
          // index-aligned whenever items.length > 0 (cards is built from items.map above);
          // when items is empty, items[i] is always undefined regardless of i, which correctly
          // signals "this card is fallback content, not a real editable row" either way.
          const realItem = items[i];
          return (
            <div key={realItem?.id ?? s.slug} className="group relative">
              {isAdmin && (
                <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {realItem && (
                    <button
                      onClick={() => setAsMainStory(realItem.id)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-full shadow-lg ${realItem.is_pinned ? "bg-secondary text-on-primary" : "bg-background text-primary"}`}
                      title={realItem.is_pinned ? "Currently the main story on /journal" : "Set as main story on /journal"}
                    >
                      {realItem.is_pinned ? "★" : "☆"}
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(realItem ?? toDraft(s))}
                    className="bg-secondary text-on-primary w-8 h-8 flex items-center justify-center text-sm rounded-full shadow-lg"
                    title={realItem ? "Edit" : "Edit to publish this as a real post"}
                  >
                    ✎
                  </button>
                  {realItem && (
                    <button
                      onClick={() => remove(realItem.id)}
                      className="bg-primary text-on-primary w-8 h-8 flex items-center justify-center text-sm rounded-full shadow-lg"
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
              <Link href={`/journal/${s.slug}`} className="block cursor-pointer">
                <div className="aspect-[16/9] overflow-hidden mb-6 relative">
                  <Image
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={s.alt}
                    src={s.img}
                  />
                  <div className="absolute bottom-0 left-0 bg-primary text-on-primary px-4 py-1 font-label-caps text-[10px] uppercase">
                    {s.tag}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-on-surface-variant font-label-caps text-[10px] uppercase tracking-widest">
                    <span>{s.date}</span>
                    {s.read && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span> {s.read}
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline-sm text-headline-sm group-hover:text-secondary transition-colors">
                    {s.title}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{s.body}</p>
                </div>
              </Link>
            </div>
          );
        })}

        {isAdmin && (
          <button
            onClick={startNew}
            className="border border-dashed border-primary/25 hover:border-secondary flex flex-col items-center justify-center gap-2 min-h-[280px] text-on-surface-variant hover:text-secondary transition-colors"
          >
            <span className="text-3xl">+</span>
            <span className="font-label-caps text-[10px] uppercase tracking-widest">Add journal post</span>
          </button>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-background w-full max-w-2xl p-8 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display-sm text-display-sm text-primary">{editing.id ? "Edit post" : "New post"}</h3>
              <button onClick={() => setEditing(null)} className="text-on-surface-variant">✕</button>
            </div>
            <div className="space-y-4">
              <F label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} />
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Category</span>
                  <select
                    value={editing.category ?? CATEGORIES[0]}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <F
                  label="Read minutes"
                  type="number"
                  value={editing.read_minutes != null ? String(editing.read_minutes) : ""}
                  onChange={(v) => setEditing({ ...editing, read_minutes: v ? Number(v) : null })}
                />
                <label className="block col-span-2">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                    Country <span className="normal-case text-on-surface-variant/60">(optional — shows this post on that country&apos;s page)</span>
                  </span>
                  <select
                    value={editing.country ?? ""}
                    onChange={(e) => setEditing({ ...editing, country: e.target.value || null })}
                    className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                  >
                    <option value="">— None (not country-specific) —</option>
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c.slug} value={c.name}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <F
                label="Excerpt"
                textarea
                value={editing.excerpt ?? ""}
                onChange={(v) => setEditing({ ...editing, excerpt: v })}
              />
              <label className="block">
                <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                  Quote author <span className="normal-case text-on-surface-variant/60">(optional — shown under the pull quote instead of the category)</span>
                </span>
                <input
                  value={editing.quote_author ?? ""}
                  onChange={(e) => setEditing({ ...editing, quote_author: e.target.value || null })}
                  placeholder="e.g. Kofi Mensah"
                  className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                />
              </label>
              <F label="Content" textarea value={editing.content ?? ""} onChange={(v) => setEditing({ ...editing, content: v })} />
              <div>
                <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Cover image</span>
                <label className="block border border-dashed border-primary/25 bg-surface/60 hover:border-secondary cursor-pointer p-4">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="sr-only" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-navigation text-navigation uppercase tracking-[0.18em] text-primary">Click to upload a picture</div>
                    <div className="shrink-0 border border-primary/15 px-3 py-2 text-xs uppercase tracking-[0.18em] text-primary">Choose file</div>
                  </div>
                </label>
                {uploading && <div className="mt-2 text-xs text-secondary">Uploading…</div>}
                <input
                  placeholder="…or paste an image URL"
                  value={editing.cover_image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })}
                  className="mt-3 w-full bg-transparent border-b border-primary/30 py-2 text-primary text-sm"
                />
                {editing.cover_image_url && <img src={editing.cover_image_url} alt="" className="mt-3 max-h-40 object-cover" />}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setEditing(null)} className="border border-primary/20 px-5 py-2 text-xs uppercase tracking-[0.2em]">Cancel</button>
                <button onClick={save} className="bg-primary text-on-primary px-5 py-2 text-xs uppercase tracking-[0.2em]">Publish</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
