"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type Props = {
  artworkTitle: string;
  artistName?: string;
};

export function ShareButton({ artworkTitle, artistName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 group cursor-pointer"
      >
        <span className="material-symbols-outlined text-primary group-hover:text-secondary transition-colors">
          share
        </span>
        <span className="font-label-caps text-label-caps uppercase">Share</span>
      </button>
      {open && <ShareModal artworkTitle={artworkTitle} artistName={artistName} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareModal({
  artworkTitle,
  artistName,
  onClose,
}: {
  artworkTitle: string;
  artistName?: string;
  onClose: () => void;
}) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const shareText = artistName ? `${artworkTitle} by ${artistName} — NU-ART` : `${artworkTitle} — NU-ART`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied to clipboard");
    } catch {
      toast("Couldn't copy the link");
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareText, url });
      } catch {
        // user cancelled the native share sheet — no-op
      }
    }
  };

  const links = [
    {
      label: "X / Twitter",
      icon: "tag",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "Facebook",
      icon: "public",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "Pinterest",
      icon: "push_pin",
      href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(shareText)}`,
    },
    {
      label: "Email",
      icon: "mail",
      href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(url)}`,
    },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#141110] text-[#f4efe6] border border-[#38302c] shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#b85d38] via-[#e58a64] to-[#b85d38]" />
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#1c1816] text-[#b5a999] hover:text-[#f4efe6] hover:bg-[#2a2421] border border-[#38302c] flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div className="p-6 sm:p-8">
          <span className="text-[9px] font-mono tracking-widest text-[#e58a64] uppercase font-semibold block mb-1">
            Share
          </span>
          <h3 className="font-serif text-xl font-medium text-[#f4efe6] leading-tight mb-6">{artworkTitle}</h3>

          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 bg-[#1c1816] border border-[#38302c] hover:border-[#e58a64] transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-[#e58a64] text-lg">link</span>
            Copy link
          </button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={nativeShare}
              className="w-full flex items-center gap-3 px-4 py-3 mb-2 bg-[#1c1816] border border-[#38302c] hover:border-[#e58a64] transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-[#e58a64] text-lg">ios_share</span>
              More options
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-[#1c1816] border border-[#38302c] hover:border-[#e58a64] transition-colors text-xs"
              >
                <span className="material-symbols-outlined text-[#e58a64] text-base">{l.icon}</span>
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
