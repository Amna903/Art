"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type AppRole = "admin" | "artist" | "client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: (role?: AppRole) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, role: AppRole, displayName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string | undefined, currentUser?: User | null) => {
    if (!uid) {
      setRole(null);
      return;
    }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (!data || data.length === 0) {
      const targetUser = currentUser ?? user;
      const metaRole = (targetUser?.user_metadata?.role as AppRole) ?? null;
      if (metaRole && (metaRole === "artist" || metaRole === "client")) {
        const { error: rpcErr } = await supabase.rpc("set_my_role", { p_role: metaRole });
        if (!rpcErr) {
          setRole(metaRole);
          return;
        }
      }
    }
    if (!data || data.length === 0) {
      setRole(null);
      return;
    }
    const priority: AppRole[] = ["admin", "artist", "client"];
    const found = priority.find((r) => data.some((d) => d.role === r)) ?? null;
    setRole(found);
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => loadRole(s?.user?.id, s?.user), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadRole(data.session?.user?.id, data.session?.user).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      role,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message };
      },
      signInWithGoogle: async (signupRole?: AppRole) => {
        const redirectUrl = `${window.location.origin}/dashboard${signupRole ? `?signup_role=${signupRole}` : ""}`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            queryParams: signupRole ? { role: signupRole } : undefined,
          },
        });
        return { error: error?.message };
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=update-password`,
        });
        return { error: error?.message };
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message };
      },
      signUp: async (email, password, role, displayName) => {
        const redirect = `${window.location.origin}/dashboard`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirect,
            data: { role, display_name: displayName },
          },
        });
        return { error: error?.message };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshRole: async () => loadRole(user?.id, user),
    }),
    [user, session, role, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
