import { Skeleton } from "@/components/ui/Skeleton";

export default function JournalArticleLoading() {
  return (
    <main className="max-w-3xl mx-auto px-gutter-page py-24 md:py-28">
      <Skeleton className="h-3 w-32 mb-6" />
      <Skeleton className="h-10 w-full mb-3" />
      <Skeleton className="h-10 w-2/3 mb-10" />
      <Skeleton className="aspect-[16/9] w-full mb-10" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </main>
  );
}
