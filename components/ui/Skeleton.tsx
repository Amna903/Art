type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`skeleton rounded-sm ${className ?? ""}`} />;
}

type CardGridSkeletonProps = {
  count?: number;
  columns?: "3" | "2-3" | "2-4";
  aspect?: string;
};

const COLUMN_CLASSES: Record<NonNullable<CardGridSkeletonProps["columns"]>, string> = {
  "3": "md:grid-cols-3",
  "2-3": "md:grid-cols-2 lg:grid-cols-3",
  "2-4": "md:grid-cols-2 lg:grid-cols-4",
};

export function CardGridSkeleton({ count = 6, columns = "2-3", aspect = "aspect-[4/5]" }: CardGridSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 ${COLUMN_CLASSES[columns]} gap-x-gutter gap-y-16`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className={`${aspect} w-full mb-6`} />
          <Skeleton className="h-4 w-3/4 mb-3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function ListRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-primary/10 p-5 flex items-center gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailHeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
      <div className="lg:col-span-7">
        <Skeleton className="aspect-[4/5] w-full" />
      </div>
      <div className="lg:col-span-5 flex flex-col gap-4 pt-4 lg:pt-0">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full mt-4" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
