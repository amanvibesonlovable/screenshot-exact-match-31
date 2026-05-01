import { Link } from "react-router-dom";
import { LogIn, ArrowRight } from "lucide-react";
import { SURVEYS, type SurveyStage } from "@/survey/survey-config";
import { CandorLogo } from "@/components/CandorLogo";

const STAGE_META: Record<SurveyStage, { context: string; measures: string; minutes: string }> = {
  15: {
    context: "First two weeks in market — adjustment to field reality.",
    measures: "Field reality, support from managers, early adjustment.",
    minutes: "~2 min",
  },
  30: {
    context: "First month complete — confidence and learning curve.",
    measures: "Training effectiveness, peer dynamics, motivation.",
    minutes: "~2 min",
  },
  45: {
    context: "Mid-training — workload, autonomy, fatigue.",
    measures: "Workload pressure, support guidance, wellbeing.",
    minutes: "~2 min",
  },
  60: {
    context: "Two months in — readiness signals begin to surface.",
    measures: "Transition readiness, attrition risk, role fit.",
    minutes: "~2 min",
  },
  90: {
    context: "Three months — about to step into independent territory.",
    measures: "Independence, manager trust, retention intent.",
    minutes: "~2-3 min",
  },
  180: {
    context: "Six months — full transition to a Sales Officer role.",
    measures: "Long-term retention, career outlook, recommendation.",
    minutes: "~2-3 min",
  },
};

export default function DemoPage() {
  const stages: SurveyStage[] = [15, 30, 45, 60, 90, 180];

  return (
    <main className="min-h-dvh bg-background">
      {/* Top nav (matches landing — solid) */}
      <nav className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <CandorLogo size={32} />
            <span className="text-lg font-bold tracking-tight text-foreground" style={{ letterSpacing: "-0.02em" }}>
              Candor
            </span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md border border-primary px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <LogIn size={16} />
            HR Sign In
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Try the Candor check-in experience
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Pick any milestone to see what trainees experience. These are demos — no data is saved.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => {
            const survey = SURVEYS[stage];
            const meta = STAGE_META[stage];
            const qCount = survey.questions.filter((q) => q.kind === "static").length;
            return (
              <Link
                key={stage}
                to={`/survey/demo-day${stage}`}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-l-4 hover:border-l-primary hover:shadow-md"
              >
                <span className="inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Day {stage}
                </span>
                <h3 className="mt-3 text-base font-semibold text-foreground">{survey.title}</h3>
                <p className="mt-1 text-xs italic text-muted-foreground">{meta.context}</p>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{meta.measures}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{qCount} questions</span>
                  <span>·</span>
                  <span>{meta.minutes}</span>
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                  Try this <ArrowRight size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
