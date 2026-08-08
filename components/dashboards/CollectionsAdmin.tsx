"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slugify";
import { F } from "./FormField";
import { ListRowSkeleton } from "@/components/ui/Skeleton";

type Collection = Database["public"]["Tables"]["collections"]["Row"];
type Artwork = Database["public"]["Tables"]["artworks"]["Row"];

export function CollectionsAdmin() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  // collection id -> set of artwork ids currently in that collection
  const [membership, setMembership] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const [cRes, aRes, caRes] = await Promise.all([
        supabase.from("collections").select("*").order("created_at", { ascending: false }),
        supabase.from("artworks").select("*").eq("status", "published").order("created_at", { ascending: false }),
        supabase.from("collection_artworks").select("collection_id, artwork_id"),
      ]);
      setCollections(cRes.data ?? []);
      setArtworks(aRes.data ?? []);
      const map = new Map<string, Set<string>>();
      (caRes.data ?? []).forEach((row) => {
        const set = map.get(row.collection_id) ?? new Set<string>();
        set.add(row.artwork_id);
        map.set(row.collection_id, set);
      });
      setMembership(map);
      setLoading(false);
    })();
  }, []);

  const uploadCover = async (file: File) => {
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("collections").upload(path, file);
    if (error) {
      alert(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("collections").getPublicUrl(path);
    setCoverUrl(data.publicUrl);
    setUploading(false);
  };

  const createCollection = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("collections")
      .insert({
        title: title.trim(),
        slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`,
        description: description.trim() || null,
        cover_image_url: coverUrl,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      alert(error.message);
      return;
    }
    // Prepend just the new collection — no refetch of the rest.
    setCollections((prev) => [data, ...prev]);
    setTitle("");
    setDescription("");
    setCoverUrl("");
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Delete this collection?")) return;
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setMembership((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    if (managing === id) setManaging(null);
  };

  const toggleArtwork = async (collectionId: string, artworkId: string) => {
    const inCollection = membership.get(collectionId)?.has(artworkId) ?? false;
    // Optimistic: patch only this one collection's membership set.
    setMembership((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(collectionId) ?? []);
      if (inCollection) set.delete(artworkId);
      else set.add(artworkId);
      next.set(collectionId, set);
      return next;
    });

    const { error } = inCollection
      ? await supabase.from("collection_artworks").delete().eq("collection_id", collectionId).eq("artwork_id", artworkId)
      : await supabase.from("collection_artworks").insert({ collection_id: collectionId, artwork_id: artworkId });

    if (error) {
      // Roll back just this collection's set on failure.
      setMembership((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(collectionId) ?? []);
        if (inCollection) set.add(artworkId);
        else set.delete(artworkId);
        next.set(collectionId, set);
        return next;
      });
      alert(error.message);
    }
  };

  if (loading) return <ListRowSkeleton count={3} />;

  const managingCollection = collections.find((c) => c.id === managing);

  return (
    <section className="space-y-10">
      <div className="border border-primary/10 p-6 space-y-4">
        <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">New collection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <F label="Title" value={title} onChange={setTitle} />
          <F label="Description" value={description} onChange={setDescription} />
        </div>
        <div>
          <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Cover image</span>
          <label className="block border border-dashed border-primary/25 bg-surface/60 hover:border-secondary cursor-pointer p-4">
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} className="sr-only" />
            <div className="flex items-start justify-between gap-4">
              <div className="font-navigation text-navigation uppercase tracking-[0.18em] text-primary">Click to upload a picture</div>
              <div className="shrink-0 border border-primary/15 px-3 py-2 text-xs uppercase tracking-[0.18em] text-primary">Choose file</div>
            </div>
          </label>
          {uploading && <div className="mt-2 text-xs text-secondary">Uploading…</div>}
          {coverUrl && <img src={coverUrl} alt="" className="mt-3 max-h-32 object-cover" />}
        </div>
        <button
          onClick={createCollection}
          disabled={!title.trim() || creating}
          className="bg-primary text-on-primary px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </div>

      <div className="space-y-3">
        {collections.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No collections yet.</p>
        ) : (
          collections.map((c) => {
            const count = membership.get(c.id)?.size ?? 0;
            return (
              <div key={c.id} className="flex items-center justify-between gap-4 border border-primary/10 p-4">
                <div className="flex items-center gap-4 min-w-0">
                  {c.cover_image_url && (
                    <Image src={c.cover_image_url} alt="" width={56} height={56} className="w-14 h-14 object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-primary truncate">{c.title}</div>
                    <div className="text-xs text-on-surface-variant">{count} artwork{count === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setManaging(c.id)}
                    className="text-[10px] uppercase tracking-widest px-3 py-2 border border-primary/20 hover:border-primary"
                  >
                    Manage Artworks
                  </button>
                  <button
                    onClick={() => deleteCollection(c.id)}
                    className="text-[10px] uppercase tracking-widest px-3 py-2 border border-secondary text-secondary hover:bg-secondary hover:text-on-primary"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {managingCollection && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-4xl p-8 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display-sm text-display-sm text-primary">{managingCollection.title}</h3>
              <button onClick={() => setManaging(null)} className="text-on-surface-variant">✕</button>
            </div>
            {artworks.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No published artworks yet.</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {artworks.map((a) => {
                  const selected = membership.get(managingCollection.id)?.has(a.id) ?? false;
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleArtwork(managingCollection.id, a.id)}
                      className={`relative aspect-square overflow-hidden border-2 ${selected ? "border-secondary" : "border-transparent"}`}
                      title={a.title}
                    >
                      <Image src={a.image_url} alt={a.title} fill sizes="20vw" className="object-cover" />
                      {selected && (
                        <div className="absolute inset-0 bg-secondary/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-3xl">check_circle</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
