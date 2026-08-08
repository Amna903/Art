export function PriceUponRequest({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-secondary ${className}`}>
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        lock
      </span>
      Price Upon Request
    </span>
  );
}
