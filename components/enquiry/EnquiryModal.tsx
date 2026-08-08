"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { submitEnquiry } from "@/lib/data/enquiries";

type Props = {
  open: boolean;
  onClose: () => void;
  artworkSlug: string;
  artworkTitle: string;
  artistName?: string;
  artworkImage?: string;
};

export function EnquiryModal({
  open,
  onClose,
  artworkSlug,
  artworkTitle,
  artistName,
  artworkImage,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !mounted) return null;

  const reset = () => {
    setSent(false);
    setError(null);
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await submitEnquiry({
      artworkSlug,
      artworkTitle,
      artistName,
      name,
      email,
      phone: phone.trim() || undefined,
      message: message.trim() || undefined,
    });

    setBusy(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSent(true);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md transition-opacity duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-[#141110] text-[#f4efe6] border border-[#38302c] shadow-2xl relative overflow-hidden rounded-none my-auto transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#b85d38] via-[#e58a64] to-[#b85d38]" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#1c1816] text-[#b5a999] hover:text-[#f4efe6] hover:bg-[#2a2421] border border-[#38302c] flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div className="p-6 sm:p-8">
          {sent ? (
            <div className="py-8 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-[#2d1b14] border border-[#522b1f] text-[#e58a64] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest text-[#e58a64] uppercase block mb-2">
                Inquiry Dispatched
              </span>
              <h3 className="font-serif text-2xl mb-3 text-[#f4efe6]">Curatorial Request Sent</h3>
              <p className="text-[#b5a999] text-sm leading-relaxed max-w-md mx-auto mb-8">
                Thank you, <strong className="text-[#f4efe6] font-medium">{name}</strong>. A member of our Senior Curatorial Team has received your inquiry for &ldquo;<span className="italic text-[#f4efe6]">{artworkTitle}</span>&rdquo; and will respond directly to <span className="text-[#e58a64] underline">{email}</span> within 24 business hours with pricing, provenance, and private acquisition details.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-[#e58a64] text-[#141110] font-mono text-xs uppercase tracking-widest py-3.5 px-6 font-semibold hover:bg-[#f4efe6] transition-colors"
              >
                Return to Gallery
              </button>
            </div>
          ) : (
            <>
              {/* Clean Single Modal Header */}
              <div className="mb-6 border-b border-[#2a2421] pb-5">
                <span className="text-[9px] font-mono tracking-widest text-[#e58a64] uppercase font-semibold block mb-1">
                  Private Curatorial Advisory
                </span>
                <h3 className="font-serif text-2xl font-medium text-[#f4efe6] leading-tight mb-1">
                  {artworkTitle}
                </h3>
                {artistName && (
                  <p className="text-xs text-[#b5a999] italic">
                    By {artistName}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-[#f4efe6] mb-1">
                  Request Pricing & Provenance
                </h4>
                <p className="text-xs text-[#b5a999] leading-relaxed">
                  Provide your contact details below to receive current availability, pricing guide, and shipping options.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-[#b5a999] mb-1.5">
                      Full Name <span className="text-[#e58a64]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Eleanor Vance"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1c1816] border border-[#38302c] px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder-[#665e57] focus:outline-none focus:border-[#e58a64] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-[#b5a999] mb-1.5">
                      Email Address <span className="text-[#e58a64]">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. collector@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#1c1816] border border-[#38302c] px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder-[#665e57] focus:outline-none focus:border-[#e58a64] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-[#b5a999] mb-1.5">
                    Phone / WhatsApp <span className="text-[#665e57]">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#1c1816] border border-[#38302c] px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder-[#665e57] focus:outline-none focus:border-[#e58a64] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-[#b5a999] mb-1.5">
                    Message / Special Requirements <span className="text-[#665e57]">(Optional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Mention any specific questions regarding framing, global insured transport, or presentation..."
                    className="w-full bg-[#1c1816] border border-[#38302c] px-3.5 py-2.5 text-sm text-[#f4efe6] placeholder-[#665e57] focus:outline-none focus:border-[#e58a64] transition-colors resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-[#2d1414] border border-[#521f1f] text-[#e56464] text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  disabled={busy}
                  type="submit"
                  className="w-full bg-[#e58a64] text-[#141110] font-mono text-xs uppercase tracking-widest py-3.5 px-6 font-semibold hover:bg-[#f4efe6] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#141110] border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Pricing Inquiry</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-[#8c827a]">
                  <span className="material-symbols-outlined text-xs text-[#e58a64]">lock</span>
                  <span>Direct & Private Communication • Guaranteed Response within 24h</span>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
