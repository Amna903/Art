"use client";

import { useState } from "react";

const LINK_CLASS = "text-left font-body-md text-body-md hover:text-secondary underline decoration-1 underline-offset-4";

export function ShareLinks({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const currentUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  const shareTwitter = () => {
    const intent = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl())}&text=${encodeURIComponent(title)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  // Instagram has no web share intent — copy the link and tell people where to paste it,
  // which is the common real-world workaround for "sharing to Instagram" from a website.
  const shareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      alert("Link copied — paste it into your Instagram bio or story.");
    } catch {
      alert(currentUrl());
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(currentUrl());
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={shareTwitter} className={LINK_CLASS}>
        X (Twitter)
      </button>
      <button onClick={shareInstagram} className={LINK_CLASS}>
        Instagram
      </button>
      <button onClick={copyLink} className={LINK_CLASS}>
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
