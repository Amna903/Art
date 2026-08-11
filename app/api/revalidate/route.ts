import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Client-side editors write straight to Supabase from the browser — there's no
// server action in that path to call revalidateTag from directly. This lets
// them ping after a successful write so changes show immediately instead of
// waiting out the 60s unstable_cache / ISR window. Whitelisted tags only —
// this endpoint only clears cache entries.
const ALLOWED_TAGS = new Set([
  "journal-posts",
  "exhibitions",
  "artworks",
  "collections",
  "page-blocks",
]);

const PAGE_BLOCK_PATHS: Record<string, string> = {
  home: "/",
  journal: "/journal",
  exhibitions: "/exhibitions",
};

// Full Route Cache (ISR) is separate from Data Cache (unstable_cache tags).
// Busting the tag alone leaves prerendered HTML stale — also revalidate paths.
const PATHS_BY_TAG: Record<string, string[]> = {
  artworks: ["/", "/artists", "/artworks", "/collections", "/search", "/discover", "/virtual-gallery"],
  collections: ["/", "/collections", "/discover"],
  "journal-posts": ["/", "/journal", "/discover"],
  exhibitions: ["/", "/exhibitions", "/discover"],
  "page-blocks": ["/", "/journal", "/exhibitions", "/discover"],
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({ tag: null, page: null }));
  const { tag, page } = body as { tag: unknown; page?: unknown };

  if (typeof tag !== "string" || !ALLOWED_TAGS.has(tag)) {
    return NextResponse.json({ error: "Unknown tag." }, { status: 400 });
  }

  // { expire: 0 } so the next view after an admin/artist write is fresh.
  revalidateTag(tag, { expire: 0 });

  if (tag === "page-blocks" && typeof page === "string" && PAGE_BLOCK_PATHS[page]) {
    revalidatePath(PAGE_BLOCK_PATHS[page], "page");
    revalidatePath(PAGE_BLOCK_PATHS[page], "layout");
  }

  for (const path of PATHS_BY_TAG[tag] ?? []) {
    revalidatePath(path);
  }

  if (tag === "artworks") {
    revalidatePath("/", "layout");
    revalidatePath("/artists", "layout");
    revalidatePath("/artworks", "layout");
    revalidatePath("/collections", "layout");
    revalidatePath("/discover", "layout");
    revalidatePath("/search");
    revalidatePath("/virtual-gallery");
  } else if (tag === "collections") {
    revalidatePath("/", "layout");
    revalidatePath("/collections", "layout");
    revalidatePath("/discover", "layout");
  } else if (tag === "journal-posts") {
    revalidatePath("/", "layout");
    revalidatePath("/journal", "layout");
    revalidatePath("/discover", "layout");
  } else if (tag === "exhibitions") {
    revalidatePath("/", "layout");
    revalidatePath("/exhibitions", "layout");
    revalidatePath("/discover", "layout");
  } else if (tag === "page-blocks") {
    revalidatePath("/", "layout");
    revalidatePath("/journal", "layout");
    revalidatePath("/exhibitions", "layout");
  }

  return NextResponse.json({ revalidated: true, tag, page: page ?? null });
}
