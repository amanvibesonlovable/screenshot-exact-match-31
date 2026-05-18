import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
  AreaChart, Area, BarChart, Bar, Legend,
} from "recharts";
import { AscentLayout } from "@/ascent/AscentLayout";
import { AscentFilterBar } from "@/ascent/AscentFilterBar";
import {
  ASCENT_TEAL, ASCENT_WEEKS, AscentFilters, DEFAULT_FILTERS, DIM_COLORS, DIM_KEYS, DIM_LABELS, RISK_COLORS,
  applyFilters, dimAverages, dimRisk, pulseScore, uniqueBatches, uniqueBranches,
  useAscentInterns, useAscentResponses, weekNum,
} from "@/ascent/lib";

const BRANCH_COLORS = ["#0F766E", "#2563EB", "#7C3AED", "#F59E0B", "#DC2626"];

export default function AscentAnalyticsPage() {
  const { data: interns = [] } = useAscentInterns();
  const ids = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(ids);
  const [filters, setFilters] = useState<AscentFilters>(DEFAULT_FILTERS);
  const [riskMode, setRiskMode] = useState<"count" | "pct">("count");

  const branches = uniqueBranches(interns);
  const batches = uniqueBatches(interns);
  const f = applyFilters(interns, responses, filters);

  // Engagement trend
  const trend = ASCENT_WEEKS.map((w) => {
    const rs = f.responses.filter((r) => weekNum(r.stage) === w);
    const ps = rs.map(pulseScore).filter((x): x is number => x != null);
    return { week: `W${w}`, pulse: ps.length ? Number((ps.reduce((a, b) => a + b, 0) / ps.length).toFixed(2)) : null, n: ps.length };
  });

  // Risk over weeks
  const riskByWeek = ASCENT_WEEKS.map((w) => {
    const rs = f.responses.filter((r) => weekNum(r.stage) === w);
    const high = rs.filter((r) => r.risk_level === "HIGH").length;
    const med = rs.filter((r) => r.risk_level === "MEDIUM").length;
    const low = rs.filter((r) => r.risk_level === "LOW").length;
    const total = high + med + low || 1;
    return riskMode === "pct"
      ? { week: `W${w}`, High: Math.round((high / total) * 100), Medium: Math.round((med / total) * 100), Low: Math.round((low / total) * 100) }
      : { week: `W${w}`, High: high, Medium: med, Low: low };
  });

  // Dim trends
  const dimTrend = ASCENT_WEEKS.map((w) => {
    const rs = f.responses.filter((r) => weekNum(r.stage) === w);
    const a = dimAverages(rs);
    return { week: `W${w}`, ...a };
  });
  const overallDim = dimAverages(f.responses);

  // Branch comparison
  const branchCompare = DIM_KEYS.map((k) => {
    const row: Record<string, string | number> = { dim: DIM_LABELS[k] };
    branches.forEach((b) => {
      const rs = f.responses.filter((r) => f.interns.find((i) => i.id === r.employee_id && i.branch === b));
      const a = dimAverages(rs);
      row[b] = Number(a[k].toFixed(2));
    });
    return row;
  });
  let worstCombo: { branch: string; dim: string; val: number } | null = null;
  for (const row of branchCompare) {
    for (const b of branches) {
      const v = row[b] as number;
      if (!worstCombo || v > worstCombo.val) worstCombo = { branch: b, dim: row.dim as string, val: v };
    }
  }

  // Completion by branch
  const completionByBranch = branches.map((b) => {
    const bi = f.interns.filter((i) => i.branch === b);
    let eligible = 0, completed = 0;
    const done = new Set(f.responses.map((r) => `${r.employee_id}:${weekNum(r.stage)}`));
    bi.forEach((i) => ASCENT_WEEKS.forEach((w) => {
      const days = Math.floor((Date.now() - new Date(i.doj).getTime()) / 86400000);
      if (days >= w * 7) { eligible++; if (done.has(`${i.id}:${w}`)) completed++; }
    }));
    return { branch: b, pct: eligible ? Math.round((completed / eligible) * 100) : 0 };
  }).sort((a, b) => a.pct - b.pct);

  // Response time histogram
  const buckets = [
    { label: "<30s", min: 0, max: 30, danger: true },
    { label: "30s–1m", min: 30, max: 60 },
    { label: "1–2m", min: 60, max: 120 },
    { label: "2–3m", min: 120, max: 180 },
    { label: "3m+", min: 180, max: Infinity },
  ];
  const hist = buckets.map((b) => ({
    label: b.label,
    count: f.responses.filter((r) => r.completion_time_seconds >= b.min && r.completion_time_seconds < b.max).length,
    fill: b.danger ? RISK_COLORS.MEDIUM : ASCENT_TEAL,
  }));
  const gamingCount = f.responses.filter((r) => r.gaming_flag).length;
  const times = f.responses.map((r) => r.completion_time_seconds).filter((x) => x > 0);
  const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const median = times.length ? times.sort((a, b) => a - b)[Math.floor(times.length / 2)] : 0;

  // Dropouts by week — approximate as 0 unless intern marked dropped_out. No timeline data; show empty.
  const dropouts = f.interns.filter((i) => i.status === "dropped_out").length;

  return (
    <AscentLayout title="Analytics">
      <div className="space-y-5">
        <AscentFilterBar filters={filters} onChange={setFilters} branches={branches} batches={batches} />

        <Section title="Weekly Engagement Trend" subtitle="Average experience rating (1–5) across all filtered interns.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: "#64748B" }} />
                <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="pulse" stroke={ASCENT_TEAL} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section
          title="Risk Trend Over Time"
          subtitle="Risk distribution across weeks."
          right={
            <div className="flex gap-1 rounded-md border border-border p-0.5 text-[11px]">
              {(["count", "pct"] as const).map((m) => (
                <button key={m} onClick={() => setRiskMode(m)} className={`rounded px-2 py-0.5 ${riskMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {m === "count" ? "Count" : "%"}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Low" stackId="1" fill={RISK_COLORS.LOW} stroke={RISK_COLORS.LOW} />
                <Area type="monotone" dataKey="Medium" stackId="1" fill={RISK_COLORS.MEDIUM} stroke={RISK_COLORS.MEDIUM} />
                <Area type="monotone" dataKey="High" stackId="1" fill={RISK_COLORS.HIGH} stroke={RISK_COLORS.HIGH} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Dimension Trends" subtitle="Average per-dimension scores across weeks.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DIM_KEYS.map((k) => {
              const v = overallDim[k];
              const r = dimRisk(v);
              return (
                <div key={k} className="rounded-lg border border-border p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold text-foreground">{DIM_LABELS[k]}</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: DIM_COLORS[k] }}>
                      {v.toFixed(1)}
                      <span className="ml-2 rounded-full px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase" style={{ background: RISK_COLORS[r] + "22", color: RISK_COLORS[r] }}>{r}</span>
                    </p>
                  </div>
                  <div className="mt-2 h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dimTrend}>
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                        <RTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey={k} stroke={DIM_COLORS[k]} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Branch Deep Comparison" subtitle="4 dimensions side-by-side across branches.">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchCompare}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="dim" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {branches.map((b, i) => (
                  <Bar key={b} dataKey={b} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {worstCombo && worstCombo.val > 0 && (
            <p className="mt-2 rounded-md bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Insight:</strong> {worstCombo.branch} scores worst on {worstCombo.dim} ({worstCombo.val.toFixed(1)}).
            </p>
          )}
        </Section>

        <Section title="Week-wise Risk Distribution" subtitle="When does risk spike across the program?">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Low" stackId="r" fill={RISK_COLORS.LOW} />
                <Bar dataKey="Medium" stackId="r" fill={RISK_COLORS.MEDIUM} />
                <Bar dataKey="High" stackId="r" fill={RISK_COLORS.HIGH} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Dropout Timeline" subtitle="When interns leave the program.">
          {dropouts === 0 ? (
            <p className="rounded-md bg-secondary/40 px-4 py-6 text-center text-xs text-muted-foreground">
              No confirmed dropouts yet 🎉
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{dropouts} confirmed dropout{dropouts === 1 ? "" : "s"}. Week-level timeline data not yet tracked.</p>
          )}
        </Section>

        <Section title="Completion Rate by Branch" subtitle="Worst-performing branches first.">
          <div className="space-y-2">
            {completionByBranch.map((b) => {
              const c = b.pct >= 80 ? RISK_COLORS.LOW : b.pct >= 50 ? RISK_COLORS.MEDIUM : RISK_COLORS.HIGH;
              return (
                <div key={b.branch} className="flex items-center gap-3 text-xs">
                  <span className="w-28 truncate">{b.branch}</span>
                  <div className="relative h-4 flex-1 overflow-hidden rounded-md bg-secondary">
                    <div className="h-full" style={{ width: `${b.pct}%`, background: c }} />
                  </div>
                  <span className="w-12 text-right font-semibold tabular-nums" style={{ color: c }}>{b.pct}%</span>
                </div>
              );
            })}
            {completionByBranch.length === 0 && <p className="text-xs text-muted-foreground">No branch data.</p>}
          </div>
        </Section>

        <Section title="Response Time Distribution" subtitle="Watch for gaming (sub-30s submissions).">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count">
                    {hist.map((b, i) => <rect key={i} fill={b.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 rounded-lg border border-border p-3 text-xs">
              <p><span className="text-muted-foreground">Gaming flagged:</span> <strong style={{ color: RISK_COLORS.HIGH }}>{gamingCount}</strong></p>
              <p><span className="text-muted-foreground">Avg completion:</span> <strong>{avgTime}s</strong></p>
              <p><span className="text-muted-foreground">Median:</span> <strong>{median}s</strong></p>
            </div>
          </div>
        </Section>
      </div>
    </AscentLayout>
  );
}

function Section({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
