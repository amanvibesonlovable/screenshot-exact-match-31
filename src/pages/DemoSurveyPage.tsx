import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SurveyChat } from "@/survey/SurveyChat";
import { SURVEYS, STAGE_LABELS, type SurveyStage } from "@/survey/survey-config";
import type { ScoredSurvey } from "@/survey/scoring";
import { ShieldCheck, ArrowRight } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  LOW: "#10B981",
  MEDIUM: "#F59E0B",
  HIGH: "#EF4444",
};
const RISK_LABEL: Record<string, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
};

const DIM_META: { key: keyof ScoredSurvey["scores"]; label: string; color: string }[] = [
  { key: "training_effectiveness", label: "Training", color: "#3B82F6" },
  { key: "attrition_risk", label: "Attrition", color: "#EF4444" },
  { key: "support_guidance", label: "Support", color: "#8B5CF6" },
  { key: "adjustment_wellbeing", label: "Wellbeing", color: "#14B8A6" },
  { key: "transition_readiness", label: "Readiness", color: "#4F46E5" },
];

function parseStage(slug?: string): SurveyStage | null {
  if (!slug) return null;
  const m = slug.match(/^demo-day(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if ([15, 30, 45, 60, 90, 180].includes(n)) return n as SurveyStage;
  return null;
}

export default function DemoSurveyPage() {
  const { slug } = useParams<{ slug: string }>();
  const stage = parseStage(slug);
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [result, setResult] = useState<ScoredSurvey | null>(null);

  if (!stage) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demo not found</h1>
          <p className="mt-2 text-muted-foreground">That demo link isn't recognized.</p>
          <Link to="/demo" className="mt-4 inline-block text-primary underline">
            Back to demos
          </Link>
        </div>
      </div>
    );
  }

  const config = SURVEYS[stage];

  // Step 1: ask for a friendly name
  if (!name) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setName(nameInput.trim() || "Demo User");
          }}
          className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {STAGE_LABELS[stage]} · Demo
          </span>
          <h1 className="mt-3 text-xl font-bold text-foreground">What should we call you?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Just for the demo. Nothing is saved.
          </p>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your first name"
            className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Start the check-in <ArrowRight size={14} />
          </button>
          <Link
            to="/demo"
            className="mt-3 block text-center text-xs text-muted-foreground hover:underline"
          >
            ← Back to demos
          </Link>
        </form>
      </div>
    );
  }

  // Step 3: show demo results
  if (result) {
    const r = result.scores;
    const color = RISK_COLORS[r.risk_level];
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {STAGE_LABELS[stage]} · Demo Results
              </span>
              <h1 className="mt-3 text-2xl font-bold text-foreground">
                Here's what HR would see
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on your answers — calculated locally. Nothing was saved.
              </p>
            </div>

            {/* Risk badge */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
                style={{ background: color }}
              >
                {r.final_score.toFixed(1)}
              </div>
              <div
                className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: color }}
              >
                {RISK_LABEL[r.risk_level]}
              </div>
              <div className="text-xs text-muted-foreground">
                Final score (composite × {r.stage_multiplier} stage weight)
              </div>
            </div>

            {/* Dimensions */}
            <div className="mt-6 space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dimension scores
              </div>
              {DIM_META.map((d) => {
                const v = r[d.key] as number | null;
                if (v === null || v === undefined) {
                  return (
                    <div key={d.label} className="flex items-center gap-3">
                      <span className="w-20 text-xs font-medium text-muted-foreground">{d.label}</span>
                      <div className="flex-1 text-xs italic text-muted-foreground">— not measured at this stage</div>
                    </div>
                  );
                }
                const pct = Math.min(100, (v / 6) * 100);
                return (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="w-20 text-xs font-medium text-foreground">{d.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold text-foreground">
                      {v.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Critical flags */}
            {result.critical_flags.length > 0 && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  Critical flags
                </div>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  {result.critical_flags.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-success" />
              Demo only — no data was saved to any database.
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/demo"
                className="flex-1 rounded-md border border-primary px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/5"
              >
                Try another survey
              </Link>
              <Link
                to="/dashboard"
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Go to HR Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: run the chat
  return (
    <SurveyChat
      config={config}
      traineeName={name}
      onComplete={(scored) => setResult(scored)}
    />
  );
}
