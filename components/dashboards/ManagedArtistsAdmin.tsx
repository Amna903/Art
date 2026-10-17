"use client";

import { useRouter, useLanguage } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "@/components/i18n/Link";
import { supabase } from "@/lib/supabase/client";
import { AFRICAN_COUNTRIES, getCountryDisplayName } from "@/lib/data/africa";
import { ARTWORK_STATUS_LABELS } from "@/lib/data/artwork-status";
import type { Json } from "@/lib/supabase/types";
import { TranslationFields } from "./TranslationFields";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slugify";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { F } from "./FormField";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { saveArtworkWithOriginality } from "@/lib/originality/client";

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
  translations: Json;
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
    translations: {},
  };
}

/**
 * Admin console for gallery-represented artists who do not have platform
 * accounts. Admins create the profile, fill bio/photo, and upload/manage
 * their artworks end-to-end.
 */
export function ManagedArtistsAdmin({ adminId }: { adminId: string }) {
  const { t, language } = useLanguage();
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
      translations: artist.translations ?? {},
    });
    setFeedback("");
  };

  const saveArtist = async () => {
    if (!artistDraft?.display_name.trim() || !artistDraft.country) {
      setFeedback(t("Name and country are required."));
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
      translations: artistDraft.translations ?? {},
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

    setFeedback(artistDraft.id ? t("Artist profile updated.") : t("Artist profile created."));
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
        t("Delete {display_name}? Their artworks will be unlinked from this profile (not deleted).", { display_name: artist.display_name }),
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
    setFeedback(t("Artist profile deleted."));
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
    if (!artworkDraft || !selected) {
      setFeedback(t("Select an artist before saving artwork."));
      return;
    }
    if (!artworkDraft.title?.trim()) {
      setFeedback(t("Artwork title is required."));
      return;
    }
    if (!artworkDraft.image_url?.trim()) {
      setFeedback(t("Upload an artwork image before saving."));
      return;
    }
    if (uploadingArtwork) {
      setFeedback(t("Wait for the image upload to finish."));
      return;
    }
    setSavingArtwork(true);
    setFeedback("");

    let originalityNote = "";
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
      translations: artworkDraft.translations ?? {},
    };
    try {
      const { originality } = await saveArtworkWithOriginality({ ...payload, id: artworkDraft.id });
      if (originality.decision === "blocked") originalityNote = originality.note;
      else if (originality.decision === "review") originalityNote = t("Possible match found — queued for originality review instead of publishing.");
    } catch (error) {
      setSavingArtwork(false);
      setFeedback(error instanceof Error ? t(error.message) : t("Could not save artwork."));
      return;
    }
    setSavingArtwork(false);
    setArtworkDraft(null);
    setFeedback(
      originalityNote ||
        t("Artwork saved."),
    );
    await load();
    await pingRevalidate("artworks");
    router.refresh();
  };

  const removeArtwork = async (id: string) => {
    if (!confirm(t("Delete this artwork?"))) return;
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
    setFeedback("");
    try {
      const path = `managed/${selected.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("artworks").upload(path, file);
      if (error) throw new Error(error.message);

      const { data: signed, error: signedUrlError } = await supabase.storage
        .from("artworks")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signedUrlError || !signed?.signedUrl) {
        throw new Error(signedUrlError?.message ?? t("Could not create an image URL."));
      }
      setArtworkDraft((d) => (d ? { ...d, image_url: signed.signedUrl } : d));
    } catch (error) {
      setFeedback(error instanceof Error ? t(error.message) : t("Artwork image upload failed."));
    } finally {
      setUploadingArtwork(false);
    }
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
            {t("Represented artists — no account required")}
          </p>
          <p className="text-sm text-on-surface-variant max-w-xl">
            {t("Create and fully manage artist profiles for makers who cannot use the platform themselves. Fill in their information and upload artworks on their behalf.")}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateArtist}
          className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-widest"
        >
          {t("+ New artist profile")}
        </button>
      </div>

      {feedback && <p className="text-xs text-on-surface-variant border border-primary/10 px-3 py-2">{feedback}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8">
        <div className="border border-primary/10 divide-y divide-primary/5">
          {artists.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant">{t("No represented artists yet.")}</p>
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
                      {getCountryDisplayName(artist.country, language)}
                      {artist.city ? ` · ${artist.city}` : ""} · {count === 1 ? t("1 work") : t("{count} works", { count })}
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
                  {artistDraft.id ? t("Edit artist profile") : t("New artist profile")}
                </h3>
                {selected && (
                  <Link
                    href={`/artists/${selected.slug}`}
                    className="text-[10px] uppercase tracking-widest text-secondary hover:underline"
                    target="_blank"
                  >
                    {t("View public page →")}
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
                  {uploadingAvatar ? t("Uploading…") : t("Upload portrait")}
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
                  label={t("Display name")}
                  value={artistDraft.display_name}
                  onChange={(v) => setArtistDraft({ ...artistDraft, display_name: v })}
                />
                <label className="block">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                    {t("Country")}
                  </span>
                  <select
                    value={artistDraft.country}
                    onChange={(e) => setArtistDraft({ ...artistDraft, country: e.target.value })}
                    className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                  >
                    <option value="">{t("Select country")}</option>
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {getCountryDisplayName(c, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <F
                  label={t("City")}
                  value={artistDraft.city}
                  onChange={(v) => setArtistDraft({ ...artistDraft, city: v })}
                />
                <F
                  label={t("Technique")}
                  value={artistDraft.technique}
                  onChange={(v) => setArtistDraft({ ...artistDraft, technique: v })}
                />
              </div>
              <F
                label={t("Bio")}
                value={artistDraft.bio}
                onChange={(v) => setArtistDraft({ ...artistDraft, bio: v })}
                textarea
              />
              <TranslationFields
                fields={[{ name: "bio", label: "Bio", textarea: true }]}
                value={artistDraft.translations}
                onChange={(translations) => setArtistDraft({ ...artistDraft, translations })}
              />

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveArtist}
                  disabled={savingArtist}
                  className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {savingArtist ? t("Saving…") : artistDraft.id ? t("Save profile") : t("Create profile")}
                </button>
                {selected && (
                  <button
                    type="button"
                    onClick={() => deleteArtist(selected)}
                    className="border border-secondary text-secondary px-4 py-2 text-xs uppercase tracking-widest"
                  >
                    {t("Delete profile")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant border border-dashed border-primary/15 p-8 text-center">
              {t("Select an artist from the list, or create a new profile.")}
            </p>
          )}

          {selected && (
            <div className="border border-primary/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-headline-sm text-headline-sm">{t("Artworks")}</h3>
                <button
                  type="button"
                  onClick={startNewArtwork}
                  className="text-xs uppercase tracking-widest text-secondary border border-secondary/40 px-3 py-1.5"
                >
                  {t("+ Add artwork")}
                </button>
              </div>

              {artworkDraft && (
                <div className="bg-surface-container-low p-4 space-y-3 border border-primary/10">
                  <p className="text-[10px] uppercase tracking-widest text-secondary">
                    {artworkDraft.id ? t("Edit artwork") : t("New artwork")}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <F
                      label={t("Title")}
                      value={artworkDraft.title ?? ""}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, title: v })}
                    />
                    <F
                      label={t("Year")}
                      type="number"
                      value={String(artworkDraft.year ?? "")}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, year: Number(v) || null })}
                    />
                    <label className="block">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                        {t("Medium")}
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
                        <option value="">{t("Select")}</option>
                        {RESERVED_MEDIA.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="Other">{t("Other")}</option>
                      </select>
                    </label>
                    {mediumSelectValue === "Other" && (
                      <F
                        label={t("Custom medium")}
                        value={artworkDraft.customMedium ?? ""}
                        onChange={(v) => setArtworkDraft({ ...artworkDraft, customMedium: v })}
                      />
                    )}
                    <F
                      label={t("Dimensions")}
                      value={artworkDraft.dimensions ?? ""}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, dimensions: v })}
                    />
                    <F
                      label={t("Price (USD, internal)")}
                      type="number"
                      value={String(artworkDraft.price_usd ?? 0)}
                      onChange={(v) => setArtworkDraft({ ...artworkDraft, price_usd: Number(v) || 0 })}
                    />
                    <label className="block">
                      <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                        {t("Status")}
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
                        <option value="draft">{t("Draft")}</option>
                        <option value="pending_review">{t("Pending review")}</option>
                        <option value="blocked">{t("Blocked")}</option>
                        <option value="published">{t("Published")}</option>
                        <option value="sold">{t("Sold")}</option>
                        <option value="archived">{t("Archived")}</option>
                      </select>
                    </label>
                  </div>
                  <F
                    label={t("Description")}
                    value={artworkDraft.description ?? ""}
                    onChange={(v) => setArtworkDraft({ ...artworkDraft, description: v })}
                    textarea
                  />
                  <TranslationFields
                    fields={[
                      { name: "title", label: "Title" },
                      { name: "description", label: "Description", textarea: true },
                    ]}
                    value={artworkDraft.translations}
                    onChange={(translations) => setArtworkDraft({ ...artworkDraft, translations })}
                  />
                  <div className="flex flex-wrap items-center gap-4 border-2 border-dashed border-secondary/40 bg-surface p-4">
                    {artworkDraft.image_url ? (
                      <div className="relative w-24 h-24 shrink-0 bg-surface-container overflow-hidden">
                        <Image src={artworkDraft.image_url} alt={t("Artwork preview")} fill sizes="96px" className="object-cover" />
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant">{t("Artwork image required")}</p>
                    )}
                    <label
                      className={
                        "inline-flex min-h-11 items-center justify-center bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-widest text-on-primary cursor-pointer transition-colors hover:bg-secondary " +
                        (uploadingArtwork ? "pointer-events-none opacity-60" : "")
                      }
                    >
                      {uploadingArtwork ? t("Uploading image…") : artworkDraft.image_url ? t("Replace artwork image") : t("Choose artwork image")}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingArtwork}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadArtworkImage(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <span className="text-xs text-on-surface-variant">{t("JPEG, PNG, or WebP")}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={saveArtwork}
                      disabled={savingArtwork || uploadingArtwork}
                      className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      {savingArtwork ? t("Saving…") : t("Save artwork")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtworkDraft(null)}
                      className="text-xs uppercase tracking-widest text-on-surface-variant"
                    >
                      {t("Cancel")}
                    </button>
                  </div>
                </div>
              )}

              {selectedWorks.length === 0 ? (
                <p className="text-sm text-on-surface-variant">{t("No artworks yet for this artist.")}</p>
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
                          {t(ARTWORK_STATUS_LABELS[work.status] ?? work.status)}
                          {work.medium ? ` · ${t(work.medium)}` : ""}
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
                          {t("Edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeArtwork(work.id)}
                          className="text-[10px] uppercase tracking-widest border border-secondary text-secondary px-2 py-1"
                        >
                          {t("Delete")}
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
