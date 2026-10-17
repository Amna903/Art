import type { Database } from "@/lib/supabase/types";

type ArtworkStatus = Database["public"]["Enums"]["artwork_status"];

/** English labels for artwork statuses; render them through t(). */
export const ARTWORK_STATUS_LABELS: Record<ArtworkStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  sold: "Sold",
  blocked: "Blocked",
  archived: "Archived",
};
