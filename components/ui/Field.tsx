import type { ComponentProps } from "react";

/**
 * Shared form fields: the site's underlined input style (thin bottom border,
 * transparent background). Use these instead of styling raw <input>,
 * <textarea> or <select>; `className` adds to the base (spacing, text size).
 */
export const FIELD_CLASS = "w-full bg-transparent border-b border-primary/30 py-2 text-primary";

const cls = (className?: string) => (className ? `${FIELD_CLASS} ${className}` : FIELD_CLASS);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cls(className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cls(className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cls(className)} {...props} />;
}
