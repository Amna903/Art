import { DetailHeroSkeleton } from "@/components/ui/Skeleton";

export default function ArtistDetailLoading() {
  return (
    <main className="max-w-[1440px] mx-auto px-gutter-page pt-24 md:pt-28">
      <DetailHeroSkeleton />
    </main>
  );
}
