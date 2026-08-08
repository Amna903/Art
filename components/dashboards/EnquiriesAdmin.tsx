"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ListRowSkeleton } from "@/components/ui/Skeleton";

type Enquiry = Database["public"]["Tables"]["enquiries"]["Row"];
type EnquiryStatus = Enquiry["status"];

const STATUSES: EnquiryStatus[] = ["new", "contacted", "quoted", "closed"] as EnquiryStatus[];

const FILTERS = ["all", ...STATUSES] as const;
type Filter = (typeof FILTERS)[number];

export function EnquiriesAdmin() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });
    setEnquiries((data as Enquiry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: EnquiryStatus) => {
    await supabase.from("enquiries").update({ status } as never).eq("id", id);
    load();
  };

  const sendQuote = async (enquiry: Enquiry) => {
    const draft = quoteDrafts[enquiry.id];
    const quotedPrice = Number(draft);
    if (!draft || !(quotedPrice > 0)) {
      setFeedback((f) => ({ ...f, [enquiry.id]: "Enter a valid price first." }));
      return;
    }

    setSendingId(enquiry.id);
    setFeedback((f) => ({ ...f, [enquiry.id]: "" }));

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSendingId(null);
      return;
    }

    const res = await fetch("/api/enquiries/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ enquiryId: enquiry.id, quotedPrice }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFeedback((f) => ({ ...f, [enquiry.id]: body.error || "Failed to send quote." }));
    } else {
      setFeedback((f) => ({
        ...f,
        [enquiry.id]: body.emailSent ? "Quote sent." : `Quote saved — ${body.emailNote || "email not sent"}.`,
      }));
      load();
    }
    setSendingId(null);
  };

  if (loading) return <ListRowSkeleton count={3} />;
  if (enquiries.length === 0) return <p className="text-on-surface-variant text-sm">No enquiries yet.</p>;

  const filtered = filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f === "all" ? enquiries.length : enquiries.filter((e) => e.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs uppercase tracking-widest border transition-colors ${
                filter === f
                  ? "bg-primary text-on-primary border-primary"
                  : "border-primary/20 text-on-surface-variant hover:border-primary"
              }`}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-on-surface-variant text-sm">No enquiries match this filter.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((e) => (
            <article key={e.id} className="border border-primary/10 p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary">{e.artwork_title}</h3>
                  {e.artist_name && <p className="text-xs text-on-surface-variant italic">By {e.artist_name}</p>}
                  <p className="text-sm text-on-surface mt-1">
                    {e.name} · <a href={`mailto:${e.email}`} className="text-secondary hover:underline">{e.email}</a>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-on-surface-variant">
                    {new Date(e.created_at).toLocaleDateString()}
                  </span>
                  <select
                    value={e.status}
                    onChange={(ev) => setStatus(e.id, ev.target.value as EnquiryStatus)}
                    className="bg-transparent border border-primary/20 text-xs px-2 py-1 uppercase tracking-widest"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {e.message && (
                <p className="text-sm text-on-surface-variant bg-surface-container-low p-3 whitespace-pre-wrap">
                  {e.message}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-primary/5">
                {e.quoted_price != null && (
                  <span className="text-xs uppercase tracking-widest text-secondary">
                    Quoted: ${Number(e.quoted_price).toLocaleString()}
                  </span>
                )}
                <input
                  type="number"
                  min={1}
                  placeholder="Quote price (USD)"
                  value={quoteDrafts[e.id] ?? ""}
                  onChange={(ev) => setQuoteDrafts((d) => ({ ...d, [e.id]: ev.target.value }))}
                  className="bg-transparent border-b border-primary/30 text-sm px-2 py-1 w-40"
                />
                <button
                  onClick={() => sendQuote(e)}
                  disabled={sendingId === e.id}
                  className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  {sendingId === e.id ? "Sending…" : e.quoted_price != null ? "Resend Quote" : "Send Quote"}
                </button>
                {feedback[e.id] && (
                  <span className="text-xs text-on-surface-variant">{feedback[e.id]}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
