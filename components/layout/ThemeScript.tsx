"use client";

import { themeInitScript } from "@/lib/theme";

/**
 * Sets the light/dark class before first paint. The server sends it as a
 * normal script, so it runs while the HTML loads. When React renders the root
 * layout in the browser (client navigation, dev refresh), the tag gets
 * type="text/plain": a data block React doesn't warn about and the browser
 * won't run again. suppressHydrationWarning covers the server/client type difference.
 */
export function ThemeScript() {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === "undefined" ? undefined : "text/plain"}
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}
