"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { PriceUponRequest } from "@/components/enquiry/PriceUponRequest";
import { RequestPriceButton } from "@/components/enquiry/RequestPriceButton";
import { listSavedArtworks, unsaveArtwork, SAVED_ARTWORKS_EVENT, type SavedArtworkRow } from "@/lib/data/saved";
import { listFollowedArtists, unfollowArtist, FOLLOWED_ARTISTS_EVENT, type FollowedArtistRow } from "@/lib/data/followed-artists";

const A = "https://nu-artcollective.lovable.app/__l5e/assets-v1";

const DEFAULT_SAVED = [
  {
    artwork_slug: "somnyama-ngonyama-ii",
    artwork_title: "Somnyama Ngonyama II",
    artist_name: "Zanele Muholi",
    artwork_image: `${A}/7ecf1ef0-f8b8-4e2b-ba7f-9abe7ac43151/afr-portrait-painting.jpg`,
  },
  {
    artwork_slug: "crimson-horizon",
    artwork_title: "Crimson Horizon",
    artist_name: "El Anatsui",
    artwork_image: `${A}/962ca422-ea96-4526-86bf-114414bf21e6/afr-culture-portrait.jpg`,
  },
  {
    artwork_slug: "rhythm-of-bamako",
    artwork_title: "Rhythm of Bamako",
    artist_name: "Abdoulaye Konaté",
    artwork_image: `${A}/047a8f56-5cc6-48eb-8d6b-4c1254b37d70/afr-ritual-bw.jpg`,
  },
];

const TABS = ["Saved Artworks", "Followed Artists", "Order History"] as const;
type Tab = (typeof TABS)[number];

type Enquiry = {
  id: string;
  artwork_title: string;
  status: string;
  created_at: string;
};

export default function AccountPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Saved Artworks");
  const [saved, setSaved] = useState<SavedArtworkRow[]>([]);
  const [followed, setFollowed] = useState<FollowedArtistRow[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    const [savedData, followedData] = await Promise.all([
      listSavedArtworks(user?.id),
      listFollowedArtists(user?.id),
    ]);
    const { data: enquiryData } = user
      ? await supabase
          .from("enquiries")
          .select("id, artwork_title, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      : { data: [] };
    setSaved(savedData);
    setFollowed(followedData);
    setEnquiries(enquiryData ?? []);
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
  }, [user]);

  const handleUnsave = async (slug: string) => {
    setSaved((prev) => prev.filter((item) => item.artwork_slug !== slug));
    const res = await unsaveArtwork(user?.id, slug);
    if (res?.error) {
      toast("Couldn't remove artwork");
    } else {
      toast("Removed from your saved collection");
    }
  };

  const handleUnfollow = async (slug: string) => {
    setFollowed((prev) => prev.filter((item) => item.artist_slug !== slug));
    const res = await unfollowArtist(user?.id, slug);
    if (res?.error) {
      toast("Couldn't unfollow artist");
    } else {
      toast("Artist unfollowed");
    }
  };

  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Collector";

  return (
    <main className="max-w-container-max mx-auto px-gutter-page pt-24 pb-16">
      <section className="mb-section-gap pt-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="font-label-caps text-label-caps text-secondary mb-4 block uppercase">
              Collector&apos;s Sanctuary
            </span>
            <h1 className="font-display-lg text-display-lg text-primary">Jambo, {userName}.</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-4">
              Welcome back to your personal portal. Manage your saved artworks, followed artists, and acquisition history.
            </p>
          </div>
          <div className="hidden lg:block w-32 red-thread mb-6" />
        </div>
      </section>

      <nav className="flex items-center space-x-12 mb-16 border-b border-primary/5 pb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative py-2 font-navigation text-navigation uppercase tracking-widest transition-all whitespace-nowrap ${
              tab === t ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {tab === t ? <span className="border-b-2 border-secondary pb-1">{t}</span> : t}
          </button>
        ))}
      </nav>

      {tab === "Saved Artworks" && (
        <>
          {saved.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-gutter">
              {saved.map((w) => (
                <div key={w.id || w.artwork_slug} className="group">
                  <div className="relative overflow-hidden aspect-[3/4]">
                    <Image
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out"
                      alt={w.artwork_title}
                      src={w.artwork_image || `${A}/7ecf1ef0-f8b8-4e2b-ba7f-9abe7ac43151/afr-portrait-painting.jpg`}
                    />
                    <button
                      type="button"
                      onClick={() => handleUnsave(w.artwork_slug)}
                      className="absolute top-4 right-4 bg-background/90 w-11 h-11 flex items-center justify-center rounded-full material-symbols-outlined text-primary hover:text-secondary transition-colors"
                      aria-label="Remove from saved"
                    >
                      close
                    </button>
                  </div>
                  <div className="pt-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 red-thread" />
                      <span className="font-label-caps text-label-caps text-secondary uppercase">
                        {w.artist_name || "Featured Artist"}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-1">{w.artwork_title}</h3>
                    <div className="flex items-center justify-between mt-4">
                      <PriceUponRequest className="text-sm" />
                      <RequestPriceButton
                        artworkSlug={w.artwork_slug}
                        artworkTitle={w.artwork_title}
                        artistName={w.artist_name || undefined}
                        artworkImage={w.artwork_image || undefined}
                        className="bg-primary text-on-primary px-6 py-2.5 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-colors duration-300"
                      >
                        Request Price
                      </RequestPriceButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !user ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-gutter">
              {DEFAULT_SAVED.map((w) => (
                <div key={w.artwork_title} className="group">
                  <div className="relative overflow-hidden aspect-[3/4]">
                    <Image
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out"
                      alt={w.artwork_title}
                      src={w.artwork_image}
                    />
                  </div>
                  <div className="pt-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-4 red-thread" />
                      <span className="font-label-caps text-label-caps text-secondary uppercase">{w.artist_name}</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-primary mb-1">{w.artwork_title}</h3>
                    <div className="flex items-center justify-between mt-4">
                      <PriceUponRequest className="text-sm" />
                      <RequestPriceButton
                        artworkSlug={w.artwork_slug}
                        artworkTitle={w.artwork_title}
                        artistName={w.artist_name}
                        artworkImage={w.artwork_image}
                        className="bg-primary text-on-primary px-6 py-2.5 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-colors duration-300"
                      >
                        Request Price
                      </RequestPriceButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-body-lg text-on-surface-variant mb-4">You have no saved artworks in your collection yet.</p>
              <Link
                href="/collections"
                className="inline-block bg-tertiary text-on-tertiary px-8 py-3 font-navigation uppercase tracking-widest hover:bg-secondary transition-colors"
              >
                Browse Collections
              </Link>
            </div>
          )}
        </>
      )}

      {tab === "Followed Artists" && (
        <>
          {followed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {followed.map((a) => (
                <div key={a.id || a.artist_slug} className="flex flex-col items-center text-center p-6 border border-primary/10 rounded-2xl bg-surface-container-lowest">
                  <div className="relative w-40 h-40 rounded-full overflow-hidden mb-6 grayscale hover:grayscale-0 transition-all duration-500">
                    <Image
                      fill
                      sizes="160px"
                      className="object-cover"
                      alt={`Portrait of ${a.artist_name}`}
                      src={a.artist_image || `${A}/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg`}
                    />
                  </div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase mb-1">
                    {a.technique || "Contemporary Visual Art"}
                  </span>
                  {a.country_name && (
                    <span className="text-xs text-on-surface-variant mb-2">{a.country_name}</span>
                  )}
                  <h4 className="font-headline-sm text-headline-sm text-primary mb-4">{a.artist_name}</h4>
                  <div className="flex gap-3">
                    <Link
                      href={`/artists/${a.artist_slug}`}
                      className="border border-primary/20 px-4 py-2 font-navigation text-xs uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all"
                    >
                      View Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleUnfollow(a.artist_slug)}
                      className="border border-secondary/40 text-secondary px-3 py-2 font-navigation text-xs uppercase tracking-widest hover:bg-secondary hover:text-on-secondary transition-all"
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !user ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              <div className="flex flex-col items-center text-center p-6 border border-primary/10 rounded-2xl bg-surface-container-lowest">
                <div className="relative w-40 h-40 rounded-full overflow-hidden mb-6 grayscale hover:grayscale-0 transition-all duration-500">
                  <Image
                    fill
                    sizes="160px"
                    className="object-cover"
                    alt="Yinka Shonibare portrait"
                    src={`${A}/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg`}
                  />
                </div>
                <span className="font-label-caps text-label-caps text-secondary uppercase mb-2">
                  Sculpture / Installation
                </span>
                <h4 className="font-headline-sm text-headline-sm text-primary mb-4">Yinka Shonibare</h4>
                <Link
                  href="/artists/yinka-shonibare"
                  className="border border-primary/20 px-6 py-2 font-navigation text-navigation uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-body-lg text-on-surface-variant mb-4">You are not following any artists yet.</p>
              <Link
                href="/artists"
                className="inline-block bg-tertiary text-on-tertiary px-8 py-3 font-navigation uppercase tracking-widest hover:bg-secondary transition-colors"
              >
                Explore Artists Directory
              </Link>
            </div>
          )}
        </>
      )}

      {tab === "Order History" && (
        <div className="space-y-8 max-w-4xl mx-auto">
          

          <div className="border border-primary/10 p-8 bg-surface-container-low">
            <h3 className="font-headline-sm text-headline-sm text-primary mb-6">Enquiries sent</h3>
            {enquiries.length === 0 ? (
              <p className="text-on-surface-variant text-sm">No enquiries sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
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
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
