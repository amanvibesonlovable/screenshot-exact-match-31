import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Copy, Sprout, Trash2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { seedAscentData, clearAscentData } from "@/ascent/seed";
import { AscentLayout } from "@/ascent/AscentLayout";
import { AscentFilterBar } from "@/ascent/AscentFilterBar";
import { KPIBar } from "@/hr/KPIBar";
import {
  ASCENT_TEAL,
  ASCENT_WEEKS,
  AscentFilters,
  DEFAULT_FILTERS,
  DIM_COLORS,
  DIM_KEYS,
  DIM_LABELS,
  RISK_COLORS,
  applyFilters,
  completionStats,
  currentOpenWeek,
  daysSince,
  dimAverages,
  dimRisk,
  eligibleWeeks,
  isNonResponsive,
  latestResponse,
  pulseScore,
  relTime,
  responsesByIntern,
  uniqueBatches,
  uniqueBranches,
  useAscentInterns,
  useAscentResponses,
  weekNum,
} from "@/ascent/lib";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";

export default function AscentOverviewPage() {
  const { data: interns = [] } = useAscentInterns();
  const internIds = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(internIds);
  const [filters, setFilters] = useState<AscentFilters>(DEFAULT_FILTERS);
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const qc = useQueryClient();

  async function handleSeed() {
    if (seeding) return;
    setSeeding(true);
    const res = await seedAscentData();
    setSeeding(false);
    if (res.error) toast.error(`Seed failed: ${res.error}`);
    else toast.success(`Seeded ${res.insertedEmployees} interns, ${res.insertedResponses} responses`);
    qc.invalidateQueries({ queryKey: ["ascent"] });
  }

  async function handleClear() {
    if (clearing) return;
    if (!confirm("Clear ALL Ascent interns and responses? This cannot be undone.")) return;
    setClearing(true);
    const res = await clearAscentData();
    setClearing(false);
    if (res.error) toast.error(`Clear failed: ${res.error}`);
    else toast.success("Ascent data cleared");
    qc.invalidateQueries({ queryKey: ["ascent"] });
  }

  const branches = uniqueBranches(interns);
  const batches = uniqueBatches(interns);
  const f = applyFilters(interns, responses, filters);

  const activeInterns = f.interns.filter((i) => i.status === "training");
  const byEmp = responsesByIntern(f.responses);
  const dropouts = f.interns.filter((i) => i.status === "exited").length;

  // KPI calcs
  const completion = completionStats(activeInterns, f.responses);
  const highRiskInterns = activeInterns.filter((i) => latestResponse(byEmp.get(i.id) ?? [])?.risk_level === "HIGH");
  const nonResponsive = activeInterns.filter((i) => isNonResponsive(i, byEmp.get(i.id) ?? []));
  const flagged = activeInterns.filter((i) => {
    const last = latestResponse(byEmp.get(i.id) ?? []);
    return last?.critical_flags && last.critical_flags.length > 0;
  });
  const branchCount = new Set(activeInterns.map((i) => i.branch)).size;
  const compColor =
    completion.pct >= 80 ? RISK_COLORS.LOW : completion.pct >= 50 ? RISK_COLORS.MEDIUM : RISK_COLORS.HIGH;

  const healthy = activeInterns.filter((i) => latestResponse(byEmp.get(i.id) ?? [])?.risk_level === "LOW").length;

  // Overdue calc — current week of program, >=3 days into the week
  const overdueInterns = activeInterns.filter((i) => {
    const open = currentOpenWeek(i, byEmp.get(i.id) ?? []);
    if (!open) return false;
    const d = daysSince(i.doj);
    // each "week" is 7d starting at week 1 = day 7
    const daysIntoCurrentWeek = (d - 7) % 7;
    return daysIntoCurrentWeek >= 3;
  });

  // Section 3: Funnel
  const funnel = ASCENT_WEEKS.map((w) => {
    const eligible = activeInterns.filter((i) => eligibleWeeks(i.doj).includes(w));
    const completedCount = eligible.filter((i) =>
      (byEmp.get(i.id) ?? []).some((r) => weekNum(r.stage) === w),
    ).length;
    const pct = eligible.length ? Math.round((completedCount / eligible.length) * 100) : 0;
    return { week: w, eligible: eligible.length, completed: completedCount, pct };
  });

  // Critical alerts feed
  const alertsFeed = f.responses
    .filter((r) => r.critical_flags && r.critical_flags.length > 0)
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 15)
    .map((r) => {
      const intern = f.interns.find((i) => i.id === r.employee_id);
      return { r, intern };
    });

  // Section 4: Risk by branch
  const branchRows = branches
    .map((b) => {
      const bi = activeInterns.filter((i) => i.branch === b);
      if (!bi.length) return null;
      const lasts = bi.map((i) => latestResponse(byEmp.get(i.id) ?? [])).filter(Boolean) as ReturnType<typeof latestResponse>[];
      const high = lasts.filter((l) => l!.risk_level === "HIGH").length;
      const med = lasts.filter((l) => l!.risk_level === "MEDIUM").length;
      const low = lasts.filter((l) => l!.risk_level === "LOW").length;
      const avgScore = lasts.length ? lasts.reduce((s, l) => s + Number(l!.final_score || 0), 0) / lasts.length : 0;
      const pulses = bi.flatMap((i) => (byEmp.get(i.id) ?? []).map(pulseScore).filter((x): x is number => x != null));
      const avgPulse = pulses.length ? pulses.reduce((a, b) => a + b, 0) / pulses.length : null;
      const comp = completionStats(bi, f.responses);
      return { branch: b, active: bi.length, completion: comp.pct, high, med, low, avgScore, avgPulse };
    })
    .filter(Boolean) as Array<{
    branch: string;
    active: number;
    completion: number;
    high: number;
    med: number;
    low: number;
    avgScore: number;
    avgPulse: number | null;
  }>;
  branchRows.sort((a, b) => b.avgScore - a.avgScore);

  const branchInsight = (() => {
    if (branchRows.length < 2) return null;
    const sortedAsc = [...branchRows].sort((a, b) => a.avgScore - b.avgScore);
    const best = sortedAsc[0];
    const worst = sortedAsc[sortedAsc.length - 1];
    if (best.avgScore < 1) return null;
    const ratio = (worst.avgScore / best.avgScore).toFixed(1);
    return `${worst.branch} has ${ratio}× the average risk of ${best.branch}`;
  })();

  // Dimension heatmap
  const dimAvg = dimAverages(f.responses);
  const dimEntries = DIM_KEYS.map((k) => ({ k, label: DIM_LABELS[k], avg: dimAvg[k], color: DIM_COLORS[k] }));
  const primaryConcern = [...dimEntries].sort((a, b) => b.avg - a.avg)[0];

  // Weekly engagement trend
  const trendData = ASCENT_WEEKS.map((w) => {
    const weekResps = f.responses.filter((r) => weekNum(r.stage) === w);
    const pulses = weekResps.map(pulseScore).filter((x): x is number => x != null);
    return {
      week: `W${w}`,
      pulse: pulses.length ? Number((pulses.reduce((a, b) => a + b, 0) / pulses.length).toFixed(2)) : null,
      n: pulses.length,
    };
  });
  const trendPoints = trendData.filter((p) => p.pulse != null);
  let trendDir: "improving" | "stable" | "declining" = "stable";
  if (trendPoints.length >= 2) {
    const first = trendPoints[0].pulse!;
    const last = trendPoints[trendPoints.length - 1].pulse!;
    if (last > first + 0.15) trendDir = "improving";
    else if (last < first - 0.15) trendDir = "declining";
  }

  // AM Performance
  const amRows = (() => {
    const groups = new Map<string, typeof activeInterns>();
    for (const i of activeInterns) {
      const key = `${i.area_manager}__${i.branch}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    }
    const rows = Array.from(groups.entries()).map(([key, bi]) => {
      const [am, branch] = key.split("__");
      const lasts = bi.map((i) => latestResponse(byEmp.get(i.id) ?? [])).filter(Boolean) as ReturnType<typeof latestResponse>[];
      const high = lasts.filter((l) => l!.risk_level === "HIGH").length;
      const avgRisk = lasts.length ? lasts.reduce((s, l) => s + Number(l!.final_score || 0), 0) / lasts.length : 0;
      const comp = completionStats(bi, f.responses);
      const pulses = bi.flatMap((i) => (byEmp.get(i.id) ?? []).map(pulseScore).filter((x): x is number => x != null));
      const avgPulse = pulses.length ? pulses.reduce((a, b) => a + b, 0) / pulses.length : null;
      const nr = bi.filter((i) => isNonResponsive(i, byEmp.get(i.id) ?? [])).length;
      const flag = high >= 2 || nr >= 2;
      return { am, branch, interns: bi.length, surveysDone: comp.completed, completionPct: comp.pct, avgRisk, high, avgPulse, flag };
    });
    rows.sort((a, b) => b.avgRisk - a.avgRisk);
    return rows;
  })();

  const kpis = [
    {
      key: "active",
      label: "Active Interns",
      value: activeInterns.length,
      context: `across ${branchCount} branch${branchCount === 1 ? "" : "es"}`,
    },
    {
      key: "completion",
      label: "Survey Completion",
      value: `${completion.pct}%`,
      valueColor: compColor,
      context: `${completion.completed} of ${completion.eligible} eligible`,
    },
    {
      key: "high-risk",
      label: "High Risk",
      value: highRiskInterns.length,
      valueColor: RISK_COLORS.HIGH,
      context: activeInterns.length
        ? `${Math.round((highRiskInterns.length / activeInterns.length) * 100)}% of active`
        : "—",
      hoverTint: "#FEF2F2",
    },
    {
      key: "non-responsive",
      label: "At Risk",
      value: nonResponsive.length,
      valueColor: RISK_COLORS.MEDIUM,
      context: "missed 2+ consecutive weeks",
      hoverTint: "#FFFBEB",
    },
    {
      key: "dropouts",
      label: "Dropouts",
      value: dropouts,
      valueColor: dropouts > 0 ? RISK_COLORS.HIGH : "#94A3B8",
      context: "confirmed dropouts",
    },
    {
      key: "critical",
      label: "Critical Flags",
      value: flagged.length,
      valueColor: RISK_COLORS.HIGH,
      context: "require attention",
      pulse: flagged.length > 0,
      hoverTint: "#FEF2F2",
    },
  ];

  return (
    <AscentLayout title="Ascent Overview">
      <div className="space-y-5">
        <AscentFilterBar filters={filters} onChange={setFilters} branches={branches} batches={batches} />

        <div>
          <KPIBar metrics={kpis} />
          {healthy > 0 && (
            <p className="mt-2 px-1 text-xs font-medium" style={{ color: RISK_COLORS.LOW }}>
              {healthy} intern{healthy === 1 ? "" : "s"} in the healthy range (Low Risk)
            </p>
          )}
        </div>

        {overdueInterns.length > 0 && (
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3"
            style={{ borderColor: "#FED7AA", background: "#FFF7ED" }}
          >
            <p className="text-sm" style={{ color: "#9A3412" }}>
              <AlertTriangle size={14} className="mr-1.5 inline" />
              <strong>{overdueInterns.length}</strong> intern{overdueInterns.length === 1 ? "" : "s"} haven't
              submitted this week's check-in.
            </p>
            <button
              onClick={() => setOverdueOpen(true)}
              className="text-xs font-semibold underline"
              style={{ color: "#9A3412" }}
            >
              Show them
            </button>
          </div>
        )}

        {/* Funnel + Alerts */}
        <div className="grid gap-5 md:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-5 md:col-span-3">
            <h3 className="text-sm font-bold tracking-tight text-foreground">Survey Completion Funnel</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Weekly completion rates across active interns.</p>
            <div className="mt-4 space-y-2.5">
              {funnel.map((row) => {
                const color =
                  row.pct >= 80 ? RISK_COLORS.LOW : row.pct >= 50 ? RISK_COLORS.MEDIUM : RISK_COLORS.HIGH;
                return (
                  <div key={row.week} className="flex items-center gap-3">
                    <span className="w-7 text-xs font-semibold text-muted-foreground">W{row.week}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-secondary">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${row.pct}%`, background: color, opacity: row.eligible ? 1 : 0.2 }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs font-semibold tabular-nums" style={{ color }}>
                      {row.eligible ? `${row.pct}%` : "—"}
                    </span>
                    <span className="w-24 text-right text-[11px] text-muted-foreground tabular-nums">
                      {row.completed}/{row.eligible} eligible
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2">
            <h3 className="text-sm font-bold tracking-tight text-foreground">Critical Alerts</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest 15 flagged responses.</p>
            <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {alertsFeed.length === 0 && (
                <li className="rounded-md bg-secondary/60 px-3 py-4 text-center text-xs text-muted-foreground">
                  No critical alerts yet 🎉
                </li>
              )}
              {alertsFeed.map(({ r, intern }) => (
                <li key={r.id}>
                  <Link
                    to={intern ? `/ascent/interns/${intern.id}` : "#"}
                    className="block rounded-md border border-transparent px-2.5 py-2 text-xs transition-colors hover:border-border hover:bg-secondary/50"
                  >
                    <p className="font-medium text-foreground">
                      <span style={{ color: RISK_COLORS.HIGH }}>●</span> {intern?.name ?? "Unknown"}
                      <span className="font-normal text-muted-foreground">
                        {" · "}
                        {intern?.branch} · W{weekNum(r.stage)}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] italic text-muted-foreground">
                      "{(r.critical_flags ?? [])[0]}" · {relTime(r.submitted_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Branch + Dimension */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold tracking-tight text-foreground">Risk by Branch</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Sorted by average risk score (worst first).</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-muted-foreground">
                    <th className="py-1.5 pr-2">Branch</th>
                    <th className="py-1.5 pr-2">Active</th>
                    <th className="py-1.5 pr-2">Compl.</th>
                    <th className="py-1.5 pr-2">Risk dist.</th>
                    <th className="py-1.5 pr-2 text-right">Avg Score</th>
                    <th className="py-1.5 pr-2 text-right">Pulse</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRows.map((r) => {
                    const total = r.high + r.med + r.low || 1;
                    return (
                      <tr key={r.branch} className="border-t border-border">
                        <td className="py-2 pr-2 font-medium text-foreground">{r.branch}</td>
                        <td className="py-2 pr-2 tabular-nums">{r.active}</td>
                        <td className="py-2 pr-2 tabular-nums">{r.completion}%</td>
                        <td className="py-2 pr-2">
                          <div className="flex h-2 w-24 overflow-hidden rounded-full bg-secondary">
                            <div style={{ width: `${(r.high / total) * 100}%`, background: RISK_COLORS.HIGH }} />
                            <div style={{ width: `${(r.med / total) * 100}%`, background: RISK_COLORS.MEDIUM }} />
                            <div style={{ width: `${(r.low / total) * 100}%`, background: RISK_COLORS.LOW }} />
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold tabular-nums">{r.avgScore.toFixed(1)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {r.avgPulse != null ? r.avgPulse.toFixed(1) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {branchRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-muted-foreground">
                        No branch data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {branchInsight && (
              <p className="mt-3 rounded-md bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
                <strong className="text-foreground">Insight:</strong> {branchInsight}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold tracking-tight text-foreground">Dimension Heatmap</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Average score across all responses (0–10).</p>
            <div className="mt-4 space-y-3">
              {dimEntries.map((d) => {
                const risk = dimRisk(d.avg);
                const pct = Math.min(100, (d.avg / 10) * 100);
                const isPrimary = primaryConcern?.k === d.k && d.avg > 0;
                return (
                  <div key={d.k}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-foreground">{d.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        Avg: <span className="font-semibold" style={{ color: RISK_COLORS[risk] }}>{d.avg.toFixed(1)}</span>
                        {"  "}<span className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ background: RISK_COLORS[risk] + "22", color: RISK_COLORS[risk] }}>{risk}</span>
                        {isPrimary && <span className="ml-1 text-[10px] font-semibold" style={{ color: RISK_COLORS.HIGH }}>← Primary</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Weekly engagement trend */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Weekly Engagement Trend</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Average experience rating across all interns. Declining trend = program needs attention.
              </p>
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background:
                  trendDir === "declining"
                    ? "#FEF2F2"
                    : trendDir === "improving"
                    ? "#F0FDF4"
                    : "#F1F5F9",
                color:
                  trendDir === "declining"
                    ? RISK_COLORS.HIGH
                    : trendDir === "improving"
                    ? RISK_COLORS.LOW
                    : "#64748B",
              }}
            >
              {trendDir === "declining" ? "↘ Declining" : trendDir === "improving" ? "↗ Improving" : "→ Stable"}
            </span>
          </div>
          <div className="mt-4 h-[220px]">
            {trendPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Engagement data will appear once interns reach the recurring pulse weeks.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: "#64748B" }} />
                  <RTooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number | string, _n, p) => {
                      const n = (p?.payload as { n: number } | undefined)?.n ?? 0;
                      return [`Avg ${v} (${n} responses)`, "Pulse"];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pulse"
                    stroke={ASCENT_TEAL}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: ASCENT_TEAL }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AM Performance */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold tracking-tight text-foreground">AM Performance</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Sorted by average risk score (worst first).</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-muted-foreground">
                  <th className="py-1.5 pr-2">AM</th>
                  <th className="py-1.5 pr-2">Branch</th>
                  <th className="py-1.5 pr-2 text-right">Interns</th>
                  <th className="py-1.5 pr-2 text-right">Surveys</th>
                  <th className="py-1.5 pr-2 text-right">Compl.</th>
                  <th className="py-1.5 pr-2 text-right">Avg Risk</th>
                  <th className="py-1.5 pr-2 text-right">High</th>
                  <th className="py-1.5 pr-2 text-right">Pulse</th>
                </tr>
              </thead>
              <tbody>
                {amRows.map((r) => {
                  const pulseColor =
                    r.avgPulse == null ? "#94A3B8" : r.avgPulse >= 4 ? RISK_COLORS.LOW : r.avgPulse >= 3 ? RISK_COLORS.MEDIUM : RISK_COLORS.HIGH;
                  return (
                    <tr key={`${r.am}-${r.branch}`} className="border-t border-border">
                      <td className="py-2 pr-2 font-medium text-foreground">
                        {r.flag && <span className="mr-1" style={{ color: RISK_COLORS.HIGH }}>●</span>}
                        {r.am || "—"}
                      </td>
                      <td className="py-2 pr-2 text-muted-foreground">{r.branch}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.interns}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.surveysDone}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{r.completionPct}%</td>
                      <td className="py-2 pr-2 text-right font-semibold tabular-nums">{r.avgRisk.toFixed(1)}</td>
                      <td
                        className="py-2 pr-2 text-right font-semibold tabular-nums"
                        style={{ color: r.high > 0 ? RISK_COLORS.HIGH : undefined }}
                      >
                        {r.high}
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold tabular-nums" style={{ color: pulseColor }}>
                        {r.avgPulse != null ? r.avgPulse.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
                {amRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-muted-foreground">
                      No AM data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {overdueOpen && (
        <OverdueModal
          interns={overdueInterns.map((i) => ({
            ...i,
            currentWeek: currentOpenWeek(i, byEmp.get(i.id) ?? []) ?? 0,
            daysSinceLast: (() => {
              const last = (byEmp.get(i.id) ?? []).slice().sort((a, b) => weekNum(b.stage) - weekNum(a.stage))[0];
              return last ? Math.floor((Date.now() - new Date(last.submitted_at).getTime()) / 86400000) : null;
            })(),
          }))}
          onClose={() => setOverdueOpen(false)}
        />
      )}
    </AscentLayout>
  );
}

function OverdueModal({
  interns,
  onClose,
}: {
  interns: Array<
    { id: string; name: string; branch: string; area_manager: string; currentWeek: number; daysSinceLast: number | null } & {
      employee_code?: string;
    }
  >;
  onClose: () => void;
}) {
  const surveyLink = (id: string) => {
    // Token isn't fetched in this view — link to detail page or build later.
    return `${window.location.origin}/ascent/interns/${id}`;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Overdue check-ins ({interns.length})</h3>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-muted-foreground">
              <th className="py-1.5">Name</th>
              <th className="py-1.5">Branch</th>
              <th className="py-1.5">AM</th>
              <th className="py-1.5">Week</th>
              <th className="py-1.5">Last submission</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {interns.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="py-2 font-medium text-foreground">
                  <Link to={`/ascent/interns/${i.id}`} className="hover:underline">{i.name}</Link>
                </td>
                <td className="py-2 text-muted-foreground">{i.branch}</td>
                <td className="py-2 text-muted-foreground">{i.area_manager}</td>
                <td className="py-2 tabular-nums">W{i.currentWeek}</td>
                <td className="py-2 tabular-nums">
                  {i.daysSinceLast == null ? "Never" : `${i.daysSinceLast}d ago`}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => navigator.clipboard.writeText(surveyLink(i.id))}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-secondary"
                  >
                    <Copy size={11} /> Copy link
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
