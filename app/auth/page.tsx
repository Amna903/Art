"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "reset" | "update-password";

export default function AuthPage() {
  const { user, loading, signIn, signInWithGoogle, resetPassword, updatePassword, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("client");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && mode !== "update-password") {
      router.push("/dashboard");
    }
  }, [loading, user, router, mode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (searchParams.get("mode") === "update-password" || hash.includes("type=recovery")) {
        setMode("update-password");
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update-password");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === "update-password") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      setBusy(true);
      const res = await updatePassword(password);
      setBusy(false);
      if (res.error) {
        setError(res.error);
      } else {
        toast("Password updated successfully!");
        setSuccessMsg("Your password has been reset successfully. Redirecting to your dashboard...");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
      return;
    }

    setBusy(true);
    const res =
      mode === "signin"
        ? await signIn(email, password)
        : mode === "signup"
          ? await signUp(email, password, role, displayName || email.split("@")[0])
          : await resetPassword(email);
    setBusy(false);

    if (res.error) {
      setError(res.error);
    } else if (mode === "reset") {
      setSuccessMsg("We sent a password reset link to your email inbox. Please check your email to proceed.");
      toast("Password reset link sent to your email");
    } else {
      router.push("/dashboard");
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setBusy(true);
    const res = await signInWithGoogle(mode === "signup" ? role : undefined);
    setBusy(false);
    if (res.error) setError(res.error);
  };

  return (
    <main className="min-h-screen px-gutter-page pt-28 pb-16 md:pt-32 max-w-container-max mx-auto">
      <div className="max-w-md mx-auto">
        <span className="font-label-caps text-label-caps text-secondary uppercase block mb-3">
          {mode === "signin"
            ? "Welcome back"
            : mode === "signup"
            ? "Join the circle"
            : mode === "reset"
            ? "Account recovery"
            : "Set new password"}
        </span>
        <h1 className="font-display-lg text-display-lg text-primary mb-8">
          {mode === "signin"
            ? "Sign in"
            : mode === "signup"
            ? "Create an account"
            : mode === "reset"
            ? "Reset password"
            : "Update password"}
        </h1>

        {mode === "signup" && (
          <div className="mb-6">
            <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-3">
              I am a…
            </span>
            <div className="grid grid-cols-2 gap-3">
              {(["client", "artist"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={
                    "p-4 border text-left transition-all " +
                    (role === r
                      ? "border-secondary bg-secondary/10 text-primary font-semibold"
                      : "border-primary/15 text-on-surface-variant hover:border-primary/40")
                  }
                >
                  <div className="font-headline-sm text-headline-sm text-primary">{r === "client" ? "Buyer" : "Artist"}</div>
                  <div className="text-xs mt-1 opacity-80">
                    {r === "client"
                      ? "Discover, save and acquire artworks."
                      : "Publish your portfolio and sell originals."}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(mode === "signin" || mode === "signup") && (
          <div className="mb-6">
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-primary/20 bg-surface py-3 px-4 font-navigation text-navigation uppercase tracking-widest hover:border-secondary hover:bg-secondary/5 disabled:opacity-50 transition-all shadow-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{mode === "signin" ? "Sign in with Google" : "Sign up with Google"}</span>
            </button>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary/15" />
              </div>
              <span className="relative bg-background px-3 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                Or continue with email
              </span>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && <Field label="Display name" value={displayName} onChange={setDisplayName} />}
          
          {mode !== "update-password" && (
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
          )}

          {mode !== "reset" && (
            <Field
              label={mode === "update-password" ? "New Password" : "Password"}
              type="password"
              value={password}
              onChange={setPassword}
              required
            />
          )}

          {mode === "update-password" && (
            <Field
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />
          )}

          {error && <div className="text-sm text-secondary p-3 border border-secondary/30 bg-secondary/10 rounded">{error}</div>}
          {successMsg && <div className="text-sm text-tertiary p-3 border border-tertiary/30 bg-tertiary/10 rounded leading-relaxed">{successMsg}</div>}

          <button
            disabled={busy}
            className="w-full bg-primary text-on-primary py-3.5 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-colors disabled:opacity-50 shadow-md"
          >
            {busy
              ? "Processing…"
              : mode === "signin"
              ? "Sign in"
              : mode === "signup"
              ? "Create account"
              : mode === "reset"
              ? "Send reset link"
              : "Update Password"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-start gap-3 text-sm text-on-surface-variant">
          {mode === "signin" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="hover:text-secondary transition-colors underline-offset-4 hover:underline"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="hover:text-secondary transition-colors underline-offset-4 hover:underline font-medium"
              >
                Don't have an account? Sign up
              </button>
            </>
          )}

          {mode === "signup" && (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccessMsg(null);
              }}
              className="hover:text-secondary transition-colors underline-offset-4 hover:underline font-medium"
            >
              Already have an account? Sign in
            </button>
          )}

          {(mode === "reset" || mode === "update-password") && (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccessMsg(null);
              }}
              className="hover:text-secondary transition-colors underline-offset-4 hover:underline font-medium"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-primary/30 focus:border-secondary outline-none py-2 text-primary text-base transition-colors"
      />
    </label>
  );
}
