"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AFRICAN_COUNTRIES } from "@/lib/data/africa";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slugify";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { F } from "./FormField";
import { ListRowSkeleton } from "@/components/ui/Skeleton";

type ManagedArtist = Database["public"]["Tables"]["managed_artists"]["Row"];
type Artwork = Database["public"]["Tables"]["artworks"]["Row"];

const RESERVED_MEDIA = [
  "Painting",
  "Sculpture",
  "Photography",
  "Textile",
  "Digital",
  "Mixed Media",
] as const;

type ArtistDraft = {
  id?: string;
  display_name: string;
  bio: string;
  country: string;
  city: string;
  technique: string;
  avatar_url: string;
  slug: string;
};

type ArtworkDraft = Partial<Artwork> & { customMedium?: string };

function emptyArtistDraft(): ArtistDraft {
  return {
    display_name: "",
    bio: "",
    country: "",
    city: "",
    technique: "",
    avatar_url: "",
    slug: "",
  };
}

/**
 * Admin console for gallery-represented artists who do not have platform
 * accounts. Admins create the profile, fill bio/photo, and upload/manage
 * their artworks end-to-end.
 */
export function ManagedArtistsAdmin({ adminId }: { adminId: string }) {
  const router = useRouter();
  const [artists, setArtists] = useState<ManagedArtist[]>([]);
  const [artworksByArtist, setArtworksByArtist] = useState<Map<string, Artwork[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [artistDraft, setArtistDraft] = useState<ArtistDraft | null>(null);
  const [artworkDraft, setArtworkDraft] = useState<ArtworkDraft | null>(null);
  const [savingArtist, setSavingArtist] = useState(false);
  const [savingArtwork, setSavingArtwork] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: artistRows, error: aErr }, { data: artworkRows, error: wErr }] = await Promise.all([
      supabase.from("managed_artists").select("*").order("created_at", { ascending: false }),
      supabase.from("artworks").select("*").not("managed_artist_id", "is", null).order("created_at", { ascending: false }),
    ]);
    if (aErr) console.error("[managed_artists]", aErr.message);
    if (wErr) console.error("[managed artworks]", wErr.message);

    setArtists(artistRows ?? []);
    const map = new Map<string, Artwork[]>();
    (artworkRows ?? []).forEach((row) => {
      if (!row.managed_artist_id) return;
      const list = map.get(row.managed_artist_id) ?? [];
      list.push(row);
      map.set(row.managed_artist_id, list);
    });
    setArtworksByArtist(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = artists.find((a) => a.id === selectedId) ?? null;
  const selectedWorks = selectedId ? artworksByArtist.get(selectedId) ?? [] : [];

  const openCreateArtist = () => {
    setSelectedId(null);
    setArtworkDraft(null);
    setArtistDraft(emptyArtistDraft());
    setFeedback("");
  };

  const openEditArtist = (artist: ManagedArtist) => {
    setSelectedId(artist.id);
    setArtworkDraft(null);
    setArtistDraft({
      id: artist.id,
      display_name: artist.display_name,
      bio: artist.bio ?? "",
      country: artist.country,
      city: artist.city ?? "",
      technique: artist.technique ?? "",
      avatar_url: artist.avatar_url ?? "",
      slug: artist.slug,
    });
    setFeedback("");
  };

  const saveArtist = async () => {
    if (!artistDraft?.display_name.trim() || !artistDraft.country) {
      setFeedback("Name and country are required.");
      return;
    }
    setSavingArtist(true);
    const baseSlug = slugify(artistDraft.slug || artistDraft.display_name) || "artist";
    const slug = artistDraft.id
      ? artistDraft.slug || baseSlug
      : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const payload = {
      display_name: artistDraft.display_name.trim(),
      bio: artistDraft.bio.trim() || null,
      country: artistDraft.country,
      city: artistDraft.city.trim() || null,
      technique: artistDraft.technique.trim() || null,
      avatar_url: artistDraft.avatar_url.trim() || null,
      slug,
      managed_by: adminId,
    };

    let error: { message: string } | null = null;
    let savedId = artistDraft.id;
    if (artistDraft.id) {
      const res = await supabase.from("managed_artists").update(payload).eq("id", artistDraft.id).select().single();
      error = res.error;
      if (res.data) savedId = res.data.id;
    } else {
      const res = await supabase.from("managed_artists").insert(payload).select().single();
      error = res.error;
      if (res.data) savedId = res.data.id;
    }

    setSavingArtist(false);
    if (error) {
      setFeedback(error.message);
      return;
    }

    setFeedback(artistDraft.id ? "Artist profile updated." : "Artist profile created.");
    await load();
    await pingRevalidate("artworks");
    router.refresh();
    if (savedId) {
      const refreshed = (await supabase.from("managed_artists").select("*").eq("id", savedId).maybeSingle()).data;
      if (refreshed) openEditArtist(refreshed);
    }
  };

  const deleteArtist = async (artist: ManagedArtist) => {
    if (
      !confirm(
        `Delete ${artist.display_name}? Their artworks will be unlinked from this profile (not deleted).`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("managed_artists").delete().eq("id", artist.id);
    if (error) {
      setFeedback(error.message);
      return;
    }
    if (selectedId === artist.id) {
      setSelectedId(null);
      setArtistDraft(null);
      setArtworkDraft(null);
    }
    setFeedback("Artist profile deleted.");
    await load();
    await pingRevalidate("artworks");
    router.refresh();
  };

  const uploadAvatar = async (file: File) => {
    if (!artistDraft) return;
    setUploadingAvatar(true);
    const folder = artistDraft.id ?? "new";
    const path = `managed/${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) {
      setFeedback(error.message);
      setUploadingAvatar(false);
      return;
    }
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setArtistDraft((d) => (d ? { ...d, avatar_url: signed?.signedUrl ?? "" } : d));
    setUploadingAvatar(false);
  };

  const startNewArtwork = () => {
    if (!selected) return;
    setArtworkDraft({
      artist_id: adminId,
      managed_artist_id: selected.id,
      title: "",
      description: "",
      price_usd: 0,
      year: new Date().getFullYear(),
      medium: "",
      dimensions: "",
      country: selected.country,
      image_url: "",
      status: "published",
      customMedium: "",
    });
  };

  const saveArtwork = async () => {
    if (!artworkDraft?.title?.trim() || !artworkDraft.image_url?.trim() || !selected) {
      setFeedback("Artwork title and image are required.");
      return;
    }
    setSavingArtwork(true);
    const selectedMedium = artworkDraft.medium?.trim() ?? "";
    const mediumValue =
      selectedMedium === "Other" ? (artworkDraft.customMedium ?? "").trim() : selectedMedium;
    const payload = {
      artist_id: adminId,
      managed_artist_id: selected.id,
      title: artworkDraft.title.trim(),
      slug:
        artworkDraft.slug ||
        `${slugify(artworkDraft.title)}-${Math.random().toString(36).slice(2, 6)}`,
      description: artworkDraft.description?.trim() || null,
      price_usd: Number(artworkDraft.price_usd) || 0,
      year: artworkDraft.year ?? null,
      medium: mediumValue || null,
      dimensions: artworkDraft.dimensions?.trim() || null,
      country: selected.country,
      image_url: artworkDraft.image_url,
      status: (artworkDraft.status as Artwork["status"]) ?? "published",
    };

    const res = artworkDraft.id
      ? await supabase.from("artworks").update(payload).eq("id", artworkDraft.id)
      : await supabase.from("artworks").insert(payload);

    setSavingArtwork(false);
    if (res.error) {
      setFeedback(res.error.message);
      return;
    }
    setArtworkDraft(null);
    setFeedback("Artwork saved.");
    await load();
    await pingRevalidate("artworks");
    router.refresh();
  };

  const removeArtwork = async (id: string) => {
    if (!confirm("Delete this artwork?")) return;
    const { error } = await supabase.from("artworks").delete().eq("id", id);
    if (error) {
      setFeedback(error.message);
      return;
    }
    await load();
    await pingRevalidate("artworks");
    router.refresh();
  };

  const uploadArtworkImage = async (file: File) => {
    if (!selected) return;
    setUploadingArtwork(true);
    const path = `managed/${selected.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("artworks").upload(path, file);
    if (error) {
      setFeedback(error.message);
      setUploadingArtwork(false);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("artworks")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setArtworkDraft((d) => (d ? { ...d, image_url: signed?.signedUrl ?? "" } : d));
    setUploadingArtwork(false);
  };

  if (loading) return <ListRowSkeleton count={4} />;

  const mediumSelectValue = (() => {
    const m = artworkDraft?.medium?.trim() ?? "";
    if (!m) return "";
    return RESERVED_MEDIA.includes(m as (typeof RESERVED_MEDIA)[number]) ? m : "Other";
  })();

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary mb-2">
            Represented artists — no account required
          </p>
          <p className="text-sm text-on-surface-variant max-w-xl">
            Create and fully manage artist profiles for makers who cannot use the platform themselves.
            Fill in their information and upload artworks on their behalf.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateArtist}
          className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-widest"
        >
          + New artist profile
        </button>
      </div>

      {feedback && <p className="text-xs text-on-surface-variant border border-primary/10 px-3 py-2">{feedback}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8">
        <div className="border border-primary/10 divide-y divide-primary/5">
          {artists.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant">No represented artists yet.</p>
          ) : (
            artists.map((artist) => {
              const count = artworksByArtist.get(artist.id)?.length ?? 0;
              const active = selectedId === artist.id;
              return (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => openEditArtist(artist)}
                  className={
                    "w-full text-left p-4 flex gap-4 items-center transition-colors " +
                    (active ? "bg-secondary/10" : "hover:bg-surface-container-low")
                  }
                >
                  <div className="relative w-12 h-12 shrink-0 bg-surface-container overflow-hidden">
                    {artist.avatar_url ? (
                      <Image src={artist.avatar_url} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-on-surface-variant">
                        —
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-headline-sm text-sm text-primary truncate">{artist.display_name}</p>
                    <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">
                      {artist.country}
                      {artist.city ? ` · ${artist.city}` : ""} · {count} work{count === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="space-y-8">
          {artistDraft ? (
            <div className="border border-primary/10 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-headline-sm text-headline-sm">
                  {artistDraft.id ? "Edit artist profile" : "New artist profile"}
                </h3>
                {selected && (
                  <Link
                    href={`/artists/${selected.slug}`}
                    className="text-[10px] uppercase tracking-widest text-secondary hover:underline"
                    target="_blank"
                  >
                    View public page →
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 bg-surface-container overflow-hidden shrink-0">
                  {artistDraft.avatar_url ? (
                    <Image src={artistDraft.avatar_url} alt="" fill sizes="80px" className="object-cover" />
                  ) : null}
                </div>
                <label className="text-xs uppercase tracking-widest text-secondary cursor-pointer">
                  {uploadingAvatar ? "Uploading…" : "Upload portrait"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar(file);
                    }}
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <F
                  label="Display name"
                  value={artistDraft.display_name}
                  onChange={(v) => setArtistDraft({ ...artistDraft, display_name: v })}
                />
                <label className="block">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                    Country
                  </span>
                  <select
                    value={artistDraft.country}
                    onChange={(e) => setArtistDraft({ ...artistDraft, country: e.target.value })}
                    className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                  >
                    <option value="">Select country</option>
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <F
                  label="City"
                  value={artistDraft.city}
                  onChange={(v) => setArtistDraft({ ...artistDraft, city: v })}
                />
                <F
                  label="Technique"
                  value={artistDraft.technique}
                  onChange={(v) => setArtistDraft({ ...artistDraft, technique: v })}
                />
              </div>
              <F
                label="Bio"
                value={artistDraft.bio}
                onChange={(v) => setArtistDraft({ ...artistDraft, bio: v })}
                textarea
              />

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveArtist}
                  disabled={savingArtist}
                  className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {savingArtist ? "Saving…" : artistDraft.id ? "Save profile" : "Create profile"}
                </button>
                {selected && (
                  <button
                    type="button"
                    onClick={() => deleteArtist(selected)}
                    className="border border-secondary text-secondary px-4 py-2 text-xs uppercase tracking-widest"
                  >
                    Delete profile
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant border border-dashed border-primary/15 p-8 text-center">
              Select an artist from the list, or create a new profile.
            </p>
          )}

          {selected && (
            <div className="border border-primary/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-headline-sm text-headline-sm">Artworks</h3>
                <button
                  type="button"
                  onClick={startNewArtwork}
                  className="text-xs uppercase tracking-widest text-secondary border border-secondary/40 px-3 py-1.5"
                >
                  + Add artwork
                </button>
              </div>

              {artworkDraft && (
                <div className="bg-surface-container-low p-4 space-y-3 border border-primary/10">
                  <p className="text-[10px] uppercase tracking-widest text-secondary">
                    {artworkDraft.id ? "Edit artwork" : "New artwork"}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <F
                      label="Title"
                      value={artworkDraft.title ?? ""}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, title: v })}
                    />
                    <F
                      label="Year"
                      type="number"
                      value={String(artworkDraft.year ?? "")}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, year: Number(v) || null })}
                    />
                    <label className="block">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                        Medium
                      </span>
                      <select
                        value={mediumSelectValue}
                        onChange={(e) =>
                          setArtworkDraft({
                            ...artworkDraft,
                            medium: e.target.value,
                            customMedium: e.target.value === "Other" ? artworkDraft.customMedium : "",
                          })
                        }
                        className="w-full bg-transparent border-b border-primary/30 py-2 text-primary text-sm"
                      >
                        <option value="">Select</option>
                        {RESERVED_MEDIA.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    {mediumSelectValue === "Other" && (
                      <F
                        label="Custom medium"
                        value={artworkDraft.customMedium ?? ""}
                        onChange={(v) => setArtworkDraft({ ...artworkDraft, customMedium: v })}
                      />
                    )}
                    <F
                      label="Dimensions"
                      value={artworkDraft.dimensions ?? ""}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, dimensions: v })}
                    />
                    <F
                      label="Price (USD, internal)"
                      type="number"
                      value={String(artworkDraft.price_usd ?? 0)}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, price_usd: Number(v) || 0 })}
                    />
                    <label className="block">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                        Status
                      </span>
                      <select
                        value={artworkDraft.status ?? "published"}
                        onChange={(e) =>
                          setArtworkDraft({
                            ...artworkDraft,
                            status: e.target.value as Artwork["status"],
                          })
                        }
                        className="w-full bg-transparent border-b border-primary/30 py-2 text-primary text-sm"
                      >
                        <option value="draft">draft</option>
                        <option value="pending_review">pending review</option>
                        <option value="published">published</option>
                        <option value="sold">sold</option>
                        <option value="archived">archived</option>
                      </select>
                    </label>
                  </div>
                  <F
                    label="Description"
                    value={artworkDraft.description ?? ""}
                    onChange={(v) => setArtworkDraft({ ...artworkDraft, description: v })}
                    textarea
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    {artworkDraft.image_url ? (
                      <div className="relative w-24 h-24 bg-surface-container overflow-hidden">
                        <Image src={artworkDraft.image_url} alt="" fill sizes="96px" className="object-cover" />
                      </div>
                    ) : null}
                    <label className="text-xs uppercase tracking-widest text-secondary cursor-pointer">
                      {uploadingArtwork ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingArtwork}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadArtworkImage(file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={saveArtwork}
                      disabled={savingArtwork}
                      className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      {savingArtwork ? "Saving…" : "Save artwork"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtworkDraft(null)}
                      className="text-xs uppercase tracking-widest text-on-surface-variant"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {selectedWorks.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No artworks yet for this artist.</p>
              ) : (
                <ul className="divide-y divide-primary/5">
                  {selectedWorks.map((work) => (
                    <li key={work.id} className="py-3 flex gap-4 items-center">
                      <div className="relative w-14 h-14 shrink-0 bg-surface-container overflow-hidden">
                        {work.image_url ? (
                          <Image src={work.image_url} alt="" fill sizes="56px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-primary truncate">{work.title}</p>
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                          {work.status}
                          {work.medium ? ` · ${work.medium}` : ""}
                          {work.year ? ` · ${work.year}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setArtworkDraft({
                              ...work,
                              customMedium: RESERVED_MEDIA.includes(
                                (work.medium ?? "") as (typeof RESERVED_MEDIA)[number],
                              )
                                ? ""
                                : work.medium ?? "",
                            })
                          }
                          className="text-[10px] uppercase tracking-widest border border-primary/20 px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeArtwork(work.id)}
                          className="text-[10px] uppercase tracking-widest border border-secondary text-secondary px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
