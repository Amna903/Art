import Link from "next/link";
import type { Artist } from "@/lib/data/artists";

export function ArtistCard({ artist, offset }: { artist: Artist; offset: boolean }) {
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className={["artist-card-container group flex flex-col relative", offset ? "lg:translate-y-10" : ""].join(" ")}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low mb-6 cursor-pointer">
        <div
          className="absolute inset-0 z-10 transition-opacity duration-700 group-hover:opacity-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${artist.image}')` }}
        />
        <div className="absolute inset-0 z-0 bg-surface-container flex flex-col justify-end p-7">
          <div className="mb-4">
            <span className="font-label-caps text-secondary">FEATURED WORK</span>
            <h4 className="font-headline-sm text-primary">&ldquo;{artist.featuredWork}&rdquo;</h4>
          </div>
          <p className="font-body-md text-on-surface-variant line-clamp-4 italic">{artist.bio}</p>
          <div className="mt-6 flex justify-between items-center">
            <span className="font-label-caps uppercase tracking-widest border-b border-primary">View Bio</span>
            <span className="material-symbols-outlined">north_east</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start gap-3">
          <h3 className="font-headline-sm text-primary">{artist.name}</h3>
          <span className="font-label-caps text-on-surface-variant text-right">
            {artist.city}, {artist.countryCode.slice(0, 2)}
          </span>
        </div>
        <div className="red-thread mb-2" />
        <div className="flex justify-between items-center gap-3">
          <p className="font-label-caps text-on-surface-variant tracking-wider uppercase">{artist.technique}</p>
          <span className="text-[10px] font-bold bg-secondary-container/10 text-secondary px-2 py-0.5 rounded-full whitespace-nowrap">
            {artist.newDiscovery ? "NEW DISCOVERY" : `${artist.worksCount} WORKS`}
          </span>
        </div>
      </div>
    </Link>
  );
}
