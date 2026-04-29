import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useHrAuth } from "@/hr/useHrAuth";
import RequireHr from "@/hr/RequireHr";
import {
  BranchLeaderboard,
  RiskDonut,
  RiskTrendChart,
  StageBreakdown,
} from "@/hr/DashboardCharts";
import CsvUploadModal from "@/hr/CsvUploadModal";
import { seedDemoTrainees } from "@/hr/seed";

type Employee = {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  area_manager: string;
  doj: string;
  status: string;
  token: string;
};

type SurveyResponse = {
  id: string;
  employee_id: string;
  stage: string | number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  final_score: number;
  gaming_flag: boolean;
  critical_flags: string[];
  submitted_at: string;
  free_text_response: string | null;
};

type RiskFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";

function riskClasses(level: string) {
  switch (level) {
    case "HIGH":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "MEDIUM":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400";
    default:
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
  }
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  renderOption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  renderOption?: (v: string) => string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
      <span className="font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground focus:outline-none"
      >
        <option value="ALL">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {renderOption ? renderOption(o) : o}
          </option>
        ))}
      </select>
    </label>
  );
}

function DashboardInner() {
  const { user } = useHrAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RiskFilter>("ALL");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [managerFilter, setManagerFilter] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [{ data: emp }, { data: resp }] = await Promise.all([
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
      supabase
        .from("survey_responses")
        .select("*")
        .order("submitted_at", { ascending: false }),
    ]);
    setEmployees((emp ?? []) as Employee[]);
    setResponses((resp ?? []) as unknown as SurveyResponse[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    const res = await seedDemoTrainees(12);
    setSeeding(false);
    if (res.error) {
      setToast(`Seed failed: ${res.error}`);
    } else {
      setToast(
        `Seeded ${res.insertedEmployees} trainees and ${res.insertedResponses} responses`
      );
      await refresh();
    }
    setTimeout(() => setToast(null), 4000);
  };

  // Latest response per employee
  const latestByEmp = useMemo(() => {
    const map = new Map<string, SurveyResponse>();
    for (const r of responses) {
      if (!map.has(r.employee_id)) map.set(r.employee_id, r);
    }
    return map;
  }, [responses]);

  const stats = useMemo(() => {
    let high = 0,
      med = 0,
      low = 0,
      gaming = 0,
      critical = 0;
    for (const r of latestByEmp.values()) {
      if (r.risk_level === "HIGH") high++;
      else if (r.risk_level === "MEDIUM") med++;
      else low++;
      if (r.gaming_flag) gaming++;
      if (Array.isArray(r.critical_flags) && r.critical_flags.length > 0) critical++;
    }
    return {
      total: employees.length,
      responded: latestByEmp.size,
      high,
      med,
      low,
      gaming,
      critical,
    };
  }, [latestByEmp, employees]);

  const branches = useMemo(
    () => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(),
    [employees]
  );
  const managers = useMemo(
    () => Array.from(new Set(employees.map((e) => e.area_manager).filter(Boolean))).sort(),
    [employees]
  );
  const stages = useMemo(() => {
    const set = new Set<string>();
    for (const r of responses) set.add(String(r.stage));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [responses]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (branchFilter !== "ALL" && e.branch !== branchFilter) return false;
      if (managerFilter !== "ALL" && e.area_manager !== managerFilter) return false;
      const r = latestByEmp.get(e.id);
      if (filter !== "ALL") {
        if (!r || r.risk_level !== filter) return false;
      }
      if (stageFilter !== "ALL") {
        if (!r || String(r.stage) !== stageFilter) return false;
      }
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.branch.toLowerCase().includes(q) ||
        e.area_manager.toLowerCase().includes(q)
      );
    });
  }, [employees, latestByEmp, filter, search, branchFilter, managerFilter, stageFilter]);

  // Risk donut from current latest-per-employee + filters (excluding risk filter)
  const donutData = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const e of employees) {
      if (branchFilter !== "ALL" && e.branch !== branchFilter) continue;
      if (managerFilter !== "ALL" && e.area_manager !== managerFilter) continue;
      const r = latestByEmp.get(e.id);
      if (!r) continue;
      if (stageFilter !== "ALL" && String(r.stage) !== stageFilter) continue;
      counts[r.risk_level]++;
    }
    return [
      { name: "HIGH" as const, value: counts.HIGH },
      { name: "MEDIUM" as const, value: counts.MEDIUM },
      { name: "LOW" as const, value: counts.LOW },
    ];
  }, [employees, latestByEmp, branchFilter, managerFilter, stageFilter]);

  // Trend over last 30 days, by submitted_at date
  const trendData = useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets: Record<string, { HIGH: number; MEDIUM: number; LOW: number }> = {};
    const order: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      buckets[key] = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      order.push(key);
    }
    const empById = new Map(employees.map((e) => [e.id, e]));
    for (const r of responses) {
      const e = empById.get(r.employee_id);
      if (!e) continue;
      if (branchFilter !== "ALL" && e.branch !== branchFilter) continue;
      if (managerFilter !== "ALL" && e.area_manager !== managerFilter) continue;
      if (stageFilter !== "ALL" && String(r.stage) !== stageFilter) continue;
      const d = new Date(r.submitted_at);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diff < 0 || diff >= days) continue;
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (buckets[key]) buckets[key][r.risk_level]++;
    }
    return order.map((k) => ({ date: k, ...buckets[k] }));
  }, [responses, employees, branchFilter, managerFilter, stageFilter]);

  // Stage breakdown — latest response per employee, grouped by stage
  const stageData = useMemo(() => {
    const map: Record<string, { HIGH: number; MEDIUM: number; LOW: number }> = {};
    for (const e of employees) {
      if (branchFilter !== "ALL" && e.branch !== branchFilter) continue;
      if (managerFilter !== "ALL" && e.area_manager !== managerFilter) continue;
      const r = latestByEmp.get(e.id);
      if (!r) continue;
      const key = `Day ${r.stage}`;
      if (!map[key]) map[key] = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      map[key][r.risk_level]++;
    }
    return Object.entries(map)
      .map(([stage, v]) => ({ stage, ...v }))
      .sort((a, b) => Number(a.stage.replace("Day ", "")) - Number(b.stage.replace("Day ", "")));
  }, [employees, latestByEmp, branchFilter, managerFilter]);

  // Branch leaderboard
  const branchData = useMemo(() => {
    const map: Record<
      string,
      { branch: string; total: number; high: number; med: number; low: number; sum: number }
    > = {};
    for (const e of employees) {
      if (managerFilter !== "ALL" && e.area_manager !== managerFilter) continue;
      const r = latestByEmp.get(e.id);
      if (!r) continue;
      if (stageFilter !== "ALL" && String(r.stage) !== stageFilter) continue;
      const key = e.branch || "—";
      if (!map[key]) map[key] = { branch: key, total: 0, high: 0, med: 0, low: 0, sum: 0 };
      map[key].total++;
      map[key].sum += r.final_score;
      if (r.risk_level === "HIGH") map[key].high++;
      else if (r.risk_level === "MEDIUM") map[key].med++;
      else map[key].low++;
    }
    return Object.values(map)
      .map((b) => ({ ...b, avg: b.total ? b.sum / b.total : 0 }))
      .sort((a, b) => b.high / Math.max(1, b.total) - a.high / Math.max(1, a.total));
  }, [employees, latestByEmp, managerFilter, stageFilter]);


  const selectedEmp = selected ? employees.find((e) => e.id === selected) ?? null : null;
  const selectedResponses = selected
    ? responses.filter((r) => r.employee_id === selected)
    : [];

  return (
    <main className="min-h-dvh bg-gradient-warm">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-xl font-extrabold text-primary-foreground shadow-soft">
              ✦
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-foreground">Pulse · HR</p>
              <p className="text-xs text-muted-foreground">Early warning dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              {seeding ? "Seeding…" : "Seed demo trainees"}
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft hover:-translate-y-0.5 transition"
            >
              Upload CSV
            </button>
            <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Trainees" value={stats.total} />
          <Kpi label="Responded" value={stats.responded} />
          <Kpi label="High risk" value={stats.high} tone="high" />
          <Kpi label="Medium risk" value={stats.med} tone="med" />
          <Kpi label="Low risk" value={stats.low} tone="low" />
          <Kpi label="Critical flags" value={stats.critical} tone="high" />
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <RiskTrendChart data={trendData} />
          <RiskDonut data={donutData} />
          <StageBreakdown data={stageData} />
          <div className="lg:col-span-2">
            <BranchLeaderboard rows={branchData} />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-border bg-card p-1">
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as RiskFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  filter === f
                    ? "bg-gradient-brand text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "ALL" ? "All risks" : f}
              </button>
            ))}
          </div>

          <FilterSelect
            label="Branch"
            value={branchFilter}
            onChange={setBranchFilter}
            options={branches}
          />
          <FilterSelect
            label="Area Mgr"
            value={managerFilter}
            onChange={setManagerFilter}
            options={managers}
          />
          <FilterSelect
            label="Stage"
            value={stageFilter}
            onChange={setStageFilter}
            options={stages}
            renderOption={(s) => `Day ${s}`}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, branch, manager…"
            className="flex-1 min-w-[220px] rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {(filter !== "ALL" ||
            branchFilter !== "ALL" ||
            managerFilter !== "ALL" ||
            stageFilter !== "ALL" ||
            search) && (
            <button
              onClick={() => {
                setFilter("ALL");
                setBranchFilter("ALL");
                setManagerFilter("ALL");
                setStageFilter("ALL");
                setSearch("");
              }}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-bubble backdrop-blur">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading trainees…</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-foreground">No trainees yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a roster CSV or seed demo trainees to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Trainee</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Area Mgr</th>
                    <th className="px-4 py-3">Latest stage</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((e) => {
                    const r = latestByEmp.get(e.id);
                    return (
                      <tr
                        key={e.id}
                        className="border-t border-border/50 hover:bg-secondary/20"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{e.name}</p>
                          <p className="text-xs text-muted-foreground">{e.employee_code}</p>
                        </td>
                        <td className="px-4 py-3 text-foreground">{e.branch}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.area_manager}</td>
                        <td className="px-4 py-3 text-foreground">
                          {r ? `Day ${r.stage}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${riskClasses(
                                r.risk_level
                              )}`}
                            >
                              {r.risk_level}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">no response</span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-foreground">
                          {r ? r.final_score.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r?.gaming_flag && (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                gaming
                              </span>
                            )}
                            {(r?.critical_flags ?? []).slice(0, 2).map((f) => (
                              <span
                                key={f}
                                className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelected(e.id)}
                            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Want to test the trainee flow?{" "}
          <Link to="/s/demo-token" className="font-bold text-primary hover:underline">
            Open the Day 15 preview →
          </Link>
        </p>
      </section>

      {/* Detail drawer */}
      {selectedEmp && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-lg overflow-y-auto bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {selectedEmp.employee_code}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-foreground">
                  {selectedEmp.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedEmp.branch} · {selectedEmp.area_manager}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                Close
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <Field label="Email" value={selectedEmp.email} />
              <Field label="Phone" value={selectedEmp.phone} />
              <Field label="DOJ" value={selectedEmp.doj} />
              <Field label="Status" value={selectedEmp.status} />
            </dl>

            <h3 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Survey history
            </h3>
            <div className="mt-3 space-y-3">
              {selectedResponses.length === 0 && (
                <p className="text-sm text-muted-foreground">No responses yet.</p>
              )}
              {selectedResponses.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border/60 bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">Day {r.stage}</p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${riskClasses(
                        r.risk_level
                      )}`}
                    >
                      {r.risk_level} · {r.final_score.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.submitted_at).toLocaleString()}
                  </p>
                  {(r.critical_flags ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.critical_flags.map((f) => (
                        <span
                          key={f}
                          className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.free_text_response && (
                    <p className="mt-2 rounded-xl bg-secondary/50 p-3 text-sm italic text-foreground">
                      "{r.free_text_response}"
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-border bg-background/50 p-4 text-xs text-muted-foreground">
              Survey link:{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 text-foreground">
                /s/{selectedEmp.token}
              </code>
            </div>
          </aside>
        </div>
      )}
      <CsvUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={refresh}
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}


function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "high" | "med" | "low";
}) {
  const toneClass =
    tone === "high"
      ? "text-destructive"
      : tone === "med"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "low"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-foreground";
  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-bubble backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground">{value || "—"}</dd>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireHr>
      <DashboardInner />
    </RequireHr>
  );
}
