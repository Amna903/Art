import type { ReactNode } from "react";

/** The small dark uppercase tag used on artist and collection cards ("New Discovery"). */
export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`bg-primary text-beige font-label-caps text-tiny px-3 py-1 uppercase tracking-widest ${className}`.trim()}>
      {children}
    </span>
  );
}
