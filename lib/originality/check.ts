import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeAverageHash, hammingDistance, similarityFromDistance } from "./phash";

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

/** Hamming ≤ this → treat as a clear duplicate of platform work. */
const PLATFORM_BLOCK_DISTANCE = 6;
/** Hamming ≤ this → send to admin review. */
const PLATFORM_REVIEW_DISTANCE = 14;
/** Web visual match similarity ≥ this → block. */
const WEB_BLOCK_SIMILARITY = 0.92;
/** Web visual match similarity ≥ this → review. */
const WEB_REVIEW_SIMILARITY = 0.75;

type ArtworkHashRow = {
  id: string;
  title: string;
  image_url: string;
  image_phash: string | null;
  slug: string;
};

function serviceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for originality checks.");
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("Image URL is invalid.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Image URL must use HTTP or HTTPS.");
  }
  // The check endpoint fetches this URL from the server. Do not let it be
  // used to probe local/private services when a URL is pasted into the form.
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("Image URL must not point to a private network.");
  }

  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    throw new Error(`Could not download image (${res.status}).`);
  }
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error("The supplied URL is not an image.");
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > 10 * 1024 * 1024) throw new Error("Image must be 10 MB or smaller.");
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > 10 * 1024 * 1024) throw new Error("Image must be 10 MB or smaller.");
  return buffer;
}

async function compareAgainstPlatform(
  client: SupabaseClient<Database>,
  phash: string,
  excludeArtworkId?: string,
): Promise<OriginalityMatch[]> {
  const { data, error } = await client
    .from("artworks")
    .select("id, title, image_url, image_phash, slug")
    .not("image_url", "eq", "");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ArtworkHashRow[];
  const matches: OriginalityMatch[] = [];

  for (const row of rows) {
    if (excludeArtworkId && row.id === excludeArtworkId) continue;

    let otherHash = row.image_phash;
    if (!otherHash && row.image_url) {
      try {
        const buf = await fetchImageBuffer(row.image_url);
        otherHash = await computeAverageHash(buf);
        await client.from("artworks").update({ image_phash: otherHash }).eq("id", row.id);
      } catch {
        continue;
      }
    }
    if (!otherHash) continue;

    const dist = hammingDistance(phash, otherHash);
    if (dist > PLATFORM_REVIEW_DISTANCE) continue;

    matches.push({
      source: "platform",
      artworkId: row.id,
      title: row.title,
      url: `/artworks/${row.slug}`,
      similarity: similarityFromDistance(dist),
      hammingDistance: dist,
    });
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

type SerpLensImage = {
  title?: string;
  link?: string;
  source?: string;
  thumbnail?: string;
};

async function searchPublicWeb(imageUrl: string): Promise<{
  matches: OriginalityMatch[];
  status: "ran" | "skipped" | "failed";
}> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return { matches: [], status: "skipped" };
  }

  try {
    const endpoint = new URL("https://serpapi.com/search.json");
    endpoint.searchParams.set("engine", "google_lens");
    endpoint.searchParams.set("url", imageUrl);
    endpoint.searchParams.set("api_key", apiKey);

    const res = await fetch(endpoint.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      return { matches: [], status: "failed" };
    }
    const body = (await res.json()) as {
      visual_matches?: SerpLensImage[];
      error?: string;
    };
    if (body.error) {
      return { matches: [], status: "failed" };
    }

    const platformHost = (() => {
      try {
        return process.env.NEXT_PUBLIC_SITE_URL
          ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
          : null;
      } catch {
        return null;
      }
    })();

    const matches: OriginalityMatch[] = [];
    const visuals = body.visual_matches ?? [];
    visuals.slice(0, 12).forEach((item, index) => {
      const link = item.link ?? item.thumbnail;
      if (!link) return;
      try {
        const host = new URL(link).hostname;
        if (platformHost && host.includes(platformHost)) return;
      } catch {
        /* keep match */
      }
      // Google Lens visual_matches are ordered by relevance; map rank → similarity.
      const similarity = Math.max(0.55, 0.98 - index * 0.03);
      matches.push({
        source: "web",
        title: item.title ?? item.source ?? "Web match",
        url: link,
        similarity,
      });
    });

    return { matches, status: "ran" };
  } catch {
    return { matches: [], status: "failed" };
  }
}

function decide(matches: OriginalityMatch[], webSearch: OriginalityResult["webSearch"]): OriginalityResult["decision"] {
  const platform = matches.filter((m) => m.source === "platform");
  const web = matches.filter((m) => m.source === "web");

  if (platform.some((m) => (m.hammingDistance ?? 64) <= PLATFORM_BLOCK_DISTANCE)) {
    return "blocked";
  }
  if (web.some((m) => m.similarity >= WEB_BLOCK_SIMILARITY)) {
    return "blocked";
  }
  if (platform.some((m) => (m.hammingDistance ?? 64) <= PLATFORM_REVIEW_DISTANCE)) {
    return "review";
  }
  if (web.some((m) => m.similarity >= WEB_REVIEW_SIMILARITY)) {
    return "review";
  }
  // Any lower-confidence web hits still warrant a human look when search ran.
  if (webSearch === "ran" && web.length > 0) {
    return "review";
  }
  return "clear";
}

export async function runOriginalityCheck(opts: {
  imageUrl: string;
  excludeArtworkId?: string;
}): Promise<OriginalityResult> {
  const client = serviceClient();
  const buffer = await fetchImageBuffer(opts.imageUrl);
  const phash = await computeAverageHash(buffer);

  const [platformMatches, web] = await Promise.all([
    compareAgainstPlatform(client, phash, opts.excludeArtworkId),
    searchPublicWeb(opts.imageUrl),
  ]);

  const matches = [...platformMatches, ...web.matches].sort((a, b) => b.similarity - a.similarity);
  const decision = decide(matches, web.status);
  const score = matches[0]?.similarity ?? 0;

  const note =
    decision === "blocked"
      ? "Exact or highly similar match found. Publication is blocked pending admin action."
      : decision === "review"
        ? "Possible match found. Sent to the admin originality review queue."
        : web.status === "skipped"
          ? "No platform duplicate found. Public web reverse-search was skipped (set SERPAPI_API_KEY to enable)."
          : "No clear match found on the platform or in publicly indexed results. Note: unindexed pages cannot be guaranteed clear.";

  return {
    decision,
    score,
    phash,
    matches: matches.slice(0, 20),
    webSearch: web.status,
    note,
  };
}
