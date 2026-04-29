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

/** Risk heatmap by 5 dimensions — horizontal gauges with avg score. */
export function DimensionHeatmap({
  rows,
}: {
  rows: { key: string; label: string; avg: number; max: number }[];
}) {
  const top = rows.slice().sort((a, b) => b.avg - a.avg)[0];
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h3 className={titleCls}>Risk by dimension</h3>
        {top && (
          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
            Primary driver: {top.label}
          </span>
        )}
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const pct = r.max ? Math.min(100, Math.round((r.avg / r.max) * 100)) : 0;
          return (
            <li key={r.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.avg.toFixed(1)} avg
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div style={{ width: `${pct}%`, background: DIM_COLORS[r.key] }} className="h-full" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BranchLeaderboard({
  rows,
  onBranchClick,
}: {
  rows: { branch: string; total: number; high: number; med: number; low: number; avg: number }[];
  onBranchClick?: (branch: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  // PRD insight: e.g., "Nagpur has 2.5x the high-risk rate of average"
  let insight: string | null = null;
  if (rows.length >= 2) {
    const totalAll = rows.reduce((s, r) => s + r.total, 0);
    const highAll = rows.reduce((s, r) => s + r.high, 0);
    const avgHighRate = totalAll ? highAll / totalAll : 0;
    const worst = rows.slice().sort((a, b) =>
      (b.high / Math.max(1, b.total)) - (a.high / Math.max(1, a.total))
    )[0];
    const worstRate = worst.total ? worst.high / worst.total : 0;
    if (avgHighRate > 0 && worstRate > avgHighRate * 1.5) {
      insight = `${worst.branch} branch has ${(worstRate / avgHighRate).toFixed(1)}x the high-risk rate of the average.`;
    }
  }
  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h3 className={titleCls}>Branches by risk</h3>
        <span className="text-xs text-muted-foreground">avg score · % high</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {rows.slice(0, 8).map((r) => {
              const highPct = r.total ? Math.round((r.high / r.total) * 100) : 0;
              return (
                <li key={r.branch}>
                  <button
                    onClick={() => onBranchClick?.(r.branch)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-foreground">{r.branch}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {r.avg.toFixed(1)} · {highPct}% high
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-secondary">
                      <div style={{ width: `${(r.low / max) * 100}%`, background: RISK_COLORS.LOW }} />
                      <div style={{ width: `${(r.med / max) * 100}%`, background: RISK_COLORS.MEDIUM }} />
                      <div style={{ width: `${(r.high / max) * 100}%`, background: RISK_COLORS.HIGH }} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {insight && (
            <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-bold text-destructive">
              ⚠ {insight}
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

/** Recent critical alerts feed */
export function CriticalAlertsFeed({
  alerts,
  onClick,
}: {
  alerts: { id: string; name: string; branch: string; stage: number; flag: string; daysAgo: number; employeeId: string }[];
  onClick?: (employeeId: string) => void;
}) {
  return (
    <div className={cardCls}>
      <h3 className={titleCls}>Recent critical alerts</h3>
      {alerts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No active critical flags. 🎉</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {alerts.slice(0, 15).map((a) => (
            <li key={a.id}>
              <button
                onClick={() => onClick?.(a.employeeId)}
                className="block w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-left hover:bg-destructive/10"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-bold text-foreground">{a.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {a.daysAgo === 0 ? "today" : `${a.daysAgo}d ago`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.branch} · Day {a.stage}
                </p>
                <p className="mt-1 text-xs font-bold text-destructive">"{a.flag}"</p>
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
  const COLORS = ["#2563EB", "#7C3AED", "#0D9488", "#D4820C", "#2D8B4E", "#DC2626"];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className={cardCls}>
      <h3 className={titleCls}>What trainees want leadership to know</h3>
      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Pulse insights appear once Day 90 / Day 180 surveys come in.
        </p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={45} outerRadius={80} paddingAngle={2}
                stroke="hsl(var(--card))" strokeWidth={3}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
