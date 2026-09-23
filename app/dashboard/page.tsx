"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { ArtistDashboard } from "@/components/dashboards/ArtistDashboard";
import { ClientDashboard } from "@/components/dashboards/ClientDashboard";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { CardGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
  }, [user]);

  if (loading || !user) {
    return (
      <main className="min-h-screen px-gutter-page py-16 max-w-container-max mx-auto">
        <Skeleton className="h-3 w-40 mb-4" />
        <Skeleton className="h-10 w-1/2 mb-16" />
        <CardGridSkeleton count={6} columns="2-3" aspect="aspect-[4/5]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen px-gutter-page py-12 max-w-container-max mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-6 mb-12 pb-6 border-b border-primary/10">
        <div>
          <span className="font-label-caps text-label-caps text-secondary uppercase block mb-2">
            {role === "admin" ? "Operations" : role === "artist" ? "Studio" : "Collector"}
          </span>
          <h1 className="font-display-lg text-display-lg text-primary">
            Karibu, {displayName || user.email?.split("@")[0]}.
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Signed in as <span className="text-primary">{user.email}</span>
            {role && (
              <>
                {" "}
                · role <span className="text-secondary uppercase tracking-widest font-bold">{role === "client" ? "buyer" : role}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="border border-primary/20 px-4 py-2 text-xs uppercase tracking-[0.2em] hover:border-secondary transition-colors"
          >
            View site
          </Link>
          <button
            onClick={() => signOut().then(() => router.push("/"))}
            className="bg-primary text-on-primary px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-secondary transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {role === "artist" && <ArtistDashboard userId={user.id} />}
      {role === "client" && <ClientDashboard userId={user.id} />}
      {role === "admin" && <AdminDashboard />}
      {!role && (
        <div className="py-12 text-center border border-primary/10 rounded-2xl p-8 bg-surface-container-low">
          <p className="text-on-surface-variant">Your account role has not been assigned. Please contact the gallery team for assistance.</p>
        </div>
      )}
    </main>
  );
}
