import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useHrAuth } from "@/hr/useHrAuth";
import RequireHr from "@/hr/RequireHr";
import {
  BranchLeaderboard,
  CompletionFunnel,
  CriticalAlertsFeed,
  DimensionHeatmap,
  DIM_LABELS,
} from "@/hr/DashboardCharts";
import { TraineeCard, TraineeCardData } from "@/hr/TraineeCard";
import CsvUploadModal from "@/hr/CsvUploadModal";
import { seedDemoTrainees, clearAllData } from "@/hr/seed";
import { DashboardSidebar, DashboardHeader } from "@/hr/DashboardSidebar";
import {
  OverviewFilterBar,
  OverviewFilters,
  responseMatchesFilters,
  employeeMatchesBranch,
  filtersFromParams,
  filtersToParams,
} from "@/hr/OverviewFilterBar";
import { RiskDrillSheet, DrillKind, DrillTrainee } from "@/hr/RiskDrillSheet";
import { OverdueModal, computeOverdueRows } from "@/hr/OverdueModal";
import { CheckCircle2 } from "lucide-react";
import { UserMenu } from "@/hr/UserMenu";
import { KPIBar } from "@/hr/KPIBar";

type Employee = {
  id: string; employee_code: string; name: string; email: string; phone: string;
  branch: string; area_manager: string; doj: string; status: string; token: string;
};
type SurveyResponse = {
  id: string; employee_id: string; stage: string | number;
  risk_level: "LOW" | "MEDIUM" | "HIGH"; final_score: number;
  gaming_flag: boolean; critical_flags: string[];
  submitted_at: string; free_text_response: string | null;
  scores: Record<string, number | null>;
  responses: any;
};

const STAGES = [15, 30, 45, 60, 90, 180] as const;
type Tab = "overview" | "trainees" | "upload" | "settings";

function FilterChip({
  label, value, onChange, options, renderOption,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; renderOption?: (v: string) => string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
      <span className="font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-foreground focus:outline-none">
        <option value="ALL">All</option>
        {options.map((o) => (<option key={o} value={o}>{renderOption ? renderOption(o) : o}</option>))}
      </select>
    </label>
  );
}

type KpiTone = "neutral" | "ok" | "warn" | "bad";

function kpiCardCls(tone: KpiTone, clickable: boolean, glow: boolean) {
  const base =
    "text-left rounded-xl border bg-card p-4 shadow-sm transition";
  const toneCls =
    tone === "ok" ? "border-border border-l-4 border-l-emerald-500"
    : tone === "warn" ? "border-border border-l-4 border-l-amber-500"
    : tone === "bad" ? "border-border border-l-4 border-l-destructive"
    : "border-border border-l-4 border-l-primary";
  const interactive = clickable ? "hover:-translate-y-0.5 hover:shadow-md cursor-pointer" : "";
  const glowCls = glow ? "ring-2 ring-destructive/40" : "";
  return `${base} ${toneCls} ${interactive} ${glowCls}`;
}

/** Simple circular completion ring */
function Ring({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--secondary))" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function daysSinceDOJ(doj: string): number {
  return Math.floor((Date.now() - new Date(doj).getTime()) / 86400000);
}

function eligibleStages(daysSince: number): number[] {
  return STAGES.filter((s) => daysSince >= s);
}
function currentEligibleStage(daysSince: number): number | null {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (daysSince >= STAGES[i]) return STAGES[i];
  }
  return null;
}

function DashboardInner() {
  const { user } = useHrAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const tabParam = (params.get("tab") as Tab) || "overview";
  const [tab, setTab] = useState<Tab>(tabParam);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading2, _unused] = useState(false);
  const [loading, setLoading] = useState(true);

  // Trainees-tab filters
  const [riskFilter, setRiskFilter] = useState<string>(params.get("risk") || "ALL");
  const [branchFilter, setBranchFilter] = useState<string>(params.get("branch") || "ALL");
  const [managerFilter, setManagerFilter] = useState<string>(params.get("manager") || "ALL");
  const [stageFilter, setStageFilter] = useState<string>(params.get("stage") || "ALL");
  const [flagFilter, setFlagFilter] = useState<string>(params.get("flag") || "ALL");
  const [gamingFilter, setGamingFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [grouping, setGrouping] = useState<"flat" | "branch" | "manager">("flat");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("Called trainee");

  const [showUpload, setShowUpload] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Overview-tab filter bar (date / branch / stage / risk)
  const [overviewFilters, setOverviewFiltersState] = useState<OverviewFilters>(() => filtersFromParams(params));
  const setOverviewFilters = (next: OverviewFilters) => {
    setOverviewFiltersState(next);
    const np = new URLSearchParams(params);
    // clear our keys then re-apply
    ["dr", "dfrom", "dto", "b", "s", "r"].forEach((k) => np.delete(k));
    for (const [k, v] of Object.entries(filtersToParams(next))) np.set(k, v);
    setParams(np, { replace: true });
  };

  // Drill-down sheet
  const [drillKind, setDrillKind] = useState<DrillKind | null>(null);
  // Overdue check-ins modal
  const [showOverdue, setShowOverdue] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [{ data: emp }, { data: resp }] = await Promise.all([
      supabase.from("employees").select("*").order("created_at", { ascending: false }),
      supabase.from("survey_responses").select("*").order("submitted_at", { ascending: false }),
    ]);
    setEmployees((emp ?? []) as Employee[]);
    setResponses((resp ?? []) as unknown as SurveyResponse[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-line */ }, []);

  // Sync tab to URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    setParams(next, { replace: true });
    // eslint-disable-next-line
  }, [tab]);

  // Sync URL → tab (so sidebar links that change ?tab= update the active view)
  useEffect(() => {
    const urlTab = (params.get("tab") as Tab) || "overview";
    if (urlTab !== tab) setTab(urlTab);
    // eslint-disable-next-line
  }, [params]);

  const handleSeed = async () => {
    if (!window.confirm("This will populate the database with 45 demo trainees and ~100 survey responses. Any existing data will be replaced. Continue?")) return;
    setSeeding(true);
    const res = await seedDemoTrainees(45);
    setSeeding(false);
    if (res.error) setToast(`Seed failed: ${res.error}`);
    else { setToast(`Demo data seeded successfully — ${res.insertedEmployees} trainees, ${res.insertedResponses} responses`); await refresh(); }
    setTimeout(() => setToast(null), 4000);
  };

  const handleClear = async () => {
    if (!window.confirm("This will permanently delete ALL data (trainees, responses, actions). This cannot be undone. Continue?")) return;
    setSeeding(true);
    const res = await clearAllData();
    setSeeding(false);
    if (res.error) setToast(`Clear failed: ${res.error}`);
    else { setToast("All data cleared"); await refresh(); }
    setTimeout(() => setToast(null), 4000);
  };

  // Latest response per employee
  const latestByEmp = useMemo(() => {
    const m = new Map<string, SurveyResponse>();
    for (const r of responses) if (!m.has(r.employee_id)) m.set(r.employee_id, r);
    return m;
  }, [responses]);

  // All responses by employee (chronological asc)
  const allByEmp = useMemo(() => {
    const m = new Map<string, SurveyResponse[]>();
    for (const r of [...responses].reverse()) {
      const arr = m.get(r.employee_id) ?? [];
      arr.push(r);
      m.set(r.employee_id, arr);
    }
    return m;
  }, [responses]);

  // === Overview-tab filtered datasets (driven by OverviewFilterBar) ===
  const oEmployees = useMemo(
    () => employees.filter((e) => employeeMatchesBranch(e.branch, overviewFilters)),
    [employees, overviewFilters],
  );
  const oEmpIdSet = useMemo(() => new Set(oEmployees.map((e) => e.id)), [oEmployees]);
  const oResponses = useMemo(
    () => responses.filter((r) => oEmpIdSet.has(r.employee_id) && responseMatchesFilters(r, overviewFilters)),
    [responses, oEmpIdSet, overviewFilters],
  );
  const oLatest = useMemo(() => {
    const m = new Map<string, SurveyResponse>();
    for (const r of oResponses) if (!m.has(r.employee_id)) m.set(r.employee_id, r);
    return m;
  }, [oResponses]);

  // KPIs (overview-tab; respects filters)
  const kpis = useMemo(() => {
    let high = 0, med = 0, low = 0, gaming = 0, critical = 0, scoreSum = 0, scoreN = 0;
    let totalEligible = 0, totalCompleted = 0;
    const completedByEmpStage = new Set<string>();
    for (const r of oResponses) completedByEmpStage.add(`${r.employee_id}:${r.stage}`);
    const stageFilterSet = overviewFilters.stages;
    for (const e of oEmployees) {
      const days = daysSinceDOJ(e.doj);
      const elig = eligibleStages(days).filter((s) => stageFilterSet.size === 0 || stageFilterSet.has(s));
      totalEligible += elig.length;
      for (const s of elig) if (completedByEmpStage.has(`${e.id}:${s}`)) totalCompleted++;
      const r = oLatest.get(e.id);
      if (!r) continue;
      if (r.risk_level === "HIGH") high++;
      else if (r.risk_level === "MEDIUM") med++;
      else low++;
      if (r.gaming_flag) gaming++;
      if (Array.isArray(r.critical_flags) && r.critical_flags.length > 0) critical++;
      scoreSum += r.final_score; scoreN++;
    }
    const completionPct = totalEligible ? Math.round((totalCompleted / totalEligible) * 100) : 0;
    const activeByBranch: Record<string, number> = {};
    let activeTrainees = 0;
    for (const e of oEmployees) {
      const isActive = e.status === "training" || (e.status === "positioned" && daysSinceDOJ(e.doj) < 180);
      if (!isActive) continue;
      activeTrainees++;
      const k = (e.branch || "—").slice(0, 3);
      activeByBranch[k] = (activeByBranch[k] ?? 0) + 1;
    }
    const branchBreakdown = Object.entries(activeByBranch)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
    const branchCount = Object.keys(activeByBranch).length;
    return {
      total: oEmployees.length,
      activeTrainees,
      branchBreakdown,
      branchCount,
      totalEligible,
      totalCompleted,
      completionPct,
      high, med, low, gaming, critical,
      avgScore: scoreN ? scoreSum / scoreN : 0,
    };
  }, [oEmployees, oResponses, oLatest, overviewFilters.stages]);

  const funnel = useMemo(() => {
    const completedByEmpStage = new Set<string>();
    for (const r of oResponses) completedByEmpStage.add(`${r.employee_id}:${r.stage}`);
    return STAGES.map((s) => {
      let elig = 0, done = 0;
      for (const e of oEmployees) {
        if (daysSinceDOJ(e.doj) >= s) {
          elig++;
          if (completedByEmpStage.has(`${e.id}:${s}`)) done++;
        }
      }
      return { stage: s, eligible: elig, completed: done };
    });
  }, [oEmployees, oResponses]);

  const pendingOverdue = useMemo(() => {
    const completedByEmpStage = new Set<string>();
    for (const r of oResponses) completedByEmpStage.add(`${r.employee_id}:${r.stage}`);
    let n = 0;
    for (const e of oEmployees) {
      const days = daysSinceDOJ(e.doj);
      const elig = eligibleStages(days);
      for (const s of elig) {
        if (!completedByEmpStage.has(`${e.id}:${s}`) && days - s >= 5) { n++; break; }
      }
    }
    return n;
  }, [oEmployees, oResponses]);

  const overdueRows = useMemo(
    () => computeOverdueRows(oEmployees as any, oResponses as any),
    [oEmployees, oResponses],
  );

  const donutData = useMemo(() => {
    const c = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const r of oLatest.values()) c[r.risk_level]++;
    return [
      { name: "HIGH" as const, value: c.HIGH },
      { name: "MEDIUM" as const, value: c.MEDIUM },
      { name: "LOW" as const, value: c.LOW },
    ];
  }, [oLatest]);

  const trendData = useMemo(() => {
    const weeks = 10;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7;
    const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - dayOfWeek);
    const buckets: { start: Date; end: Date; key: string; HIGH: number; MEDIUM: number; LOW: number }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(thisMonday); start.setDate(thisMonday.getDate() - i * 7);
      const end = new Date(start); end.setDate(start.getDate() + 7);
      buckets.push({
        start, end,
        key: `${start.getMonth() + 1}/${start.getDate()}`,
        HIGH: 0, MEDIUM: 0, LOW: 0,
      });
    }
    for (const r of oResponses) {
      const d = new Date(r.submitted_at);
      const b = buckets.find((x) => d >= x.start && d < x.end);
      if (b) b[r.risk_level]++;
    }
    return buckets.map((b) => ({ week: b.key, HIGH: b.HIGH, MEDIUM: b.MEDIUM, LOW: b.LOW }));
  }, [oResponses]);

  const stageData = useMemo(() => {
    const map: Record<string, { HIGH: number; MEDIUM: number; LOW: number }> = {};
    for (const r of oLatest.values()) {
      const key = `Day ${r.stage}`;
      if (!map[key]) map[key] = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      map[key][r.risk_level]++;
    }
    return Object.entries(map)
      .map(([stage, v]) => ({ stage, ...v }))
      .sort((a, b) => Number(a.stage.replace("Day ", "")) - Number(b.stage.replace("Day ", "")));
  }, [oLatest]);

  const dimRows = useMemo(() => {
    const sums: Record<string, { sum: number; n: number }> = {};
    const keys = ["training_effectiveness", "attrition_risk", "support_guidance", "adjustment_wellbeing", "transition_readiness"];
    for (const k of keys) sums[k] = { sum: 0, n: 0 };
    for (const r of oLatest.values()) {
      for (const k of keys) {
        const v = r.scores?.[k];
        if (v === null || v === undefined) continue;
        sums[k].sum += Number(v); sums[k].n++;
      }
    }
    return keys.map((k) => ({
      key: k,
      label: DIM_LABELS[k],
      avg: sums[k].n ? sums[k].sum / sums[k].n : 0,
      max: 25,
      hasData: sums[k].n > 0,
    }));
  }, [oLatest]);

  const branchData = useMemo(() => {
    type Row = {
      branch: string; active: number; total: number;
      high: number; med: number; low: number; sum: number;
      eligible: number; completed: number;
    };
    const map: Record<string, Row> = {};
    const completedByEmpStage = new Set<string>();
    for (const r of oResponses) completedByEmpStage.add(`${r.employee_id}:${r.stage}`);
    for (const e of oEmployees) {
      const key = e.branch || "—";
      if (!map[key]) map[key] = { branch: key, active: 0, total: 0, high: 0, med: 0, low: 0, sum: 0, eligible: 0, completed: 0 };
      const days = daysSinceDOJ(e.doj);
      const isActive = e.status === "training" || (e.status === "positioned" && days < 180);
      if (isActive) map[key].active++;
      const elig = eligibleStages(days);
      map[key].eligible += elig.length;
      for (const s of elig) if (completedByEmpStage.has(`${e.id}:${s}`)) map[key].completed++;
      const r = oLatest.get(e.id);
      if (!r) continue;
      map[key].total++; map[key].sum += r.final_score;
      if (r.risk_level === "HIGH") map[key].high++;
      else if (r.risk_level === "MEDIUM") map[key].med++;
      else map[key].low++;
    }
    return Object.values(map).map((b) => ({
      branch: b.branch,
      active: b.active,
      total: b.total,
      high: b.high,
      med: b.med,
      low: b.low,
      avg: b.total ? b.sum / b.total : 0,
      completionPct: b.eligible ? Math.round((b.completed / b.eligible) * 100) : 0,
      trend: "flat" as const,
    }));
  }, [oEmployees, oLatest, oResponses]);

  const managerRows = useMemo(() => {
    type Row = { manager: string; branch: string; trainees: number; surveysDone: number; sumScore: number; n: number; highCount: number };
    const map: Record<string, Row> = {};
    for (const e of oEmployees) {
      if (!e.area_manager) continue;
      if (!map[e.area_manager]) map[e.area_manager] = { manager: e.area_manager, branch: e.branch, trainees: 0, surveysDone: 0, sumScore: 0, n: 0, highCount: 0 };
      map[e.area_manager].trainees++;
      const r = oLatest.get(e.id);
      if (r) {
        map[e.area_manager].surveysDone++;
        map[e.area_manager].sumScore += r.final_score; map[e.area_manager].n++;
        if (r.risk_level === "HIGH") map[e.area_manager].highCount++;
      }
    }
    return Object.values(map)
      .map((r) => ({ manager: r.manager, branch: r.branch, trainees: r.trainees, surveysDone: r.surveysDone, avgRisk: r.n ? r.sumScore / r.n : 0, highCount: r.highCount }))
      .sort((a, b) => b.avgRisk - a.avgRisk);
  }, [oEmployees, oLatest]);

  const alertsFeed = useMemo(() => {
    const empById = new Map(oEmployees.map((e) => [e.id, e]));
    const items = oResponses
      .filter((r) => Array.isArray(r.critical_flags) && r.critical_flags.length > 0)
      .flatMap((r) =>
        (r.critical_flags as string[]).map((f, idx) => {
          const e = empById.get(r.employee_id);
          if (!e) return null;
          const days = Math.floor((Date.now() - new Date(r.submitted_at).getTime()) / 86400000);
          return {
            id: `${r.id}:${idx}`,
            employeeId: e.id,
            name: e.name,
            branch: e.branch,
            stage: Number(r.stage),
            flag: f,
            daysAgo: days,
          };
        })
      )
      .filter(Boolean) as any[];
    return items.sort((a, b) => a.daysAgo - b.daysAgo);
  }, [oEmployees, oResponses]);

  const orgPulse = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of oResponses) {
      if (Number(r.stage) !== 90 && Number(r.stage) !== 180) continue;
      const list = Array.isArray(r.responses) ? r.responses : [];
      for (const qa of list) {
        if (qa.question_id?.startsWith("S5_Q5") || qa.question_id?.startsWith("S6_Q6")) {
          counts[qa.answer_text] = (counts[qa.answer_text] || 0) + 1;
        }
      }
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [oResponses]);

  // === Drill-down trainees for sheet ===
  const drillTrainees = useMemo<DrillTrainee[]>(() => {
    if (!drillKind) return [];
    const empById = new Map(oEmployees.map((e) => [e.id, e]));
    const matches: DrillTrainee[] = [];
    for (const [empId, r] of oLatest.entries()) {
      const e = empById.get(empId);
      if (!e) continue;
      if (drillKind === "HIGH" && r.risk_level !== "HIGH") continue;
      if (drillKind === "MEDIUM" && r.risk_level !== "MEDIUM") continue;
      if (drillKind === "CRITICAL" && (!Array.isArray(r.critical_flags) || r.critical_flags.length === 0)) continue;
      const responsesList = Array.isArray(r.responses) ? r.responses : [];
      matches.push({
        id: e.id,
        name: e.name,
        employee_code: e.employee_code,
        branch: e.branch,
        area_manager: e.area_manager,
        stage: Number(r.stage),
        risk_level: r.risk_level,
        final_score: r.final_score,
        critical_flags: r.critical_flags ?? [],
        scores: r.scores ?? {},
        responses: responsesList,
        free_text_response: r.free_text_response,
        gaming_flag: r.gaming_flag,
      });
    }
    return matches.sort((a, b) => b.final_score - a.final_score);
  }, [drillKind, oEmployees, oLatest]);

  // === Trainees tab data ===
  const branches = useMemo(() => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(), [employees]);
  const managers = useMemo(() => Array.from(new Set(employees.map((e) => e.area_manager).filter(Boolean))).sort(), [employees]);

  const traineeCards = useMemo<TraineeCardData[]>(() => {
    const completedByEmpStage = new Set<string>();
    for (const r of responses) completedByEmpStage.add(`${r.employee_id}:${r.stage}`);
    return employees.map((e) => {
      const days = daysSinceDOJ(e.doj);
      const elig = new Set(eligibleStages(days));
      const all = allByEmp.get(e.id) ?? [];
      const surveysByStage: TraineeCardData["surveysByStage"] = {};
      for (const s of STAGES) {
        const completed = completedByEmpStage.has(`${e.id}:${s}`);
        const eligible = elig.has(s);
        const overdue = eligible && !completed && days - s >= 5;
        const respForStage = all.find((r) => Number(r.stage) === s);
        surveysByStage[s] = {
          completed, eligible, overdue,
          gaming: !!respForStage?.gaming_flag,
          risk_level: respForStage?.risk_level,
          final_score: respForStage?.final_score,
        };
      }
      const latest = all.length ? all[all.length - 1] : undefined;
      let trend: TraineeCardData["trend"] = undefined;
      if (all.length >= 2) {
        const prev = all[all.length - 2].final_score;
        const cur = all[all.length - 1].final_score;
        if (cur > prev + 2) trend = "WORSENING";
        else if (cur < prev - 2) trend = "IMPROVING";
        else trend = "STABLE";
      }
      return {
        employee: e,
        daysSince: days,
        surveysByStage,
        latest: latest && {
          risk_level: latest.risk_level,
          final_score: latest.final_score,
          scores: latest.scores ?? {},
          critical_flags: latest.critical_flags ?? [],
          gaming_flag: latest.gaming_flag,
          stage: Number(latest.stage),
        },
        trend,
      };
    });
  }, [employees, responses, allByEmp]);

  const filteredTrainees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return traineeCards.filter((t) => {
      const e = t.employee;
      if (branchFilter !== "ALL" && e.branch !== branchFilter) return false;
      if (managerFilter !== "ALL" && e.area_manager !== managerFilter) return false;
      if (riskFilter !== "ALL") {
        if (!t.latest || t.latest.risk_level !== riskFilter) return false;
      }
      if (stageFilter === "NONE") {
        if (t.latest) return false;
      } else if (stageFilter !== "ALL") {
        if (!t.latest || String(t.latest.stage) !== stageFilter) return false;
      }
      if (flagFilter === "HAS" && (!t.latest || t.latest.critical_flags.length === 0)) return false;
      if (flagFilter === "NONE" && (t.latest && t.latest.critical_flags.length > 0)) return false;
      if (gamingFilter === "FLAGGED" && !t.latest?.gaming_flag) return false;
      if (q && !(
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.branch.toLowerCase().includes(q) ||
        e.area_manager.toLowerCase().includes(q)
      )) return false;
      return true;
    }).sort((a, b) => (b.latest?.final_score ?? -1) - (a.latest?.final_score ?? -1));
  }, [traineeCards, search, riskFilter, branchFilter, managerFilter, stageFilter, flagFilter, gamingFilter]);

  const groupedTrainees = useMemo(() => {
    if (grouping === "flat") return [{ label: "", items: filteredTrainees }];
    const map: Record<string, TraineeCardData[]> = {};
    for (const t of filteredTrainees) {
      const k = grouping === "branch" ? t.employee.branch : t.employee.area_manager;
      if (!map[k]) map[k] = [];
      map[k].push(t);
    }
    return Object.entries(map)
      .map(([label, items]) => ({ label, items }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredTrainees, grouping]);

  // Cross-tab navigation helpers
  const goToTrainees = (filters: Record<string, string>) => {
    setRiskFilter(filters.risk ?? "ALL");
    setBranchFilter(filters.branch ?? "ALL");
    setManagerFilter(filters.manager ?? "ALL");
    setStageFilter(filters.stage ?? "ALL");
    setFlagFilter(filters.flag ?? "ALL");
    setTab("trainees");
  };



  return (
    <main className="min-h-dvh bg-background">
      <DashboardHeader
        rightSlot={
          <>
            <button onClick={handleSeed} disabled={seeding} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50">
              {seeding ? "Seeding…" : "Seed demo"}
            </button>
            <button onClick={handleClear} disabled={seeding} className="rounded-md border border-destructive/30 bg-background px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
              Clear data
            </button>
            <UserMenu />
          </>
        }
      />

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <DashboardSidebar />

        <div className="flex-1 min-w-0">
          {/* Mobile tab switch */}
          <div className="md:hidden mb-4 flex gap-1 rounded-full border border-border bg-card p-1">
            {(["overview", "trainees", "upload", "settings"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-bold ${tab === t ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground"}`}>
                {t}
              </button>
            ))}
          </div>


          {tab === "overview" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Trainee health overview</h1>
                <p className="text-xs text-muted-foreground">All KPIs and charts below respect the filters you set.</p>
              </div>
              <OverviewFilterBar
                filters={overviewFilters}
                setFilters={setOverviewFilters}
                branches={Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort()}
              />

              {/* KPI Bar — single container, 5 cells */}
              {(() => {
                const hasResponses = oResponses.length > 0;
                const completionColor =
                  kpis.completionPct >= 80 ? "#16A34A" : kpis.completionPct >= 50 ? "#D97706" : "#DC2626";
                const dash = "—";
                const highPct = kpis.activeTrainees ? Math.round((kpis.high / kpis.activeTrainees) * 100) : 0;
                const medPct = kpis.activeTrainees ? Math.round((kpis.med / kpis.activeTrainees) * 100) : 0;

                return (
                  <KPIBar
                    metrics={[
                      {
                        key: "active",
                        label: "Active Trainees",
                        value: kpis.activeTrainees,
                        valueColor: "#0F172A",
                        context: `across ${kpis.branchCount} branch${kpis.branchCount === 1 ? "" : "es"}`,
                        subContext: kpis.branchBreakdown || undefined,
                        flex: 1.3,
                      },
                      {
                        key: "completion",
                        label: "Completion",
                        value: hasResponses ? `${kpis.completionPct}%` : dash,
                        valueColor: hasResponses ? completionColor : "#CBD5E1",
                        context: hasResponses
                          ? `${kpis.totalCompleted} of ${kpis.totalEligible} eligible`
                          : "no surveys yet",
                      },
                      {
                        key: "high",
                        label: "High Risk",
                        value: hasResponses ? kpis.high : dash,
                        valueColor: hasResponses ? "#DC2626" : "#CBD5E1",
                        context: hasResponses ? `${highPct}% of active trainees` : "awaiting data",
                        onClick: hasResponses ? () => setDrillKind("HIGH") : undefined,
                        hoverTint: "#FEF2F2",
                      },
                      {
                        key: "medium",
                        label: "Medium Risk",
                        value: hasResponses ? kpis.med : dash,
                        valueColor: hasResponses ? "#D97706" : "#CBD5E1",
                        context: hasResponses ? `${medPct}% of active trainees` : "awaiting data",
                        onClick: hasResponses ? () => setDrillKind("MEDIUM") : undefined,
                        hoverTint: "#FFFBEB",
                      },
                      {
                        key: "critical",
                        label: "Critical Flags",
                        value: hasResponses ? kpis.critical : dash,
                        valueColor: hasResponses ? "#DC2626" : "#CBD5E1",
                        context: hasResponses ? "require immediate attention" : "awaiting data",
                        onClick: hasResponses ? () => setDrillKind("CRITICAL") : undefined,
                        hoverTint: "#FEF2F2",
                        pulse: hasResponses && kpis.critical > 0,
                      },
                    ]}
                  />
                );
              })()}

              {/* Healthy footnote */}
              {kpis.low > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-[13px]" style={{ color: "#64748B" }}>
                  <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
                  {kpis.low} trainee{kpis.low === 1 ? "" : "s"} in the healthy range
                </p>
              )}


              {/* Overdue banner — opens modal */}
              {pendingOverdue > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  <span>
                    ⚠ <span className="font-semibold">{pendingOverdue} trainees</span> have overdue check-ins (eligible 5+ days, not completed).
                  </span>
                  <button
                    onClick={() => setShowOverdue(true)}
                    className="rounded-md bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-500/30 dark:text-amber-200"
                  >
                    Show them
                  </button>
                </div>
              )}

              {/* Row: Funnel (60%) + Critical Alerts (40%) */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <CompletionFunnel rows={funnel} onStageClick={(s) => goToTrainees({ stage: String(s) })} />
                </div>
                <div className="lg:col-span-2">
                  <CriticalAlertsFeed alerts={alertsFeed} onClick={(empId) => navigate(`/dashboard/trainees/${empId}`)} />
                </div>
              </div>

              {/* Row: Branch (50%) + Dimension Heatmap (50%) */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <BranchLeaderboard rows={branchData} onBranchClick={(b) => goToTrainees({ branch: b })} />
                <DimensionHeatmap rows={dimRows} />
              </div>
            </div>
          )}

          {tab === "trainees" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Trainees</h1>
                <p className="text-xs text-muted-foreground">{filteredTrainees.length} of {traineeCards.length} trainees</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
                <div className="flex rounded-md border border-border p-0.5">
                  {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((f) => (
                    <button key={f} onClick={() => setRiskFilter(f)}
                      className={`rounded px-3 py-1 text-xs font-semibold transition ${
                        riskFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {f === "ALL" ? "All" : f}
                    </button>
                  ))}
                </div>
                <FilterChip label="Branch" value={branchFilter} onChange={setBranchFilter} options={branches} />
                <FilterChip label="Manager" value={managerFilter} onChange={setManagerFilter} options={managers} />
                <FilterChip label="Stage" value={stageFilter} onChange={setStageFilter}
                  options={[...STAGES.map(String), "NONE"]}
                  renderOption={(s) => s === "NONE" ? "No survey yet" : `Day ${s}`} />
                <FilterChip label="Flags" value={flagFilter} onChange={setFlagFilter} options={["HAS", "NONE"]}
                  renderOption={(s) => s === "HAS" ? "Has flags" : "No flags"} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, code, branch, manager…"
                  className="flex-1 min-w-[220px] rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {pendingOverdue > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                  ⚠ {pendingOverdue} trainees have overdue check-ins.
                </div>
              )}

              {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs">
                  <span className="font-semibold text-foreground">{selected.size} selected</span>
                  <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1 font-semibold">
                    <option>Called trainee</option>
                    <option>Spoke to manager</option>
                    <option>Scheduled check-in</option>
                    <option>Escalated to senior HR</option>
                  </select>
                  <button
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      const rows = Array.from(selected).map((employee_id) => ({
                        employee_id, action_type: bulkAction, notes: null,
                        created_by: user?.id ?? null, created_by_email: user?.email ?? null,
                      }));
                      await supabase.from("hr_actions").insert(rows);
                      setToast(`Logged "${bulkAction}" for ${rows.length} trainees`);
                      setTimeout(() => setToast(null), 3000);
                      setSelected(new Set());
                    }}
                    className="rounded-md bg-primary px-3 py-1 font-semibold text-primary-foreground hover:opacity-90">
                    Log action
                  </button>
                  <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground">Clear</button>
                </div>
              )}

              {loading ? (
                <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading trainees…</p>
              ) : filteredTrainees.length === 0 ? (
                <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">No trainees match these filters.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-8 px-3 py-2.5">
                          <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary"
                            checked={filteredTrainees.length > 0 && filteredTrainees.every((t) => selected.has(t.employee.id))}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) filteredTrainees.forEach((t) => next.add(t.employee.id));
                              else filteredTrainees.forEach((t) => next.delete(t.employee.id));
                              setSelected(next);
                            }} />
                        </th>
                        <th className="px-3 py-2.5">Name</th>
                        <th className="px-3 py-2.5">Branch</th>
                        <th className="px-3 py-2.5">Manager</th>
                        <th className="px-3 py-2.5">Days</th>
                        <th className="px-3 py-2.5">Latest stage</th>
                        <th className="px-3 py-2.5">Risk</th>
                        <th className="px-3 py-2.5">Score</th>
                        <th className="px-3 py-2.5">Flags</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrainees.map((t) => {
                        const e = t.employee;
                        const risk = t.latest?.risk_level;
                        const riskCls =
                          risk === "HIGH" ? "bg-destructive/10 text-destructive border-destructive/30"
                          : risk === "MEDIUM" ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
                          : risk === "LOW" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                          : "bg-secondary text-muted-foreground border-border";
                        return (
                          <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                            <td className="px-3 py-2.5">
                              <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary"
                                checked={selected.has(e.id)}
                                onChange={() => {
                                  const next = new Set(selected);
                                  if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                                  setSelected(next);
                                }} />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-foreground">{e.name}</div>
                              <div className="text-[11px] text-muted-foreground">{e.employee_code}</div>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{e.branch}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{e.area_manager}</td>
                            <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{t.daysSince}d</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{t.latest ? `Day ${t.latest.stage}` : "—"}</td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${riskCls}`}>
                                {risk ?? "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{t.latest?.final_score?.toFixed(1) ?? "—"}</td>
                            <td className="px-3 py-2.5">
                              {t.latest?.critical_flags?.length ? (
                                <span className="inline-block rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                                  {t.latest.critical_flags.length}
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <button onClick={() => navigate(`/dashboard/trainees/${e.id}`)}
                                className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:bg-secondary">
                                Open
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
          )}

          {tab === "upload" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-bubble backdrop-blur">
                <h2 className="text-lg font-extrabold text-foreground">Roster upload</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload a CSV with columns: Employee ID, Name, Phone, Email, Branch, Area Manager, DOJ. Optional: Age, College.
                </p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setShowUpload(true)} className="rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft">
                    Upload CSV
                  </button>
                  <button onClick={handleSeed} disabled={seeding} className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary disabled:opacity-50">
                    {seeding ? "Seeding…" : "Seed demo trainees"}
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-bubble backdrop-blur">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">All survey links</h3>
                <p className="mt-1 text-xs text-muted-foreground">Copy and share via WhatsApp.</p>
                <div className="mt-3 max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr><th className="py-2">Code</th><th>Name</th><th>Branch</th><th>Link</th><th></th></tr>
                    </thead>
                    <tbody>
                      {employees.map((e) => {
                        const url = `${window.location.origin}/survey/${e.token}`;
                        return (
                          <tr key={e.id} className="border-t border-border/40">
                            <td className="py-1.5 text-xs">{e.employee_code}</td>
                            <td>{e.name}</td>
                            <td className="text-muted-foreground">{e.branch}</td>
                            <td><code className="text-[10px]">{url}</code></td>
                            <td>
                              <button
                                onClick={() => navigator.clipboard.writeText(url)}
                                className="rounded-full border border-border px-2 py-0.5 text-[10px] hover:bg-secondary"
                              >
                                Copy
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {employees.length > 0 && (
                  <button
                    onClick={() => {
                      const csv = ["Code,Name,Phone,Branch,Link"]
                        .concat(employees.map((e) => `${e.employee_code},${e.name},${e.phone},${e.branch},${window.location.origin}/survey/${e.token}`))
                        .join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = "pulse-survey-links.csv"; a.click();
                    }}
                    className="mt-3 rounded-full border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-secondary"
                  >
                    Export all links (CSV)
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-bubble backdrop-blur">
                <h2 className="text-lg font-extrabold text-foreground">Admin access</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Admin access is now managed from a dedicated page. Super admins can add, edit, and remove admins there.
                </p>
                <Link
                  to="/dashboard/admin-management"
                  className="mt-4 inline-block rounded-full bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft"
                >
                  Open Admin Management →
                </Link>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Want to test the trainee flow?{" "}
                <Link to="/demo" className="font-bold text-primary hover:underline">Open the demo previews →</Link>
              </p>
            </div>
          )}
        </div>
      </div>

      <CsvUploadModal open={showUpload} onClose={() => setShowUpload(false)} onUploaded={refresh} />
      <RiskDrillSheet
        open={drillKind !== null}
        onOpenChange={(v) => !v && setDrillKind(null)}
        kind={drillKind}
        trainees={drillTrainees}
      />
      <OverdueModal
        open={showOverdue}
        onOpenChange={setShowOverdue}
        rows={overdueRows}
      />
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireHr>
      <DashboardInner />
    </RequireHr>
  );
}
