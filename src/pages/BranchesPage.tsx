import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RequireHr from "@/hr/RequireHr";
import { useHrAuth } from "@/hr/useHrAuth";
import { DashboardHeader, DashboardSidebar } from "@/hr/DashboardSidebar";
import { DIM_COLORS, DIM_LABELS, RISK_COLORS } from "@/hr/DashboardCharts";
import {
  DIM_KEYS, DIM_MAX, EmpLite, RespLite, STAGES,
  avgRiskScore, completionForEmployees, daysSince, dimAverages,
  dimRiskBand, isEligibleForStage, latestResponseByEmp, relTime, riskLevelFromScore,
} from "@/hr/aggregations";

const cardCls = "rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur";
const titleCls = "text-sm font-bold uppercase tracking-wide text-muted-foreground";

const RISK_BG: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "bg-destructive/15 text-destructive",
};

function pctColor(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-destructive";
}

function BranchesInner() {
  const { user } = useHrAuth();
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [responses, setResponses] = useState<RespLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: emp }, { data: resp }] = await Promise.all([
        supabase.from("employees").select("id,name,employee_code,branch,area_manager,doj,status"),
        supabase.from("survey_responses").select("*").order("submitted_at", { ascending: false }),
      ]);
      setEmployees((emp ?? []) as EmpLite[]);
      setResponses((resp ?? []) as unknown as RespLite[]);
      setLoading(false);
    })();
  }, []);

  const branches = useMemo(
    () => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(),
    [employees],
  );

  // Active = status === 'training' (positioned still shown for breakdown)
  const activeEmps = useMemo(() => employees.filter((e) => e.status !== "exited"), [employees]);

  const branchSummary = useMemo(() => {
    return branches.map((b) => {
      const emps = activeEmps.filter((e) => e.branch === b);
      const empIds = new Set(emps.map((e) => e.id));
      const latest = Array.from(latestResponseByEmp(responses).values()).filter((r) => empIds.has(r.employee_id));
      const avg = avgRiskScore(latest);
      return { branch: b, count: emps.length, avg, level: riskLevelFromScore(avg) };
    });
  }, [branches, activeEmps, responses]);

  // Auto-select branch with highest avg risk on load
  useEffect(() => {
    if (selected || branchSummary.length === 0) return;
    const sorted = [...branchSummary].sort((a, b) => b.avg - a.avg);
    setSelected(sorted[0].branch);
  }, [branchSummary, selected]);

  const branch = selected;
  const branchEmps = useMemo(() => activeEmps.filter((e) => e.branch === branch), [activeEmps, branch]);
  const branchEmpIds = useMemo(() => new Set(branchEmps.map((e) => e.id)), [branchEmps]);
  const branchResponses = useMemo(() => responses.filter((r) => branchEmpIds.has(r.employee_id)), [responses, branchEmpIds]);
  const latestMap = useMemo(() => latestResponseByEmp(branchResponses), [branchResponses]);

  // KPIs
  const completion = useMemo(() => completionForEmployees(branchEmps, branchResponses), [branchEmps, branchResponses]);
  const trainingCount = branchEmps.filter((e) => e.status === "training").length;
  const positionedCount = branchEmps.filter((e) => e.status === "positioned").length;
  const latestList = Array.from(latestMap.values());
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<"HIGH"|"MEDIUM"|"LOW", number>;
  for (const r of latestList) counts[r.risk_level]++;
  const criticalFlagsCount = latestList.reduce((s, r) => s + (r.critical_flags?.length || 0), 0);

  // Trainees table (sorted by latest score desc), no-survey at bottom grayed
  const traineesRows = useMemo(() => {
    const withResp = branchEmps.map((e) => ({ e, r: latestMap.get(e.id) }));
    withResp.sort((a, b) => {
      if (!a.r && !b.r) return a.e.name.localeCompare(b.e.name);
      if (!a.r) return 1; if (!b.r) return -1;
      return b.r.final_score - a.r.final_score;
    });
    return withResp;
  }, [branchEmps, latestMap]);

  // Dimension breakdown branch vs company avg
  const branchDimAvg = useMemo(() => dimAverages(latestList), [latestList]);
  const companyLatest = useMemo(() => Array.from(latestResponseByEmp(responses).values()), [responses]);
  const companyDimAvg = useMemo(() => dimAverages(companyLatest), [companyLatest]);
  const biggestGapDim = useMemo(() => {
    let best = ""; let g = -1;
    for (const k of DIM_KEYS) {
      const gap = (branchDimAvg[k] ?? 0) - (companyDimAvg[k] ?? 0);
      if (gap > g) { g = gap; best = k; }
    }
    return best;
  }, [branchDimAvg, companyDimAvg]);

  // Manager performance within branch
  const managerRows = useMemo(() => {
    const byMgr = new Map<string, EmpLite[]>();
    for (const e of branchEmps) {
      const arr = byMgr.get(e.area_manager) ?? [];
      arr.push(e); byMgr.set(e.area_manager, arr);
    }
    const rows = Array.from(byMgr.entries()).map(([mgr, list]) => {
      const ids = new Set(list.map((e) => e.id));
      const respList = branchResponses.filter((r) => ids.has(r.employee_id));
      const completion = completionForEmployees(list, respList);
      const latest = Array.from(latestResponseByEmp(respList).values());
      const avg = avgRiskScore(latest);
      const high = latest.filter((r) => r.risk_level === "HIGH").length;
      return {
        mgr, count: list.length, surveys: respList.length, completion: completion.pct,
        avg, level: riskLevelFromScore(avg), high, flag: high >= 2,
      };
    });
    rows.sort((a, b) => b.avg - a.avg);
    return rows;
  }, [branchEmps, branchResponses]);

  // Critical alerts feed (this branch only)
  const alerts = useMemo(() => {
    const out: Array<{ id: string; emp: EmpLite; flag: string; stage: number; submitted_at: string }> = [];
    for (const r of branchResponses) {
      if (!r.critical_flags || r.critical_flags.length === 0) continue;
      const e = branchEmps.find((x) => x.id === r.employee_id);
      if (!e) continue;
      for (const f of r.critical_flags) out.push({ id: r.id + f, emp: e, flag: f, stage: Number(r.stage), submitted_at: r.submitted_at });
    }
    out.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    return out;
  }, [branchResponses, branchEmps]);

  // Funnel
  const funnel = useMemo(() => {
    const respondedSet = new Set<string>();
    for (const r of branchResponses) respondedSet.add(`${r.employee_id}:${Number(r.stage)}`);
    return STAGES.map((s) => {
      const eligible = branchEmps.filter((e) => isEligibleForStage(e.doj, s));
      const responded = eligible.filter((e) => respondedSet.has(`${e.id}:${s}`)).length;
      const pct = eligible.length ? Math.round((responded / eligible.length) * 100) : null;
      return { stage: s, eligible: eligible.length, responded, pct };
    });
  }, [branchEmps, branchResponses]);

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
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Branches</h1>
            <p className="text-xs text-muted-foreground">Drill into one branch's training health and compare against the company.</p>
          </div>

          {/* Branch selector */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {branchSummary.map((b) => {
              const active = b.branch === branch;
              const color = RISK_COLORS[b.level];
              return (
                <button
                  key={b.branch}
                  onClick={() => setSelected(b.branch)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-primary bg-card shadow-bubble ring-2 ring-primary/30"
                      : "border-border/60 bg-card/70 hover:bg-card"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{b.branch}</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">{b.count}</p>
                  <p className="text-[11px] text-muted-foreground">active trainees</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">avg risk</span>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${color}22`, color }}>
                      {b.avg.toFixed(1)} · {b.level}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading branches…</p>
          ) : !branch ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No branches yet.</p>
          ) : branchEmps.length === 0 ? (
            <div className={cardCls}><p className="p-4 text-center text-sm text-muted-foreground">No active trainees in {branch} currently.</p></div>
          ) : (
            <>
              {/* KPI row */}
              <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <div className={cardCls + " py-4"}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Active trainees</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">{branchEmps.length}</p>
                  <p className="text-[10px] text-muted-foreground">{trainingCount} training · {positionedCount} positioned</p>
                </div>
                <div className={cardCls + " py-4"}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Survey completion</p>
                  <p className={`mt-1 text-2xl font-extrabold ${pctColor(completion.pct)}`}>{completion.pct}%</p>
                  <p className="text-[10px] text-muted-foreground">{completion.responded} of {completion.eligible} eligible</p>
                </div>
                <div className={cardCls + " py-4"}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">High risk</p>
                  <p className={`mt-1 text-2xl font-extrabold ${counts.HIGH > 0 ? "text-destructive" : "text-foreground"}`}>{counts.HIGH}</p>
                </div>
                <div className={cardCls + " py-4"}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Medium risk</p>
                  <p className={`mt-1 text-2xl font-extrabold ${counts.MEDIUM > 0 ? "text-amber-600" : "text-foreground"}`}>{counts.MEDIUM}</p>
                </div>
                <div className={cardCls + " py-4"}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Low risk</p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-600">{counts.LOW}</p>
                </div>
                <div className={cardCls + " py-4"}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Critical flags</p>
                  <p className={`mt-1 text-2xl font-extrabold ${criticalFlagsCount > 0 ? "text-destructive" : "text-foreground"}`}>{criticalFlagsCount}</p>
                </div>
              </section>

              {/* Trainees table */}
              <section className={cardCls}>
                <h2 className={titleCls}>Trainees in {branch}</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2">Name</th>
                        <th className="px-2 py-2">Employee ID</th>
                        <th className="px-2 py-2">Manager</th>
                        <th className="px-2 py-2">DOJ</th>
                        <th className="px-2 py-2">Days</th>
                        <th className="px-2 py-2">Latest survey</th>
                        <th className="px-2 py-2">Risk</th>
                        <th className="px-2 py-2">Score</th>
                        <th className="px-2 py-2">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {traineesRows.map(({ e, r }) => {
                        const flagCount = r?.critical_flags?.length ?? 0;
                        return (
                          <tr key={e.id} className={`border-t border-border/40 ${!r ? "opacity-60" : ""}`}>
                            <td className="px-2 py-2">
                              <Link to={`/dashboard/trainees/${e.id}`} className="font-bold text-foreground hover:underline">{e.name}</Link>
                            </td>
                            <td className="px-2 py-2 text-xs text-muted-foreground">{e.employee_code}</td>
                            <td className="px-2 py-2 text-xs">{e.area_manager}</td>
                            <td className="px-2 py-2 text-xs text-muted-foreground">{new Date(e.doj).toLocaleDateString()}</td>
                            <td className="px-2 py-2 text-xs">{daysSince(e.doj)}</td>
                            <td className="px-2 py-2 text-xs">
                              {r ? <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">Day {Number(r.stage)}</span>
                                : <span className="text-muted-foreground">Awaiting first check-in</span>}
                            </td>
                            <td className="px-2 py-2">
                              {r ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_BG[r.risk_level]}`}>{r.risk_level}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-2 font-bold tabular-nums">{r ? r.final_score.toFixed(1) : <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-2 py-2 text-xs">
                              {flagCount > 0 ? <span className="inline-flex items-center gap-1 font-bold text-destructive"><span className="h-2 w-2 rounded-full bg-destructive" />{flagCount}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Dimension comparison */}
              <section className={cardCls}>
                <h2 className={titleCls}>How {branch} compares to the company</h2>
                <p className="text-xs text-muted-foreground">Solid = this branch. Faded = company average.</p>
                <div className="mt-4 space-y-4">
                  {DIM_KEYS.map((k) => {
                    const bv = branchDimAvg[k] ?? 0; const cv = companyDimAvg[k] ?? 0;
                    const color = DIM_COLORS[k]; const risk = dimRiskBand(bv);
                    const isBiggest = k === biggestGapDim;
                    return (
                      <div key={k}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{DIM_LABELS[k]}</span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums text-foreground">{bv.toFixed(1)}</span>
                            <span className={`rounded-full px-2 py-0.5 font-bold ${RISK_BG[risk]}`}>{risk}</span>
                            {isBiggest && <span className="text-[11px] font-bold text-destructive">← Biggest gap from average</span>}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="relative h-3 rounded bg-secondary/50">
                            <div className="h-3 rounded" style={{ width: `${Math.min(100, (bv / DIM_MAX) * 100)}%`, background: color }} />
                          </div>
                          <div className="relative h-2 rounded bg-secondary/30">
                            <div className="h-2 rounded opacity-50" style={{ width: `${Math.min(100, (cv / DIM_MAX) * 100)}%`, background: color, opacity: 0.35 }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">Company avg: {cv.toFixed(1)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Manager performance + alerts side-by-side */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className={cardCls}>
                  <h2 className={titleCls}>Manager performance in {branch}</h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2">Manager</th>
                          <th className="px-2 py-2">Tr.</th>
                          <th className="px-2 py-2">Surveys</th>
                          <th className="px-2 py-2">Comp%</th>
                          <th className="px-2 py-2">Avg risk</th>
                          <th className="px-2 py-2">High</th>
                          <th className="px-2 py-2">⚠️</th>
                        </tr>
                      </thead>
                      <tbody>
                          <tr key={m.mgr}
                            className={`border-t border-border/40 ${m.flag ? "bg-destructive/5" : ""}`}>
                            <td className="px-2 py-2 font-bold text-foreground">{m.mgr}</td>
                            <td className="px-2 py-2 text-xs">{m.count}</td>
                            <td className="px-2 py-2 text-xs">{m.surveys}</td>
                            <td className={`px-2 py-2 font-bold ${pctColor(m.completion)}`}>{m.completion}%</td>
                            <td className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_BG[m.level]}`}>{m.avg.toFixed(1)}</span></td>
                            <td className="px-2 py-2 font-bold text-destructive">{m.high || ""}</td>
                            <td className="px-2 py-2">{m.flag ? "🟥" : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={cardCls}>
                  <h2 className={titleCls}>Critical alerts · {branch}</h2>
                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-2">
                    {alerts.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">No critical flags raised in {branch} 🎉</p>
                    ) : alerts.map((a) => (
                      <Link key={a.id} to={`/dashboard/trainees/${a.emp.id}`}
                        className="block rounded-xl border-l-4 border-destructive bg-background/40 p-3 text-xs hover:bg-background/70">
                        <p className="font-bold text-foreground">🟥 {a.emp.name} · Day {a.stage}</p>
                        <p className="italic text-foreground">"{a.flag}"</p>
                        <p className="text-[10px] text-muted-foreground">{relTime(a.submitted_at)}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              {/* Funnel */}
              <section className={cardCls}>
                <h2 className={titleCls}>Survey completion funnel · {branch}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
                  {funnel.map((f) => {
                    const color = f.pct == null ? "text-muted-foreground" : pctColor(f.pct);
                    return (
                      <div key={f.stage} className="rounded-xl border border-border/60 bg-background/40 p-3 text-center">
                        <p className="text-[11px] font-bold uppercase text-muted-foreground">Day {f.stage}</p>
                        <p className={`mt-1 text-xl font-extrabold ${color}`}>{f.pct == null ? "—" : `${f.pct}%`}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {f.eligible === 0 ? "no trainees eligible" : `${f.responded} of ${f.eligible} eligible`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function BranchesPage() {
  return <RequireHr><BranchesInner /></RequireHr>;
}
