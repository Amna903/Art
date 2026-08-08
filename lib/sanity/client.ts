import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

export const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const SANITY_API_VERSION = "2025-01-01";

export function isSanityConfigured(): boolean {
  return Boolean(SANITY_PROJECT_ID);
}

let _client: ReturnType<typeof createClient> | undefined;

/**
 * Read-only Sanity client. Only call this after checking isSanityConfigured() —
 * it throws if NEXT_PUBLIC_SANITY_PROJECT_ID isn't set, since createClient()
 * itself requires a projectId.
 */
export function getSanityClient() {
  if (!_client) {
    _client = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      useCdn: true,
    });
  }
  return _client;
}

const builder = {
  get instance() {
    return imageUrlBuilder(getSanityClient());
  },
};

/** Build a Sanity CDN image URL from an image reference/asset. */
export function urlFor(source: SanityImageSource) {
  return builder.instance.image(source);
}
