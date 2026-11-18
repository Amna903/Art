"use client";

import { useEffect, useState } from "react";
import Link from "@/components/i18n/Link";
import { useLanguage } from "@/lib/i18n";

const KEY = "nua_cookie_notice";

/**
 * Cookie notice (correction plan P0.1). The site only uses essential and
 * functional storage today (sign-in, theme, language, guest saved works), so
 * this informs rather than asks. If analytics or marketing pixels are added,
 * replace it with an accept/reject banner and load those scripts only after
 * consent.
 */
export function CookieNotice() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {}
    // Shown after mount so server and client HTML match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!seen) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label={t("Cookie notice")}
      className="fixed bottom-0 inset-x-0 z-40 border-t border-outline/20 bg-background/95 backdrop-blur"
    >
      <div className="max-w-container-max mx-auto px-gutter-page py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-sm">
        <p className="text-on-surface-variant">
          {t("We use essential cookies and browser storage to keep you signed in and remember your preferences. We don't use advertising or tracking cookies.")}{" "}
          <Link href="/cookies" className="underline hover:text-secondary">{t("Cookie Policy")}</Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 self-start sm:self-auto border border-primary/30 px-5 py-2 font-navigation text-navigation uppercase tracking-widest hover:border-secondary hover:text-secondary"
        >
          {t("OK")}
        </button>
      </div>
    </div>
  );
}
