"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slugify";
import { AFRICAN_COUNTRIES } from "@/lib/data/africa";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { F } from "@/components/dashboards/FormField";

type Exhibition = Database["public"]["Tables"]["exhibitions"]["Row"];
type ExhibitionStatus = Exhibition["status"];
type CardData = { month: string; title: string; body: string; img: string; alt: string };

const STATUSES: ExhibitionStatus[] = ["upcoming", "current", "past"];

function toCard(e: Exhibition): CardData {
  return {
    month: [e.status === "current" ? "LIVE NOW" : null, e.date_label].filter(Boolean).join(" · "),
    title: e.title,
    body: e.description ?? "",
    img: e.cover_image_url,
    alt: e.title,
  };
}

export function ExhibitionsGrid({
  initialItems,
  fallbackItems,
}: {
  initialItems: Exhibition[];
  fallbackItems: CardData[];
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<Partial<Exhibition> | null>(null);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("exhibitions").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }, []);

  const startNew = () =>
    setEditing({ title: "", description: "", cover_image_url: "", location: "", date_label: "", status: "upcoming", country: null });

  const save = async () => {
    if (!editing?.title) return;
    const payload = {
      title: editing.title,
      slug: editing.slug || `${slugify(editing.title)}-${Math.random().toString(36).slice(2, 6)}`,
      description: editing.description ?? null,
      cover_image_url: editing.cover_image_url ?? "",
      location: editing.location ?? null,
      date_label: editing.date_label ?? null,
      status: (editing.status as ExhibitionStatus) ?? "upcoming",
      country: editing.country ?? null,
    };
    if (editing.id) {
      await supabase.from("exhibitions").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("exhibitions").insert(payload);
    }
    setEditing(null);
    reload();
    await pingRevalidate("exhibitions");
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this exhibition?")) return;
    await supabase.from("exhibitions").delete().eq("id", id);
    reload();
    await pingRevalidate("exhibitions");
    router.refresh();
  };

  const upload = async (file: File) => {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("exhibitions").upload(path, file);
    if (upErr) {
      alert(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("exhibitions").getPublicUrl(path);
    setEditing((e) => ({ ...e!, cover_image_url: data.publicUrl }));
    setUploading(false);
  };

  const cards = items.length > 0 ? items.map(toCard) : fallbackItems;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        {cards.map((ev, i) => (
          <div key={items.length > 0 ? items[i].id : ev.title} className="group relative cursor-pointer">
            {isAdmin && items.length > 0 && (
              <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditing(items[i])}
                  className="bg-secondary text-on-primary w-8 h-8 flex items-center justify-center text-sm rounded-full shadow-lg"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => remove(items[i].id)}
                  className="bg-primary text-on-primary w-8 h-8 flex items-center justify-center text-sm rounded-full shadow-lg"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            )}
            <span className="font-label-caps text-label-caps text-on-surface-variant block mb-4">{ev.month}</span>
            <div className="mb-6 relative overflow-hidden aspect-[4/5]">
              <Image
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                alt={ev.alt}
                src={ev.img}
              />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                <button className="w-full py-3 bg-beige text-black font-navigation text-navigation uppercase">Remind Me</button>
              </div>
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-2">{ev.title}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">{ev.body}</p>
          </div>
        ))}

        {isAdmin && (
          <button
            onClick={startNew}
            className="border border-dashed border-primary/25 hover:border-secondary flex flex-col items-center justify-center gap-2 min-h-[280px] text-on-surface-variant hover:text-secondary transition-colors"
          >
            <span className="text-3xl">+</span>
            <span className="font-label-caps text-[10px] uppercase tracking-widest">Add exhibition</span>
          </button>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-background w-full max-w-2xl p-8 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display-sm text-display-sm text-primary">{editing.id ? "Edit exhibition" : "New exhibition"}</h3>
              <button onClick={() => setEditing(null)} className="text-on-surface-variant">✕</button>
            </div>
            <div className="space-y-4">
              <F label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} />
              <F label="Description" textarea value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
              <div className="grid grid-cols-2 gap-4">
                <F label="Location" value={editing.location ?? ""} onChange={(v) => setEditing({ ...editing, location: v })} />
                <F label="Date label" value={editing.date_label ?? ""} onChange={(v) => setEditing({ ...editing, date_label: v })} />
                <label className="block">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Status</span>
                  <select
                    value={editing.status ?? "upcoming"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as ExhibitionStatus })}
                    className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                    Country <span className="normal-case text-on-surface-variant/60">(optional — links to /discover)</span>
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
