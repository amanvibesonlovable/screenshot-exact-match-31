import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";
import { AscentLayout } from "@/ascent/AscentLayout";
import {
  ASCENT_TEAL,
  ASCENT_WEEKS,
  DIM_COLORS,
  DIM_KEYS,
  DIM_LABELS,
  RISK_COLORS,
  daysSince,
  dimAverages,
  dimRisk,
  isNonResponsive,
  latestResponse,
  pulseScore,
  pulseSeries,
  responsesByIntern,
  useAscentInterns,
  useAscentResponses,
  weekNum,
} from "@/ascent/lib";

export default function AscentInternDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: interns = [] } = useAscentInterns();
  const internIds = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(internIds);

  const intern = interns.find((i) => i.id === id);
  const myResponses = useMemo(
    () => responses.filter((r) => r.employee_id === id).sort((a, b) => weekNum(a.stage) - weekNum(b.stage)),
    [responses, id],
  );

  if (!intern) {
    return (
      <AscentLayout title="Intern Detail">
        <Link to="/ascent/interns" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={12} /> Back to interns
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">Intern not found.</p>
      </AscentLayout>
    );
  }

  const last = latestResponse(myResponses);
  const risk = last?.risk_level ?? "N/A";
  const days = daysSince(intern.doj);
  const dims = dimAverages(myResponses);
  const series = ASCENT_WEEKS.map((w) => {
    const r = myResponses.find((x) => weekNum(x.stage) === w);
    return { week: `W${w}`, pulse: r ? pulseScore(r) : null };
  });
  const allFlags = myResponses.flatMap((r) =>
    (r.critical_flags ?? []).map((f) => ({ flag: f, week: weekNum(r.stage) })),
  );
  const ppoResponse = myResponses.find((r) => weekNum(r.stage) >= 6);
  const ppoIntent = ppoResponse?.responses?.find((q) => /ppo/i.test(q.question_text))?.answer_text;
  const nonResp = isNonResponsive(intern, myResponses);
  const missedWeeks = (() => {
    const done = new Set(myResponses.map((r) => weekNum(r.stage)));
    const elig = ASCENT_WEEKS.filter((w) => days >= w * 7);
    return elig.filter((w) => !done.has(w));
  })();

  return (
    <AscentLayout title={intern.name}>
      <div className="space-y-5">
        <Link to="/ascent/interns" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={12} /> Back to interns
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{intern.name}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {intern.employee_code} · {intern.branch} · AM: {intern.area_manager || "—"} · DOJ:{" "}
                {new Date(intern.doj).toLocaleDateString()} · Day {days} · Status: {intern.status}
                {intern.project_type && <> · Project: {intern.project_type}</>}
                {intern.intern_batch && <> · Batch: {intern.intern_batch}</>}
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1 text-sm font-bold"
              style={{
                background:
                  risk === "HIGH" ? "#FEE2E2" : risk === "MEDIUM" ? "#FEF3C7" : risk === "LOW" ? "#DCFCE7" : "#F1F5F9",
                color:
                  risk === "HIGH"
                    ? RISK_COLORS.HIGH
                    : risk === "MEDIUM"
                    ? RISK_COLORS.MEDIUM
                    : risk === "LOW"
                    ? RISK_COLORS.LOW
                    : "#64748B",
              }}
            >
              {risk === "N/A" ? "No data yet" : `${risk} Risk`}
            </span>
          </div>
        </div>

        {/* Pulse Chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground">Weekly Pulse Trend</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Self-reported experience (1–5) across the program.</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: "#64748B" }} />
                <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="pulse" stroke={ASCENT_TEAL} strokeWidth={2.5} dot={{ r: 4, fill: ASCENT_TEAL }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dimensions */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground">4-Dimension Snapshot</h3>
          <div className="mt-4 space-y-3">
            {DIM_KEYS.map((k) => {
              const v = dims[k];
              const r = dimRisk(v);
              const pct = Math.min(100, (v / 10) * 100);
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{DIM_LABELS[k]}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold" style={{ color: RISK_COLORS[r] }}>{v.toFixed(1)}</span>
                      <span className="ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ background: RISK_COLORS[r] + "22", color: RISK_COLORS[r] }}>
                        {r}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: DIM_COLORS[k] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical Flags */}
        {allFlags.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold text-foreground">Critical Flags</h3>
            <ul className="mt-2 space-y-1">
              {allFlags.map((f, idx) => (
                <li key={idx} className="rounded-md px-2.5 py-1.5 text-xs" style={{ background: "#FEF2F2", color: RISK_COLORS.HIGH }}>
                  🚨 W{f.week} · {f.flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Non-responsive */}
        {nonResp && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold text-foreground">Non-Responsive History</h3>
            <p className="mt-2 text-xs" style={{ color: RISK_COLORS.MEDIUM }}>
              ⚠️ Missed weeks: {missedWeeks.map((w) => `W${w}`).join(", ") || "—"}
            </p>
          </div>
        )}

        {/* PPO */}
        {ppoIntent && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold text-foreground">PPO Intent</h3>
            <p className="mt-2 text-xs text-foreground">{ppoIntent}</p>
          </div>
        )}

        {/* Survey History */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground">Survey History</h3>
          <div className="mt-3 space-y-2">
            {myResponses.length === 0 && <p className="text-xs text-muted-foreground">No surveys submitted yet.</p>}
            {myResponses.map((r) => (
              <WeekAccordion key={r.id} response={r} />
            ))}
          </div>
        </div>
      </div>
    </AscentLayout>
  );
}

function WeekAccordion({ response }: { response: ReturnType<typeof latestResponse> & object }) {
  const [open, setOpen] = useState(false);
  const w = weekNum(response.stage);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-secondary/50"
      >
        <span className="font-semibold text-foreground">
          Week {w} <span className="ml-2 font-normal text-muted-foreground">{new Date(response.submitted_at).toLocaleDateString()}</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              background: response.risk_level === "HIGH" ? "#FEE2E2" : response.risk_level === "MEDIUM" ? "#FEF3C7" : "#DCFCE7",
              color: RISK_COLORS[response.risk_level],
            }}
          >
            {response.risk_level}
          </span>
          <span className="tabular-nums text-muted-foreground">Score {Number(response.final_score).toFixed(1)}</span>
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border bg-secondary/30 px-3 py-3 text-xs">
          {(response.responses ?? []).map((q, idx) => {
            const isCritical = (response.critical_flags ?? []).some((f) => q.answer_text.includes(f));
            return (
              <div key={idx}>
                <p className="font-medium text-foreground">
                  {isCritical && <span className="mr-1">🚨</span>}
                  {q.question_text}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  → {q.answer_text}{" "}
                  <span className="text-[10px]">
                    [{q.dimension} · {q.points} pts]
                  </span>
                </p>
              </div>
            );
          })}
          {response.free_text_response && (
            <blockquote className="border-l-2 border-border pl-2 italic text-muted-foreground">
              "{response.free_text_response}"
            </blockquote>
          )}
          <p className="text-[10px] text-muted-foreground">Completion: {response.completion_time_seconds}s</p>
        </div>
      )}
    </div>
  );
}
