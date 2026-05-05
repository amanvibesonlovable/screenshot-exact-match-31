import { Link } from "react-router-dom";
import { LogIn, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { SURVEYS, type SurveyStage } from "@/survey/survey-config";
import { CandorLogo } from "@/components/CandorLogo";

const STAGE_META: Record<
  SurveyStage,
  { milestone: string; context: string; measures: string; minutes: string }
> = {
  15: {
    milestone: "First pulse",
    context: "First two weeks in market — adjustment to field reality.",
    measures: "Field reality, support from managers, early adjustment.",
    minutes: "~2 min",
  },
  30: {
    milestone: "Learning curve",
    context: "First month complete — confidence and learning curve.",
    measures: "Training effectiveness, peer dynamics, motivation.",
    minutes: "~2 min",
  },
  45: {
    milestone: "Midpoint",
    context: "Mid-training — workload, autonomy, fatigue.",
    measures: "Workload pressure, support guidance, wellbeing.",
    minutes: "~2 min",
  },
  60: {
    milestone: "Readiness",
    context: "Two months in — readiness signals begin to surface.",
    measures: "Transition readiness, attrition risk, role fit.",
    minutes: "~2 min",
  },
  90: {
    milestone: "Transition",
    context: "Three months — about to step into independent territory.",
    measures: "Independence, manager trust, retention intent.",
    minutes: "~2-3 min",
  },
  180: {
    milestone: "Long-term signal",
    context: "Six months — full transition to a Sales Officer role.",
    measures: "Long-term retention, career outlook, recommendation.",
    minutes: "~2-3 min",
  },
};

export default function DemoPage() {
  const stages: SurveyStage[] = [15, 30, 45, 60, 90, 180];

  return (
    <main className="min-h-dvh bg-background">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <CandorLogo size={32} />
            <span
              className="text-lg font-bold tracking-tight text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              Candor
            </span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 sm:px-5 sm:py-2.5"
          >
            <LogIn size={16} />
            <span className="hidden sm:inline">HR Sign In</span>
            <span className="sm:hidden">Sign In</span>
          </Link>
        </div>
      </nav>

      {/* Hero intro — soft teal band w/ dot pattern */}
      <section
        className="relative overflow-hidden border-b border-border"
        style={{
          background:
            "linear-gradient(180deg, #F0FDFA 0%, #ECFDF5 40%, hsl(210 20% 98%) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #0F766E22 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0))",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-10 text-center sm:py-14">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur"
          >
            <Sparkles size={12} className="text-amber-500" />
            Trainee demo previews
          </span>
          <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Preview each Candor check-in
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Step into the experience your trainees see at every milestone. These
            are interactive previews — no data is saved.
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {stages.map((stage) => {
            const survey = SURVEYS[stage];
            const meta = STAGE_META[stage];
            const qCount = survey.questions.filter((q) => q.kind === "static").length;
            return (
              <Link
                key={stage}
                to={`/demo/demo-day${stage}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
              >
                {/* top accent bar */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary to-primary/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />

                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    Day {stage}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-amber-600">
                    {meta.milestone}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold leading-snug text-foreground">
                  {survey.title}
                </h3>
                <p className="mt-1 text-xs italic leading-relaxed text-muted-foreground">
                  {meta.context}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                  {meta.measures}
                </p>

                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{qCount} questions</span>
                      <span aria-hidden>·</span>
                      <span>{meta.minutes}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-all group-hover:gap-2">
                      Try this
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Subtle orientation footnote */}
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-2 rounded-lg border border-border bg-white/60 px-4 py-3 text-center text-xs text-muted-foreground sm:flex-row sm:justify-center sm:gap-3 sm:text-left">
          <ShieldCheck size={14} className="shrink-0 text-primary" />
          <span>
            These are demo previews. No trainee data is saved.{" "}
            <Link to="/auth" className="font-medium text-primary hover:underline">
              HR sign-in
            </Link>{" "}
            is separate.
          </span>
        </div>
      </section>
    </main>
  );
}
