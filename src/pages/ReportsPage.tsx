import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import RequireHr from "@/hr/RequireHr";
import { useHrAuth } from "@/hr/useHrAuth";
import { DashboardHeader, DashboardSidebar } from "@/hr/DashboardSidebar";
import { DIM_LABELS } from "@/hr/DashboardCharts";
import {
  DIM_KEYS, EmpLite, RespLite, STAGES,
  avgRiskScore, completionForEmployees, daysSince, dimAverages,
  isEligibleForStage, latestResponseByEmp, riskLevelFromScore,
} from "@/hr/aggregations";

const cardCls = "rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur";
const titleCls = "text-sm font-bold uppercase tracking-wide text-muted-foreground";

type ReportKey = "weekly" | "branch" | "training" | "export";
type DateRange = "7" | "14" | "30" | "all" | "custom";

type ActionRow = {
  id: string; created_at: string; employee_id: string;
  action_type: string; notes: string | null; created_by_email: string | null;
};

function csvEscape(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCsv(filename: string, rows: any[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function dateFrom(range: DateRange, customFrom?: string): Date | null {
  if (range === "all") return null;
  if (range === "custom") return customFrom ? new Date(customFrom) : null;
  const d = new Date(); d.setDate(d.getDate() - Number(range)); return d;
}

function ReportsInner() {
  const { user } = useHrAuth();
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [responses, setResponses] = useState<RespLite[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ReportKey | null>(null);

  // configs
  const [weeklyRange, setWeeklyRange] = useState<DateRange>("7");
  const [branchSelected, setBranchSelected] = useState<string>("");
  const [branchRange, setBranchRange] = useState<DateRange>("all");
  const [trainingRange, setTrainingRange] = useState<DateRange>("all");
  const [exportDataset, setExportDataset] = useState<"employees" | "responses" | "responses_full" | "actions">("employees");
  const [exportBranch, setExportBranch] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: emp }, { data: resp }, { data: act }] = await Promise.all([
        supabase.from("employees").select("id,name,employee_code,branch,area_manager,doj,status,phone,email,token"),
        supabase.from("survey_responses").select("*").order("submitted_at", { ascending: false }),
        supabase.from("hr_actions").select("*").order("created_at", { ascending: false }),
      ]);
      setEmployees((emp ?? []) as EmpLite[]);
      setResponses((resp ?? []) as unknown as RespLite[]);
      setActions((act ?? []) as ActionRow[]);
      setLoading(false);
    })();
  }, []);

  const branches = useMemo(() => Array.from(new Set(employees.map((e) => e.branch).filter(Boolean))).sort(), [employees]);
  useEffect(() => { if (!branchSelected && branches.length) setBranchSelected(branches[0]); }, [branches, branchSelected]);
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

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
          <div className="no-print">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Reports</h1>
            <p className="text-xs text-muted-foreground">Generate downloadable summary reports for leadership and reviews.</p>
          </div>

          {/* 2x2 grid of report cards */}
          <section className="no-print grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Weekly Digest */}
            <div className={cardCls}>
              <h2 className="text-lg font-extrabold text-foreground">Weekly Digest</h2>
              <p className="text-xs text-muted-foreground">Auto-generated summary of the past week. Share with leadership.</p>
              <label className="mt-3 block text-xs font-bold text-muted-foreground">Date range</label>
              <select value={weeklyRange} onChange={(e) => setWeeklyRange(e.target.value as DateRange)}
                className="mt-1 w-full rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </select>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setOpen("weekly")} className="rounded-full bg-gradient-brand px-4 py-1.5 text-xs font-bold text-primary-foreground">Preview</button>
                <button onClick={() => window.print()} className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-bold">Print / PDF</button>
              </div>
            </div>

            {/* Branch Review */}
            <div className={cardCls}>
              <h2 className="text-lg font-extrabold text-foreground">Branch Review</h2>
              <p className="text-xs text-muted-foreground">Detailed report for a specific branch. Ideal for branch review meetings.</p>
              <label className="mt-3 block text-xs font-bold text-muted-foreground">Branch</label>
              <select value={branchSelected} onChange={(e) => setBranchSelected(e.target.value)}
                className="mt-1 w-full rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <label className="mt-2 block text-xs font-bold text-muted-foreground">Date range</label>
              <select value={branchRange} onChange={(e) => setBranchRange(e.target.value as DateRange)}
                className="mt-1 w-full rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <option value="all">All time</option>
                <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
              </select>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setOpen("branch")} className="rounded-full bg-gradient-brand px-4 py-1.5 text-xs font-bold text-primary-foreground">Preview</button>
                <button onClick={() => window.print()} className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-bold">Print / PDF</button>
                <button onClick={() => exportBranchCsv(branchSelected, employees, responses)} className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-bold">CSV</button>
              </div>
            </div>

            {/* Training Effectiveness */}
            <div className={cardCls}>
              <h2 className="text-lg font-extrabold text-foreground">Training Effectiveness</h2>
              <p className="text-xs text-muted-foreground">Aggregated training quality insights. Share with L&amp;D.</p>
              <label className="mt-3 block text-xs font-bold text-muted-foreground">Date range</label>
              <select value={trainingRange} onChange={(e) => setTrainingRange(e.target.value as DateRange)}
                className="mt-1 w-full rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <option value="all">All time</option>
                <option value="30">Last 30 days</option><option value="90">Last 90 days</option>
              </select>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setOpen("training")} className="rounded-full bg-gradient-brand px-4 py-1.5 text-xs font-bold text-primary-foreground">Preview</button>
                <button onClick={() => window.print()} className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-bold">Print / PDF</button>
                <button onClick={() => exportTrainingCsv(employees, responses)} className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-bold">CSV</button>
              </div>
            </div>

            {/* Data Export */}
            <div className={cardCls}>
              <h2 className="text-lg font-extrabold text-foreground">Data Export</h2>
              <p className="text-xs text-muted-foreground">Download raw data as CSV for analysis in Excel or Sheets.</p>
              <label className="mt-3 block text-xs font-bold text-muted-foreground">Dataset</label>
              <select value={exportDataset} onChange={(e) => setExportDataset(e.target.value as any)}
                className="mt-1 w-full rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <option value="employees">All Employees</option>
                <option value="responses">All Survey Responses</option>
                <option value="responses_full">Responses with Full Scores</option>
                <option value="actions">Actions Log</option>
              </select>
              <label className="mt-2 block text-xs font-bold text-muted-foreground">Branch filter</label>
              <select value={exportBranch} onChange={(e) => setExportBranch(e.target.value)}
                className="mt-1 w-full rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <option value="all">All branches</option>
                {branches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <p className="mt-2 text-[11px] text-muted-foreground">{recordCount(exportDataset, exportBranch, employees, responses, actions)} records will export.</p>
              <button onClick={() => doExport(exportDataset, exportBranch, employees, responses, actions, empById)}
                className="mt-3 rounded-full bg-gradient-brand px-4 py-1.5 text-xs font-bold text-primary-foreground">Download CSV</button>
            </div>
          </section>

          {loading && <p className="p-4 text-center text-xs text-muted-foreground">Loading data…</p>}

          {/* Preview area (printable) */}
          {open && (
            <section id="report-preview" className="report-print rounded-3xl border border-border/60 bg-card p-8 shadow-bubble">
              <ReportPreview
                kind={open}
                employees={employees}
                responses={responses}
                actions={actions}
                weeklyRange={weeklyRange}
                branchSelected={branchSelected}
                branchRange={branchRange}
              />
            </section>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .no-print, header, aside { display: none !important; }
          .report-print { box-shadow: none !important; border: none !important; padding: 0 !important; }
        }
      `}</style>
    </main>
  );
}

function recordCount(dataset: string, branch: string, emps: EmpLite[], resps: RespLite[], acts: ActionRow[]) {
  const empFilter = (e: EmpLite) => branch === "all" || e.branch === branch;
  const empIds = new Set(emps.filter(empFilter).map((e) => e.id));
  if (dataset === "employees") return Array.from(empIds).length;
  if (dataset === "responses" || dataset === "responses_full") return resps.filter((r) => empIds.has(r.employee_id)).length;
  if (dataset === "actions") return acts.filter((a) => empIds.has(a.employee_id)).length;
  return 0;
}

function exportBranchCsv(branch: string, emps: EmpLite[], resps: RespLite[]) {
  const list = emps.filter((e) => e.branch === branch);
  const ids = new Set(list.map((e) => e.id));
  const rows: any[][] = [
    ["Name", "Employee ID", "Manager", "DOJ", "Days", "Latest Stage", "Risk", "Score", "Flags"],
  ];
  const latest = latestResponseByEmp(resps.filter((r) => ids.has(r.employee_id)));
  for (const e of list) {
    const r = latest.get(e.id);
    rows.push([e.name, e.employee_code, e.area_manager, e.doj, daysSince(e.doj),
      r ? Number(r.stage) : "", r?.risk_level ?? "", r?.final_score ?? "", r?.critical_flags?.length ?? 0]);
  }
  downloadCsv(`branch-review-${branch}.csv`, rows);
}

function exportTrainingCsv(emps: EmpLite[], resps: RespLite[]) {
  const byBranch = new Map<string, RespLite[]>();
  const empById = new Map(emps.map((e) => [e.id, e]));
  for (const r of resps) {
    const e = empById.get(r.employee_id); if (!e) continue;
    const arr = byBranch.get(e.branch) ?? []; arr.push(r); byBranch.set(e.branch, arr);
  }
  const rows: any[][] = [["Branch", "Avg Training Score", "Sample N"]];
  for (const [b, list] of byBranch) {
    const dim = dimAverages(list);
    rows.push([b, dim.training_effectiveness?.toFixed(2) ?? "0", list.length]);
  }
  downloadCsv("training-effectiveness.csv", rows);
}

function doExport(dataset: string, branch: string, emps: EmpLite[], resps: RespLite[], acts: ActionRow[], empById: Map<string, EmpLite>) {
  const empFilter = (e: EmpLite) => branch === "all" || e.branch === branch;
  if (dataset === "employees") {
    const rows: any[][] = [["ID", "Name", "Phone", "Email", "Branch", "Manager", "DOJ", "Status"]];
    for (const e of emps.filter(empFilter)) rows.push([e.employee_code, e.name, e.phone ?? "", e.email ?? "", e.branch, e.area_manager, e.doj, e.status]);
    downloadCsv("employees.csv", rows); return;
  }
  if (dataset === "responses") {
    const rows: any[][] = [["Name", "Branch", "Manager", "Stage", "Risk", "Score", "Flags", "Free Text", "Gaming", "Submitted"]];
    for (const r of resps) {
      const e = empById.get(r.employee_id); if (!e || !empFilter(e)) continue;
      rows.push([e.name, e.branch, e.area_manager, Number(r.stage), r.risk_level, r.final_score, (r.critical_flags ?? []).join(" | "), r.free_text_response ?? "", r.gaming_flag, r.submitted_at]);
    }
    downloadCsv("responses.csv", rows); return;
  }
  if (dataset === "responses_full") {
    const rows: any[][] = [["Name", "Branch", "Manager", "Stage", "Risk", "Score", "Composite", "Multiplier", ...DIM_KEYS, "Flags", "Submitted"]];
    for (const r of resps) {
      const e = empById.get(r.employee_id); if (!e || !empFilter(e)) continue;
      const s = r.scores ?? {} as any;
      rows.push([e.name, e.branch, e.area_manager, Number(r.stage), r.risk_level, r.final_score, s.composite ?? "", s.stage_multiplier ?? "",
        ...DIM_KEYS.map((k) => s[k] ?? ""), (r.critical_flags ?? []).join(" | "), r.submitted_at]);
    }
    downloadCsv("responses-full.csv", rows); return;
  }
  if (dataset === "actions") {
    const rows: any[][] = [["Date", "Trainee", "Branch", "Action Type", "Notes", "Logged By"]];
    for (const a of acts) {
      const e = empById.get(a.employee_id); if (!e || !empFilter(e)) continue;
      rows.push([a.created_at, e.name, e.branch, a.action_type, a.notes ?? "", a.created_by_email ?? ""]);
    }
    downloadCsv("actions.csv", rows); return;
  }
}

function ReportPreview({ kind, employees, responses, actions, weeklyRange, branchSelected, branchRange }: {
  kind: ReportKey; employees: EmpLite[]; responses: RespLite[]; actions: ActionRow[];
  weeklyRange: DateRange; branchSelected: string; branchRange: DateRange;
}) {
  if (kind === "weekly") return <WeeklyPulsePreview employees={employees} responses={responses} actions={actions} range={weeklyRange} />;
  if (kind === "branch") return <BranchReviewPreview employees={employees} responses={responses} branch={branchSelected} range={branchRange} />;
  if (kind === "training") return <TrainingEffectivenessPreview employees={employees} responses={responses} />;
  return null;
}

function ReportHeader({ name, period }: { name: string; period?: string }) {
  return (
    <header className="mb-6 border-b border-border pb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Candor · {name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{period ? `Period: ${period} · ` : ""}Generated {new Date().toLocaleString()}</p>
    </header>
  );
}
function ReportFooter() {
  return <footer className="mt-8 border-t border-border pt-3 text-[10px] text-muted-foreground">Generated by Candor — Confidential</footer>;
}

function WeeklyPulsePreview({ employees, responses, actions, range }: { employees: EmpLite[]; responses: RespLite[]; actions: ActionRow[]; range: DateRange }) {
  const from = dateFrom(range);
  const inPeriod = (iso: string) => !from || new Date(iso) >= from;
  const periodResponses = responses.filter((r) => inPeriod(r.submitted_at));
  const empById = new Map(employees.map((e) => [e.id, e]));
  const activeEmps = employees.filter((e) => e.status !== "exited");
  const branchesCount = new Set(activeEmps.map((e) => e.branch)).size;
  const completion = completionForEmployees(activeEmps, responses);
  const latest = Array.from(latestResponseByEmp(responses).values());
  const total = latest.length || 1;
  const high = latest.filter((r) => r.risk_level === "HIGH").length;
  const med = latest.filter((r) => r.risk_level === "MEDIUM").length;
  const low = latest.filter((r) => r.risk_level === "LOW").length;
  const awaiting = activeEmps.length - latest.length;
  const newFlags = periodResponses.flatMap((r) => (r.critical_flags ?? []).map((f) => ({ f, emp: empById.get(r.employee_id), stage: Number(r.stage), date: r.submitted_at })))
    .filter((x) => x.emp);

  // Top concern dimension (latest)
  const dimAvg = dimAverages(latest);
  const topDim = DIM_KEYS.reduce((best, k) => (dimAvg[k] > (dimAvg[best] ?? 0) ? k : best), DIM_KEYS[0]);

  // Branch alert
  const byBranch = new Map<string, RespLite[]>();
  for (const r of latest) { const e = empById.get(r.employee_id); if (!e) continue; const a = byBranch.get(e.branch) ?? []; a.push(r); byBranch.set(e.branch, a); }
  const branchAvgs = Array.from(byBranch.entries()).map(([b, list]) => ({ b, avg: avgRiskScore(list) }));
  const overallAvg = avgRiskScore(latest) || 1;
  const worstBranch = branchAvgs.sort((a, b) => b.avg - a.avg)[0];
  const branchRatio = worstBranch ? worstBranch.avg / overallAvg : 1;

  // HR actions
  const periodActions = actions.filter((a) => inPeriod(a.created_at));
  const actionedEmps = new Set(periodActions.map((a) => a.employee_id));
  const pendingHigh = latest.filter((r) => r.risk_level === "HIGH" && !actionedEmps.has(r.employee_id)).length;

  // Recommendations
  const recs: string[] = [];
  if (pendingHigh > 0) recs.push(`${pendingHigh} high-risk trainees need immediate attention`);
  if (worstBranch && branchRatio >= 1.4) recs.push(`${worstBranch.b} warrants a branch-level review`);
  // worst manager
  const byMgr = new Map<string, RespLite[]>();
  for (const r of latest) { const e = empById.get(r.employee_id); if (!e) continue; const a = byMgr.get(e.area_manager) ?? []; a.push(r); byMgr.set(e.area_manager, a); }
  const worstMgr = Array.from(byMgr.entries()).map(([m, list]) => ({ m, high: list.filter((r) => r.risk_level === "HIGH").length }))
    .sort((a, b) => b.high - a.high)[0];
  if (worstMgr && worstMgr.high >= 2) recs.push(`Manager ${worstMgr.m} has ${worstMgr.high} at-risk trainees — consider a discussion`);

  const periodLabel = range === "all" ? "All time" : `${from?.toLocaleDateString()} to ${new Date().toLocaleDateString()}`;

  return (
    <article className="space-y-5 text-sm leading-relaxed text-foreground">
      <ReportHeader name="Weekly Digest" period={periodLabel} />
      <Section title="Overview">
        <ul className="list-disc pl-5">
          <li>Active trainees: <b>{activeEmps.length}</b> across <b>{branchesCount}</b> branches</li>
          <li>New survey responses this period: <b>{periodResponses.length}</b></li>
          <li>Survey completion rate: <b>{completion.pct}%</b></li>
        </ul>
      </Section>
      <Section title="Risk snapshot">
        <ul className="list-disc pl-5">
          <li>High Risk: <b>{high}</b> ({Math.round(high / total * 100)}%)</li>
          <li>Medium Risk: <b>{med}</b> ({Math.round(med / total * 100)}%)</li>
          <li>Low Risk: <b>{low}</b> ({Math.round(low / total * 100)}%)</li>
          <li>Awaiting check-in: <b>{awaiting}</b></li>
        </ul>
      </Section>
      <Section title="New critical flags this period">
        {newFlags.length === 0 ? <p>No new critical flags this period ✓</p> : (
          <ul className="list-disc pl-5">
            {newFlags.map((x, i) => <li key={i}>{x.emp!.name} ({x.emp!.branch}) — Day {x.stage} — "{x.f}" — {new Date(x.date).toLocaleDateString()}</li>)}
          </ul>
        )}
      </Section>
      <Section title="Top concern dimension">
        <p>{DIM_LABELS[topDim]} (avg: <b>{(dimAvg[topDim] ?? 0).toFixed(1)}</b> — {riskLevelFromScore((dimAvg[topDim] ?? 0) * 1.4)}) is the primary area of concern.</p>
      </Section>
      <Section title="Branch alert">
        {worstBranch && branchRatio >= 1.2 ? (
          <p><b>{worstBranch.b}</b> has an average risk score of <b>{worstBranch.avg.toFixed(1)}</b>, which is {branchRatio.toFixed(1)}x the company average.</p>
        ) : <p>All branches are within normal range.</p>}
      </Section>
      <Section title="HR actions this period">
        <ul className="list-disc pl-5">
          <li>Actions logged: <b>{periodActions.length}</b></li>
          <li>Pending high-risk trainees with no action: <b>{pendingHigh}</b></li>
        </ul>
      </Section>
      <Section title="Recommended focus">
        {recs.length === 0 ? <p>No urgent focus items.</p> : <ul className="list-disc pl-5">{recs.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      </Section>
      <ReportFooter />
    </article>
  );
}

function BranchReviewPreview({ employees, responses, branch, range }: { employees: EmpLite[]; responses: RespLite[]; branch: string; range: DateRange }) {
  const from = dateFrom(range);
  const inPeriod = (iso: string) => !from || new Date(iso) >= from;
  const list = employees.filter((e) => e.branch === branch && e.status !== "exited");
  const ids = new Set(list.map((e) => e.id));
  const allBranchResp = responses.filter((r) => ids.has(r.employee_id));
  const branchResp = allBranchResp.filter((r) => inPeriod(r.submitted_at));
  const completion = completionForEmployees(list, branchResp);
  const latest = Array.from(latestResponseByEmp(branchResp).values());
  const avg = avgRiskScore(latest);
  const total = latest.length || 1;
  const high = latest.filter((r) => r.risk_level === "HIGH").length;
  const med = latest.filter((r) => r.risk_level === "MEDIUM").length;
  const low = latest.filter((r) => r.risk_level === "LOW").length;
  const branchDim = dimAverages(latest);
  const companyDim = dimAverages(Array.from(latestResponseByEmp(responses).values()));
  const flags = branchResp.flatMap((r) => (r.critical_flags ?? []).map((f) => ({
    f, name: list.find((e) => e.id === r.employee_id)?.name, stage: Number(r.stage), date: r.submitted_at,
  })));

  // Manager perf
  const mgrs = new Map<string, EmpLite[]>();
  for (const e of list) { const a = mgrs.get(e.area_manager) ?? []; a.push(e); mgrs.set(e.area_manager, a); }
  const mgrRows = Array.from(mgrs.entries()).map(([m, ml]) => {
    const mIds = new Set(ml.map((e) => e.id));
    const rs = branchResp.filter((r) => mIds.has(r.employee_id));
    const lat = Array.from(latestResponseByEmp(rs).values());
    return { m, count: ml.length, avg: avgRiskScore(lat), high: lat.filter((r) => r.risk_level === "HIGH").length, comp: completionForEmployees(ml, rs).pct };
  });

  // Funnel
  const respondedSet = new Set<string>();
  for (const r of branchResp) respondedSet.add(`${r.employee_id}:${Number(r.stage)}`);

  return (
    <article className="space-y-5 text-sm leading-relaxed text-foreground">
      <ReportHeader name={`Branch Review — ${branch}`} period={range === "all" ? "All time" : `${from?.toLocaleDateString()} to ${new Date().toLocaleDateString()}`} />
      <Section title="Branch overview">
        <ul className="list-disc pl-5">
          <li>Active trainees: <b>{list.length}</b></li>
          <li>Survey completion rate: <b>{completion.pct}%</b></li>
          <li>Average risk score: <b>{avg.toFixed(1)}</b> ({riskLevelFromScore(avg)})</li>
        </ul>
      </Section>
      <Section title="Risk distribution">
        <p>High: <b>{high}</b> ({Math.round(high/total*100)}%) | Medium: <b>{med}</b> ({Math.round(med/total*100)}%) | Low: <b>{low}</b> ({Math.round(low/total*100)}%)</p>
      </Section>
      <Section title="Dimension breakdown (Branch vs Company average)">
        <table className="w-full border-collapse text-xs">
          <thead><tr className="border-b border-border text-left"><th className="py-1">Dimension</th><th>Branch</th><th>Company</th><th>Gap</th></tr></thead>
          <tbody>
            {DIM_KEYS.map((k) => {
              const bv = branchDim[k] ?? 0; const cv = companyDim[k] ?? 0; const gap = bv - cv;
              return <tr key={k} className="border-b border-border/40"><td className="py-1">{DIM_LABELS[k]}</td><td>{bv.toFixed(1)}</td><td>{cv.toFixed(1)}</td><td>{gap > 2 ? "⚠️ " : ""}{gap > 0 ? "+" : ""}{gap.toFixed(1)}</td></tr>;
            })}
          </tbody>
        </table>
      </Section>
      <Section title="Trainee status">
        <table className="w-full border-collapse text-xs">
          <thead><tr className="border-b border-border text-left"><th className="py-1">Name</th><th>Manager</th><th>Days</th><th>Stage</th><th>Risk</th><th>Score</th><th>Flags</th></tr></thead>
          <tbody>
            {[...list].sort((a, b) => {
              const la = latestResponseByEmp(branchResp).get(a.id); const lb = latestResponseByEmp(branchResp).get(b.id);
              return (lb?.final_score ?? -1) - (la?.final_score ?? -1);
            }).map((e) => {
              const r = latestResponseByEmp(branchResp).get(e.id);
              return <tr key={e.id} className="border-b border-border/40"><td className="py-1">{e.name}</td><td>{e.area_manager}</td><td>{daysSince(e.doj)}</td><td>{r ? `Day ${Number(r.stage)}` : "—"}</td><td>{r?.risk_level ?? "—"}</td><td>{r?.final_score?.toFixed(1) ?? "—"}</td><td>{r?.critical_flags?.length ?? 0}</td></tr>;
            })}
          </tbody>
        </table>
      </Section>
      <Section title="Manager performance">
        <table className="w-full border-collapse text-xs">
          <thead><tr className="border-b border-border text-left"><th className="py-1">Manager</th><th>Trainees</th><th>Avg Risk</th><th>High Risk</th><th>Completion %</th></tr></thead>
          <tbody>
            {mgrRows.sort((a, b) => b.avg - a.avg).map((m) => (
              <tr key={m.m} className="border-b border-border/40"><td className="py-1">{m.m}</td><td>{m.count}</td><td>{m.avg.toFixed(1)}</td><td>{m.high}</td><td>{m.comp}%</td></tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Critical flags">
        {flags.length === 0 ? <p>None ✓</p> : <ul className="list-disc pl-5">{flags.map((x, i) => <li key={i}>{x.name} · Day {x.stage} · "{x.f}" · {new Date(x.date).toLocaleDateString()}</li>)}</ul>}
      </Section>
      <Section title="Completion funnel">
        <table className="w-full border-collapse text-xs">
          <thead><tr className="border-b border-border text-left"><th className="py-1">Stage</th><th>Eligible</th><th>Responded</th><th>Rate</th></tr></thead>
          <tbody>
            {STAGES.map((s) => {
              const eligible = list.filter((e) => isEligibleForStage(e.doj, s));
              const responded = eligible.filter((e) => respondedSet.has(`${e.id}:${s}`)).length;
              const pct = eligible.length ? Math.round(responded / eligible.length * 100) : null;
              return <tr key={s} className="border-b border-border/40"><td className="py-1">Day {s}</td><td>{eligible.length}</td><td>{responded}</td><td>{pct == null ? "—" : `${pct}%`}</td></tr>;
            })}
          </tbody>
        </table>
      </Section>
      <ReportFooter />
    </article>
  );
}

function TrainingEffectivenessPreview({ employees, responses }: { employees: EmpLite[]; responses: RespLite[] }) {
  const empById = new Map(employees.map((e) => [e.id, e]));
  const latest = Array.from(latestResponseByEmp(responses).values());
  const overall = dimAverages(latest).training_effectiveness ?? 0;

  // By branch
  const byBranch = new Map<string, RespLite[]>();
  for (const r of latest) { const e = empById.get(r.employee_id); if (!e) continue; const a = byBranch.get(e.branch) ?? []; a.push(r); byBranch.set(e.branch, a); }
  const branchRows = Array.from(byBranch.entries()).map(([b, list]) => ({ b, score: dimAverages(list).training_effectiveness ?? 0 }));

  // By stage
  const byStage = new Map<number, RespLite[]>();
  for (const r of responses) { const s = Number(r.stage); const a = byStage.get(s) ?? []; a.push(r); byStage.set(s, a); }
  const stageRows = STAGES.map((s) => {
    const list = byStage.get(s) ?? [];
    const score = dimAverages(list).training_effectiveness ?? 0;
    // most common training_effectiveness follow-up answer in this stage
    const counts = new Map<string, number>();
    for (const r of list) for (const a of (r.responses ?? [])) if (a.dimension === "training_effectiveness") counts.set(a.answer_text, (counts.get(a.answer_text) ?? 0) + 1);
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    return { s, score, concern: top ? top[0] : "—" };
  });

  // Top skill gaps from training_effectiveness multi answers
  const gaps = new Map<string, number>();
  let denom = 0;
  for (const r of responses) {
    let counted = false;
    for (const a of (r.responses ?? [])) {
      if (a.dimension === "training_effectiveness") {
        for (const opt of a.answer_text.split(" • ")) {
          gaps.set(opt, (gaps.get(opt) ?? 0) + 1);
        }
        counted = true;
      }
    }
    if (counted) denom++;
  }
  const topGaps = Array.from(gaps.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Day 45 Q5 = dossier adherence (heuristic: contains "dossier")
  const day45 = responses.filter((r) => Number(r.stage) === 45);
  const dossierCounts: Record<string, number> = {};
  let dossierTotal = 0;
  for (const r of day45) for (const a of (r.responses ?? [])) {
    if (a.question_text.toLowerCase().includes("dossier")) {
      for (const opt of a.answer_text.split(" • ")) dossierCounts[opt] = (dossierCounts[opt] ?? 0) + 1;
      dossierTotal++; break;
    }
  }

  return (
    <article className="space-y-5 text-sm leading-relaxed text-foreground">
      <ReportHeader name="Training Effectiveness Report" />
      <Section title="Overall score">
        <p>Average Training Effectiveness dimension: <b>{overall.toFixed(1)}</b> ({riskLevelFromScore(overall * 1.4)})</p>
      </Section>
      <Section title="By branch">
        <table className="w-full border-collapse text-xs">
          <thead><tr className="border-b border-border text-left"><th className="py-1">Branch</th><th>Avg Training Score</th><th>Risk Level</th></tr></thead>
          <tbody>{branchRows.sort((a, b) => b.score - a.score).map((r) => <tr key={r.b} className="border-b border-border/40"><td className="py-1">{r.b}</td><td>{r.score.toFixed(1)}</td><td>{riskLevelFromScore(r.score * 1.4)}</td></tr>)}</tbody>
        </table>
      </Section>
      <Section title="By survey stage">
        <table className="w-full border-collapse text-xs">
          <thead><tr className="border-b border-border text-left"><th className="py-1">Stage</th><th>Avg Training Score</th><th>Most Common Concern</th></tr></thead>
          <tbody>{stageRows.map((r) => <tr key={r.s} className="border-b border-border/40"><td className="py-1">Day {r.s}</td><td>{r.score.toFixed(1)}</td><td className="max-w-md">{r.concern}</td></tr>)}</tbody>
        </table>
      </Section>
      <Section title="Top skill gaps reported">
        {topGaps.length === 0 ? <p>No data yet.</p> : (
          <ol className="list-decimal pl-5">
            {topGaps.map(([g, c], i) => <li key={i}>"{g}" — reported by {Math.round(c/Math.max(1,denom)*100)}% of responses</li>)}
          </ol>
        )}
      </Section>
      <Section title="Training dossier adherence (Day 45)">
        {dossierTotal === 0 ? <p>No Day 45 data yet.</p> : (
          <ul className="list-disc pl-5">
            {Object.entries(dossierCounts).map(([k, v]) => <li key={k}>{k}: <b>{Math.round(v/dossierTotal*100)}%</b></li>)}
          </ul>
        )}
      </Section>
      <Section title="Recommendations">
        <ul className="list-disc pl-5">
          {overall * 1.4 >= 11 && <li>Training program needs structural improvement</li>}
          {dossierTotal > 0 && (dossierCounts["What dossier?"] ?? 0) / dossierTotal > 0.2 && <li>Training dossier is not being followed consistently</li>}
          {branchRows.length > 0 && branchRows[0].score > overall * 1.4 && <li>{branchRows[0].b} needs targeted training intervention</li>}
          {topGaps[0] && (topGaps[0][1] / Math.max(1, denom)) > 0.4 && <li>Priority gap: {topGaps[0][0]}</li>}
        </ul>
      </Section>
      <ReportFooter />
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="text-foreground">{children}</div>
    </section>
  );
}

export default function ReportsPage() {
  return <RequireHr><ReportsInner /></RequireHr>;
}
