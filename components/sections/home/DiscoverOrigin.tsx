import Link from "next/link";

const ORIGINS = [
  "Nigeria",
  "Senegal",
  "South Africa",
  "Ghana",
  "Ethiopia",
  "Kenya",
  "Morocco",
  "Congo",
  "Zimbabwe",
  "Angola",
];

export function DiscoverOrigin() {
  return (
    <section className="py-section-gap px-gutter-page bg-primary text-on-primary overflow-hidden relative">
      <div className="max-w-container-max mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-primary">Discover by Origin</h2>
            <p className="text-primary-fixed-dim mt-4">Uncover narratives from every corner of the continent.</p>
          </div>
          <Link href="/artists" className="text-secondary border-b border-secondary font-navigation text-navigation uppercase">
            View Full Map
          </Link>
        </div>
        <div className="flex flex-wrap gap-4">
          {ORIGINS.map((country) => (
            <Link
              key={country}
              href={`/discover/${country.toLowerCase().replace(/\s+/g, "-")}`}
              className="px-8 py-4 border border-on-primary/20 hover:border-secondary hover:text-secondary transition-all font-navigation text-navigation uppercase tracking-widest bg-transparent"
            >
              {country}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
