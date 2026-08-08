"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isArtistFollowed, followArtist, unfollowArtist } from "@/lib/data/followed-artists";

type Props = {
  artistSlug: string;
  artistName: string;
  artistImage?: string | null;
  technique?: string | null;
  countryName?: string | null;
  className?: string;
};

export function SaveArtistButton({
  artistSlug,
  artistName,
  artistImage,
  technique,
  countryName,
  className,
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    isArtistFollowed(user?.id, artistSlug).then((res) => {
      if (!cancelled) setSaved(res);
    });
    return () => {
      cancelled = true;
    };
  }, [user, artistSlug]);

  const toggleSave = async () => {
    setBusy(true);
    const next = !saved;
    setSaved(next);
    if (next) setBounceKey((k) => k + 1);

    await (next
      ? followArtist(user?.id, {
          artistSlug,
          artistName,
          artistImage,
          technique,
          countryName,
        })
      : unfollowArtist(user?.id, artistSlug));

    setBusy(false);
    toast(next ? `Saved ${artistName} to your collection` : `Removed ${artistName} from your collection`);
  };

  return (
    <button
      type="button"
      onClick={toggleSave}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove artist from bookmark" : "Bookmark artist"}
      className={
        className ??
        "group flex items-center justify-center size-14 rounded-xl border-2 border-tertiary/20 hover:border-secondary-container transition-all"
      }
    >
      <span
        key={bounceKey}
        className={
          (saved
            ? "material-symbols-outlined text-secondary-container"
            : "material-symbols-outlined text-tertiary group-hover:text-secondary-container") +
          (bounceKey > 0 ? " animate-icon-bounce" : "")
        }
        style={saved ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        bookmark
      </span>
    </button>
  );
}
