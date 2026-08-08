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
  variant?: "primary" | "outline" | "compact";
};

export function FollowArtistButton({
  artistSlug,
  artistName,
  artistImage,
  technique,
  countryName,
  className,
  variant = "primary",
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isArtistFollowed(user?.id, artistSlug).then((res) => {
      if (!cancelled) setFollowed(res);
    });
    return () => {
      cancelled = true;
    };
  }, [user, artistSlug]);

  const toggleFollow = async () => {
    setBusy(true);
    const next = !followed;
    setFollowed(next);

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
    toast(next ? `Now following ${artistName}` : `Unfollowed ${artistName}`);
  };

  const defaultClasses =
    variant === "primary"
      ? followed
        ? "bg-secondary text-on-secondary px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-tertiary transition-colors shadow-lg active:scale-95"
        : "bg-tertiary text-on-tertiary px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-secondary transition-colors shadow-lg active:scale-95"
      : variant === "outline"
      ? followed
        ? "border border-secondary bg-secondary/10 text-secondary px-6 py-2 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary hover:text-on-secondary transition-all"
        : "border border-primary/20 px-6 py-2 font-navigation text-navigation uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all"
      : "text-xs font-bold uppercase tracking-widest text-secondary hover:underline";

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={busy}
      aria-pressed={followed}
      className={className ?? defaultClasses}
    >
      {busy ? "…" : followed ? "Following" : "Follow Artist"}
    </button>
  );
}
