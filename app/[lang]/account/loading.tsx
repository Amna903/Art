import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function AccountLoading() {
  return (
    <main className="max-w-container-max mx-auto px-gutter-page py-24 md:py-28">
      <Skeleton className="h-3 w-40 mb-4" />
      <Skeleton className="h-10 w-1/2 mb-16" />
      <CardGridSkeleton count={6} columns="2-3" aspect="aspect-[4/5]" />
    </main>
  );
}
