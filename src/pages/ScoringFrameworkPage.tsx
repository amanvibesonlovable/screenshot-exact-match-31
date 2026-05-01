import { Link } from "react-router-dom";
import RequireHr from "@/hr/RequireHr";
import { DIM_COLORS } from "@/hr/DashboardCharts";
import { NotificationSettingsCard } from "@/hr/NotificationSettingsCard";

const dimensions: { key: string; label: string; what: string; applies: string }[] = [
  { key: "training_effectiveness", label: "Training Effectiveness", what: "Learning quality, skill gaps, curriculum coverage, dossier adherence", applies: "All surveys" },
  { key: "attrition_risk", label: "Attrition Risk", what: "Intent to leave, role-fit rejection, recommendation signals", applies: "All surveys" },
  { key: "support_guidance", label: "Support & Guidance", what: "Quality of training from field team, manager involvement", applies: "All surveys" },
  { key: "adjustment_wellbeing", label: "Adjustment & Wellbeing", what: "Physical demands, city adjustment, isolation, stress, culture fit", applies: "All surveys" },
  { key: "transition_readiness", label: "Transition Readiness", what: "Confidence to run a section independently, handover quality", applies: "Day 60, 90, 180 only" },
];

const stageMultipliers: { stage: string; mult: string; rationale: string }[] = [
  { stage: "Day 15", mult: "0.7×", rationale: "Very early — most issues are normal adjustment" },
  { stage: "Day 30", mult: "0.9×", rationale: "Still early but patterns forming" },
  { stage: "Day 45", mult: "1.0×", rationale: "Midpoint baseline — what you see is real" },
  { stage: "Day 60", mult: "1.2×", rationale: "Late training — issues harder to fix" },
  { stage: "Day 90", mult: "1.4×", rationale: "Training over — settled opinions" },
  { stage: "Day 180", mult: "1.5×", rationale: "Post-training — problems predict long-term attrition" },
];

const criticalTriggers: { text: string; where: string }[] = [
  { text: "\"Regretting\" emotional state", where: "Day 15, Q4" },
  { text: "\"I'd rethink my decision to join\"", where: "Day 15, Q5" },
  { text: "\"I feel like I'm in the way\"", where: "Day 30, Q3" },
  { text: "\"Exploring other opportunities\"", where: "Day 30, Q4a" },
  { text: "\"Would tell juniors to avoid this role\"", where: "Day 30, Q6 (and any survey with recommendation question)" },
  { text: "\"Hostile/demeaning environment\"", where: "Day 45, Q2a" },
  { text: "\"Seriously considering other options\"", where: "Day 60, Q4a" },
  { text: "\"Already started looking elsewhere\"", where: "Day 60, Q5" },
  { text: "\"Toxic/demoralizing training experience\"", where: "Day 90, Q3" },
  { text: "\"Planning exit\"", where: "Day 90, Q4" },
  { text: "\"Exploring exit\"", where: "Day 180, Q4" },
  { text: "\"Would not recommend role\"", where: "Day 180, Q5" },
];

const actionMatrix: { profile: string; action: string; timeline: string; tone: "ok" | "warn" | "bad" }[] = [
  { profile: "LOW + All dimensions low", action: "No action. Monitor normally.", timeline: "—", tone: "ok" },
  { profile: "MEDIUM + Training Effectiveness high", action: "Review training coverage with branch. Check dossier adherence.", timeline: "Within 1 week", tone: "warn" },
  { profile: "MEDIUM + Support & Guidance high", action: "Skip-level check-in. Evaluate training quality in that area.", timeline: "Within 1 week", tone: "warn" },
  { profile: "MEDIUM + Adjustment & Wellbeing high", action: "Informal HR call. Connect with a batch-mate nearby.", timeline: "Within 3 days", tone: "warn" },
  { profile: "MEDIUM + Attrition Risk high", action: "Confidential retention conversation with trainee.", timeline: "Within 48 hours", tone: "warn" },
  { profile: "HIGH + Any combination", action: "Immediate HR intervention. Inform Senior HR Manager.", timeline: "Within 24 hours", tone: "bad" },
  { profile: "HIGH + Hostile/toxic flag", action: "Escalate to Employee Relations.", timeline: "Within 24 hours", tone: "bad" },
  { profile: "HIGH + Planning exit / already looking", action: "Assess retention possibility. If unlikely, prepare transition.", timeline: "Within 24 hours", tone: "bad" },
];

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mt-10 mb-4 print:mt-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Section {n}</p>
      <h2 className="text-xl font-extrabold text-foreground">{children}</h2>
      <div className="mt-2 h-px w-full bg-border/60" />
    </div>
  );
}

function ScoringInner() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <main className="min-h-dvh bg-gradient-warm print:bg-white">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-xl font-extrabold text-primary-foreground shadow-soft">✦</div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-foreground">Scoring Framework</p>
              <p className="text-xs text-muted-foreground">How Candor calculates risk for every trainee</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-secondary">
              Print / Export PDF
            </button>
            <Link to="/dashboard" className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-secondary">
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-6 py-10 print:px-0 print:py-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground print:text-2xl">Scoring Framework Reference</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A complete reference for how trainee responses are translated into risk scores. Use this page to brief HR partners,
          area managers, or senior leadership.
        </p>

        {/* Section 1: Risk Dimensions */}
        <SectionTitle n={1}>Risk Dimensions</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-bubble print:shadow-none">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Dimension</th>
                <th className="px-4 py-3">What it measures</th>
                <th className="px-4 py-3 whitespace-nowrap">Applies to</th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((d) => (
                <tr key={d.key} className="border-t border-border/40">
                  <td
                    className="px-4 py-3 font-bold text-foreground"
                    style={{ borderLeft: `4px solid ${DIM_COLORS[d.key]}` }}
                  >
                    {d.label}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.what}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{d.applies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Per-Dimension Thresholds */}
        <SectionTitle n={2}>Per-Dimension Thresholds</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">LOW</span>
            <p className="mt-3 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">0–3 points</p>
            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">Healthy range. No action needed.</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <span className="inline-block rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">MEDIUM</span>
            <p className="mt-3 text-2xl font-extrabold text-amber-700 dark:text-amber-400">4–8 points</p>
            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">Watch closely. Investigate the dimension.</p>
          </div>
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
            <span className="inline-block rounded-full bg-destructive px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">HIGH</span>
            <p className="mt-3 text-2xl font-extrabold text-destructive">9+ points</p>
            <p className="mt-1 text-xs text-destructive/80">Active concern in this dimension.</p>
          </div>
        </div>

        {/* Section 3: Stage Multipliers */}
        <SectionTitle n={3}>Stage Multipliers</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-bubble print:shadow-none">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Survey stage</th>
                <th className="px-4 py-3">Multiplier</th>
                <th className="px-4 py-3">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {stageMultipliers.map((s) => (
                <tr key={s.stage} className="border-t border-border/40">
                  <td className="px-4 py-3 font-bold text-foreground">{s.stage}</td>
                  <td className="px-4 py-3 font-mono font-bold text-primary">{s.mult}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Composite Score Formula */}
        <SectionTitle n={4}>Composite Score Formula</SectionTitle>
        <pre className="overflow-x-auto rounded-2xl border border-border/60 bg-foreground/[0.04] p-5 font-mono text-xs leading-6 text-foreground print:bg-white print:text-[11px]">
{`composite_score = training_effectiveness + attrition_risk + support_guidance +
                  adjustment_wellbeing + transition_readiness

final_score     = composite_score × stage_multiplier

Risk Classification:
  LOW    : final_score 0–10
  MEDIUM : final_score 11–22
  HIGH   : final_score 23+`}
        </pre>

        {/* Section 5: Critical Escalation Triggers */}
        <SectionTitle n={5}>Critical Escalation Triggers</SectionTitle>
        <ol className="space-y-2">
          {criticalTriggers.map((t, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 pl-4"
              style={{ borderLeft: "4px solid hsl(var(--destructive))" }}
            >
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{t.text}</p>
                <p className="text-xs text-muted-foreground">{t.where}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          <strong>Note:</strong> Any single critical flag immediately overrides the composite score and classifies the trainee as
          <strong> HIGH RISK</strong>, regardless of <code>final_score</code>.
        </p>

        {/* Section 6: Recommended Action Matrix */}
        <SectionTitle n={6}>Recommended Action Matrix</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-bubble print:shadow-none">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Risk profile</th>
                <th className="px-4 py-3">Recommended action</th>
                <th className="px-4 py-3 whitespace-nowrap">Timeline</th>
              </tr>
            </thead>
            <tbody>
              {actionMatrix.map((row, i) => {
                const dot =
                  row.tone === "ok" ? "bg-emerald-500"
                  : row.tone === "warn" ? "bg-amber-500"
                  : "bg-destructive";
                return (
                  <tr key={i} className="border-t border-border/40">
                    <td className="px-4 py-3 font-bold text-foreground">
                      <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${dot}`} />
                      {row.profile}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.action}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{row.timeline}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 7: Gaming Detection */}
        <SectionTitle n={7}>Gaming Detection</SectionTitle>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-bubble print:shadow-none">
          <p className="text-sm text-foreground">
            A survey response is flagged as potentially gamed (<span className="font-bold">⚡</span>) if <strong>both</strong> conditions are met:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary">•</span> Every static question was answered with the most positive option</li>
            <li className="flex items-start gap-2"><span className="text-primary">•</span> Total completion time was under 45 seconds</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            This flag does <strong>not</strong> affect risk scores — it's an indicator for HR to interpret the response with caution.
          </p>
        </div>

        <p className="mt-12 text-center text-[11px] text-muted-foreground">
          Last updated: {today} · Candor · HR
        </p>
      </article>
    </main>
  );
}

export default function ScoringFrameworkPage() {
  return (
    <RequireHr>
      <ScoringInner />
    </RequireHr>
  );
}
