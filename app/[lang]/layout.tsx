import type { Metadata } from "next";
import { Allura, Cormorant_Garamond, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import { Providers } from "./providers";
import { VisitCounter } from "@/components/layout/VisitCounter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { ENABLED_LOCALES, isPreviewLocale } from "@/lib/i18n/config";
import { getDictionary, getT, resolveLang } from "@/lib/i18n/server";
import { SITE_URL } from "@/lib/site";

// Brand fonts, self-hosted by next/font instead of a render-blocking Google
// Fonts stylesheet. Same families and weights as before; the fallback-metric
// adjustment is off so text looks exactly as it did while fonts load.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-cormorant",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-montserrat",
});
const allura = Allura({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-allura",
});

// Material Symbols, self-hosted: the exact subset Google Fonts served for
// this site (only the icons it uses; FILL 0/1, weight 300–400, GRAD 0, every
// optical size), ~47 KB. To add an icon, re-download the subset from
// fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..400,0..1,0&icon_names=...
// with the new name added, and replace app/fonts/material-symbols-outlined.woff2.
const materialSymbols = localFont({
  src: "../fonts/material-symbols-outlined.woff2",
  weight: "300 400",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-material-symbols",
});

export function generateStaticParams() {
  return ENABLED_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const t = await getT(lang);
  const title = t("NUA-ARTE | Contemporary African Art Movement");
  const description = t(
    "NUA-ARTE — a curated platform dedicated to contemporary African artists. Each country, each culture, each story — collected with intent.",
  );
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    // Share cards; the image comes from opengraph-image.tsx unless a page sets its own.
    openGraph: { type: "website", siteName: "NUA-ARTE", title, description, locale: lang },
    twitter: { card: "summary_large_image", title, description },
    // Languages still waiting on native-speaker review stay out of search.
    robots: isPreviewLocale(lang) ? { index: false, follow: false } : undefined,
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/icon.png", type: "image/png" },
      ],
      apple: [
        { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = resolveLang((await params).lang);
  const dictionary = await getDictionary(lang);
  const t = await getT(lang);

  return (
    <html
      lang={lang}
      className={`h-full antialiased ${cormorant.variable} ${montserrat.variable} ${allura.variable} ${materialSymbols.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers language={lang} dictionary={dictionary}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-background focus:text-primary focus:px-4 focus:py-2 focus:border focus:border-secondary"
          >
            {t("Skip to content")}
          </a>
          <SiteHeader />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
          <SiteFooter />
          <VisitCounter />
          <CookieNotice />
        </Providers>
      </body>
    </html>
  );
}
