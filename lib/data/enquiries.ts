export type EnquiryInput = {
  artworkSlug: string;
  artworkTitle: string;
  artistName?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
};

export async function submitEnquiry(input: EnquiryInput): Promise<{ error?: string; success?: boolean }> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { error: data.error || "Failed to submit enquiry. Please try again." };
    }

    return { success: true };
  } catch (err: any) {
    console.error("submitEnquiry error:", err);
    return { error: err?.message || "Network error. Please try again." };
  }
}
