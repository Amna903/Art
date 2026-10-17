"use client";

import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const KEY = "nua-visit-counted";

/** Counts one visit per browser session for "Visits worldwide". Automated
 * browsers (navigator.webdriver) are skipped. Renders nothing. */
export function VisitCounter() {
  useEffect(() => {
    if (!isSupabaseConfigured() || navigator.webdriver) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      return; // storage blocked: don't risk counting every page view
    }
    void supabase.rpc("record_site_visit");
  }, []);
  return null;
}
