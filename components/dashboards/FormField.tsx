"use client";

import { Input } from "@/components/ui/Field";
export function F({
  label,
  value,
  onChange,
  type = "text",
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border border-primary/20 p-2 text-primary text-sm"
 />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}

 />
      )}
    </label>
  );
}
