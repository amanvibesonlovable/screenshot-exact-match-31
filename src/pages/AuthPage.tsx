import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable";
import { useHrAuth } from "@/hr/useHrAuth";
import { supabase } from "@/integrations/supabase/client";
import { PulseLogo } from "@/components/PulseLogo";
import { ArrowLeft } from "lucide-react";

type LiveStats = {
  trainees: number;
  highRisk: number;
  branches: number;
} | null;

export default function AuthPage() {
  const nav = useNavigate();
  const { user } = useHrAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<LiveStats>(null);

  useEffect(() => {
    if (user) nav("/dashboard", { replace: true });
  }, [user, nav]);

  // Best-effort live stats — silently hide on any error / no data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("trainees")
          .select("id, branch, latest_risk")
          .limit(1000);
        if (cancelled || error || !data || data.length === 0) return;
        const trainees = data.length;
        const highRisk = data.filter(
          (t: any) => t.latest_risk === "Bad" || t.latest_risk === "high"
        ).length;
        const branches = new Set(data.map((t: any) => t.branch).filter(Boolean)).size;
        setStats({ trainees, highRisk, branches });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* LEFT — Brand panel */}
      <section
        className="relative flex shrink-0 items-center justify-center overflow-hidden px-8 py-10 lg:min-h-dvh lg:w-[55%] lg:px-12"
        style={{
          minHeight: "30vh",
          background:
            "linear-gradient(180deg, #1E1B4B 0%, #312E81 35%, #4338CA 100%)",
        }}
      >
        {/* faint dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="pulse-logo-glow" style={{ display: "inline-flex" }}>
              <PulseLogo size={36} bg="#FFFFFF" fg="#4F46E5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">Pulse</span>
          </div>

          {/* Headline */}
          <h1
            className="mt-6 text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[36px]"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
          >
            Hear your trainees before they leave.
          </h1>

          {/* Decorative pulse line */}
          <svg
            aria-hidden
            viewBox="0 0 600 40"
            className="mt-5 h-5 w-[80%] max-w-sm self-center lg:self-start"
            preserveAspectRatio="none"
          >
            <polyline
              className="pulse-line-draw"
              points="0,20 120,20 150,20 165,8 180,32 195,14 210,20 360,20 380,20 395,12 410,28 425,18 440,20 600,20"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.18}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Feature list — hide on mobile to keep header compact */}
          <ul className="mt-5 hidden space-y-2 text-sm lg:block" style={{ color: "#E0E7FF" }}>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              Confidential check-ins at 6 milestones
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              5 risk dimensions scored automatically
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
              Real-time HR dashboard
            </li>
          </ul>

          {/* Live stats — only when real data exists */}
          {stats && (
            <div
              className="mt-6 hidden w-full max-w-sm rounded-xl border border-white/15 px-5 py-4 lg:block"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(4px)" }}
            >
              <ul className="space-y-2 text-sm text-white">
                <li className="flex items-center gap-2">
                  <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: "#22C55E" }} />
                  {stats.trainees} active trainees tracked
                </li>
                <li className="flex items-center gap-2">
                  <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} />
                  {stats.highRisk} high-risk flags caught
                </li>
                <li className="flex items-center gap-2">
                  <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: "#A5B4FC" }} />
                  {stats.branches} branches monitored
                </li>
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT — Sign-in form */}
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-10 lg:min-h-dvh lg:w-[45%] lg:px-12">
        <div className="w-full max-w-sm">
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: "#111827" }}
          >
            HR Dashboard
          </h2>
          <p className="mt-2 text-base leading-relaxed" style={{ color: "#6B7280" }}>
            Sign in with your work Google account to access the dashboard.
          </p>

          {!user && (
            <button
              onClick={onGoogle}
              disabled={signingIn}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[#F9FAFB] hover:shadow-sm disabled:opacity-60"
              style={{ color: "#111827", borderColor: "#D1D5DB" }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.8 29 5 24 5 16.3 5 9.6 9.4 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 43c5 0 9.5-1.7 13-4.6l-6-4.9c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 38.6 16.1 43 24 43z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.3 5.5l6 4.9c-.4.4 6.5-4.7 6.5-14.4 0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              {signingIn ? "Redirecting…" : "Continue with Google"}
            </button>
          )}

          {user && (
            <div className="mt-6 space-y-4">
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Signed in as <span className="font-semibold" style={{ color: "#111827" }}>{user.email}</span>. Redirecting…
              </p>
              <button
                onClick={onSignOut}
                className="w-full rounded-lg border px-5 py-3 text-sm font-semibold hover:bg-[#F9FAFB]"
                style={{ color: "#111827", borderColor: "#D1D5DB" }}
              >
                Sign out
              </button>
            </div>
          )}

          {err && (
            <div
              role="alert"
              className="mt-4 rounded-lg border px-4 py-3 text-sm"
              style={{
                background: "#FEF2F2",
                borderColor: "#FECACA",
                color: "#B91C1C",
              }}
            >
              <p className="font-medium">Access denied</p>
              <p className="mt-1 leading-relaxed">{err}</p>
              <Link
                to="/"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                style={{ color: "#B91C1C" }}
              >
                <ArrowLeft size={12} /> Back to home
              </Link>
            </div>
          )}

          <p className="mt-4 text-[13px] leading-relaxed" style={{ color: "#9CA3AF" }}>
            Only whitelisted HR team members can access. Contact your admin if you need access.
          </p>

          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: "#4F46E5" }}
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
