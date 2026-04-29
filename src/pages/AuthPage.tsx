import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable";
import { useHrAuth } from "@/hr/useHrAuth";
import { supabase } from "@/integrations/supabase/client";

export default function AuthPage() {
  const nav = useNavigate();
  const { user } = useHrAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  const onGoogle = async () => {
    setErr(null);
    setSigningIn(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      setErr(result.error.message ?? "Sign-in failed");
      setSigningIn(false);
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-dvh bg-gradient-warm">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-2xl font-extrabold text-primary-foreground shadow-soft">
            ✦
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-foreground">Pulse</span>
        </div>

        <div className="w-full rounded-3xl border border-border/60 bg-card/80 p-8 shadow-bubble backdrop-blur">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            HR Dashboard sign-in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Only whitelisted HR team members can access the dashboard. Sign in with your work
            Google account.
          </p>

          {!user && (
            <button
              onClick={onGoogle}
              disabled={signingIn}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background px-5 py-3 text-sm font-bold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.8 29 5 24 5 16.3 5 9.6 9.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 43c5 0 9.5-1.7 13-4.6l-6-4.9c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 38.6 16.1 43 24 43z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.3 5.5l6 4.9c-.4.4 6.5-4.7 6.5-14.4 0-1.2-.1-2.3-.4-3.5z"/>
              </svg>
              {signingIn ? "Redirecting…" : "Continue with Google"}
            </button>
          )}

          {user && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-bold text-foreground">{user.email}</span>. Redirecting…
              </p>
              <button
                onClick={onSignOut}
                className="w-full rounded-full border border-border px-5 py-3 text-sm font-bold text-foreground hover:bg-secondary"
              >
                Sign out
              </button>
            </div>
          )}

          {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
        </div>
      </div>
    </main>
  );
}
