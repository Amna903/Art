import { DetailHeroSkeleton } from "@/components/ui/Skeleton";

export default function ArtworkDetailLoading() {
  return (
    <main className="max-w-container-max mx-auto px-gutter-page pt-24 md:pt-28">
      <DetailHeroSkeleton />
    </main>
  );
}
