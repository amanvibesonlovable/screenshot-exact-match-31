import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import RequireHr from "@/hr/RequireHr";
import { useHrAuth } from "@/hr/useHrAuth";
import { DashboardHeader, DashboardSidebar } from "@/hr/DashboardSidebar";
import {
  ResponsesFilterBar,
  ResponsesFilters,
  emptyResponsesFilters,
  responseMatchesAll,
} from "@/hr/ResponsesFilterBar";
import { DIM_LABELS, RISK_COLORS } from "@/hr/DashboardCharts";
import { formatTime } from "@/hr/ResponseDetail";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Employee = {
  id: string; name: string; employee_code: string;
  branch: string; area_manager: string; doj: string; status: string;
};
type Response = {
  id: string; employee_id: string; stage: string | number;
  risk_level: "LOW" | "MEDIUM" | "HIGH"; final_score: number;
  gaming_flag: boolean; critical_flags: string[] | null;
  scores: Record<string, number | null>;
  free_text_response: string | null;
  submitted_at: string; completion_time_seconds: number;
};

const STAGES = [15, 30, 45, 60, 90, 180] as const;

const BRANCH_COLORS: Record<string, string> = {
  Mumbai: "#2563EB",
  Ahmedabad: "#D97706",
  Pune: "#16A34A",
  Nagpur: "#DC2626",
  Bhopal: "#7C3AED",
};
const fallbackBranchColor = (name: string) => {
  // hash to a color from a palette
  const palette = ["#2563EB", "#D97706", "#16A34A", "#DC2626", "#7C3AED", "#0D9488", "#DB2777"];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};
const branchColor = (b: string) => BRANCH_COLORS[b] ?? fallbackBranchColor(b);

const cardCls = "rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur";
const titleCls = "text-sm font-bold uppercase tracking-wide text-muted-foreground";

function dimRiskFromScore(score: number, max: number) {
  if (max <= 0) return "N/A" as const;
  const pct = score / max;
  if (pct >= 0.66) return "HIGH" as const;
  if (pct >= 0.33) return "MEDIUM" as const;
  return "LOW" as const;
}

function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function weekKey(d: Date) {
  const m = d.getMonth() + 1;
  return `${m}/${d.getDate()}`;
}

function AnalyticsInner() {
  const { user } = useHrAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ResponsesFilters>(emptyResponsesFilters());
  const [trendMode, setTrendMode] = useState<"count" | "pct">("count");
  const [stageMode, setStageMode] = useState<"count" | "pct">("count");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: emp }, { data: resp }] = await Promise.all([
        supabase.from("employees").select("id,name,employee_code,branch,area_manager,doj,status"),
        supabase.from("survey_responses").select("*").order("submitted_at", { ascending: true }),
      ]);
      setEmployees((emp ?? []) as Employee[]);
      setResponses((resp ?? []) as unknown as Response[]);
      setLoading(false);
    })();
  }, []);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const branches = useMemo(
    () => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(),
    [employees],
  );

  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      const e = empById.get(r.employee_id);
      if (!e) return false;
      return responseMatchesAll(r, e, filters);
    });
  }, [responses, filters, empById]);

  // Weeks range
  const weekBuckets = useMemo(() => {
    if (filteredResponses.length === 0) return [];
    const earliest = new Date(filteredResponses[0].submitted_at);
    const start = startOfWeek(earliest);
    const end = startOfWeek(new Date());
    const out: { start: Date; end: Date; key: string }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
      const s = new Date(d); const e = new Date(d); e.setDate(e.getDate() + 7);
      out.push({ start: s, end: e, key: weekKey(s) });
    }
    return out;
  }, [filteredResponses]);

  // 1) Risk trend
  const riskTrend = useMemo(() => {
    return weekBuckets.map((b) => {
      const row = { week: b.key, HIGH: 0, MEDIUM: 0, LOW: 0 };
      for (const r of filteredResponses) {
        const t = new Date(r.submitted_at).getTime();
        if (t >= b.start.getTime() && t < b.end.getTime()) row[r.risk_level]++;
      }
      return row;
    });
  }, [weekBuckets, filteredResponses]);

  const riskTrendDisplay = useMemo(() => {
    if (trendMode === "count") return riskTrend;
    return riskTrend.map((d) => {
      const t = d.HIGH + d.MEDIUM + d.LOW || 1;
      return { week: d.week, HIGH: Math.round(d.HIGH / t * 100), MEDIUM: Math.round(d.MEDIUM / t * 100), LOW: Math.round(d.LOW / t * 100) };
    });
  }, [riskTrend, trendMode]);

  // 2) Dimension trends (per dimension, weekly avg)
  const dimensionTrends = useMemo(() => {
    const dims = ["training_effectiveness", "attrition_risk", "support_guidance", "adjustment_wellbeing", "transition_readiness"];
    return dims.map((d) => {
      const series = weekBuckets.map((b) => {
        let sum = 0, n = 0;
        for (const r of filteredResponses) {
          const t = new Date(r.submitted_at).getTime();
          if (t >= b.start.getTime() && t < b.end.getTime()) {
            const v = r.scores?.[d];
            if (v !== null && v !== undefined) { sum += Number(v); n++; }
          }
        }
        // Use raw per-dimension averages (already on 0-10ish scale)
        const avg = n ? Math.round((sum / n) * 10) / 10 : null;
        return { week: b.key, value: avg };
      });
      // Current avg (latest non-null)
      let currentAvg: number | null = null;
      for (let i = series.length - 1; i >= 0; i--) {
        if (series[i].value !== null) { currentAvg = series[i].value; break; }
      }
      const hasAnyData = series.some((s) => s.value !== null);
      return { key: d, label: DIM_LABELS[d], series, currentAvg, hasAnyData };
    });
  }, [weekBuckets, filteredResponses]);

  // Get latest response per employee within filtered set
  const latestByEmp = useMemo(() => {
    const m = new Map<string, Response>();
    // filteredResponses is asc by submitted_at; iterate to get latest
    for (const r of filteredResponses) m.set(r.employee_id, r);
    return m;
  }, [filteredResponses]);

  // 3) Branch deep comparison: avg per dimension (0-10) per branch
  const branchDimData = useMemo(() => {
    const dims = ["training_effectiveness", "attrition_risk", "support_guidance", "adjustment_wellbeing", "transition_readiness"];
    // Build matrix
    const sums: Record<string, Record<string, { sum: number; n: number }>> = {};
    for (const r of latestByEmp.values()) {
      const e = empById.get(r.employee_id);
      if (!e) continue;
      const b = e.branch || "—";
      if (!sums[b]) sums[b] = {};
      for (const d of dims) {
        const v = r.scores?.[d];
        if (v === null || v === undefined) continue;
        if (!sums[b][d]) sums[b][d] = { sum: 0, n: 0 };
        sums[b][d].sum += Number(v); sums[b][d].n++;
      }
    }
    const branchList = Object.keys(sums).sort();
    const data = dims.map((d) => {
      const row: Record<string, any> = { dimension: DIM_LABELS[d] };
      for (const b of branchList) {
        const s = sums[b][d];
        row[b] = s ? Math.round((s.sum / s.n) * 10) / 10 : 0;
      }
      return row;
    });
    return { data, branchList };
  }, [latestByEmp, empById]);

  // Auto-insight for branch deep comparison
  const branchInsight = useMemo(() => {
    const { data, branchList } = branchDimData;
    if (branchList.length < 2 || data.length === 0) return null;
    let best: { gap: number; dim: string; high: string; low: string; highVal: number; lowVal: number } | null = null;
    for (const row of data) {
      let hi = -Infinity, lo = Infinity, hiB = "", loB = "";
      for (const b of branchList) {
        const v = Number(row[b] ?? 0);
        if (v > hi) { hi = v; hiB = b; }
        if (v < lo && v > 0) { lo = v; loB = b; }
      }
      if (lo === Infinity || lo <= 0) continue;
      const gap = hi / lo;
      if (!best || gap > best.gap) best = { gap, dim: row.dimension, high: hiB, low: loB, highVal: hi, lowVal: lo };
    }
    if (!best) return null;
    return `${best.high} scores ${best.gap.toFixed(1)}× higher than ${best.low} on ${best.dim} — the widest gap across all branches.`;
  }, [branchDimData]);

  // 4) Stage-wise risk distribution
  const stageRisk = useMemo(() => {
    return STAGES.map((s) => {
      const row = { stage: `Day ${s}`, HIGH: 0, MEDIUM: 0, LOW: 0 };
      for (const r of filteredResponses) {
        if (Number(r.stage) === s) row[r.risk_level]++;
      }
      const total = row.HIGH + row.MEDIUM + row.LOW;
      return { ...row, total };
    });
  }, [filteredResponses]);

  const stageRiskDisplay = useMemo(() => {
    if (stageMode === "count") return stageRisk;
    return stageRisk.map((d) => {
      const t = d.total || 1;
      return { stage: d.stage, HIGH: Math.round(d.HIGH / t * 100), MEDIUM: Math.round(d.MEDIUM / t * 100), LOW: Math.round(d.LOW / t * 100), total: d.total };
    });
  }, [stageRisk, stageMode]);

  const stageInsight = useMemo(() => {
    let best: { stage: string; pct: number } | null = null;
    for (const r of stageRisk) {
      if (r.total === 0) continue;
      const pct = Math.round(r.HIGH / r.total * 100);
      if (!best || pct > best.pct) best = { stage: r.stage, pct };
    }
    if (!best || best.pct === 0) return null;
    return `${best.stage} has the highest proportion of High Risk responses (${best.pct}%) — appears to be the most critical period.`;
  }, [stageRisk]);

  // 5) Completion rate by branch
  const branchCompletion = useMemo(() => {
    const map: Record<string, { eligible: number; completed: number }> = {};
    const completedSet = new Set<string>();
    for (const r of filteredResponses) completedSet.add(`${r.employee_id}:${r.stage}`);
    for (const e of employees) {
      if (filters.branches.size > 0 && !filters.branches.has(e.branch)) continue;
      const days = Math.floor((Date.now() - new Date(e.doj).getTime()) / 86400000);
      const stagesToCount = filters.stages.size > 0
        ? STAGES.filter((s) => filters.stages.has(s) && days >= s)
        : STAGES.filter((s) => days >= s);
      const b = e.branch || "—";
      if (!map[b]) map[b] = { eligible: 0, completed: 0 };
      map[b].eligible += stagesToCount.length;
      for (const s of stagesToCount) if (completedSet.has(`${e.id}:${s}`)) map[b].completed++;
    }
    return Object.entries(map)
      .map(([branch, v]) => ({
        branch, eligible: v.eligible, completed: v.completed,
        pct: v.eligible ? Math.round((v.completed / v.eligible) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [employees, filteredResponses, filters.branches, filters.stages]);

  // 6) Response time distribution
  const timeBuckets = [
    { key: "Under 45s", min: 0, max: 45, color: "#F97316" },
    { key: "45s-1min", min: 45, max: 60, color: "#3B82F6" },
    { key: "1-2 min", min: 60, max: 120, color: "#3B82F6" },
    { key: "2-3 min", min: 120, max: 180, color: "#3B82F6" },
    { key: "3-5 min", min: 180, max: 300, color: "#3B82F6" },
    { key: "5+ min", min: 300, max: Infinity, color: "#3B82F6" },
  ];
  const timeDist = useMemo(() => {
    const counts = timeBuckets.map((b) => ({ key: b.key, color: b.color, count: 0 }));
    for (const r of filteredResponses) {
      const s = r.completion_time_seconds || 0;
      const idx = timeBuckets.findIndex((b) => s >= b.min && s < b.max);
      if (idx >= 0) counts[idx].count++;
    }
    return counts;
  }, [filteredResponses]);

  const timeStats = useMemo(() => {
    const times = filteredResponses.map((r) => r.completion_time_seconds || 0).filter((x) => x > 0);
    const flagged = filteredResponses.filter((r) => r.gaming_flag).length;
    if (times.length === 0) return { flagged, avg: 0, median: 0 };
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((s, x) => s + x, 0) / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    return { flagged, avg, median };
  }, [filteredResponses]);

  const noData = !loading && responses.length === 0;
  const noFilteredData = !loading && responses.length > 0 && filteredResponses.length === 0;
  const enoughWeeks = weekBuckets.length >= 3;

  return (
    <main className="min-h-dvh bg-gradient-warm">
      <DashboardHeader rightSlot={
        <>
          <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary">
            Sign out
          </button>
        </>
      } />

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <DashboardSidebar />

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground">Trends and patterns across surveys, dimensions, and branches over time.</p>
          </div>

          <ResponsesFilterBar
            filters={filters}
            setFilters={setFilters}
            branches={branches}
            showSpecialToggles={false}
            showSearch={false}
          />

          {noData ? (
            <div className={`${cardCls} flex min-h-[300px] items-center justify-center text-center`}>
              <div>
                <p className="text-4xl">📊</p>
                <p className="mt-3 text-sm font-bold text-foreground">No survey data yet</p>
                <p className="text-xs text-muted-foreground">Analytics will populate as trainees complete their check-ins.</p>
              </div>
            </div>
          ) : (
            <>
              {/* 1) Risk trend over time */}
              <section className={cardCls}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className={titleCls}>Risk trend over time</h3>
                    <p className="text-xs text-muted-foreground">Weekly distribution of risk levels across all survey responses</p>
                  </div>
                  <div className="flex rounded-full border border-border p-0.5 text-[10px] font-bold">
                    {(["count", "pct"] as const).map((m) => (
                      <button key={m} onClick={() => setTrendMode(m)}
                        className={`rounded-full px-2.5 py-0.5 ${trendMode === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                        {m === "count" ? "Count" : "%"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 h-64">
                  {!enoughWeeks ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                      Trend data will appear after a few weeks of survey responses
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={riskTrendDisplay} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => trendMode === "pct" ? `${v}%` : v} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                          labelFormatter={(l) => `Week of ${l}`} />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                        <Area type="monotone" dataKey="LOW" stackId="1" stroke={RISK_COLORS.LOW} fill={RISK_COLORS.LOW} fillOpacity={0.7} />
                        <Area type="monotone" dataKey="MEDIUM" stackId="1" stroke={RISK_COLORS.MEDIUM} fill={RISK_COLORS.MEDIUM} fillOpacity={0.7} />
                        <Area type="monotone" dataKey="HIGH" stackId="1" stroke={RISK_COLORS.HIGH} fill={RISK_COLORS.HIGH} fillOpacity={0.8} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              {/* 2) Dimension trends */}
              <section className={cardCls}>
                <h3 className={titleCls}>Dimension trends</h3>
                <p className="text-xs text-muted-foreground">Average per-dimension scores over time. Spot which areas are improving or worsening.</p>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {dimensionTrends.map((d) => {
                    const color = d.key === "training_effectiveness" ? "#2563EB"
                      : d.key === "attrition_risk" ? "#DC2626"
                      : d.key === "support_guidance" ? "#7C3AED"
                      : d.key === "adjustment_wellbeing" ? "#0D9488"
                      : "#4F46E5";
                    const isTransitionEmpty = d.key === "transition_readiness" && !d.hasAnyData;
                    const risk = d.currentAvg !== null ? dimRiskFromScore(d.currentAvg, 10) : "N/A";
                    return (
                      <div key={d.key} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-foreground">{d.label}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-extrabold tabular-nums text-foreground">
                              {d.currentAvg !== null ? d.currentAvg.toFixed(1) : "—"}
                            </span>
                            {risk !== "N/A" && (
                              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                                style={{ background: RISK_COLORS[risk] }}>
                                {risk}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 h-32">
                          {isTransitionEmpty ? (
                            <div className="flex h-full items-center justify-center rounded-lg bg-secondary/40 text-center text-[11px] text-muted-foreground">
                              Awaiting Day 60+ responses
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={d.series} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                                  formatter={(v: any) => [Number(v).toFixed(1), "Score"]} />
                                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} connectNulls />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 3) Branch deep comparison */}
              <section className={cardCls}>
                <h3 className={titleCls}>Branch comparison by dimension</h3>
                <p className="text-xs text-muted-foreground">How each branch scores across all 5 risk dimensions</p>
                <div className="mt-4 h-72">
                  {branchDimData.branchList.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No branch data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchDimData.data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="dimension" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                          formatter={(v: any, name: string) => {
                            const num = Number(v);
                            const risk = dimRiskFromScore(num, 10);
                            return [`${num} (${risk})`, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                        {branchDimData.branchList.map((b) => (
                          <Bar key={b} dataKey={b} fill={branchColor(b)} radius={[4, 4, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {branchInsight && (
                  <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                    💡 {branchInsight}
                  </p>
                )}
              </section>

              {/* 4) Stage-wise risk distribution */}
              <section className={cardCls}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className={titleCls}>Risk distribution by survey stage</h3>
                    <p className="text-xs text-muted-foreground">How risk levels shift as trainees progress through training</p>
                  </div>
                  <div className="flex rounded-full border border-border p-0.5 text-[10px] font-bold">
                    {(["count", "pct"] as const).map((m) => (
                      <button key={m} onClick={() => setStageMode(m)}
                        className={`rounded-full px-2.5 py-0.5 ${stageMode === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                        {m === "count" ? "Count" : "%"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageRiskDisplay} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => stageMode === "pct" ? `${v}%` : v} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                      <Bar dataKey="LOW" stackId="a" fill={RISK_COLORS.LOW} />
                      <Bar dataKey="MEDIUM" stackId="a" fill={RISK_COLORS.MEDIUM} />
                      <Bar dataKey="HIGH" stackId="a" fill={RISK_COLORS.HIGH} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {stageInsight && (
                  <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                    💡 {stageInsight}
                  </p>
                )}
              </section>

              {/* 5) Completion rate by branch */}
              <section className={cardCls}>
                <h3 className={titleCls}>Survey completion by branch</h3>
                <p className="text-xs text-muted-foreground">Branches with low completion may need survey reminders</p>
                <ul className="mt-4 space-y-2.5">
                  {branchCompletion.length === 0 ? (
                    <li className="text-xs text-muted-foreground">No branch data available.</li>
                  ) : branchCompletion.map((b) => {
                    const color = b.pct >= 80 ? "#2D8B4E" : b.pct >= 50 ? "#D4820C" : "#C23B22";
                    return (
                      <li key={b.branch}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-foreground">{b.branch}</span>
                          <span className="text-xs text-muted-foreground">{b.completed} of {b.eligible} eligible</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div style={{ width: `${b.pct}%`, background: color }} className="h-full transition-all" />
                          </div>
                          <span className="w-10 text-right text-xs font-bold tabular-nums" style={{ color }}>{b.pct}%</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* 6) Response time distribution */}
              <section className={cardCls}>
                <h3 className={titleCls}>Response time distribution</h3>
                <p className="text-xs text-muted-foreground">How long trainees spend on each survey. Very fast completions may indicate rushed responses.</p>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeDist} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="key" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {timeDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs">
                      <p className="text-foreground">⚡ <span className="font-bold tabular-nums">{timeStats.flagged}</span> response{timeStats.flagged === 1 ? "" : "s"} flagged as potentially rushed</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-xs">
                      <p className="text-muted-foreground">Average completion time</p>
                      <p className="mt-0.5 text-base font-bold text-foreground">{formatTime(Math.round(timeStats.avg))}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-xs">
                      <p className="text-muted-foreground">Median completion time</p>
                      <p className="mt-0.5 text-base font-bold text-foreground">{formatTime(Math.round(timeStats.median))}</p>
                    </div>
                  </div>
                </div>
              </section>

              {noFilteredData && (
                <div className={`${cardCls} text-center text-xs text-muted-foreground`}>No data matches the current filters.</div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AnalyticsPage() {
  return (
    <RequireHr>
      <AnalyticsInner />
    </RequireHr>
  );
}
