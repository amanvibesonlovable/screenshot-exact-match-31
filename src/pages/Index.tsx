import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageSquare, TrendingUp, ShieldCheck, Upload, MessagesSquare, BarChart3, ArrowRight, LogIn } from "lucide-react";
import { CandorLogo } from "@/components/CandorLogo";

const Index = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-dvh bg-background">
      {/* Sticky Nav — transparent on hero, solid after scroll */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-border bg-white/95 backdrop-blur"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className={scrolled ? "pulse-logo-glow-teal" : "pulse-logo-glow"}
              style={{ display: "inline-flex" }}
            >
              <CandorLogo size={32} bg={scrolled ? "#0F766E" : "#FFFFFF"} fg={scrolled ? "#FFFFFF" : "#0F766E"} />
            </span>
            <span
              className={`text-lg font-bold tracking-tight transition-colors ${
                scrolled ? "text-foreground" : "text-white"
              }`}
              style={{ letterSpacing: "-0.02em" }}
            >
              Candor
            </span>
          </Link>
          <Link
            to="/auth"
            className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${
              scrolled
                ? "border text-primary hover:bg-primary/5"
                : "border border-white/80 bg-transparent text-white hover:bg-white/15"
            }`}
            style={scrolled ? { borderColor: "#0F766E" } : undefined}
          >
            <LogIn size={16} />
            HR Sign In
          </Link>
        </div>
      </nav>

      {/* Hero — deep teal gradient → white */}
      <section
        className="relative overflow-hidden pt-20"
        style={{
          background:
            "linear-gradient(180deg, #0C4A42 0%, #115E59 30%, #0F766E 55%, #CCFBF1 85%, #FFFFFF 100%)",
        }}
      >
        {/* faint dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* Large faint quote watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute select-none font-serif"
          style={{
            top: "2rem",
            left: "-1rem",
            fontSize: "300px",
            lineHeight: 1,
            color: "rgba(255,255,255,0.04)",
            fontWeight: 700,
          }}
        >
          “
        </div>

        <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-12 text-center sm:pt-16 sm:pb-16">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white backdrop-blur"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: "#22C55E" }} />
            Early-warning system for Sales Trainees
          </span>
          <h1
            className="mt-5 text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
          >
            The truth about your trainees — before it's too late.
          </h1>

          {/* Hero EKG line — draws once on load */}
          <svg
            aria-hidden
            viewBox="0 0 600 40"
            className="mx-auto mt-5 h-6 w-[80%] max-w-md"
            preserveAspectRatio="none"
          >
            <polyline
              className="pulse-line-draw"
              points="0,20 120,20 150,20 165,8 180,32 195,14 210,20 360,20 380,20 395,12 410,28 425,18 440,20 600,20"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.32}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <p
            className="mx-auto mt-3 max-w-xl text-pretty text-lg leading-relaxed"
            style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          >
            Candor gives every trainee a confidential space to share how they're really doing —
            then surfaces who needs support before they slip away.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              to="/demo"
              className="relative rounded-full bg-white px-8 py-4 text-sm font-semibold shadow-md transition-colors hover:bg-[#F0FDFA]"
              style={{ color: "#0F766E" }}
            >
              {/* tiny amber spark */}
              <span
                aria-hidden
                className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full"
                style={{ background: "#F59E0B", boxShadow: "0 0 0 2px #FFFFFF" }}
              />
              Try the trainee experience →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats row — light teal strip */}
      <section className="border-t border-border/60" style={{ background: "#F0FDFA" }}>
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
            {[
              { n: "6", l: "Check-in Milestones" },
              { n: "5", l: "Risk Dimensions" },
              { n: "<2 min", l: "Per Check-in" },
              { n: "100%", l: "Confidential" },
            ].map((s, i) => (
              <div
                key={s.l}
                className={`text-center ${i > 0 ? "sm:border-l sm:border-border/60" : ""}`}
              >
                <div className="text-2xl font-bold sm:text-3xl" style={{ color: "#0F766E" }}>
                  {s.n}
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "#64748B" }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Card 1 - Conversational */}
            <div className="flex flex-col rounded-xl p-7 shadow-sm" style={{ background: "#F0FDFA" }}>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "#CCFBF1", color: "#0F766E" }}
              >
                <MessageSquare size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold" style={{ color: "#0F172A" }}>Conversational</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Feels like chatting with a friend, not filling a form. Trainees respond with taps — no typing needed.
              </p>
              <div className="mt-5 space-y-2 rounded-lg bg-white p-3 shadow-inner">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-1.5 text-[12px] text-foreground">
                  How's training going?
                </div>
                <div
                  className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm px-3 py-1.5 text-[12px] text-white"
                  style={{ background: "#0F766E" }}
                >
                  Pretty good 👍
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-1.5 text-[12px] text-foreground">
                  What's the hardest part?
                </div>
              </div>
            </div>

            {/* Card 2 - Smart Scoring */}
            <div className="flex flex-col rounded-xl p-7 shadow-sm" style={{ background: "#FFF7ED" }}>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "#FEF3C7", color: "#D97706" }}
              >
                <TrendingUp size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold" style={{ color: "#0F172A" }}>Smart Scoring</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#64748B" }}>
                Every response is scored across 5 risk dimensions with dynamic follow-ups that dig deeper when it matters.
              </p>
              <div className="mt-5 space-y-2 rounded-lg bg-white p-3 shadow-inner">
                {[
                  { l: "Training", w: "75%", c: "#2563EB" },
                  { l: "Attrition", w: "40%", c: "#DC2626" },
                  { l: "Support", w: "60%", c: "#7C3AED" },
                  { l: "Wellbeing", w: "85%", c: "#0D9488" },
                  { l: "Readiness", w: "55%", c: "#4F46E5" },
                ].map((b) => (
                  <div key={b.l} className="flex items-center gap-2">
                    <span className="w-16 text-[10px] font-medium uppercase text-muted-foreground">{b.l}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full" style={{ width: b.w, backgroundColor: b.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3 - Confidential */}
            <div className="flex flex-col rounded-xl p-7 shadow-sm" style={{ background: "#F0FDF4" }}>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "#DCFCE7", color: "#16A34A" }}
              >
                <ShieldCheck size={22} />
              </div>
              <h3 className="mt-4 text-lg font-semibold" style={{ color: "#0F172A" }}>Confidential</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#64748B" }}>
                No login required. Managers never see individual answers. Trainees know their honesty is protected.
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 shadow-inner">
                <ShieldCheck size={16} style={{ color: "#16A34A" }} />
                <span className="text-[12px] font-medium text-foreground">Encrypted · Anonymous to managers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border" style={{ background: "#F8FAFB" }}>
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: "#64748B" }}>
            How it works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-4">
            {[
              { icon: Upload, title: "Upload", body: "Upload your trainee roster as a CSV. Links auto-generate for each trainee." },
              { icon: MessagesSquare, title: "Check-in", body: "Trainees get a friendly chat survey at Day 15, 30, 45, 60, 90, and 180. No login needed." },
              { icon: BarChart3, title: "Act", body: "HR sees risk scores, flags, and trends on a live dashboard. Intervene early." },
            ].map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
                  style={{ background: "#0F766E" }}
                >
                  {i + 1}
                </div>
                <div
                  className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm"
                  style={{ color: "#0F766E" }}
                >
                  <s.icon size={22} />
                </div>
                <h3 className="mt-3 text-sm font-semibold" style={{ color: "#0F172A" }}>{s.title}</h3>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed" style={{ color: "#475569" }}>{s.body}</p>
                {i < 2 && (
                  <ArrowRight className="absolute right-[-12px] top-5 hidden h-5 w-5 sm:block" style={{ color: "#CBD5E1" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer — deep teal */}
      <footer style={{ background: "#0C4A42" }} className="text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <CandorLogo size={36} bg="#FFFFFF" fg="#0F766E" />
              <div>
                <div className="text-base font-bold" style={{ letterSpacing: "-0.02em" }}>Candor</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Built for HR teams that care about trainee success.
                </div>
              </div>
            </div>
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              Confidential &amp; Secure
            </div>
          </div>
          <div
            className="mt-8 border-t pt-4 text-xs"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94A3B8" }}
          >
            © {new Date().getFullYear()} Candor
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
