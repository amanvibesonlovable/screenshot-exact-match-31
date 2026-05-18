import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { AscentLayout } from "@/ascent/AscentLayout";
import {
  ASCENT_WEEKS,
  AscentFilters,
  AscentWeek,
  DEFAULT_FILTERS,
  DIM_COLORS,
  DIM_KEYS,
  DIM_SHORT,
  Intern,
  InternResponse,
  RISK_COLORS,
  applyFilters,
  daysSince,
  dimRisk,
  eligibleWeek,
  eligibleWeeks,
  isNonResponsive,
  latestResponse,
  pulseScore,
  pulseSeries,
  pulseTrend,
  responsesByIntern,
  uniqueAMs,
  uniqueBranches,
  useAscentInterns,
  useAscentResponses,
  weekNum,
} from "@/ascent/lib";

type Grouping = "flat" | "branch" | "am";

export default function AscentInternsPage() {
  const { data: interns = [] } = useAscentInterns();
  const internIds = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(internIds);

  const [filters, setFilters] = useState<AscentFilters>(DEFAULT_FILTERS);
  const [amFilter, setAmFilter] = useState("all");
  const [flagsFilter, setFlagsFilter] = useState<"all" | "has" | "none">("all");
  const [nonResp, setNonResp] = useState<"all" | "only">("all");
  const [gaming, setGaming] = useState<"all" | "flagged">("all");
  const [search, setSearch] = useState("");
  const [grouping, setGrouping] = useState<Grouping>("flat");

  const branches = uniqueBranches(interns);
  const ams = uniqueAMs(interns);
  const fApplied = applyFilters(interns, responses, filters);
  const byEmp = responsesByIntern(responses);

  let list = fApplied.interns;
  if (amFilter !== "all") list = list.filter((i) => i.area_manager === amFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      (i) => i.name.toLowerCase().includes(q) || i.employee_code.toLowerCase().includes(q),
    );
  }
  if (flagsFilter !== "all") {
    list = list.filter((i) => {
      const last = latestResponse(byEmp.get(i.id) ?? []);
      const has = !!(last?.critical_flags && last.critical_flags.length);
      return flagsFilter === "has" ? has : !has;
    });
  }
  if (nonResp === "only") list = list.filter((i) => isNonResponsive(i, byEmp.get(i.id) ?? []));
  if (gaming === "flagged") list = list.filter((i) => (byEmp.get(i.id) ?? []).some((r) => r.gaming_flag));

  // Sort by risk score desc
  list = [...list].sort((a, b) => {
    const la = latestResponse(byEmp.get(a.id) ?? []);
    const lb = latestResponse(byEmp.get(b.id) ?? []);
    return Number(lb?.final_score ?? -1) - Number(la?.final_score ?? -1);
  });

  // Grouping
  const grouped: Array<{ key: string; items: Intern[] }> = (() => {
    if (grouping === "flat") return [{ key: "All", items: list }];
    const map = new Map<string, Intern[]>();
    for (const i of list) {
      const key = grouping === "branch" ? i.branch : i.area_manager || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => ({ key, items }));
  })();

  const RiskChip = ({ value, set }: { value: AscentFilters["risk"]; set: (r: AscentFilters["risk"]) => void }) => {
    const items: AscentFilters["risk"][] = ["all", "HIGH", "MEDIUM", "LOW"];
    return (
      <div className="flex gap-1">
        {items.map((r) => (
          <button
            key={r}
            onClick={() => set(r)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              value === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {r === "all" ? "All" : r.charAt(0) + r.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    );
  };
  const WeekChip = ({ value, set }: { value: AscentFilters["week"]; set: (r: AscentFilters["week"]) => void }) => (
    <div className="flex gap-1">
      <button
        onClick={() => set("all")}
        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
          value === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>
      {ASCENT_WEEKS.map((w) => (
        <button
          key={w}
          onClick={() => set(w)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            value === w ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          W{w}
        </button>
      ))}
    </div>
  );

  return (
    <AscentLayout title="Interns">
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5">
              <Search size={14} className="text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or intern ID…"
                className="h-8 flex-1 bg-transparent text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-[11px]">
              {(["flat", "branch", "am"] as Grouping[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGrouping(g)}
                  className={`rounded px-2 py-1 ${grouping === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {g === "flat" ? "Flat" : g === "branch" ? "By Branch" : "By AM"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Risk</span>
              <RiskChip value={filters.risk} set={(r) => setFilters({ ...filters, risk: r })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Week</span>
              <WeekChip value={filters.week} set={(w) => setFilters({ ...filters, week: w })} />
            </div>
            <select
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
              className="h-7 rounded-md border border-border bg-background px-2 text-[11px]"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select value={amFilter} onChange={(e) => setAmFilter(e.target.value)} className="h-7 rounded-md border border-border bg-background px-2 text-[11px]">
              <option value="all">All AMs</option>
              {ams.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select value={flagsFilter} onChange={(e) => setFlagsFilter(e.target.value as typeof flagsFilter)} className="h-7 rounded-md border border-border bg-background px-2 text-[11px]">
              <option value="all">All Flags</option>
              <option value="has">Has Flags</option>
              <option value="none">No Flags</option>
            </select>
            <select value={nonResp} onChange={(e) => setNonResp(e.target.value as typeof nonResp)} className="h-7 rounded-md border border-border bg-background px-2 text-[11px]">
              <option value="all">All</option>
              <option value="only">Non-Responsive Only</option>
            </select>
            <select value={gaming} onChange={(e) => setGaming(e.target.value as typeof gaming)} className="h-7 rounded-md border border-border bg-background px-2 text-[11px]">
              <option value="all">All</option>
              <option value="flagged">Gaming Flagged</option>
            </select>
          </div>
        </div>

        <p className="px-1 text-xs text-muted-foreground">
          Showing <strong className="text-foreground">{list.length}</strong> intern{list.length === 1 ? "" : "s"}
        </p>

        {grouped.map((g) => (
          <section key={g.key} className="space-y-3">
            {grouping !== "flat" && (
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.key} <span className="text-muted-foreground/70">({g.items.length})</span>
              </h3>
            )}
            <div className="space-y-3">
              {g.items.map((i) => (
                <InternCard key={i.id} intern={i} responses={byEmp.get(i.id) ?? []} />
              ))}
            </div>
          </section>
        ))}

        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center text-sm text-muted-foreground">
            No interns match the current filters.
          </div>
        )}
      </div>
    </AscentLayout>
  );
}

function InternCard({ intern, responses }: { intern: Intern; responses: InternResponse[] }) {
  const last = latestResponse(responses);
  const risk = last?.risk_level ?? "N/A";
  const eligibleMax = eligibleWeek(intern.doj);
  const days = daysSince(intern.doj);
  const nonResponsive = isNonResponsive(intern, responses);
  const lastSubmittedWeek = responses.length
    ? Math.max(...responses.map((r) => weekNum(r.stage)))
    : null;

  const dimScores = (() => {
    const out = {} as Record<string, { sum: number; n: number }>;
    for (const r of responses) {
      const s = r.scores || {};
      for (const k of DIM_KEYS) {
        const v = s[k];
        if (v == null) continue;
        if (!out[k]) out[k] = { sum: 0, n: 0 };
        out[k].sum += Number(v);
        out[k].n += 1;
      }
    }
    return DIM_KEYS.map((k) => ({ k, avg: out[k] ? out[k].sum / out[k].n : 0 }));
  })();

  const pulseSeq = pulseSeries(responses).filter((p) => p.pulse != null);
  const trend = pulseTrend(responses);
  const trendArrow = trend === "declining" ? "↘️" : trend === "improving" ? "↗️" : "→";
  const trendColor =
    trend === "declining" ? RISK_COLORS.HIGH : trend === "improving" ? RISK_COLORS.LOW : "#94A3B8";

  const flagsAll = responses.flatMap((r) => r.critical_flags ?? []);
  const gamingFlagged = responses.some((r) => r.gaming_flag);

  const weekStatus = (w: AscentWeek): { icon: string; color: string; title: string } => {
    const done = responses.find((r) => weekNum(r.stage) === w);
    if (done) {
      if (done.gaming_flag) return { icon: "⚡", color: "#9333EA", title: "Gaming flagged" };
      return { icon: "✅", color: RISK_COLORS.LOW, title: "Completed" };
    }
    if (!eligibleMax || w > eligibleMax) return { icon: "⬜", color: "#CBD5E1", title: "Not yet eligible" };
    // Eligible but missing: overdue if >= 3 days past week start
    const daysIntoWeek = (days - 7) % 7;
    if (w === eligibleMax && daysIntoWeek >= 3) return { icon: "⏰", color: RISK_COLORS.HIGH, title: "Overdue" };
    return { icon: "🟡", color: RISK_COLORS.MEDIUM, title: "Eligible, pending" };
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Row 1 */}
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RiskPill risk={risk} />
            <h3 className="text-base font-bold text-foreground">{intern.name}</h3>
            <span className="text-xs text-muted-foreground">
              {intern.branch} · {intern.area_manager || "—"} · Day {days}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {intern.employee_code}
            {intern.project_type && <> · Project: <span className="text-foreground">{intern.project_type}</span></>}
            {intern.intern_batch && <> · Batch: {intern.intern_batch}</>}
          </p>
        </div>
      </header>

      {/* Row 2: Weeks */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {ASCENT_WEEKS.map((w) => {
          const s = weekStatus(w);
          return (
            <span key={w} className="flex items-center gap-1" title={s.title}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="text-muted-foreground">W{w}</span>
            </span>
          );
        })}
        {gamingFlagged && (
          <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
            ⚡ Gaming
          </span>
        )}
      </div>

      {/* Row 3: Dim bars 2x2 */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {dimScores.map((d) => {
          const r = dimRisk(d.avg);
          const pct = Math.min(100, (d.avg / 10) * 100);
          return (
            <div key={d.k} className="flex items-center gap-2 text-[11px]">
              <span className="w-16 text-muted-foreground">{DIM_SHORT[d.k as keyof typeof DIM_SHORT]}</span>
              <span className="w-6 text-right font-semibold tabular-nums" style={{ color: RISK_COLORS[r] }}>
                {d.avg ? d.avg.toFixed(1) : "—"}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: DIM_COLORS[d.k as keyof typeof DIM_COLORS] }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 4: Pulse trend */}
      {pulseSeq.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
          <span className="text-muted-foreground">Pulse:</span>
          {pulseSeq.map((p, idx) => {
            const c = p.pulse! >= 4 ? RISK_COLORS.LOW : p.pulse! === 3 ? RISK_COLORS.MEDIUM : RISK_COLORS.HIGH;
            return (
              <span key={idx} className="flex items-center gap-1">
                <span className="font-bold tabular-nums" style={{ color: c }}>{p.pulse}</span>
                {idx < pulseSeq.length - 1 && <span className="text-muted-foreground">→</span>}
              </span>
            );
          })}
          <span className="ml-1 font-semibold" style={{ color: trendColor }}>
            {trendArrow} {trend === "n/a" ? "" : trend.toUpperCase()}
          </span>
        </div>
      )}

      {/* Row 5: Critical flags */}
      {flagsAll.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {Array.from(new Set(flagsAll)).slice(0, 3).map((flag, idx) => (
            <span
              key={idx}
              className="rounded-md px-2 py-1 text-[11px] font-medium"
              style={{ background: "#FEF2F2", color: RISK_COLORS.HIGH }}
            >
              🚨 {flag}
            </span>
          ))}
        </div>
      )}

      {/* Row 6: Non-responsive */}
      {nonResponsive && (
        <p className="mt-3 text-[11px] font-medium" style={{ color: RISK_COLORS.MEDIUM }}>
          ⚠️ Non-Responsive — last submitted{" "}
          {lastSubmittedWeek != null ? `W${lastSubmittedWeek}` : "never"}
        </p>
      )}

      {/* Row 7: Actions */}
      <footer className="mt-4 flex items-center gap-2">
        <Link
          to={`/ascent/interns/${intern.id}`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          View →
        </Link>
        <Link
          to={`/dashboard/actions?employee=${intern.id}`}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          Mark Action
        </Link>
      </footer>
    </article>
  );
}

function RiskPill({ risk }: { risk: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    HIGH: { bg: "#FEE2E2", fg: RISK_COLORS.HIGH, label: "HIGH" },
    MEDIUM: { bg: "#FEF3C7", fg: RISK_COLORS.MEDIUM, label: "MEDIUM" },
    LOW: { bg: "#DCFCE7", fg: RISK_COLORS.LOW, label: "LOW" },
    "N/A": { bg: "#F1F5F9", fg: "#64748B", label: "NEW" },
  };
  const m = map[risk] ?? map["N/A"];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: m.bg, color: m.fg }}
    >
      {risk === "HIGH" ? "🔴" : risk === "MEDIUM" ? "🟡" : risk === "LOW" ? "🟢" : "•"} {m.label}
    </span>
  );
}
