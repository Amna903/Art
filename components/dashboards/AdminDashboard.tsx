"use client";

import { useRouter, useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { pingRevalidate } from "@/lib/utils/revalidate";
import { EnquiriesAdmin } from "./EnquiriesAdmin";
import { CollectionsAdmin } from "./CollectionsAdmin";
import { CountrySoundsAdmin } from "./CountrySoundsAdmin";
import { GalleryMusicAdmin } from "./GalleryMusicAdmin";
import { HeroImagesAdmin } from "./HeroImagesAdmin";
import { ManagedArtistsAdmin } from "./ManagedArtistsAdmin";
import { QrCodeButton, QR_CODES_ENABLED } from "./QrCodeButton";
import { OriginalityReviewAdmin } from "./OriginalityReviewAdmin";
import { ListRowSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";

type AppRole = Database["public"]["Enums"]["app_role"];

type ProfileRow = {
  id: string;
  display_name: string;
  country: string | null;
  created_at: string;
  user_roles: { role: AppRole }[];
};

type Artwork = Database["public"]["Tables"]["artworks"]["Row"];

export function AdminDashboard() {
  const { t, formatShortDate, formatUsd } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    | "users"
    | "artworks"
    | "collections"
    | "enquiries"
    | "country sounds"
    | "gallery music"
    | "hero images"
    | "represented artists"
    | "originality"
  >("represented artists");

  const load = async () => {
    setLoading(true);
    // profiles.id and user_roles.user_id both reference auth.users independently —
    // there's no FK directly between profiles and user_roles, so PostgREST can't
    // auto-embed them in one query (same limitation as lib/data/supabase-artists.ts).
    // Fetch both and join in JS instead.
    const [pRes, rRes, aRes, eRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, country, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("artworks").select("*").order("created_at", { ascending: false }),
      supabase.from("enquiries").select("id", { count: "exact", head: true }),
    ]);
    if (pRes.error) console.error("[Supabase] Failed to fetch profiles:", pRes.error.message);
    if (rRes.error) console.error("[Supabase] Failed to fetch user_roles:", rRes.error.message);

    const rolesByUser = new Map<string, AppRole[]>();
    (rRes.data ?? []).forEach((r) => {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    });
    const profilesWithRoles: ProfileRow[] = (pRes.data ?? []).map((p) => ({
      ...p,
      user_roles: (rolesByUser.get(p.id) ?? []).map((role) => ({ role })),
    }));
    setProfiles(profilesWithRoles);
    setArtworks(aRes.data ?? []);
    setEnquiryCount(eRes.count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grantRole = async (userId: string, role: AppRole) => {
    await supabase.from("user_roles").insert({ user_id: userId, role });
    load();
  };
  const revokeRole = async (userId: string, role: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    load();
  };

  const deleteUser = async (userId: string, displayName: string) => {
    if (!confirm(t("Permanently delete {value}? This cannot be undone.", { value: displayName || "this user" }))) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ? t(body.error) : t("Failed to delete user."));
      return;
    }
    load();
  };

  const setArtworkStatus = async (id: string, status: Artwork["status"]) => {
    await supabase.from("artworks").update({ status }).eq("id", id);
    await load();
    await pingRevalidate("artworks");
    router.refresh();
  };


  return (
    <div className="space-y-12">
      <section className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <Stat label={t("Members")} value={profiles.length} />
        <Stat label={t("Artworks")} value={artworks.length} />
        <Stat label={t("Enquiries")} value={enquiryCount} />
      </section>

      <nav className="flex gap-8 border-b border-primary/10 overflow-x-auto">
        {(
          [
            "represented artists",
            "originality",
            "users",
            "artworks",
            "collections",
            "enquiries",
            "hero images",
            "gallery music",
            "country sounds",
          ] as const
        ).map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={
              "py-3 text-xs uppercase tracking-[0.2em] whitespace-nowrap " +
              (tab === name ? "text-secondary border-b border-secondary -mb-px" : "text-on-surface-variant")
            }
          >
            {t(name)}
          </button>
        ))}
      </nav>

      {tab === "represented artists" ? (
        user ? <ManagedArtistsAdmin adminId={user.id} /> : null
      ) : tab === "originality" ? (
        <OriginalityReviewAdmin />
      ) : loading ? (
        <ListRowSkeleton count={4} />
      ) : tab === "users" ? (
        <section>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-on-surface-variant">
              <tr className="border-b border-primary/10">
                <th className="text-left py-3">{t("Member")}</th>
                <th className="text-left py-3">{t("Country")}</th>
                <th className="text-left py-3">{t("Roles")}</th>
                <th className="text-left py-3">{t("Joined")}</th>
                <th className="text-right py-3">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const roles = p.user_roles?.map((r) => r.role) ?? [];
                return (
                  <tr key={p.id} className="border-b border-primary/5">
                    <td className="py-3 text-primary">{p.display_name || "—"}</td>
                    <td className="py-3 text-on-surface-variant">{p.country ?? "—"}</td>
                    <td className="py-3">
                      <div className="flex gap-2 flex-wrap">
                        {roles.map((r) => (
                          <button
                            key={r}
                            onClick={() => revokeRole(p.id, r)}
                            className="text-[10px] uppercase tracking-widest px-2 py-1 border border-secondary/40 text-secondary hover:bg-secondary/10"
                            title={t("Click to revoke")}
                          >
                            {r} ✕
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-on-surface-variant">{formatShortDate(p.created_at)}</td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {(["admin", "artist", "client"] as AppRole[])
                          .filter((r) => !roles.includes(r))
                          .filter((r) => r === "admin" || !roles.some((assigned) => assigned === "artist" || assigned === "client"))
                          .map((r) => (
                            <button
                              key={r}
                              onClick={() => grantRole(p.id, r)}
                              className="text-[10px] uppercase tracking-widest px-2 py-1 border border-primary/20 hover:border-primary"
                            >
                              + {r}
                            </button>
                          ))}
                        <button
                          onClick={() => deleteUser(p.id, p.display_name)}
                          className="text-[10px] uppercase tracking-widest px-2 py-1 border border-secondary text-secondary hover:bg-secondary hover:text-on-primary"
                        >
                          {t("Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : tab === "artworks" ? (
        <section>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-on-surface-variant">
              <tr className="border-b border-primary/10">
                <th className="text-left py-3">{t("Title")}</th>
                <th className="text-left py-3">{t("Country")}</th>
                <th className="text-left py-3">{t("Price")}</th>
                <th className="text-left py-3">{t("Status")}</th>
                {QR_CODES_ENABLED && <th className="text-left py-3">{t("QR code")}</th>}
                <th className="text-right py-3">{t("Moderation")}</th>
              </tr>
            </thead>
            <tbody>
              {artworks.map((a) => (
                <tr key={a.id} className="border-b border-primary/5">
                  <td className="py-3 text-primary">{a.title}</td>
                  <td className="py-3 text-on-surface-variant">{a.country ?? "—"}</td>
                  <td className="py-3 text-on-surface-variant">
                    {Number(a.price_usd) > 0 ? formatUsd(Number(a.price_usd)) : "—"}
                  </td>
                  <td className="py-3 uppercase tracking-widest text-xs text-secondary">{a.status}</td>
                  {QR_CODES_ENABLED && (
                    <td className="py-3">
                      <QrCodeButton id={a.id} name={a.title} />
                    </td>
                  )}
                  <td className="py-3 text-right">
                    <select
                      value={a.status}
                      onChange={(e) => setArtworkStatus(a.id, e.target.value as Artwork["status"])}
                      className="bg-transparent border border-primary/20 text-xs px-2 py-1"
                    >
                      <option value="draft">{t("Draft")}</option>
                      <option value="pending_review">{t("Pending review")}</option>
                      <option value="blocked">{t("Blocked")}</option>
                      <option value="published">{t("Published")}</option>
                      <option value="sold">{t("Sold")}</option>
                      <option value="archived">{t("Archived")}</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : tab === "collections" ? (
        <CollectionsAdmin />
      ) : tab === "enquiries" ? (
        <EnquiriesAdmin />
      ) : tab === "hero images" ? (
        <HeroImagesAdmin />
      ) : tab === "gallery music" ? (
        <GalleryMusicAdmin />
      ) : (
        <CountrySoundsAdmin />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-primary/10 p-5">
      <div className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="font-display-sm text-display-sm text-primary mt-2">{value}</div>
    </div>
  );
}
