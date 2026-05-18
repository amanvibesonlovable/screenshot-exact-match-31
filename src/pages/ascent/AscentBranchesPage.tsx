import { useMemo, useState } from "react";
import { AscentLayout } from "@/ascent/AscentLayout";
import {
  useAscentInterns,
  useAscentResponses,
  uniqueBranches,
  DIM_KEYS,
  DIM_LABELS,
  DIM_COLORS,
  DIM_MAX,
  RISK_COLORS,
  dimAverages,
  latestResponse,
  responsesByIntern,
  completionStats,
  pulseTrend,
  isNonResponsive,
} from "@/ascent/lib";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function AscentBranchesPage() {
  const { data: interns = [], isLoading } = useAscentInterns();
  const { data: responses = [] } = useAscentResponses(interns.map((i) => i.id));
  const branches = useMemo(() => uniqueBranches(interns), [interns]);
  const [selected, setSelected] = useState<string | null>(null);

  const active = selected ?? branches[0] ?? null;

  // ---- per-branch summary table data ----
  const branchSummaries = useMemo(() => {
    return branches.map((b) => {
      const bi = interns.filter((i) => i.branch === b);
      const br = responses.filter((r) => bi.some((i) => i.id === r.employee_id));
      const stats = completionStats(bi, br);
      const dims = dimAverages(br);
      const byEmp = responsesByIntern(br);
      let high = 0;
      let med = 0;
      let low = 0;
      for (const i of bi) {
        const last = latestResponse(byEmp.get(i.id) ?? []);
        if (!last) continue;
        if (last.risk_level === "HIGH") high++;
        else if (last.risk_level === "MEDIUM") med++;
        else low++;
      }
      return { branch: b, count: bi.length, stats, dims, high, med, low };
    });
  }, [branches, interns, responses]);

  // ---- selected branch deep dive ----
  const activeData = useMemo(() => {
    if (!active) return null;
    const bi = interns.filter((i) => i.branch === active);
    const br = responses.filter((r) => bi.some((i) => i.id === r.employee_id));
    const dims = dimAverages(br);
    const byEmp = responsesByIntern(br);
    const rows = bi.map((i) => {
      const rs = byEmp.get(i.id) ?? [];
      const last = latestResponse(rs);
      return {
        intern: i,
        completed: rs.length,
        risk: last?.risk_level ?? null,
        trend: pulseTrend(rs),
        nonResponsive: isNonResponsive(i, rs),
      };
    });
    return { bi, br, dims, rows };
  }, [active, interns, responses]);

  return (
    <AscentLayout title="Branches">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : branches.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No interns uploaded yet. Visit{" "}
          <Link to="/ascent/upload" className="underline">
            Upload
          </Link>{" "}
          to add your batch.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Branch picker chips */}
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => {
              const isActive = b === active;
              return (
                <button
                  key={b}
                  onClick={() => setSelected(b)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-transparent text-white"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  }`}
                  style={isActive ? { background: "#0F766E" } : undefined}
                >
                  {b}
                </button>
              );
            })}
          </div>

          {/* Compare table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Branch comparison</p>
              <p className="text-[11px] text-muted-foreground">Interns, completion and risk distribution</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Branch</th>
                    <th className="px-4 py-2 font-semibold">Interns</th>
                    <th className="px-4 py-2 font-semibold">Completion</th>
                    <th className="px-4 py-2 font-semibold">High</th>
                    <th className="px-4 py-2 font-semibold">Med</th>
                    <th className="px-4 py-2 font-semibold">Low</th>
                  </tr>
                </thead>
                <tbody>
                  {branchSummaries.map((b) => (
                    <tr
                      key={b.branch}
                      onClick={() => setSelected(b.branch)}
                      className={`cursor-pointer border-b border-border last:border-0 hover:bg-secondary/40 ${
                        b.branch === active ? "bg-secondary/30" : ""
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{b.branch}</td>
                      <td className="px-4 py-2">{b.count}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">{b.stats.pct}%</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({b.stats.completed}/{b.stats.eligible})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2" style={{ color: RISK_COLORS.HIGH }}>
                        {b.high}
                      </td>
                      <td className="px-4 py-2" style={{ color: RISK_COLORS.MEDIUM }}>
                        {b.med}
                      </td>
                      <td className="px-4 py-2" style={{ color: RISK_COLORS.LOW }}>
                        {b.low}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deep dive */}
          {activeData && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">Dimension averages · {active}</p>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  Lower is better (0 best · {DIM_MAX} worst)
                </p>
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={DIM_KEYS.map((k) => ({
                        name: DIM_LABELS[k],
                        value: Number(activeData.dims[k].toFixed(2)),
                        color: DIM_COLORS[k],
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, DIM_MAX]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {DIM_KEYS.map((k) => (
                          <Cell key={k} fill={DIM_COLORS[k]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">Interns in {active}</p>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  {activeData.bi.length} interns · click to open profile
                </p>
                <div className="max-h-[260px] divide-y divide-border overflow-auto">
                  {activeData.rows.map(({ intern, completed, risk, trend, nonResponsive }) => (
                    <Link
                      key={intern.id}
                      to={`/ascent/interns/${intern.id}`}
                      className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-secondary/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{intern.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {intern.area_manager} · {completed} response{completed === 1 ? "" : "s"}
                          {nonResponsive ? " · non-responsive" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-muted-foreground">{trend}</span>
                        {risk && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ background: RISK_COLORS[risk] }}
                          >
                            {risk}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {activeData.rows.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">No interns in branch.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AscentLayout>
  );
}
