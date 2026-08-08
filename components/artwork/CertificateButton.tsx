"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  artworkTitle: string;
  artistName?: string;
  medium?: string;
  year?: string;
};

/** Deterministic-looking certificate number derived from the artwork's identity. */
function certificateNumber(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h) % 1000000;
  return `NA-${String(n).padStart(6, "0")}`;
}

export function CertificateButton({ artworkTitle, artistName, medium, year }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 group cursor-pointer"
      >
        <span className="material-symbols-outlined text-primary group-hover:text-secondary transition-colors">
          description
        </span>
        <span className="font-label-caps text-label-caps uppercase">Certificate</span>
      </button>
      {open && (
        <CertificateModal
          artworkTitle={artworkTitle}
          artistName={artistName}
          medium={medium}
          year={year}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CertificateModal({
  artworkTitle,
  artistName,
  medium,
  year,
  onClose,
}: Props & { onClose: () => void }) {
  const number = certificateNumber(`${artworkTitle}-${artistName ?? ""}`);
  const issued = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md print:bg-white print:p-0"
      onClick={onClose}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .certificate-print, .certificate-print * { visibility: visible; }
          .certificate-print { position: fixed; inset: 0; margin: auto; }
        }
      `}</style>
      <div
        className="certificate-print w-full max-w-lg bg-[#f4efe6] text-[#141110] border-4 border-double border-[#38302c] shadow-2xl relative p-8 sm:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#141110]/5 hover:bg-[#141110]/10 flex items-center justify-center transition-all print:hidden"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-3xl text-[#b85d38]">verified_user</span>
          <h3 className="font-serif text-2xl mt-2 mb-1 tracking-wide">Certificate of Authenticity</h3>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#665e57]">NU-ART Collective</p>
        </div>

        <div className="border-t border-b border-[#38302c]/30 py-6 space-y-4 text-sm">
          <Row label="Title" value={artworkTitle} emphasis />
          {artistName && <Row label="Artist" value={artistName} />}
          {medium && <Row label="Medium" value={medium} />}
          {year && <Row label="Year" value={year} />}
          <Row label="Edition" value="Unique piece (1 of 1)" />
          <Row label="Certificate No." value={number} />
          <Row label="Issued" value={issued} />
        </div>

        <p className="text-xs text-[#665e57] leading-relaxed mt-6 text-center">
          This certifies that the above work has been authenticated by NU-ART&rsquo;s curatorial team and is sold
          with full provenance documentation.
        </p>

        <button
          onClick={() => window.print()}
          className="w-full mt-8 bg-[#141110] text-[#f4efe6] font-mono text-xs uppercase tracking-widest py-3.5 px-6 font-semibold hover:bg-[#2a2421] transition-colors flex items-center justify-center gap-2 print:hidden"
        >
          <span className="material-symbols-outlined text-sm">print</span>
          Print / Save as PDF
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#665e57] shrink-0">{label}</span>
      <span className={emphasis ? "font-serif text-base text-right" : "text-right"}>{value}</span>
    </div>
  );
}
