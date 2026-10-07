"use client";

import { useState } from "react";

const LINK_CLASS = "text-left font-body-md text-body-md hover:text-secondary underline decoration-1 underline-offset-4";

export function ShareLinks() {
  const [copied, setCopied] = useState(false);

  const currentUrl = () => (typeof window !== "undefined" ? window.location.href : "");

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
      <a
        href="https://www.instagram.com/nuaarteofficial/"
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        Instagram
      </a>
      <button onClick={copyLink} className={LINK_CLASS}>
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
