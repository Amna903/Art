"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchReviews, submitReview, type Review } from "@/lib/data/reviews";

type Props = { artworkSlug: string };

function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  return (
    <div className="flex gap-0.5 text-secondary">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`material-symbols-outlined ${size}`}
          style={{ fontVariationSettings: `'FILL' ${i < value ? 1 : 0}` }}
        >
          star
        </span>
      ))}
    </div>
  );
}

export function ReviewsSection({ artworkSlug }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchReviews(artworkSlug, 0).then(({ reviews: r, total: t }) => {
      if (cancelled) return;
      setReviews(r);
      setTotal(t);
      setPage(0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [artworkSlug]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const { reviews: r } = await fetchReviews(artworkSlug, nextPage);
    setReviews((prev) => [...prev, ...r]);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast("Sign in to leave a review", {
        action: { label: "Sign in", onClick: () => router.push("/auth") },
      });
      return;
    }
    if (rating === 0) {
      toast("Pick a star rating first");
      return;
    }

    setSubmitting(true);
    const authorName =
      (user.user_metadata?.display_name as string | undefined)?.trim() || user.email?.split("@")[0] || "Collector";

    const res = await submitReview({ artworkSlug, userId: user.id, authorName, rating, comment });
    setSubmitting(false);

    if (res.error || !res.review) {
      toast(res.error || "Couldn't submit your review. Please try again.");
      return;
    }

    setReviews((prev) => [res.review!, ...prev]);
    setTotal((t) => t + 1);
    setRating(0);
    setComment("");
    toast("Review posted — thank you");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="font-label-caps text-label-caps uppercase text-primary">Collector Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={Math.round(avgRating)} />
            <span className="text-xs text-on-surface-variant">{total}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No reviews yet — be the first to review this piece.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="border-b border-outline/10 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Stars value={r.rating} />
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="text-sm text-on-surface-variant italic leading-relaxed mb-1">&ldquo;{r.comment}&rdquo;</p>}
              <p className="text-xs text-primary font-label-caps uppercase tracking-widest">{r.author_name}</p>
            </div>
          ))
        )}

        {reviews.length < total && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="self-start text-xs uppercase tracking-widest text-secondary underline decoration-secondary/30 underline-offset-4 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : `Load more (${total - reviews.length} remaining)`}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-4 border-t border-outline/10">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Leave a review</span>
        <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              type="button"
              key={i}
              onMouseEnter={() => setHoverRating(i + 1)}
              onClick={() => setRating(i + 1)}
              aria-label={`Rate ${i + 1} star${i === 0 ? "" : "s"}`}
              className="text-secondary"
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: `'FILL' ${i < (hoverRating || rating) ? 1 : 0}` }}
              >
                star
              </span>
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Share your experience with this piece…"
          className="w-full bg-surface-container-low border border-outline/20 px-3 py-2 text-sm focus:outline-none focus:border-secondary transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="self-start bg-primary text-on-primary font-navigation text-navigation uppercase tracking-widest py-2.5 px-6 hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post Review"}
        </button>
      </form>
    </div>
  );
}
