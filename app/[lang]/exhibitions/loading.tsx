import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ExhibitionsLoading() {
  return (
    <main className="max-w-container-max mx-auto px-gutter-page py-24 md:py-28">
      <div className="mb-16 max-w-2xl">
        <Skeleton className="h-3 w-32 mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <CardGridSkeleton count={6} columns="3" aspect="aspect-[4/5]" />
    </main>
  );
}
