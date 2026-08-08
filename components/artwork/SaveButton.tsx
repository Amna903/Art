"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isArtworkSaved, saveArtwork, unsaveArtwork } from "@/lib/data/saved";

type Props = {
  artworkSlug: string;
  artworkTitle: string;
  artistName?: string;
  artworkImage?: string;
  className?: string;
};

export function SaveButton({ artworkSlug, artworkTitle, artistName, artworkImage, className }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [fetchedSaved, setFetchedSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const saved = fetchedSaved;

  useEffect(() => {
    let cancelled = false;
    isArtworkSaved(user?.id, artworkSlug).then((v) => {
      if (!cancelled) setFetchedSaved(v);
    });
    return () => {
      cancelled = true;
    };
  }, [user, artworkSlug]);

  const toggle = async () => {
    setBusy(true);
    const next = !saved;
    setFetchedSaved(next); // optimistic
    if (next) setBounceKey((k) => k + 1); // replay the pop on like, not on unlike

    await (next
      ? saveArtwork(user?.id, { artworkSlug, artworkTitle, artistName, artworkImage })
      : unsaveArtwork(user?.id, artworkSlug));

    setBusy(false);
    toast(next ? "Saved to your collection" : "Removed from your collection");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved works" : "Save this artwork"}
      className={
        className ??
        "absolute top-6 right-6 z-[1] p-3 bg-beige/90 backdrop-blur rounded-full hover:bg-secondary group/heart transition-colors disabled:opacity-60"
      }
    >
      <span
        key={bounceKey}
        className={`material-symbols-outlined text-primary group-hover/heart:text-beige transition-colors ${
          bounceKey > 0 ? "animate-icon-bounce" : ""
        }`}
        style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        favorite
      </span>
    </button>
  );
}
