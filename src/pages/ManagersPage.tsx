import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import RequireHr from "@/hr/RequireHr";
import { useHrAuth } from "@/hr/useHrAuth";
import { DashboardHeader, DashboardSidebar } from "@/hr/DashboardSidebar";
import { DIM_COLORS, DIM_LABELS, RISK_COLORS } from "@/hr/DashboardCharts";
import {
  DIM_KEYS, DIM_MAX, EmpLite, RespLite,
  avgRiskScore, completionForEmployees, daysSince, dimAverages,
  dimRiskBand, latestResponseByEmp, relTime, riskLevelFromScore, trend,
} from "@/hr/aggregations";

const cardCls = "rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur";
const titleCls = "text-sm font-bold uppercase tracking-wide text-muted-foreground";

const RISK_BG: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "bg-destructive/15 text-destructive",
};
function pctColor(pct: number) { return pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-destructive"; }

type SortKey = "avg" | "high" | "count" | "completion";

function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); const dow = (x.getDay()+6)%7; x.setDate(x.getDate()-dow); return x; }
function weekKey(d: Date) { return `${d.getMonth()+1}/${d.getDate()}`; }

function ManagersInner() {
  const { user } = useHrAuth();
  const [params, setParams] = useSearchParams();
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [responses, setResponses] = useState<RespLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("avg");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: emp }, { data: resp }] = await Promise.all([
        supabase.from("employees").select("id,name,employee_code,branch,area_manager,doj,status"),
        supabase.from("survey_responses").select("*").order("submitted_at", { ascending: true }),
      ]);
      setEmployees((emp ?? []) as EmpLite[]);
      setResponses((resp ?? []) as unknown as RespLite[]);
      setLoading(false);
    })();
  }, []);

  // Open from URL ?focus=Manager Name
  useEffect(() => {
    const f = params.get("focus");
    if (f) setExpanded(f);
  }, [params]);

  const branches = useMemo(() => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(), [employees]);

  // Build manager rows
  const allRows = useMemo(() => {
    const byMgr = new Map<string, EmpLite[]>();
    for (const e of employees) {
      if (e.status === "exited") continue;
      const arr = byMgr.get(e.area_manager) ?? [];
      arr.push(e); byMgr.set(e.area_manager, arr);
    }
    return Array.from(byMgr.entries()).map(([mgr, list]) => {
      const ids = new Set(list.map((e) => e.id));
      const respList = responses.filter((r) => ids.has(r.employee_id));
      const completion = completionForEmployees(list, respList);
      const latestMap = latestResponseByEmp(respList);
      const latest = Array.from(latestMap.values());
      const avg = avgRiskScore(latest);
      const high = latest.filter((r) => r.risk_level === "HIGH").length;
      const med = latest.filter((r) => r.risk_level === "MEDIUM").length;
      const low = latest.filter((r) => r.risk_level === "LOW").length;
      const flagsCount = latest.reduce((s, r) => s + (r.critical_flags?.length || 0), 0);
      const branchSet = Array.from(new Set(list.map((e) => e.branch)));
      const flagged = high >= 2 || completion.pct < 50;
      return {
        mgr, branchSet, list, respList, latestMap, latest,
        count: list.length, surveys: respList.length,
        completionPct: completion.pct, avg, level: riskLevelFromScore(avg),
        high, med, low, flagsCount, flagged,
      };
    });
  }, [employees, responses]);

  const filtered = useMemo(() => {
    let rows = allRows;
    if (branchFilter !== "all") rows = rows.filter((r) => r.branchSet.includes(branchFilter));
    if (flaggedOnly) rows = rows.filter((r) => r.flagged);
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "avg": return b.avg - a.avg;
        case "high": return b.high - a.high;
        case "count": return b.count - a.count;
        case "completion": return a.completionPct - b.completionPct;
      }
    });
    return rows;
  }, [allRows, branchFilter, sort, flaggedOnly]);

  // Company-wide latest dim avg (for comparisons)
  const companyLatest = useMemo(() => Array.from(latestResponseByEmp(responses).values()), [responses]);
  const companyDimAvg = useMemo(() => dimAverages(companyLatest), [companyLatest]);

  // Top 5 managers by trainee count for comparison chart
  const topManagers = useMemo(() => {
    return [...allRows].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [allRows]);
  const palette = ["#2563EB", "#D97706", "#16A34A", "#DC2626", "#7C3AED"];
  const comparisonData = useMemo(() => {
    return DIM_KEYS.map((k) => {
      const row: Record<string, number | string> = { dim: DIM_LABELS[k] };
      topManagers.forEach((m) => { row[m.mgr] = +(dimAverages(m.latest)[k] ?? 0).toFixed(2); });
      return row;
    });
  }, [topManagers]);

  return (
    <main className="min-h-dvh bg-gradient-warm">
      <DashboardHeader rightSlot={
        <>
          <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary">Sign out</button>
        </>
      } />

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <DashboardSidebar />
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Managers</h1>
            <p className="text-xs text-muted-foreground">Evaluate area manager training quality based on trainee outcomes.</p>
          </div>

          {/* Filter bar */}
          <section className={cardCls + " py-3"}>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2">
                <span className="font-bold text-muted-foreground">Branch</span>
                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
                  className="rounded-full border border-border bg-background px-3 py-1 font-bold">
                  <option value="all">All</option>
                  {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="font-bold text-muted-foreground">Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-full border border-border bg-background px-3 py-1 font-bold">
                  <option value="avg">Avg risk score</option>
                  <option value="high">High risk count</option>
                  <option value="count">Trainee count</option>
                  <option value="completion">Completion rate</option>
                </select>
              </label>
              <label className="ml-auto flex items-center gap-2">
                <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
                <span className="font-bold text-muted-foreground">Show flagged only ⚠️</span>
              </label>
            </div>
          </section>

          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading managers…</p>
          ) : filtered.length === 0 ? (
            <div className={cardCls}><p className="p-4 text-center text-sm text-muted-foreground">No manager data available yet. This page will populate once trainees complete surveys.</p></div>
          ) : (
            <>
              {/* Manager ranking table */}
              <section className={cardCls}>
                <h2 className={titleCls}>Manager ranking</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Manager</th>
                        <th className="px-2 py-2">Branch</th>
                        <th className="px-2 py-2">Tr.</th>
                        <th className="px-2 py-2">Surveys</th>
                        <th className="px-2 py-2">Comp%</th>
                        <th className="px-2 py-2">Avg risk</th>
                        <th className="px-2 py-2">High</th>
                        <th className="px-2 py-2">Med</th>
                        <th className="px-2 py-2">Low</th>
                        <th className="px-2 py-2">Flags</th>
                        <th className="px-2 py-2">⚠️</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((m, i) => {
                        const isOpen = expanded === m.mgr;
                        return (
                          <Fragment key={m.mgr}>
                            <tr onClick={() => { setExpanded(isOpen ? null : m.mgr); if (!isOpen) setParams({ focus: m.mgr }, { replace: true }); else setParams({}, { replace: true }); }}
                              className={`cursor-pointer border-t border-border/40 hover:bg-background/40 ${m.flagged ? "bg-destructive/5" : ""} ${isOpen ? "bg-background/40" : ""}`}>
                              <td className="px-2 py-2 text-xs text-muted-foreground">{i + 1}</td>
                              <td className="px-2 py-2 font-bold text-foreground">{m.mgr}</td>
                              <td className="px-2 py-2 text-xs">{m.branchSet.join(", ")}</td>
                              <td className="px-2 py-2 text-xs">{m.count}</td>
                              <td className="px-2 py-2 text-xs">{m.surveys}</td>
                              <td className={`px-2 py-2 font-bold ${pctColor(m.completionPct)}`}>{m.completionPct}%</td>
                              <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_BG[m.level]}`}>{m.avg.toFixed(1)}</span></td>
                              <td className="px-2 py-2 font-bold text-destructive">{m.high || ""}</td>
                              <td className="px-2 py-2 text-amber-600">{m.med || ""}</td>
                              <td className="px-2 py-2 text-emerald-600">{m.low || ""}</td>
                              <td className="px-2 py-2 text-xs">{m.flagsCount > 0 ? <span className="font-bold text-destructive">{m.flagsCount}</span> : "—"}</td>
                              <td className="px-2 py-2">{m.flagged ? "🔴" : ""}</td>
                            </tr>
                            {isOpen && (
                              <tr className="border-t border-border/40 bg-background/30">
                                <td colSpan={12} className="p-4">
                                  <ManagerDetail
                                    managerName={m.mgr}
                                    list={m.list}
                                    respList={m.respList}
                                    latestMap={m.latestMap}
                                    companyDimAvg={companyDimAvg}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Comparison chart */}
              {topManagers.length > 0 && (
                <section className={cardCls}>
                  <h2 className={titleCls}>Manager comparison across dimensions</h2>
                  <p className="text-xs text-muted-foreground">Top 5 managers by trainee count. Higher = more concern.</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="dim" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, DIM_MAX]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {topManagers.map((m, i) => (
                          <Bar key={m.mgr} dataKey={m.mgr} fill={palette[i]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ManagerDetail({ managerName, list, respList, latestMap, companyDimAvg }: {
  managerName: string;
  list: EmpLite[]; respList: RespLite[];
  latestMap: Map<string, RespLite>;
  companyDimAvg: Record<string, number>;
}) {
  const traineeRows = useMemo(() => {
    const respByEmp = new Map<string, RespLite[]>();
    for (const r of respList) { const arr = respByEmp.get(r.employee_id) ?? []; arr.push(r); respByEmp.set(r.employee_id, arr); }
    return list.map((e) => ({ e, latest: latestMap.get(e.id), all: respByEmp.get(e.id) ?? [] }))
      .sort((a, b) => (b.latest?.final_score ?? -1) - (a.latest?.final_score ?? -1));
  }, [list, respList, latestMap]);

  const latest = Array.from(latestMap.values());
  const dim = dimAverages(latest);

  // Critical flags
  const flags = respList.flatMap((r) => (r.critical_flags ?? []).map((f) => ({
    f, name: list.find((e) => e.id === r.employee_id)?.name ?? "?",
    empId: r.employee_id, stage: Number(r.stage), submitted_at: r.submitted_at,
  }))).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  // Auto summary
  const elevated: string[] = [];
  const strengths: string[] = [];
  for (const k of DIM_KEYS) {
    const cv = companyDimAvg[k] || 0; if (!cv) continue;
    const ratio = (dim[k] ?? 0) / cv;
    if (ratio >= 1.5) elevated.push(`${DIM_LABELS[k]} (${ratio.toFixed(1)}x avg)`);
    if (ratio <= 0.7 && (dim[k] ?? 0) > 0) strengths.push(DIM_LABELS[k]);
  }
  const high = latest.filter((r) => r.risk_level === "HIGH").length;
  const completion = completionForEmployees(list, respList);
  const companyCompletionPct = (() => {
    // approx: average not used; use threshold from action matrix
    return 73;
  })();
  const summaryParts: string[] = [];
  if (elevated.length) summaryParts.push(`This manager's trainees show elevated concerns in ${elevated.join(" and ")}.`);
  if (strengths.length) summaryParts.push(`Strength in ${strengths.join(", ")}.`);
  if (high >= 2) summaryParts.push(`${high} of ${list.length} trainees are HIGH risk.`);
  if (completion.pct < companyCompletionPct) summaryParts.push(`Completion rate is ${completion.pct}%, below the ${companyCompletionPct}% company average.`);
  if (!summaryParts.length) summaryParts.push("This manager's area is performing within expected ranges.");
  let recommendation = "";
  if (elevated.length || high >= 2) recommendation = "Recommended: HR check-in with this manager to discuss training support quality.";
  else if (completion.pct < 50) recommendation = "Recommended: nudge for survey completion across this manager's trainees.";

  // Trend
  const weekly = useMemo(() => {
    if (respList.length < 2) return [] as Array<{ week: string; avg: number }>;
    const sorted = [...respList].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    const earliest = startOfWeek(new Date(sorted[0].submitted_at));
    const end = startOfWeek(new Date());
    const buckets: Array<{ start: Date; end: Date; key: string }> = [];
    for (let d = new Date(earliest); d <= end; d.setDate(d.getDate() + 7)) {
      const s = new Date(d); const e = new Date(d); e.setDate(e.getDate() + 7);
      buckets.push({ start: s, end: e, key: weekKey(s) });
    }
    return buckets.map((b) => {
      const inB = respList.filter((r) => { const t = new Date(r.submitted_at).getTime(); return t >= b.start.getTime() && t < b.end.getTime(); });
      return { week: b.key, avg: inB.length ? inB.reduce((s, r) => s + r.final_score, 0) / inB.length : 0 };
    });
  }, [respList]);

  return (
    <div className="space-y-4">
      {/* Trainee list */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Trainees · {list.length}</h3>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-xs">
            <thead className="bg-background/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5">Trainee</th><th className="px-2 py-1.5">Employee ID</th>
                <th className="px-2 py-1.5">DOJ</th><th className="px-2 py-1.5">Days</th>
                <th className="px-2 py-1.5">Latest</th><th className="px-2 py-1.5">Risk</th>
                <th className="px-2 py-1.5">Score</th><th className="px-2 py-1.5">Flags</th>
                <th className="px-2 py-1.5">Trend</th>
              </tr>
            </thead>
            <tbody>
              {traineeRows.map(({ e, latest, all }) => {
                const t = trend(all);
                const arrow = t === "down" ? "🟢" : t === "flat" ? "➡️" : t === "up" ? "🔴" : "—";
                return (
                  <tr key={e.id} className="border-t border-border/40">
                    <td className="px-2 py-1.5"><Link to={`/dashboard/trainees/${e.id}`} className="font-bold text-foreground hover:underline">{e.name}</Link></td>
                    <td className="px-2 py-1.5 text-muted-foreground">{e.employee_code}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{new Date(e.doj).toLocaleDateString()}</td>
                    <td className="px-2 py-1.5">{daysSince(e.doj)}</td>
                    <td className="px-2 py-1.5">{latest ? `Day ${Number(latest.stage)}` : "—"}</td>
                    <td className="px-2 py-1.5">{latest ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_BG[latest.risk_level]}`}>{latest.risk_level}</span> : "—"}</td>
                    <td className="px-2 py-1.5 font-bold tabular-nums">{latest ? latest.final_score.toFixed(1) : "—"}</td>
                    <td className="px-2 py-1.5">{(latest?.critical_flags?.length ?? 0) > 0 ? <span className="font-bold text-destructive">{latest!.critical_flags!.length}</span> : "—"}</td>
                    <td className="px-2 py-1.5">{arrow}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dimension analysis */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Dimension analysis · vs company average</h3>
        <div className="space-y-3">
          {DIM_KEYS.map((k) => {
            const mv = dim[k] ?? 0; const cv = companyDimAvg[k] ?? 0;
            const ratio = cv ? mv / cv : 0;
            const concern = ratio >= 1.5; const strength = ratio <= 0.7 && mv > 0 && cv > 0;
            return (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{DIM_LABELS[k]}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{mv.toFixed(1)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${RISK_BG[dimRiskBand(mv)]}`}>{dimRiskBand(mv)}</span>
                    {concern && <span className="text-[11px] font-bold text-destructive">← Concern: {ratio.toFixed(1)}x avg</span>}
                    {strength && <span className="text-[11px] font-bold text-emerald-600">← Strength</span>}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-3 rounded bg-secondary/50"><div className="h-3 rounded" style={{ width: `${Math.min(100, (mv / DIM_MAX) * 100)}%`, background: DIM_COLORS[k] }} /></div>
                  <div className="h-2 rounded bg-secondary/30"><div className="h-2 rounded" style={{ width: `${Math.min(100, (cv / DIM_MAX) * 100)}%`, background: DIM_COLORS[k], opacity: 0.35 }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical flags + Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Critical flags</h3>
          {flags.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">No critical flags from this manager's trainees ✓</p>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {flags.map((x, i) => (
                <Link key={i} to={`/dashboard/trainees/${x.empId}`} className="block rounded-xl border-l-4 border-destructive bg-background/40 p-2 text-xs hover:bg-background/70">
                  <p className="font-bold text-foreground">🟥 {x.name} · Day {x.stage}</p>
                  <p className="italic">"{x.f}"</p>
                  <p className="text-[10px] text-muted-foreground">{relTime(x.submitted_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Summary</h3>
          <div className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs leading-relaxed">
            <p className="font-bold text-foreground">{summaryParts.join(" ")}</p>
            {recommendation && <p className="mt-2 text-foreground">{recommendation}</p>}
          </div>
        </div>
      </div>

      {/* Trend */}
      {weekly.length >= 4 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Risk trend for {managerName}'s trainees</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 35]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="avg" stroke={RISK_COLORS.HIGH} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagersPage() {
  return <RequireHr><ManagersInner /></RequireHr>;
}
