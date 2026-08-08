"use client";

import { useState } from "react";
import { EnquiryModal } from "./EnquiryModal";

type Props = {
  artworkSlug: string;
  artworkTitle: string;
  artistName?: string;
  artworkImage?: string;
  className?: string;
  children?: React.ReactNode;
};

export function RequestPriceButton({
  artworkSlug,
  artworkTitle,
  artistName,
  artworkImage,
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "bg-primary text-on-primary font-navigation text-navigation uppercase tracking-widest py-4 px-8 hover:bg-secondary transition-colors duration-300"
        }
      >
        {children ?? "Request Price"}
      </button>
      <EnquiryModal
        open={open}
        onClose={() => setOpen(false)}
        artworkSlug={artworkSlug}
        artworkTitle={artworkTitle}
        artistName={artistName}
        artworkImage={artworkImage}
      />
    </>
  );
}
