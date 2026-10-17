import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isEnabledLocale, isLocale, splitLocale } from "@/lib/i18n/config";

/**
 * Locale routing. Every page lives under app/[lang]; English is served
 * unprefixed, so:
 *   /artists      → rewritten to /en/artists (URL stays /artists)
 *   /en/artists   → redirected to /artists (one canonical English URL)
 *   /pt/artists   → served as-is
 * A visitor who picked another language in the switcher (LOCALE_COOKIE) is
 * sent from an unprefixed URL to the same page in that language. Languages
 * that aren't enabled on this deployment (see REVIEWED in lib/i18n/config.ts)
 * redirect to English.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const prefix = pathname.match(/^\/([a-z]{2})(?=\/|$)/)?.[1];

  if (prefix && isLocale(prefix)) {
    const { path } = splitLocale(pathname);
    if (prefix === DEFAULT_LOCALE || !isEnabledLocale(prefix)) {
      const url = request.nextUrl.clone();
      url.pathname = path;
      return NextResponse.redirect(url, prefix === DEFAULT_LOCALE ? 308 : 307);
    }
    return NextResponse.next();
  }

  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(remembered) && remembered !== DEFAULT_LOCALE && isEnabledLocale(remembered)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${remembered}` : `/${remembered}${pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals and anything that looks like a file
  // (favicon.ico, icon.png, /images/…/x.jpg, sounds, models).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
