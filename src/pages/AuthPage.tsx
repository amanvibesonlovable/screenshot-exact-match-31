import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hr/useAdminAuth";
import { CandorLogo } from "@/components/CandorLogo";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function AuthPage() {
  const nav = useNavigate();
  const { user, admin, resolved } = useAdminAuth();

  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // After signing in, route based on admins-table check
  useEffect(() => {
    if (!user || !resolved) return;
    if (admin && admin.status === "active") {
      nav("/dashboard", { replace: true });
    } else if (user) {
      // Signed-in user is not in admins or inactive — sign out + show error.
      const reason = admin?.status === "inactive"
        ? "This account has been deactivated. Contact your admin."
        : "Access denied. Your account is not authorized. Contact your admin.";
      supabase.auth.signOut().then(() => {
        setErr(reason);
      });
    }
  }, [user, admin, resolved, nav]);

  const onGoogle = async () => {
    setErr(null);
    setGoogleSigningIn(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      setErr(result.error.message ?? "Sign-in failed");
      setGoogleSigningIn(false);
    }
  };

  const onPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setErr("Invalid email or password. Please try again.");
      setPassword("");
      setSigningIn(false);
    }
    // success → useEffect above will check admins table and route
  };

  const onSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setResetSending(true);
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setResetSending(false);
    setResetSent(true);
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !signingIn;

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* LEFT — Brand panel */}
      <section
        className="relative flex shrink-0 items-center justify-center overflow-hidden px-8 py-10 lg:min-h-dvh lg:w-[55%] lg:px-12"
        style={{
          minHeight: "30vh",
          background: "linear-gradient(180deg, #0C4A42 0%, #115E59 50%, #0F766E 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute select-none font-serif"
          style={{
            top: "1rem",
            left: "-1rem",
            fontSize: "260px",
            lineHeight: 1,
            color: "rgba(255,255,255,0.05)",
            fontWeight: 700,
          }}
        >
          “
        </div>
        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <div className="flex items-center gap-2.5">
            <span className="pulse-logo-glow-teal" style={{ display: "inline-flex" }}>
              <CandorLogo size={36} bg="#FFFFFF" fg="#0F766E" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white" style={{ letterSpacing: "-0.02em" }}>
              Candor
            </span>
          </div>
          <h1
            className="mt-6 text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[32px]"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
          >
            The truth about your trainees — before it's too late.
          </h1>
          <ul className="mt-6 hidden space-y-2.5 text-[15px] lg:block" style={{ color: "rgba(255,255,255,0.92)" }}>
            <li className="flex items-center gap-2.5">
              <Check size={16} style={{ color: "#F59E0B" }} strokeWidth={3} />
              Confidential check-ins at 6 milestones
            </li>
            <li className="flex items-center gap-2.5">
              <Check size={16} style={{ color: "#F59E0B" }} strokeWidth={3} />
              5 risk dimensions scored automatically
            </li>
            <li className="flex items-center gap-2.5">
              <Check size={16} style={{ color: "#F59E0B" }} strokeWidth={3} />
              Real-time HR analytics dashboard
            </li>
          </ul>
        </div>
      </section>

      {/* RIGHT — Sign-in form */}
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-10 lg:min-h-dvh lg:w-[45%] lg:px-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "#111827" }}>
            HR Dashboard
          </h2>
          <p className="mt-2 text-base leading-relaxed" style={{ color: "#6B7280" }}>
            Sign in to access the dashboard.
          </p>

          {mode === "signin" && (
            <>
              {/* Google */}
              <button
                onClick={onGoogle}
                disabled={googleSigningIn || signingIn}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[#F9FAFB] hover:shadow-sm disabled:opacity-60"
                style={{ color: "#111827", borderColor: "#D1D5DB" }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.8 29 5 24 5 16.3 5 9.6 9.4 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 43c5 0 9.5-1.7 13-4.6l-6-4.9c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 38.6 16.1 43 24 43z" />
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.3 5.5l6 4.9c-.4.4 6.5-4.7 6.5-14.4 0-1.2-.1-2.3-.4-3.5z" />
                </svg>
                {googleSigningIn ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: "#E5E7EB" }} />
                <span className="text-[13px]" style={{ color: "#9CA3AF" }}>
                  or sign in with email
                </span>
                <div className="h-px flex-1" style={{ background: "#E5E7EB" }} />
              </div>

              {/* Email/password form */}
              <form onSubmit={onPasswordSignIn} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold" style={{ color: "#374151" }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.in"
                    className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                    style={{ borderColor: "#D1D5DB", color: "#111827" }}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-semibold" style={{ color: "#374151" }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border px-4 py-3 pr-11 text-sm outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                      style={{ borderColor: "#D1D5DB", color: "#111827" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-500 hover:bg-gray-100"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {err && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
                    style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#DC2626" }}
                  >
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
                  style={{ background: canSubmit ? "#0F766E" : undefined }}
                  onMouseEnter={(e) => canSubmit && (e.currentTarget.style.background = "#115E59")}
                  onMouseLeave={(e) => canSubmit && (e.currentTarget.style.background = "#0F766E")}
                >
                  {signingIn ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErr(null);
                      setResetSent(false);
                      setMode("forgot");
                    }}
                    className="text-[13px] font-medium hover:underline"
                    style={{ color: "#0F766E" }}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            </>
          )}

          {mode === "forgot" && (
            <form onSubmit={onSendReset} className="mt-6 space-y-4">
              <p className="text-sm" style={{ color: "#374151" }}>
                Enter your email and we'll send a reset link.
              </p>
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold" style={{ color: "#374151" }}>
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.in"
                  className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
                  style={{ borderColor: "#D1D5DB", color: "#111827" }}
                />
              </div>

              {resetSent ? (
                <div
                  className="rounded-lg border px-3 py-2.5 text-sm"
                  style={{ background: "#F0FDF4", borderColor: "#BBF7D0", color: "#15803D" }}
                >
                  If this email exists in our system, you'll receive a reset link shortly.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!email || resetSending}
                  className="flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ background: "#0F766E" }}
                >
                  {resetSending ? <Loader2 size={16} className="animate-spin" /> : "Send Reset Link"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setResetSent(false);
                  setErr(null);
                }}
                className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                style={{ color: "#0F766E" }}
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </form>
          )}

          <p className="mt-6 text-[13px] leading-relaxed" style={{ color: "#9CA3AF" }}>
            Only authorized HR team members can access this dashboard.
          </p>

          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: "#0F766E" }}
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
