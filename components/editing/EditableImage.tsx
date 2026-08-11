"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { pingRevalidate } from "@/lib/utils/revalidate";

export function EditableImage({
  page,
  blockKey,
  bucket,
  src,
  alt,
  className,
  fit = "cover",
}: {
  page: string;
  blockKey: string;
  bucket: "journal" | "exhibitions" | "collections" | "home";
  src: string;
  alt: string;
  className?: string;
  /** "contain" for marks/logos that shouldn't crop; defaults to "cover" for photo blocks. */
  fit?: "cover" | "contain";
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftSrc, setDraftSrc] = useState(src);
  const [draftAlt, setDraftAlt] = useState(alt);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  // "contain" callers (e.g. the homepage logo) size themselves by width and let
  // height follow the image's natural aspect ratio (className has "h-auto", no
  // fixed box) — fill needs a parent with a real height, so it collapses to
  // nothing there. Only "cover" callers (photo blocks in fixed aspect-ratio/
  // height boxes) get the fill treatment.
  const useFill = fit !== "contain";

  if (!isAdmin) {
    return useFill ? (
      <div className={`relative ${className ?? ""}`}>
        <Image fill sizes="100vw" className={fitClass} src={src} alt={alt} />
      </div>
    ) : (
      <img className={`${fitClass} ${className ?? ""}`} src={src} alt={alt} />
    );
  }

  const upload = async (file: File) => {
    setUploading(true);
    const path = `page-blocks/${page}-${blockKey}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
    if (upErr) {
      alert(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setDraftSrc(data.publicUrl);
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    await supabase
      .from("page_blocks")
      .upsert(
        { page, block_key: blockKey, value: draftSrc, alt_text: draftAlt },
        { onConflict: "page,block_key" },
      );
    await pingRevalidate("page-blocks", { page });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  if (editing) {
    return (
      <div className={`relative ${className ?? ""}`}>
        {useFill ? (
          <Image fill sizes="100vw" className={fitClass} src={draftSrc} alt={draftAlt} />
        ) : (
          <img className={`w-full h-full ${fitClass}`} src={draftSrc} alt={draftAlt} />
        )}
        <div className="absolute inset-0 bg-black/70 p-4 flex flex-col gap-2 justify-center overflow-auto">
          <label className="block border border-dashed border-white/40 text-white text-center py-3 cursor-pointer text-xs uppercase tracking-widest hover:border-white">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            {uploading ? "Uploading…" : "Upload image"}
          </label>
          <input
            placeholder="…or paste an image URL"
            value={draftSrc}
            onChange={(e) => setDraftSrc(e.target.value)}
            className="w-full bg-white/10 border border-white/30 text-white placeholder-white/50 text-xs p-2"
          />
          <input
            placeholder="Alt text"
            value={draftAlt}
            onChange={(e) => setDraftAlt(e.target.value)}
            className="w-full bg-white/10 border border-white/30 text-white placeholder-white/50 text-xs p-2"
          />
          <div className="flex gap-2 justify-center">
            <button
              onClick={save}
              disabled={saving}
              className="text-[10px] uppercase tracking-widest bg-secondary text-on-primary px-3 py-1.5 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setDraftSrc(src);
                setDraftAlt(alt);
                setEditing(false);
              }}
              className="text-[10px] uppercase tracking-widest border border-white/40 text-white px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group/edit ${className ?? ""}`}>
      {useFill ? (
        <Image fill sizes="100vw" className={fitClass} src={src} alt={alt} />
      ) : (
        <img className={`w-full h-full ${fitClass}`} src={src} alt={alt} />
      )}
      <button
        onClick={() => setEditing(true)}
        title="Edit image"
        className="absolute top-2 right-2 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-secondary text-on-primary w-8 h-8 flex items-center justify-center text-sm rounded-full shadow-lg z-[60]"
      >
        ✎
      </button>
    </div>
  );
}
