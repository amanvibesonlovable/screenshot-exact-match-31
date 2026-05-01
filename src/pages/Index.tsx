import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageSquare, TrendingUp, ShieldCheck, Upload, MessagesSquare, BarChart3, ArrowRight, LogIn } from "lucide-react";
import { PulseLogo } from "@/components/PulseLogo";

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
              className={scrolled ? "pulse-logo-glow-indigo" : "pulse-logo-glow"}
              style={{ display: "inline-flex" }}
            >
              <PulseLogo size={32} bg={scrolled ? "#4F46E5" : "#FFFFFF"} fg={scrolled ? "#FFFFFF" : "#4F46E5"} />
            </span>
            <span
              className={`text-base font-semibold tracking-tight transition-colors ${
                scrolled ? "text-foreground" : "text-white"
              }`}
            >
              Pulse
            </span>
          </Link>
          <Link
            to="/auth"
            className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${
              scrolled
                ? "border border-primary text-primary hover:bg-primary/5"
                : "border border-white/80 bg-transparent text-white hover:bg-white/15"
            }`}
          >
            <LogIn size={16} />
            HR Sign In
          </Link>
        </div>
      </nav>

      {/* Hero — deep indigo gradient → white */}
      <section
        className="relative overflow-hidden pt-20"
        style={{
          background:
            "linear-gradient(180deg, #1E1B4B 0%, #312E81 30%, #4F46E5 55%, #A5B4FC 75%, #FFFFFF 100%)",
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
        <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-12 text-center sm:pt-16 sm:pb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: "#22C55E" }} />
            Early-warning system for Sales Trainees
          </span>
          <h1
            className="mt-5 text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
          >
            Hear your trainees before they leave.
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
              strokeOpacity={0.35}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <p
            className="mx-auto mt-3 max-w-xl text-pretty text-lg leading-relaxed"
            style={{ color: "#E0E7FF", textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
          >
            Pulse runs friendly, confidential check-ins with every trainee at six milestones — then
            surfaces who's struggling so HR can step in early.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              to="/demo"
              className="rounded-md border border-white bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-md transition-colors hover:bg-[#EEF2FF]"
            >
              Try the trainee experience →
            </Link>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.9)" }}>
              Demo:{" "}
              <Link to="/demo" className="font-medium text-white underline underline-offset-2 hover:opacity-90">
                Try all 6 check-ins
              </Link>{" "}
              ·{" "}
              <Link to="/dashboard" className="font-medium text-white underline underline-offset-2 hover:opacity-90">
                View HR dashboard
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Stats row — bridge between dark hero and white content */}
      <section className="border-t border-border/60" style={{ background: "#F8FAFC" }}>
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
                <div className="text-2xl font-bold sm:text-3xl" style={{ color: "#4F46E5" }}>
                  {s.n}
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: "#6B7280" }}>
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
            <div
              className="flex flex-col rounded-xl border border-border p-6 shadow-sm"
              style={{ background: "#F5F3FF" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                <MessageSquare size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">Conversational</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Feels like chatting with a friend, not filling a form. Trainees respond with taps — no typing needed.
              </p>
              <div className="mt-5 space-y-2 rounded-lg bg-white p-3 shadow-inner">
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-1.5 text-[12px] text-foreground">
                  How's training going?
                </div>
                <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-[12px] text-primary-foreground">
                  Pretty good 👍
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-secondary px-3 py-1.5 text-[12px] text-foreground">
                  What's the hardest part?
                </div>
              </div>
            </div>

            {/* Card 2 - Smart Scoring */}
            <div
              className="flex flex-col rounded-xl border border-border p-6 shadow-sm"
              style={{ background: "#EFF6FF" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                <TrendingUp size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">Smart Scoring</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Every response is scored across 5 risk dimensions with dynamic follow-ups that dig deeper when it matters.
              </p>
              <div className="mt-5 space-y-2 rounded-lg bg-white p-3 shadow-inner">
                {[
                  { l: "Training", w: "75%", c: "#3B82F6" },
                  { l: "Attrition", w: "40%", c: "#EF4444" },
                  { l: "Support", w: "60%", c: "#8B5CF6" },
                  { l: "Wellbeing", w: "85%", c: "#14B8A6" },
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
            <div
              className="flex flex-col rounded-xl border border-border p-6 shadow-sm"
              style={{ background: "#F0FDF4" }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                <ShieldCheck size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">Confidential</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                No login required. Managers never see individual answers. Trainees know their honesty is protected.
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 shadow-inner">
                <ShieldCheck size={16} className="text-success" />
                <span className="text-[12px] font-medium text-foreground">Encrypted · Anonymous</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border" style={{ background: "#F9FAFB" }}>
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            How it works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-4">
            {[
              { icon: Upload, title: "Upload", body: "Upload your trainee roster as CSV." },
              { icon: MessagesSquare, title: "Trainees Check-in", body: "Friendly chat at every milestone." },
              { icon: BarChart3, title: "HR Acts", body: "On risk-scored insights from the dashboard." },
            ].map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
                  {i + 1}
                </div>
                <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                  <s.icon size={22} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                {i < 2 && (
                  <ArrowRight className="absolute right-[-12px] top-5 hidden h-5 w-5 text-muted-foreground/60 sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer — deep indigo */}
      <footer style={{ background: "#1E1B4B" }} className="text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-primary">
                P
              </div>
              <div>
                <div className="text-base font-semibold">Pulse</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Hear your trainees before they leave.
                </div>
              </div>
            </div>
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              Built for HR teams that care about trainee success
            </div>
          </div>
          <div
            className="mt-8 border-t pt-4 text-xs"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
          >
            © {new Date().getFullYear()} Pulse · Confidential & Secure
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
