"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLanguage } from "@/lib/i18n";

/** Drop-in for next/link that keeps internal links in the current language
 * ("/artists" → "/pt/artists" on Portuguese pages). */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { localize } = useLanguage();
  const localized =
    typeof href === "string"
      ? localize(href)
      : href.pathname
        ? { ...href, pathname: localize(href.pathname) }
        : href;
  return <NextLink href={localized} {...props} />;
}
