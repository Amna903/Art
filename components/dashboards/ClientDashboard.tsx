"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { listSavedArtworks, unsaveArtwork, SAVED_ARTWORKS_EVENT, type SavedArtworkRow } from "@/lib/data/saved";
import { listFollowedArtists, unfollowArtist, FOLLOWED_ARTISTS_EVENT, type FollowedArtistRow } from "@/lib/data/followed-artists";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

type Order = {
  id: string;
  total_usd: number;
  status: string;
  created_at: string;
};

type Enquiry = {
  id: string;
  artwork_title: string;
  status: string;
  created_at: string;
};

export function ClientDashboard({ userId }: { userId: string }) {
  const [favs, setFavs] = useState<SavedArtworkRow[]>([]);
  const [followed, setFollowed] = useState<FollowedArtistRow[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    const [savedRows, followedRows, ordersRes, enquiriesRes] = await Promise.all([
      listSavedArtworks(userId),
      listFollowedArtists(userId),
      supabase
        .from("orders")
        .select("id, total_usd, status, created_at")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("enquiries")
        .select("id, artwork_title, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    setFavs(savedRows);
    setFollowed(followedRows);
    setOrders(ordersRes.data ?? []);
    setEnquiries(enquiriesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    window.addEventListener(SAVED_ARTWORKS_EVENT, refreshData);
    window.addEventListener(FOLLOWED_ARTISTS_EVENT, refreshData);
    return () => {
      window.removeEventListener(SAVED_ARTWORKS_EVENT, refreshData);
      window.removeEventListener(FOLLOWED_ARTISTS_EVENT, refreshData);
    };
  }, [userId]);

  const removeFav = async (artworkSlug: string) => {
    setFavs((f) => f.filter((x) => x.artwork_slug !== artworkSlug));
    const res = await unsaveArtwork(userId, artworkSlug);
    if (res?.error) {
      toast("Couldn't remove artwork");
    } else {
      toast("Removed from saved works");
    }
  };

  const handleUnfollow = async (artistSlug: string) => {
    setFollowed((prev) => prev.filter((a) => a.artist_slug !== artistSlug));
    const res = await unfollowArtist(userId, artistSlug);
    if (res?.error) {
      toast("Couldn't unfollow artist");
    } else {
      toast("Artist unfollowed");
    }
  };

  return (
    <div className="space-y-12">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Saved works" value={favs.length} />
        <Stat label="Followed artists" value={followed.length} />
        <Stat label="Orders" value={orders.length} />
        <Stat
          label="Total spent"
          value={`$${orders.reduce((s, o) => s + Number(o.total_usd), 0).toLocaleString()}`}
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 border-b border-primary/10 pb-4">
          <h2 className="font-display-sm text-display-sm text-primary">Saved artworks</h2>
          <Link href="/collections" className="font-label-caps text-xs uppercase tracking-widest text-secondary hover:underline">
            Explore Gallery →
          </Link>
        </div>
        {loading ? (
          <CardGridSkeleton count={3} columns="2-3" aspect="aspect-[4/5]" />
        ) : favs.length === 0 ? (
          <div className="p-8 border border-primary/10 text-center rounded-xl bg-surface-container-lowest">
            <p className="text-on-surface-variant text-sm mb-4">
              Browse the gallery and tap the heart icon on any artwork to save it to your collection.
            </p>
            <Link
              href="/collections"
              className="inline-block bg-tertiary text-on-tertiary px-6 py-2.5 font-navigation text-xs uppercase tracking-widest hover:bg-secondary transition-colors"
            >
              Browse Artworks
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favs.map((f) => (
              <article key={f.artwork_slug} className="border border-primary/10 group rounded-xl overflow-hidden bg-surface-container-lowest flex flex-col">
                <Link href={`/artworks/${f.artwork_slug}`} className="aspect-[4/5] bg-surface-variant overflow-hidden block relative">
                  {f.artwork_image ? (
                    <Image
                      src={f.artwork_image}
                      alt={f.artwork_title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40 text-xs uppercase">
                      No Image
                    </div>
                  )}
                </Link>
                <div className="p-5 flex items-center justify-between gap-3 mt-auto">
                  <div className="min-w-0">
                    <h3 className="font-headline-sm text-headline-sm text-primary truncate">{f.artwork_title}</h3>
                    {f.artist_name && <p className="text-xs text-on-surface-variant truncate mt-0.5">{f.artist_name}</p>}
                  </div>
                  <button
                    onClick={() => removeFav(f.artwork_slug)}
                    className="text-xs font-bold uppercase tracking-widest text-secondary hover:text-primary shrink-0 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 border-b border-primary/10 pb-4">
          <h2 className="font-display-sm text-display-sm text-primary">Followed artists</h2>
          <Link href="/artists" className="font-label-caps text-xs uppercase tracking-widest text-secondary hover:underline">
            View All Artists →
          </Link>
        </div>
        {loading ? (
          <CardGridSkeleton count={3} columns="2-3" aspect="aspect-[4/5]" />
        ) : followed.length === 0 ? (
          <div className="p-8 border border-primary/10 text-center rounded-xl bg-surface-container-lowest">
            <p className="text-on-surface-variant text-sm mb-4">
              Follow contemporary artists to receive updates when new studio works enter our catalog.
            </p>
            <Link
              href="/artists"
              className="inline-block bg-tertiary text-on-tertiary px-6 py-2.5 font-navigation text-xs uppercase tracking-widest hover:bg-secondary transition-colors"
            >
              Explore Artists
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {followed.map((a) => (
              <div
                key={a.id || a.artist_slug}
                className="border border-primary/10 rounded-xl p-6 bg-surface-container-lowest flex items-center gap-5 justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 bg-surface-container border border-primary/10">
                    <Image
                      src={
                        a.artist_image ||
                        "https://nu-artcollective.lovable.app/__l5e/assets-v1/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg"
                      }
                      alt={a.artist_name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/artists/${a.artist_slug}`}
                      className="font-headline-sm text-headline-sm text-primary hover:text-secondary truncate block font-bold transition-colors"
                    >
                      {a.artist_name}
                    </Link>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">
                      {a.technique || "Contemporary visual art"}
                      {a.country_name ? ` · ${a.country_name}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnfollow(a.artist_slug)}
                  className="text-xs font-bold uppercase tracking-widest text-secondary hover:text-primary shrink-0 transition-colors"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display-sm text-display-sm text-primary mb-6 border-b border-primary/10 pb-4">
          Order history & enquiries
        </h2>
        {orders.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No orders recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-on-surface-variant">
              <tr className="border-b border-primary/10">
                <th className="text-left py-3">Order</th>
                <th className="text-left py-3">Date</th>
                <th className="text-left py-3">Status</th>
                <th className="text-right py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-primary/5">
                  <td className="py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="py-3">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="py-3 uppercase tracking-widest text-xs text-secondary">{o.status}</td>
                  <td className="py-3 text-right">${Number(o.total_usd).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-10">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-4">Enquiries sent</h3>
          {enquiries.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No enquiries sent yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-on-surface-variant">
                <tr className="border-b border-primary/10">
                  <th className="text-left py-3">Artwork</th>
                  <th className="text-left py-3">Date</th>
                  <th className="text-right py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="border-b border-primary/5">
                    <td className="py-3 text-primary">{enquiry.artwork_title}</td>
                    <td className="py-3">{new Date(enquiry.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-right uppercase tracking-widest text-xs text-secondary">
                      {enquiry.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-primary/10 p-5 rounded-xl bg-surface-container-lowest">
      <div className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="font-display-sm text-display-sm text-primary mt-2">{value}</div>
    </div>
  );
}
