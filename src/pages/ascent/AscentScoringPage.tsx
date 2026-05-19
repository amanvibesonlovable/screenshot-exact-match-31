import { AscentLayout } from "@/ascent/AscentLayout";
import { DIM_COLORS, DIM_KEYS, DIM_LABELS } from "@/ascent/lib";

const FLAGS = [
  ["1", "Questioning if internship was worth it", "W1 Q3", "\"Honestly, I'm questioning if this was worth it\""],
  ["2", "Feeling regretful", "W1 Q4", "\"Regretful\""],
  ["3", "Feeling like free labor", "W2 Q3a", "\"I feel like free labor, not a learner\""],
  ["4", "Stopped caring because they don't care", "W3 Q2a", "\"I've stopped caring because they don't care\""],
  ["5", "Experience rated 1/5 (Poor)", "W3-W7 Pulse", "Score of 1 on weekly pulse"],
  ["6", "Feeling like free labor (mid-point)", "W4 Q2", "\"I genuinely feel like free labor\""],
  ["7", "Would tell juniors to avoid it", "W4 Q3", "\"I'd say avoid it\""],
  ["8", "Mid-review hasn't happened by W5", "W5 Q1", "\"It still hasn't happened\""],
  ["9", "This has been a waste of time", "W5 Q2", "\"Nothing — this has been a waste of time\""],
  ["10", "Could disappear unnoticed", "W5 Q3", "\"Completely alone — I could disappear and no one would notice\""],
  ["11", "Mentally checked out", "W6 Q2", "\"Mentally checked out\""],
  ["12", "Would definitely decline PPO", "W6 Q3", "\"I'd definitely decline\""],
  ["13", "Overall experience: Terrible", "W7 Q1", "\"Terrible — this was a waste of 2 months\""],
];

const WEEK_MULTIS: [number, string, string][] = [
  [1, "0.7×", "First week. Everything is new. Discount heavily."],
  [2, "0.8×", "Still settling in."],
  [3, "0.9×", "Patterns forming."],
  [4, "1.0×", "Midpoint baseline. What you see is real."],
  [5, "1.1×", "Post mid-review. Should be improving."],
  [6, "1.2×", "Final stretch. Issues won't self-resolve."],
  [7, "1.3×", "Final verdict. Settled opinions."],
];

const ACTIONS: [string, string, string][] = [
  ["LOW + all dimensions low", "Monitor. Healthy intern.", "—"],
  ["MEDIUM + Guidance high", "Check if AM is engaging. Nudge AM.", "Within 3 days"],
  ["MEDIUM + Project Clarity high", "Verify project is scoped and explained.", "Within 3 days"],
  ["MEDIUM + Engagement low", "Informal HR check-in call.", "Within 3 days"],
  ["MEDIUM + Experience high", "Check workload, physical demands.", "Within 3 days"],
  ["HIGH + any combination", "HR call within 48 hours.", "Within 48 hours"],
  ["HIGH + \"Free labor\" flag", "Investigate project quality. Is this intern being exploited?", "Within 24 hours"],
  ["HIGH + \"Would decline PPO\"", "If good candidate: understand blockers. If not: note for PPO decision.", "Within 48 hours"],
  ["HIGH + AM harmful/absent", "Escalate to BM. AM needs coaching.", "Within 24 hours"],
  ["2 consecutive missed surveys", "HR calls to confirm status (live/dropout).", "Within 24 hours"],
];

export default function AscentScoringPage() {
  return (
    <AscentLayout title="Scoring Framework">
      <div className="space-y-6">
        <Section title="1. Risk Dimensions">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Dimension</th><th className="px-3 py-2 text-left">Color</th><th className="px-3 py-2 text-left">What it captures</th></tr>
              </thead>
              <tbody>
                {DIM_KEYS.map((k, i) => (
                  <tr key={k} className="border-t border-border">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold">{DIM_LABELS[k]}</td>
                    <td className="px-3 py-2"><span className="inline-block h-3 w-6 rounded" style={{ background: DIM_COLORS[k] }} /> <span className="ml-2 text-xs text-muted-foreground">{DIM_COLORS[k]}</span></td>
                    <td className="px-3 py-2 text-muted-foreground">{["Interest, energy, purpose, PPO motivation","AM/AE accessibility, feedback quality, feeling guided","Project understanding, deliverables, progress tracking","Physical demands, feeling valued vs exploited, satisfaction"][i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="2. Per-Dimension Thresholds"><p className="text-sm">LOW: <b>0–3</b> &nbsp;|&nbsp; MEDIUM: <b>4–7</b> &nbsp;|&nbsp; HIGH: <b>8+</b></p></Section>

        <Section title="3. Week Multipliers">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2 text-left">Week</th><th className="px-3 py-2 text-left">Multiplier</th><th className="px-3 py-2 text-left">Rationale</th></tr></thead>
            <tbody>{WEEK_MULTIS.map(([w, m, r]) => <tr key={w} className="border-t border-border"><td className="px-3 py-2 font-semibold">W{w}</td><td className="px-3 py-2">{m}</td><td className="px-3 py-2 text-muted-foreground">{r}</td></tr>)}</tbody>
          </table>
        </Section>

        <Section title="4. Composite Score Formula">
          <pre className="rounded-md bg-muted/50 p-3 text-xs">composite = engagement_motivation + guidance_support + project_clarity + experience_wellbeing{"\n"}final_score = composite × week_multiplier</pre>
        </Section>

        <Section title="5. Final Classification"><p className="text-sm">LOW: <b>0–8</b> &nbsp;|&nbsp; MEDIUM: <b>9–18</b> &nbsp;|&nbsp; HIGH: <b>19+</b></p></Section>

        <Section title="6. All 13 Critical Escalation Triggers">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Flag</th><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-left">Trigger</th></tr></thead>
            <tbody>{FLAGS.map(([n, f, s, t]) => <tr key={n} className="border-t border-border"><td className="px-3 py-2">{n}</td><td className="px-3 py-2 font-semibold">{f}</td><td className="px-3 py-2 text-muted-foreground">{s}</td><td className="px-3 py-2 text-muted-foreground italic">{t}</td></tr>)}</tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">Any single critical flag immediately classifies the intern as HIGH RISK regardless of the composite score.</p>
        </Section>

        <Section title="7. Non-Responsive Detection"><p className="text-sm text-muted-foreground">An intern who misses 2 consecutive weekly surveys is automatically flagged as "At Risk (Non-Responsive)". This is separate from score-based risk. Both signals appear on the dashboard.</p></Section>

        <Section title="8. Gaming Detection"><p className="text-sm text-muted-foreground">A survey is flagged as potentially gamed (⚡) if ALL static questions are answered with the most positive option (index 0) AND the total completion time is under 30 seconds. This does not affect the risk score.</p></Section>

        <Section title="9. Recommended Action Matrix">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground"><tr><th className="px-3 py-2 text-left">Risk Profile</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Timeline</th></tr></thead>
            <tbody>{ACTIONS.map(([p, a, t], i) => <tr key={i} className="border-t border-border"><td className="px-3 py-2 font-semibold">{p}</td><td className="px-3 py-2">{a}</td><td className="px-3 py-2 text-muted-foreground">{t}</td></tr>)}</tbody>
          </table>
        </Section>

        <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}. This scoring framework is specific to the Ascent Internship program.</p>
      </div>
    </AscentLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
