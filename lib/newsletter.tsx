"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

type Status = "idle" | "busy" | "done" | "error";

/** Shared sign-up logic for every newsletter form; each form keeps its own look. */
export function useNewsletter(source: string) {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "busy") return;
    setStatus("busy");
    setError(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not sign you up. Please try again.");
      setStatus("done");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not sign you up. Please try again.");
    }
  };

  return { email, setEmail, status, error, onSubmit };
}

/** One-line result under a newsletter form, in the form's own text colour. */
export function NewsletterStatus({ status, error }: { status: Status; error: string | null }) {
  const { t } = useLanguage();
  if (status !== "done" && status !== "error") return null;
  return (
    <p role="status" className="mt-3 text-sm">
      {status === "done" ? t("Thank you — you're on the list.") : t(error ?? "Could not sign you up. Please try again.")}
    </p>
  );
}
