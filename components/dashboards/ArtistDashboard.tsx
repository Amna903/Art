"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage, useRouter } from "@/lib/i18n";
import Image from "next/image";
import { toast } from "sonner";
import { prepareArtistPhoto } from "@/lib/utils/compress-image";
import { supabase } from "@/lib/supabase/client";
import { AFRICAN_COUNTRIES, getCountryDisplayName } from "@/lib/data/africa";
import type { Database } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils/slugify";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { F } from "./FormField";
import { TranslationFields } from "./TranslationFields";
import { ARTWORK_STATUS_LABELS } from "@/lib/data/artwork-status";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { saveArtworkWithOriginality } from "@/lib/originality/client";

type Artwork = Database["public"]["Tables"]["artworks"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const RESERVED_MEDIA = [
  "Painting",
  "Sculpture",
  "Photography",
  "Textile",
  "Digital",
  "Mixed Media",
] as const;

export function ArtistDashboard({ userId }: { userId: string }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<Artwork[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [editing, setEditing] = useState<Partial<Artwork> | null>(null);
  const [customMedium, setCustomMedium] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [checkingOriginality, setCheckingOriginality] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: artworkRows }, { data: profileRow }] = await Promise.all([
      supabase.from("artworks").select("*").eq("artist_id", userId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    setItems(artworkRows ?? []);
    setProfile(profileRow ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!profileEditorOpen) return;
    setProfileDraft(
      profile ?? {
        id: userId,
        display_name: "",
        bio: null,
        country: null,
        avatar_url: null,
        translations: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    );
  }, [profileEditorOpen, profile, userId]);

  useEffect(() => {
    if (!editing) {
      setCustomMedium("");
      return;
    }

    const currentMedium = editing.medium?.trim() ?? "";
    setCustomMedium(RESERVED_MEDIA.includes(currentMedium as (typeof RESERVED_MEDIA)[number]) ? "" : currentMedium);
  }, [editing]);

  const startNew = () =>
    setEditing({
      artist_id: userId,
      title: "",
      description: "",
      price_usd: 0,
      year: new Date().getFullYear(),
      medium: "",
      dimensions: "",
      country: profile?.country ?? "",
      image_url: "",
      status: "draft",
    });

  const closeEditor = () => {
    setEditing(null);
    setUploading(false);
    setUploadName(null);
  };

  const closeProfileEditor = () => {
    setProfileEditorOpen(false);
    setProfileDraft(null);
    setProfileUploading(false);
  };

  const saveProfile = async () => {
    if (!profileDraft) return;
    setProfileSaving(true);
    const payload = {
      id: userId,
      display_name: profileDraft.display_name?.trim() || "",
      bio: profileDraft.bio ?? null,
      country: profileDraft.country ?? null,
      avatar_url: profileDraft.avatar_url ?? null,
      translations: profileDraft.translations ?? {},
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      toast.error(t("Could not save your profile: {message}", { message: error.message }));
      setProfileSaving(false);
      return;
    }
    await load();
    await pingRevalidate("artworks");
    router.refresh();
    setProfileSaving(false);
    closeProfileEditor();
    toast.success(t("Profile saved."));
  };

  const uploadProfileAvatar = async (file: File) => {
    setProfileUploading(true);
    let photo: File;
    try {
      photo = await prepareArtistPhoto(file);
    } catch (err) {
      alert(t(err instanceof Error ? err.message : "Upload failed."));
      setProfileUploading(false);
      return;
    }
    const path = `${userId}/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, photo, { contentType: "image/webp" });
    if (upErr) {
      alert(upErr.message);
      setProfileUploading(false);
      return;
    }
    const { data: signed, error: signedUrlError } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signedUrlError || !signed?.signedUrl) {
      toast.error(t("Photo uploaded, but its URL could not be created: {value}", { value: signedUrlError?.message ?? t("Unknown error") }));
      setProfileUploading(false);
      return;
    }
    setProfileDraft((prev) => ({
      ...(prev ?? { id: userId, display_name: "", bio: null, country: null, avatar_url: null, translations: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
      avatar_url: signed.signedUrl,
    }));
    setProfileUploading(false);
  };

  const save = async () => {
    if (!editing?.title || !editing.image_url?.trim() || !(Number(editing.price_usd) > 0)) return;
    const selectedMedium = editing.medium?.trim() ?? "";
    const mediumValue = selectedMedium === "Other" ? customMedium.trim() : selectedMedium;

    setCheckingOriginality(true);
    let originalityDecision: "clear" | "review" | "blocked" = "clear";
    const payload = {
      artist_id: userId,
      title: editing.title!,
      slug: editing.slug || `${slugify(editing.title!)}-${Math.random().toString(36).slice(2, 6)}`,
      description: editing.description ?? null,
      price_usd: Number(editing.price_usd) || 0,
      year: editing.year ?? null,
      medium: mediumValue || null,
      dimensions: editing.dimensions ?? null,
      country: profile?.country ?? null,
      image_url: editing.image_url ?? "",
      status: (editing.status as Artwork["status"]) ?? "draft",
      translations: editing.translations ?? {},
    };
    try {
      const { originality } = await saveArtworkWithOriginality({ ...payload, id: editing.id });
      originalityDecision = originality.decision;
      if (originality.decision === "blocked") toast.error(originality.note);
      else if (originality.decision === "review") toast.message(t("Possible match found — sent to admin review."));
    } catch (err) {
      toast.error(err instanceof Error ? t(err.message) : t("Could not save artwork."));
      setCheckingOriginality(false);
      return;
    }
    setCheckingOriginality(false);
    setEditing(null);
    await load();
    await pingRevalidate("artworks");
    router.refresh();
    if (originalityDecision !== "blocked") toast.success(editing.id ? t("Artwork updated.") : t("Artwork saved."));
  };

  const remove = async (id: string) => {
    if (!confirm(t("Delete this artwork?"))) return;
    const { error } = await supabase.from("artworks").delete().eq("id", id);
    if (error) {
      toast.error(t("Could not delete this artwork: {message}", { message: error.message }));
      return;
    }
    await load();
    await pingRevalidate("artworks");
    router.refresh();
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadName(file.name);
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("artworks").upload(path, file);
    if (upErr) {
      alert(upErr.message);
      setUploading(false);
      return;
    }
    const { data: signed, error: signedUrlError } = await supabase.storage
      .from("artworks")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10); // 10y
    if (signedUrlError || !signed?.signedUrl) {
      toast.error(t("Image uploaded, but its URL could not be created: {value}", { value: signedUrlError?.message ?? t("Unknown error") }));
      setUploading(false);
      return;
    }
    setEditing((e) => ({ ...e!, image_url: signed.signedUrl }));
    setUploading(false);
  };

  const published = items.filter((i) => i.status === "published").length;
  const drafts = items.filter((i) => i.status === "draft").length;
  const sold = items.filter((i) => i.status === "sold").length;
  const selectedMedium = editing?.medium?.trim() ?? "";
  const mediumSelectValue = RESERVED_MEDIA.includes(selectedMedium as (typeof RESERVED_MEDIA)[number]) ? selectedMedium : selectedMedium ? "Other" : "";

  return (
    <div className="space-y-12">
      <section className="border border-primary/10 bg-surface-container-low p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="shrink-0">
            <div className="relative w-28 h-28 rounded-full overflow-hidden bg-surface-variant border border-primary/10">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name || t("Profile avatar")} fill sizes="112px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs uppercase text-on-surface-variant">
                  {t("No photo")}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-secondary mb-2">{t("Artist profile")}</p>
                <h2 className="font-display-sm text-display-sm text-primary">
                  {profile?.display_name?.trim() || t("Your profile")}
                </h2>
                <p className="text-sm text-on-surface-variant mt-2">
                  {profile?.country ? getCountryDisplayName(profile.country, language) : t("No location added yet")}
                </p>
              </div>
              <button
                onClick={() => setProfileEditorOpen(true)}
                className="bg-primary text-on-primary px-5 py-2 text-xs uppercase tracking-[0.2em]"
              >
                {t("Edit profile")}
              </button>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed max-w-2xl">
              {profile?.bio || t("Add a short bio, your location, and a profile photo so collectors see a complete artist page.")}
            </p>

            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-on-surface-variant">
              <span className="border border-primary/10 px-3 py-1 rounded-full">
                {items.length === 1 ? t("1 work") : t("{count} works", { count: items.length })}
              </span>
              <span className="border border-primary/10 px-3 py-1 rounded-full">
                {profile?.country ? getCountryDisplayName(profile.country, language) : t("Location missing")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label={t("Total works")} value={items.length} />
        <Stat label={t("Published")} value={published} />
        <Stat label={t("Drafts")} value={drafts} />
        <Stat label={t("Sold")} value={sold} />
      </section>

      <section>
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display-sm text-display-sm text-primary">{t("My artworks")}</h2>
          <button onClick={startNew} className="bg-secondary text-on-primary px-5 py-2 text-xs uppercase tracking-[0.2em]">
            {t("+ New artwork")}
          </button>
        </div>

        {loading ? (
          <CardGridSkeleton count={3} columns="2-3" aspect="aspect-[4/5]" />
        ) : items.length === 0 ? (
          <p className="text-on-surface-variant text-sm">{t("No artworks yet. Create your first one.")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((a) => (
              <article key={a.id} className="border border-primary/10 bg-background overflow-hidden">
                <div className="relative aspect-[4/5] bg-surface-variant overflow-hidden">
                  {a.image_url ? (
                    <Image src={a.image_url} alt={a.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-xs uppercase">
                      {t("No image")}
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm text-primary">{a.title}</h3>
                    <span className="text-xs uppercase tracking-widest text-secondary">{t(ARTWORK_STATUS_LABELS[a.status] ?? a.status)}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditing(a)} className="text-xs uppercase tracking-widest text-primary hover:text-secondary">
                      {t("Edit")}
                    </button>
                    <button onClick={() => remove(a.id)} className="text-xs uppercase tracking-widest text-secondary">
                      {t("Delete")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-background w-full max-w-2xl p-8 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display-sm text-display-sm text-primary">
                {editing.id ? t("Edit artwork") : t("New artwork")}
              </h3>
              <button onClick={closeEditor} className="text-on-surface-variant">✕</button>
            </div>
            <div className="space-y-4">
              <F label={t("Title")} value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} />
              <F label={t("Description")} textarea value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} />
              <TranslationFields
                fields={[
                  { name: "title", label: "Title" },
                  { name: "description", label: "Description", textarea: true },
                ]}
                value={editing.translations}
                onChange={(translations) => setEditing({ ...editing, translations })}
              />
              <div className="grid grid-cols-2 gap-4">
                <F label={t("Year")} type="number" value={String(editing.year ?? "")} onChange={(v) => setEditing({ ...editing, year: Number(v) || null })} />
                <label className="block">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">{t("Medium")}</span>
                  <select
                    value={mediumSelectValue}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (nextValue === "Other") {
                        setEditing({ ...editing, medium: "Other" });
                        return;
                      }
                      setEditing({ ...editing, medium: nextValue });
                      setCustomMedium("");
                    }}
                    className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                  >
                    <option value="">{t("Select medium")}</option>
                    {RESERVED_MEDIA.map((medium) => (
                      <option key={medium} value={medium}>
                        {t(medium)}
                      </option>
                    ))}
                    <option value="Other">{t("Other")}</option>
                  </select>
                </label>
                <F label={t("Dimensions")} value={editing.dimensions ?? ""} onChange={(v) => setEditing({ ...editing, dimensions: v })} />
                <div>
                  <F
                    label={t("Price (USD)")}
                    type="number"
                    value={editing.price_usd != null && editing.price_usd !== 0 ? String(editing.price_usd) : ""}
                    onChange={(v) => setEditing({ ...editing, price_usd: v ? Number(v) : 0 })}
                  />
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    {t("For the gallery's reference only — never shown publicly. Collectors always see \"Price Upon Request.\"")}
                  </p>
                </div>
                {mediumSelectValue === "Other" && (
                  <div className="col-span-2">
                    <F
                      label={t("Other medium")}
                      value={customMedium}
                      onChange={(v) => setCustomMedium(v)}
                    />
                  </div>
                )}
                <div>
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">{t("Artwork country")}</span>
                  <div className="border-b border-primary/30 py-2 text-primary text-sm">{profile?.country ? getCountryDisplayName(profile.country, language) : t("Set your registered country in your profile first")}</div>
                </div>
                <label className="block">
                  <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">{t("Status")}</span>
                  <select
                    value={editing.status === "blocked" ? "blocked" : editing.status ?? "draft"}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value as Artwork["status"] })}
                    className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                    disabled={editing.status === "blocked"}
                  >
                    <option value="draft">{t("Draft")}</option>
                    <option value="pending_review">{t("Submit for admin review")}</option>
                    {editing.status === "blocked" ? <option value="blocked">{t("Blocked (originality match)")}</option> : null}
                  </select>
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    {t("Every save runs an originality check against platform works and publicly indexed images.")}
                  </p>
                </label>
              </div>
              <div>
                <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                  {t("Image")}{" "}<span className="normal-case text-secondary">{t("(required)")}</span>
                </span>
                <label className="block border border-dashed border-primary/25 bg-surface/60 hover:border-secondary hover:bg-surface-container-low transition-colors cursor-pointer p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-navigation text-navigation uppercase tracking-[0.18em] text-primary">
                        {t("Click to upload a picture")}
                      </div>
                      <div className="mt-1 text-xs text-on-surface-variant">
                        {t("JPG, PNG, or WebP. Drag and drop is not required.")}
                      </div>
                      {uploadName && <div className="mt-2 text-xs text-secondary">{t("Selected:")}{" "}{uploadName}</div>}
                    </div>
                    <div className="shrink-0 border border-primary/15 px-3 py-2 text-xs uppercase tracking-[0.18em] text-primary">
                      {t("Choose file")}
                    </div>
                  </div>
                </label>
                {uploading && <div className="mt-2 text-xs text-secondary">{t("Uploading…")}</div>}
                <input
                  placeholder={t("…or paste an image URL")}
                  value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  className="mt-3 w-full bg-transparent border-b border-primary/30 py-2 text-primary text-sm"
                />
                {editing.image_url ? (
                  <img src={editing.image_url} alt="" className="mt-3 max-h-40 object-cover" />
                ) : (
                  <div className="mt-3 text-xs text-secondary">{t("An image is required before this artwork can be saved.")}</div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={closeEditor} className="border border-primary/20 px-5 py-2 text-xs uppercase tracking-[0.2em]">
                  {t("Cancel")}
                </button>
                <button
                  onClick={save}
                  disabled={
                    checkingOriginality ||
                    uploading ||
                    !editing.title?.trim() ||
                    !editing.image_url?.trim() ||
                    !(Number(editing.price_usd) > 0)
                  }
                  title={t("Title, price, and an image are all required")}
                  className="bg-primary text-on-primary px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {checkingOriginality
                    ? t("Checking originality…")
                    : editing.status === "pending_review"
                      ? t("Submit for review")
                      : t("Save draft")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {profileEditorOpen && profileDraft && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-background w-full max-w-2xl p-8 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display-sm text-display-sm text-primary">{t("Edit profile")}</h3>
              <button onClick={closeProfileEditor} className="text-on-surface-variant">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="shrink-0">
                  <div className="relative w-28 h-28 rounded-full overflow-hidden bg-surface-variant border border-primary/10">
                    {profileDraft.avatar_url ? (
                      <Image src={profileDraft.avatar_url} alt={profileDraft.display_name || t("Profile avatar")} fill sizes="112px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs uppercase text-on-surface-variant">
                        {t("No photo")}
                      </div>
                    )}
                  </div>
                  <label className="mt-3 block text-xs uppercase tracking-[0.18em] text-secondary cursor-pointer text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => e.target.files?.[0] && uploadProfileAvatar(e.target.files[0])}
                    />
                    {profileUploading ? t("Uploading…") : t("Change photo")}
                  </label>
                </div>

                <div className="flex-1 grid grid-cols-1 gap-4">
                  <F
                    label={t("Display name")}
                    value={profileDraft.display_name ?? ""}
                    onChange={(v) => setProfileDraft((p) => (p ? { ...p, display_name: v } : p))}
                  />
                  <label className="block">
                    <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">
                      {t("Location")}
                    </span>
                    <select
                      value={profileDraft.country ?? ""}
                      onChange={(e) => setProfileDraft((p) => (p ? { ...p, country: e.target.value } : p))}
                      className="w-full bg-transparent border-b border-primary/30 py-2 text-primary"
                    >
                      <option value="">{t("Select your country")}</option>
                      {AFRICAN_COUNTRIES.map((country) => (
                        <option key={country.slug} value={country.name}>
                          {getCountryDisplayName(country, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <F
                    label={t("Bio")}
                    textarea
                    value={profileDraft.bio ?? ""}
                    onChange={(v) => setProfileDraft((p) => (p ? { ...p, bio: v } : p))}
                  />
                  <TranslationFields
                    fields={[{ name: "bio", label: "Bio", textarea: true }]}
                    value={profileDraft.translations}
                    onChange={(translations) => setProfileDraft((p) => (p ? { ...p, translations } : p))}
                  />
                  <F
                    label={t("Profile photo URL")}
                    value={profileDraft.avatar_url ?? ""}
                    onChange={(v) => setProfileDraft((p) => (p ? { ...p, avatar_url: v } : p))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={closeProfileEditor} className="border border-primary/20 px-5 py-2 text-xs uppercase tracking-[0.2em]">
                  {t("Cancel")}
                </button>
                <button onClick={saveProfile} disabled={profileSaving} className="bg-primary text-on-primary px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-60">
                  {profileSaving ? t("Saving…") : t("Save profile")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-primary/10 p-5">
      <div className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="font-display-sm text-display-sm text-primary mt-2">{value}</div>
    </div>
  );
}
