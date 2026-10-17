"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { submitEnquiry } from "@/lib/data/enquiries";
import { richText } from "@/lib/i18n/rich";
import { useLanguage } from "@/lib/i18n";

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
  const { t } = useLanguage();
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
        className="w-full max-w-lg bg-[#111111] text-[#F0F0EE] border border-[#333333] shadow-2xl relative overflow-hidden rounded-none my-auto transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#D7141E] via-[#FF4D57] to-[#D7141E]" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label={t("Close modal")}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#1A1A1A] text-[#B8B8B8] hover:text-[#F0F0EE] hover:bg-[#262626] border border-[#333333] flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div className="p-6 sm:p-8">
          {sent ? (
            <div className="py-8 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-[#1F1F1F] border border-[#333333] text-[#FF4D57] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest text-[#FF4D57] uppercase block mb-2">
                {t("Inquiry Dispatched")}
              </span>
              <h3 className="font-serif text-2xl mb-3 text-[#F0F0EE]">{t("Curatorial Request Sent")}</h3>
              <p className="text-[#B8B8B8] text-sm leading-relaxed max-w-md mx-auto mb-8">
                {richText(
                  t(
                    "Thank you, {name}. A member of our Senior Curatorial Team has received your inquiry for “{title}” and will respond directly to {email} within 24 business hours with pricing, provenance, and private acquisition details.",
                  ),
                  {
                    name: <strong className="text-[#F0F0EE] font-medium">{name}</strong>,
                    title: <span className="italic text-[#F0F0EE]">{artworkTitle}</span>,
                    email: <span className="text-[#FF4D57] underline">{email}</span>,
                  },
                )}
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-[#FF4D57] text-[#111111] font-mono text-xs uppercase tracking-widest py-3.5 px-6 font-semibold hover:bg-[#F0F0EE] transition-colors"
              >
                {t("Return to Gallery")}
              </button>
            </div>
          ) : (
            <>
              {/* Clean Single Modal Header */}
              <div className="mb-6 border-b border-[#262626] pb-5">
                <span className="text-[9px] font-mono tracking-widest text-[#FF4D57] uppercase font-semibold block mb-1">
                  {t("Private Curatorial Advisory")}
                </span>
                <h3 className="font-serif text-2xl font-medium text-[#F0F0EE] leading-tight mb-1">
                  {artworkTitle}
                </h3>
                {artistName && (
                  <p className="text-xs text-[#B8B8B8] italic">
                    {t("By")} {artistName}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-[#F0F0EE] mb-1">
                  {t("Request Pricing & Provenance")}
                </h4>
                <p className="text-xs text-[#B8B8B8] leading-relaxed">
                  {t("Provide your contact details below to receive current availability, pricing guide, and shipping options.")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-[#B8B8B8] mb-1.5">
                      {t("Full Name")} <span className="text-[#FF4D57]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={t("e.g. Eleanor Vance")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#333333] px-3.5 py-2.5 text-sm text-[#F0F0EE] placeholder-[#5C5C5C] focus:outline-none focus:border-[#FF4D57] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-[#B8B8B8] mb-1.5">
                      {t("Email Address")} <span className="text-[#FF4D57]">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      placeholder={t("e.g. collector@domain.com")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#333333] px-3.5 py-2.5 text-sm text-[#F0F0EE] placeholder-[#5C5C5C] focus:outline-none focus:border-[#FF4D57] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-[#B8B8B8] mb-1.5">
                    {t("Phone / WhatsApp")} <span className="text-[#5C5C5C]">{t("(Optional)")}</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#333333] px-3.5 py-2.5 text-sm text-[#F0F0EE] placeholder-[#5C5C5C] focus:outline-none focus:border-[#FF4D57] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-[#B8B8B8] mb-1.5">
                    {t("Message / Special Requirements")} <span className="text-[#5C5C5C]">{t("(Optional)")}</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder={t("Mention any specific questions regarding framing, global insured transport, or presentation...")}
                    className="w-full bg-[#1A1A1A] border border-[#333333] px-3.5 py-2.5 text-sm text-[#F0F0EE] placeholder-[#5C5C5C] focus:outline-none focus:border-[#FF4D57] transition-colors resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-[#1A1A1A] border border-[#B0000E] text-[#FF4D57] text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  disabled={busy}
                  type="submit"
                  className="w-full bg-[#FF4D57] text-[#111111] font-mono text-xs uppercase tracking-widest py-3.5 px-6 font-semibold hover:bg-[#F0F0EE] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                      <span>{t("Dispatching Request...")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("Submit Pricing Inquiry")}</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-[#8C8C8C]">
                  <span className="material-symbols-outlined text-xs text-[#FF4D57]">lock</span>
                  <span>{t("Direct & Private Communication • Guaranteed Response within 24h")}</span>
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
