import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// PRD color tokens
export const RISK_COLORS = {
  HIGH: "#C23B22",
  MEDIUM: "#D4820C",
  LOW: "#2D8B4E",
};

export const DIM_COLORS: Record<string, string> = {
  training_effectiveness: "#2563EB",
  attrition_risk: "#DC2626",
  support_guidance: "#7C3AED",
  adjustment_wellbeing: "#0D9488",
  transition_readiness: "#4F46E5",
};

export const DIM_LABELS: Record<string, string> = {
  training_effectiveness: "Training Effectiveness",
  attrition_risk: "Attrition Risk",
  support_guidance: "Support & Guidance",
  adjustment_wellbeing: "Adjustment & Wellbeing",
  transition_readiness: "Transition Readiness",
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

const cardCls =
  "rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur";
const titleCls =
  "text-sm font-bold uppercase tracking-wide text-muted-foreground";

export function RiskDonut({
  data,
}: {
  data: { name: RiskLevel; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h3 className={titleCls}>Risk distribution</h3>
        <span className="text-xs text-muted-foreground">{total} responded</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={55} outerRadius={85} paddingAngle={2}
              stroke="hsl(var(--card))" strokeWidth={3}>
              {data.map((d) => <Cell key={d.name} fill={RISK_COLORS[d.name]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RiskTrendChart({
  data,
}: {
  data: { week: string; HIGH: number; MEDIUM: number; LOW: number }[];
}) {
  const [mode, setMode] = useState<"count" | "pct">("count");
  const display = mode === "count"
    ? data
    : data.map((d) => {
        const total = d.HIGH + d.MEDIUM + d.LOW || 1;
        return {
          week: d.week,
          HIGH: Math.round((d.HIGH / total) * 100),
          MEDIUM: Math.round((d.MEDIUM / total) * 100),
          LOW: Math.round((d.LOW / total) * 100),
        };
      });
  const empty = data.every((d) => d.HIGH + d.MEDIUM + d.LOW === 0);
  return (
    <div className={`${cardCls} lg:col-span-2`}>
      <div className="flex items-center justify-between">
        <h3 className={titleCls}>Risk distribution over time (weekly)</h3>
        <div className="flex rounded-full border border-border p-0.5 text-[10px] font-bold">
          {(["count", "pct"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-full px-2.5 py-0.5 ${mode === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {m === "count" ? "Count" : "%"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No survey responses yet — chart will populate as trainees check in.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={display} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => mode === "pct" ? `${v}%` : v} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Area type="monotone" dataKey="LOW" stackId="1" stroke={RISK_COLORS.LOW} fill={RISK_COLORS.LOW} fillOpacity={0.7} />
              <Area type="monotone" dataKey="MEDIUM" stackId="1" stroke={RISK_COLORS.MEDIUM} fill={RISK_COLORS.MEDIUM} fillOpacity={0.7} />
              <Area type="monotone" dataKey="HIGH" stackId="1" stroke={RISK_COLORS.HIGH} fill={RISK_COLORS.HIGH} fillOpacity={0.8} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function StageBreakdown({
  data,
}: {
  data: { stage: string; HIGH: number; MEDIUM: number; LOW: number }[];
}) {
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h3 className={titleCls}>Responses by stage</h3>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="LOW" stackId="a" fill={RISK_COLORS.LOW} />
            <Bar dataKey="MEDIUM" stackId="a" fill={RISK_COLORS.MEDIUM} />
            <Bar dataKey="HIGH" stackId="a" fill={RISK_COLORS.HIGH} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Survey Completion Funnel — horizontal bars per stage with completion %. */
export function CompletionFunnel({
  rows,
  onStageClick,
}: {
  rows: { stage: number; eligible: number; completed: number }[];
  onStageClick?: (stage: number) => void;
}) {
  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Survey completion funnel</h3>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const pct = r.eligible ? Math.round((r.completed / r.eligible) * 100) : 0;
          const color = pct >= 80 ? RISK_COLORS.LOW : pct >= 50 ? RISK_COLORS.MEDIUM : RISK_COLORS.HIGH;
          return (
            <li key={r.stage}>
              <button
                onClick={() => onStageClick?.(r.stage)}
                className="block w-full text-left"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-foreground">Day {r.stage}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pct}% · {r.completed}/{r.eligible}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div style={{ width: `${pct}%`, background: color }} className="h-full" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Risk heatmap by 5 dimensions — prominent horizontal bars with risk badges. */
export function DimensionHeatmap({
  rows,
}: {
  rows: { key: string; label: string; avg: number; max: number; hasData: boolean }[];
}) {
  // Sort by avg desc, but keep "no data" rows at the end
  const sorted = rows.slice().sort((a, b) => {
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    return b.avg - a.avg;
  });
  const top = sorted.find((r) => r.hasData);
  function levelFor(avg: number): "LOW" | "MEDIUM" | "HIGH" {
    // Per-dimension max is 25 in scoring — bands roughly mirror final-score bands scaled down
    if (avg >= 6) return "HIGH";
    if (avg >= 3) return "MEDIUM";
    return "LOW";
  }
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={titleCls}>Where the pressure is</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Average scores across all latest check-ins. Higher = more concern.
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-3.5">
        {sorted.map((r, i) => {
          const pct = r.max ? Math.min(100, Math.round((r.avg / r.max) * 100)) : 0;
          const level = levelFor(r.avg);
          const isPrimary = r.hasData && i === 0;
          return (
            <li key={r.key}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${isPrimary ? "text-foreground" : "text-foreground"}`}>
                  {r.label}
                  {isPrimary && (
                    <span className="ml-2 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                      ← Primary concern
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {r.hasData ? (
                    <>
                      <span className="text-muted-foreground">{r.avg.toFixed(1)}</span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold"
                        style={{
                          background: `${RISK_COLORS[level]}22`,
                          color: RISK_COLORS[level],
                        }}
                      >
                        {level}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Not enough data yet</span>
                  )}
                </span>
              </div>
              <div className={`mt-1.5 h-3 overflow-hidden rounded-full ${r.hasData ? "bg-secondary" : "bg-secondary/40"}`}>
                <div
                  style={{
                    width: `${pct}%`,
                    background: r.hasData ? DIM_COLORS[r.key] : "hsl(var(--muted-foreground) / 0.3)",
                  }}
                  className="h-full"
                />
              </div>
            </li>
          );
        })}
      </ul>
      {top && (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Biggest systemic concern: <span className="font-bold text-foreground">{top.label}</span>.
        </p>
      )}
    </div>
  );
}

export function BranchLeaderboard({
  rows,
  onBranchClick,
}: {
  rows: {
    branch: string;
    active: number;
    total: number;       // number with surveys
    high: number;
    med: number;
    low: number;
    avg: number;
    completionPct: number;
    trend?: "up" | "down" | "flat";
  }[];
  onBranchClick?: (branch: string) => void;
}) {
  // Auto-insight comparing best vs worst by avg
  let insight: string | null = null;
  const measured = rows.filter((r) => r.total > 0);
  if (measured.length >= 2) {
    const sorted = measured.slice().sort((a, b) => b.avg - a.avg);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    if (best.avg > 0 && worst.avg > best.avg * 1.5) {
      insight = `${worst.branch} has ${(worst.avg / best.avg).toFixed(1)}x the average risk score compared to ${best.branch}.`;
    } else {
      const sortedComp = rows.slice().sort((a, b) => b.completionPct - a.completionPct);
      insight = `${sortedComp[0].branch} has the highest completion rate at ${sortedComp[0].completionPct}%.`;
    }
  }

  function compTone(p: number) {
    if (p >= 80) return RISK_COLORS.LOW;
    if (p >= 50) return RISK_COLORS.MEDIUM;
    return RISK_COLORS.HIGH;
  }

  const sorted = rows.slice().sort((a, b) => b.avg - a.avg);

  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Risk by branch</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Data will populate as trainees complete check-ins.</p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2">Branch</th>
                  <th className="py-2 pr-2 text-right">Active</th>
                  <th className="py-2 pr-2 text-right">Compl.</th>
                  <th className="py-2 pr-2">Risk distribution</th>
                  <th className="py-2 pr-2 text-right">Avg</th>
                  <th className="py-2 text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const totalSeg = Math.max(1, r.high + r.med + r.low);
                  return (
                    <tr
                      key={r.branch}
                      onClick={() => onBranchClick?.(r.branch)}
                      className="border-t border-border/40 cursor-pointer hover:bg-secondary/40"
                    >
                      <td className="py-2 pr-2 font-bold text-foreground">{r.branch}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.active}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: compTone(r.completionPct) }} />
                          {r.completionPct}%
                        </span>
                      </td>
                      <td className="py-2 pr-2 min-w-[120px]">
                        <div className="flex h-2 overflow-hidden rounded-full bg-secondary/60">
                          <div style={{ width: `${(r.low / totalSeg) * 100}%`, background: RISK_COLORS.LOW }} />
                          <div style={{ width: `${(r.med / totalSeg) * 100}%`, background: RISK_COLORS.MEDIUM }} />
                          <div style={{ width: `${(r.high / totalSeg) * 100}%`, background: RISK_COLORS.HIGH }} />
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums font-bold">{r.avg.toFixed(1)}</td>
                      <td className="py-2 text-right">
                        {r.trend === "up" ? (
                          <span style={{ color: RISK_COLORS.HIGH }}>↑</span>
                        ) : r.trend === "down" ? (
                          <span style={{ color: RISK_COLORS.LOW }}>↓</span>
                        ) : (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {insight && (
            <p className="mt-3 rounded-xl border border-border/60 bg-secondary/40 p-2.5 text-xs text-foreground">
              💡 {insight}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Manager risk table */
export function ManagerView({
  rows,
  onManagerClick,
}: {
  rows: {
    manager: string;
    branch: string;
    trainees: number;
    surveysDone: number;
    avgRisk: number;
    highCount: number;
  }[];
  onManagerClick?: (mgr: string) => void;
}) {
  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Area Managers — risk view</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Manager</th>
                <th className="py-2">Branch</th>
                <th className="py-2 text-right">Trainees</th>
                <th className="py-2 text-right">Surveys</th>
                <th className="py-2 text-right">Avg risk</th>
                <th className="py-2 text-right">High</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const flag = r.highCount >= 2;
                return (
                  <tr
                    key={r.manager}
                    onClick={() => onManagerClick?.(r.manager)}
                    className="border-t border-border/40 cursor-pointer hover:bg-secondary/40"
                  >
                    <td className="py-2 font-bold text-foreground">
                      {r.manager}
                      {flag && (
                        <span className="ml-2 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                          flagged
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground">{r.branch}</td>
                    <td className="py-2 text-right tabular-nums">{r.trainees}</td>
                    <td className="py-2 text-right tabular-nums">{r.surveysDone}</td>
                    <td className="py-2 text-right tabular-nums">{r.avgRisk.toFixed(1)}</td>
                    <td className="py-2 text-right tabular-nums font-bold" style={{ color: r.highCount > 0 ? RISK_COLORS.HIGH : "inherit" }}>
                      {r.highCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Recent critical alerts feed — fixed-height scrollable */
export function CriticalAlertsFeed({
  alerts,
  onClick,
}: {
  alerts: { id: string; name: string; branch: string; stage: number; flag: string; daysAgo: number; employeeId: string }[];
  onClick?: (employeeId: string) => void;
}) {
  function relTime(d: number) {
    if (d <= 0) return "today";
    if (d === 1) return "1 day ago";
    if (d < 7) return `${d} days ago`;
    const w = Math.round(d / 7);
    return w === 1 ? "1 week ago" : `${w} weeks ago`;
  }
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h3 className={titleCls}>🚨 Critical alerts</h3>
        {alerts.length > 0 && (
          <span className="text-[10px] font-bold text-destructive">{alerts.length}</span>
        )}
      </div>
      {alerts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No critical flags raised — all clear 🎉</p>
      ) : (
        <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {alerts.slice(0, 15).map((a) => (
            <li key={a.id}>
              <button
                onClick={() => onClick?.(a.employeeId)}
                className="block w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-left hover:bg-destructive/10"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-destructive" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-bold text-foreground">{a.name}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {relTime(a.daysAgo)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.branch} · Day {a.stage}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-destructive">"{a.flag}"</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Org-level pulse — donut for "one thing to change" insights */
export function OrgPulseDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  // Per spec colors:
  // Better trainers = purple, More structured = blue, Prepare for field = teal,
  // Fix aggressive = red, Training is solid = green
  const COLOR_BY_NAME: Record<string, string> = {
    "Better trainers / more investment": "#7C3AED",
    "More structured assessments": "#2563EB",
    "Prepare for field reality": "#0D9488",
    "Fix aggressive culture": "#DC2626",
    "Training is solid": "#2D8B4E",
  };
  const FALLBACK = ["#7C3AED", "#2563EB", "#0D9488", "#DC2626", "#2D8B4E", "#D4820C"];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null; // hide entirely per spec
  return (
    <div className={cardCls}>
      <div>
        <h3 className={titleCls}>What trainees want leadership to know</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Aggregated from Day 90 & Day 180 feedback
        </p>
      </div>
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={55} outerRadius={85} paddingAngle={2}
              stroke="hsl(var(--card))" strokeWidth={3}
              label={(p: any) => `${Math.round((p.value / total) * 100)}%`}
              labelLine={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={COLOR_BY_NAME[d.name] ?? FALLBACK[i % FALLBACK.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-foreground">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">responses</span>
        </div>
      </div>
    </div>
  );
}
