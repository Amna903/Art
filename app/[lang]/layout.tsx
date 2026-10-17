import type { Metadata } from "next";
import "../globals.css";
import { Providers } from "./providers";
import { VisitCounter } from "@/components/layout/VisitCounter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { themeInitScript } from "@/lib/theme";
import { ENABLED_LOCALES, isPreviewLocale } from "@/lib/i18n/config";
import { getDictionary, getT, resolveLang } from "@/lib/i18n/server";

export function generateStaticParams() {
  return ENABLED_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const lang = resolveLang((await params).lang);
  const t = await getT(lang);
  return {
    title: t("NUA-ARTE | Contemporary African Art Movement"),
    description: t(
      "NUA-ARTE — a curated platform dedicated to contemporary African artists. Each country, each culture, each story — collected with intent.",
    ),
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

  return (
    <html lang={lang} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Allura&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers language={lang} dictionary={dictionary}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <VisitCounter />
        </Providers>
      </body>
    </html>
  );
}
