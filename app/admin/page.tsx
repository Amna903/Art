"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/auth");
    else if (role !== "admin") router.push("/dashboard");
  }, [loading, user, role, router]);

  if (loading || !user || role !== "admin") {
    return (
      <main className="min-h-screen px-gutter-page py-16 max-w-container-max mx-auto">
        <p className="text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-gutter-page py-12 max-w-container-max mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-6 mb-10 pb-6 border-b border-primary/10">
        <div>
          <span className="font-label-caps text-label-caps text-secondary uppercase block mb-2">
            — Admin Console
          </span>
          <h1 className="font-display-lg text-display-lg text-primary">Operations</h1>
          <p className="text-on-surface-variant mt-2 max-w-xl">
            Manage members, artworks and the sonic identity of each African nation.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs uppercase tracking-[0.2em] text-on-surface-variant hover:text-secondary"
        >
          ← Back to dashboard
        </Link>
      </header>

      <AdminDashboard />
    </main>
  );
}
