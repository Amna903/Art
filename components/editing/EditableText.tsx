"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { pingRevalidate } from "@/lib/utils/revalidate";

type Tag = "p" | "h1" | "h2" | "h3" | "span" | "blockquote" | "cite" | "div";

export function EditableText({
  page,
  blockKey,
  value,
  as: Tag = "span",
  className,
  multiline = true,
}: {
  page: string;
  blockKey: string;
  value: string;
  as?: Tag;
  className?: string;
  multiline?: boolean;
}) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!isAdmin) {
    return <Tag className={className}>{value}</Tag>;
  }

  const save = async () => {
    setSaving(true);
    await supabase
      .from("page_blocks")
      .upsert({ page, block_key: blockKey, value: draft }, { onConflict: "page,block_key" });
    await pingRevalidate("page-blocks", { page });
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  if (editing) {
    return (
      <span className="relative block w-full my-1">
        {multiline ? (
          <textarea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className={`${className ?? ""} w-full bg-secondary/5 border border-secondary outline-none resize-y p-2`}
          />
        ) : (
          <input
            ref={ref as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={`${className ?? ""} w-full bg-secondary/5 border border-secondary outline-none p-2`}
          />
        )}
        <span className="flex gap-2 mt-1">
          <button
            onClick={save}
            disabled={saving}
            className="text-[10px] uppercase tracking-widest bg-secondary text-on-primary px-2 py-1 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="text-[10px] uppercase tracking-widest border border-primary/20 px-2 py-1"
          >
            Cancel
          </button>
        </span>
      </span>
    );
  }

  return (
    <span className="relative group/edit block w-full">
      <Tag className={className}>{value}</Tag>
      <button
        onClick={() => setEditing(true)}
        title="Edit"
        className="absolute top-1 right-1 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-secondary text-on-primary w-6 h-6 flex items-center justify-center text-xs rounded-full shadow-lg z-[60]"
      >
        ✎
      </button>
    </span>
  );
}
