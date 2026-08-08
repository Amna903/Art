"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type CountrySound = {
  country_slug: string;
  title: string | null;
  audio_url: string; // storage path within `country-sounds` bucket
};

/**
 * Fetch all uploaded country sounds and resolve signed URLs for the
 * private `country-sounds` bucket. Returns a map: slug -> playable URL.
 */
export function useCountrySoundUrls() {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("country_sounds")
        .select("country_slug, audio_url");
      if (error || !data || data.length === 0) return;
      const paths = data.map((r) => r.audio_url);
      const { data: signed } = await supabase.storage
        .from("country-sounds")
        .createSignedUrls(paths, 60 * 60 * 6); // 6h
      if (cancelled || !signed) return;
      const map: Record<string, string> = {};
      data.forEach((row, i) => {
        const s = signed[i];
        if (s?.signedUrl) map[row.country_slug] = s.signedUrl;
      });
      setUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return urls;
}

export async function listCountrySounds(): Promise<CountrySound[]> {
  const { data, error } = await supabase
    .from("country_sounds")
    .select("country_slug, title, audio_url")
    .order("country_slug");
  if (error) throw error;
  return (data ?? []) as CountrySound[];
}

export async function uploadCountrySound(
  slug: string,
  file: File,
  title: string | null,
): Promise<void> {
  const ext = file.name.split(".").pop() || "mp3";
  const path = `${slug}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("country-sounds")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  // Fetch existing row for cleanup of prior file
  const { data: prev } = await supabase
    .from("country_sounds")
    .select("audio_url")
    .eq("country_slug", slug)
    .maybeSingle();

  const { error: dbErr } = await supabase
    .from("country_sounds")
    .upsert({ country_slug: slug, audio_url: path, title }, { onConflict: "country_slug" });
  if (dbErr) throw dbErr;

  if (prev?.audio_url && prev.audio_url !== path) {
    await supabase.storage.from("country-sounds").remove([prev.audio_url]);
  }
}

export async function deleteCountrySound(slug: string, path: string): Promise<void> {
  await supabase.storage.from("country-sounds").remove([path]);
  await supabase.from("country_sounds").delete().eq("country_slug", slug);
}
