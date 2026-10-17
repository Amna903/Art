import { Skeleton } from "@/components/ui/Skeleton";

export default function CollectionsLoading() {
  return (
    <main className="max-w-container-max mx-auto px-gutter-page py-24 md:py-28">
      <div className="mb-16 max-w-2xl">
        <Skeleton className="h-3 w-32 mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-8 py-4">
            <Skeleton className="md:col-span-4 aspect-[4/3]" />
            <div className="md:col-span-8 flex flex-col gap-3 justify-center">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
