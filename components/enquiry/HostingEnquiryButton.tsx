"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { EnquiryModal } from "@/components/enquiry/EnquiryModal";

/** "Enquire about hosting" for venues: opens the standard enquiry form,
 * filed under a hosting subject instead of an artwork. */
export function HostingEnquiryButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary inline-flex min-h-[48px] items-center px-8 text-base">
        {t("Enquire about hosting")}
      </button>
      <EnquiryModal
        open={open}
        onClose={() => setOpen(false)}
        artworkSlug="hosting-unseen-unheard"
        artworkTitle="Hosting enquiry: Unseen, Unheard"
      />
    </>
  );
}
