"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { MusicProvider } from "@/lib/music";
import type { Language } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/translate";

export function Providers({
  children,
  language,
  dictionary,
}: {
  children: ReactNode;
  language: Language;
  dictionary: Dictionary;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider language={language} dictionary={dictionary}>
          <AuthProvider>
            <MusicProvider>
              {children}
              <Toaster position="bottom-center" />
            </MusicProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
