import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/types";

export type OriginalityDecision = "clear" | "review" | "blocked";

export type OriginalityMatch = {
  source: "platform" | "web";
  title?: string;
  url?: string;
  artworkId?: string;
  similarity: number;
  hammingDistance?: number;
};

export type OriginalityResult = {
  decision: OriginalityDecision;
  score: number;
  phash: string;
  matches: OriginalityMatch[];
  webSearch: "ran" | "skipped" | "failed";
  note: string;
};

type ArtworkStatus = Database["public"]["Enums"]["artwork_status"];

export function originalityFieldsFromResult(result: OriginalityResult): {
  image_phash: string;
  originality_status: OriginalityDecision;
  originality_score: number;
  originality_report: Json;
  originality_checked_at: string;
  statusOverride: Extract<ArtworkStatus, "blocked" | "pending_review"> | null;
} {
  return {
    image_phash: result.phash,
    originality_status: result.decision,
    originality_score: result.score,
    originality_report: {
      decision: result.decision,
      score: result.score,
      matches: result.matches,
      webSearch: result.webSearch,
      note: result.note,
    } as Json,
    originality_checked_at: new Date().toISOString(),
    statusOverride:
      result.decision === "blocked"
        ? "blocked"
        : result.decision === "review"
          ? "pending_review"
          : null,
  };
}

export async function requestOriginalityCheck(opts: {
  imageUrl: string;
  excludeArtworkId?: string;
}): Promise<OriginalityResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sign in to run an originality check.");
  }

  const res = await fetch("/api/artworks/originality-check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      imageUrl: opts.imageUrl,
      excludeArtworkId: opts.excludeArtworkId,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || "Originality check failed.");
  }
  return body as OriginalityResult;
}

export async function saveArtworkWithOriginality(artwork: Record<string, unknown>): Promise<{
  originality: OriginalityResult;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in to save artwork.");
  const res = await fetch("/api/artworks/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ artwork }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Could not save artwork.");
  return body as { originality: OriginalityResult };
}
