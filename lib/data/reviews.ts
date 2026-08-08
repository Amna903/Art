import { supabase } from "@/lib/supabase/client";

export type Review = {
  id: string;
  artwork_slug: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export const REVIEWS_PAGE_SIZE = 5;

export async function fetchReviews(
  artworkSlug: string,
  page: number,
): Promise<{ reviews: Review[]; total: number }> {
  const from = page * REVIEWS_PAGE_SIZE;
  const to = from + REVIEWS_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("reviews")
    .select("*", { count: "exact" })
    .eq("artwork_slug", artworkSlug)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) return { reviews: [], total: 0 };
  return { reviews: data, total: count ?? data.length };
}

export async function submitReview(input: {
  artworkSlug: string;
  userId: string;
  authorName: string;
  rating: number;
  comment?: string;
}): Promise<{ review?: Review; error?: string }> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      artwork_slug: input.artworkSlug,
      user_id: input.userId,
      author_name: input.authorName,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message || "Failed to submit review." };
  return { review: data };
}
