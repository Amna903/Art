import Link from "next/link";

export default function CountryNotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div>
        <p className="font-label-caps tracking-widest text-secondary mb-3">COUNTRY NOT FOUND</p>
        <h1 className="font-display-lg text-4xl mb-6">This country isn&rsquo;t on the atlas.</h1>
        <Link
          href="/#atlas"
          className="border border-primary px-6 py-3 font-label-caps tracking-widest hover:bg-primary hover:text-beige transition-colors"
        >
          RETURN TO MAP
        </Link>
      </div>
    </main>
  );
}
