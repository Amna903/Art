import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <main className="max-w-container-max mx-auto px-gutter-page py-24 md:py-28">
      <Skeleton className="h-12 w-full max-w-xl mb-16" />
      <CardGridSkeleton count={6} columns="2-3" aspect="aspect-[4/5]" />
    </main>
  );
}
