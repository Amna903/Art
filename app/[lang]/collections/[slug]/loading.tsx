import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function CollectionDetailLoading() {
  return (
    <main className="max-w-container-max mx-auto px-gutter-page pt-24 md:pt-28">
      <div className="mb-section-gap max-w-2xl">
        <Skeleton className="h-3 w-32 mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="aspect-[21/9] w-full mb-section-gap" />
      <CardGridSkeleton count={6} columns="2-3" aspect="aspect-[3/4]" />
    </main>
  );
}
