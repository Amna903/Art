import { unstable_cache } from "next/cache";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

/** Total recorded visits (see VisitCounter); 0 until the migration runs. */
export const getSiteVisits = unstable_cache(
  async (): Promise<number> => {
    if (!isSupabaseConfigured()) return 0;
    const { data, error } = await supabase.from("site_stats").select("value").eq("key", "visits").maybeSingle();
    if (error) return 0;
    return Number(data?.value ?? 0);
  },
  ["site-visits"],
  { revalidate: 300 },
);
