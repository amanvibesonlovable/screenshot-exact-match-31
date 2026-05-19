import { useMemo, useState } from "react";
import { AscentLayout } from "@/ascent/AscentLayout";
import {
  DIM_KEYS, DIM_LABELS, RISK_COLORS, applyFilters, completionStats, isNonResponsive,
  latestResponse, pulseScore, responsesByIntern, uniqueBranches, useAscentInterns,
  useAscentResponses, weekNum, DEFAULT_FILTERS, type AscentFilters,
} from "@/ascent/lib";
import { classifyPpo, avgPulse, PPO_LABEL } from "@/ascent/ppo";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

function downloadText(name: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function csvEscape(s: any): string {
  const v = s == null ? "" : String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function AscentReportsPage() {
  const { data: interns = [] } = useAscentInterns();
  const internIds = useMemo(() => interns.map((i) => i.id), [interns]);
  const { data: responses = [] } = useAscentResponses(internIds);

  const [branchSel, setBranchSel] = useState<string>("all");
  const [dataset, setDataset] = useState<"interns" | "responses" | "responses_full" | "actions" | "ppo">("interns");
  const branches = uniqueBranches(interns);

  function generateWeeklyPulse() {
    const f = applyFilters(interns, responses, DEFAULT_FILTERS);
    const active = f.interns.filter((i) => i.status === "training");
    const byEmp = responsesByIntern(f.responses);
    const weekAgo = Date.now() - 7 * 86400000;
    const recent = f.responses.filter((r) => new Date(r.submitted_at).getTime() >= weekAgo);
    const comp = completionStats(active, f.responses);
    const high = active.filter((i) => latestResponse(byEmp.get(i.id) ?? [])?.risk_level === "HIGH");
    const med = active.filter((i) => latestResponse(byEmp.get(i.id) ?? [])?.risk_level === "MEDIUM");
    const low = active.filter((i) => latestResponse(byEmp.get(i.id) ?? [])?.risk_level === "LOW");
    const nr = active.filter((i) => isNonResponsive(i, byEmp.get(i.id) ?? []));
    const dropouts = f.interns.filter((i) => i.status === "exited").length;
    const pulses = recent.map(pulseScore).filter((x): x is number => x != null);
    const avgP = pulses.length ? (pulses.reduce((a, b) => a + b, 0) / pulses.length).toFixed(2) : "—";
    const flags = recent.filter((r) => r.critical_flags?.length).slice(0, 20);

    const lines = [
      `ASCENT WEEKLY PULSE — ${new Date(weekAgo).toLocaleDateString()} to ${new Date().toLocaleDateString()}`, "",
      "OVERVIEW",
      `• Active interns: ${active.length} across ${new Set(active.map((i) => i.branch)).size} branches`,
      `• New survey responses this period: ${recent.length}`,
      `• Survey completion rate: ${comp.pct}%`, "",
      "RISK SNAPSHOT",
      `• High Risk: ${high.length}`,
      `• Medium Risk: ${med.length}`,
      `• Low Risk: ${low.length}`,
      `• Non-Responsive: ${nr.length}`,
      `• Confirmed Dropouts: ${dropouts}`, "",
      "ENGAGEMENT TREND",
      `• Average pulse this week: ${avgP}/5`, "",
      "CRITICAL FLAGS THIS PERIOD",
      ...flags.map((r) => {
        const i = interns.find((x) => x.id === r.employee_id);
        return `• ${i?.name ?? "?"} (${i?.branch}) W${weekNum(r.stage)}: ${r.critical_flags?.join("; ")}`;
      }),
    ];
    downloadText(`ascent-weekly-pulse-${Date.now()}.txt`, lines.join("\n"));
    toast.success("Weekly Pulse generated");
  }

  function generatePpoReadiness() {
    const active = interns.filter((i) => i.status === "training");
    const byEmp = responsesByIntern(responses);
    const items = active.map((i) => ({ intern: i, rs: byEmp.get(i.id) ?? [], bucket: classifyPpo(i, byEmp.get(i.id) ?? []), avg: avgPulse(byEmp.get(i.id) ?? []) }));
    const elig = items.filter((x) => x.bucket !== "NONE");
    const acc = elig.filter((x) => x.bucket === "ACCEPT");
    const fence = elig.filter((x) => x.bucket === "FENCE");
    const dec = elig.filter((x) => x.bucket === "DECLINE");
    const avgOf = (arr: typeof items) => {
      const v = arr.map((x) => x.avg).filter((x): x is number => x != null);
      return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : "—";
    };
    const lines = [
      `PPO READINESS REPORT — Ascent 2026`, `Generated: ${new Date().toLocaleString()}`, "",
      "SUMMARY",
      `• Total interns with PPO data: ${elig.length}`,
      `• Likely to Accept: ${acc.length} 🟢`,
      `• On the Fence: ${fence.length} 🟡`,
      `• Likely to Decline: ${dec.length} 🔴`,
      `• No PPO data yet: ${active.length - elig.length}`, "",
      "BY BRANCH",
      ...branches.map((b) => {
        const ofB = items.filter((x) => x.intern.branch === b);
        const a = ofB.filter((x) => x.bucket === "ACCEPT").length;
        const f = ofB.filter((x) => x.bucket === "FENCE").length;
        const d = ofB.filter((x) => x.bucket === "DECLINE").length;
        const total = a + f + d;
        const rate = total ? Math.round((a / total) * 100) : 0;
        return `| ${b.padEnd(12)} | Accept ${a} | Fence ${f} | Decline ${d} | Accept rate ${rate}% |`;
      }), "",
      "CORRELATION INSIGHT",
      `• Average pulse for Accept group: ${avgOf(acc)}/5`,
      `• Average pulse for Fence group: ${avgOf(fence)}/5`,
      `• Average pulse for Decline group: ${avgOf(dec)}/5`, "",
      "ON THE FENCE — INTERVENTION GUIDE",
      ...fence.map((x) => `• ${x.intern.name} (${x.intern.branch}, ${x.intern.area_manager}) — avg pulse ${x.avg ?? "—"}`),
      "", "LIKELY TO DECLINE — EXIT INSIGHTS",
      ...dec.map((x) => `• ${x.intern.name} (${x.intern.branch}, ${x.intern.area_manager}) — avg pulse ${x.avg ?? "—"}`),
    ];
    downloadText(`ppo-readiness-${Date.now()}.txt`, lines.join("\n"));
    toast.success("PPO Readiness report generated");
  }

  function generateBranchReview() {
    if (branchSel === "all") { toast.error("Select a branch first"); return; }
    const ofB = interns.filter((i) => i.branch === branchSel);
    const byEmp = responsesByIntern(responses);
    const rows = ofB.map((i) => {
      const rs = byEmp.get(i.id) ?? [];
      const last = latestResponse(rs);
      return { name: i.name, code: i.employee_code, am: i.area_manager, surveys: rs.length, latestRisk: last?.risk_level ?? "—", latestScore: last?.final_score ?? "—" };
    });
    const csv = ["Name,Code,AM,Surveys,LatestRisk,LatestScore", ...rows.map((r) => [r.name, r.code, r.am, r.surveys, r.latestRisk, r.latestScore].map(csvEscape).join(","))].join("\n");
    downloadText(`ascent-branch-${branchSel}-${Date.now()}.csv`, csv, "text/csv");
    toast.success("Branch review generated");
  }

  function exportData() {
    const byEmp = responsesByIntern(responses);
    let csv = "";
    if (dataset === "interns") {
      csv = "ID,Name,Phone,Email,Branch,AM,DOJ,Project,Batch,Status\n" +
        interns.map((i) => [i.employee_code, i.name, i.phone, i.email, i.branch, i.area_manager, i.doj, i.project_type, i.intern_batch, i.status].map(csvEscape).join(",")).join("\n");
    } else if (dataset === "responses") {
      csv = "Intern,Branch,Week,Risk,Score,CriticalFlags,FreeText,Pulse,Gaming,Date\n" +
        responses.map((r) => {
          const i = interns.find((x) => x.id === r.employee_id);
          return [i?.name, i?.branch, weekNum(r.stage), r.risk_level, r.final_score, (r.critical_flags ?? []).join("; "), r.free_text_response ?? "", pulseScore(r) ?? "", r.gaming_flag, r.submitted_at].map(csvEscape).join(",");
        }).join("\n");
    } else if (dataset === "responses_full") {
      csv = "Intern,Branch,Week,Risk,Score,Engagement,Guidance,Project,Experience,Composite,Multiplier,Date\n" +
        responses.map((r) => {
          const i = interns.find((x) => x.id === r.employee_id);
          const s: any = r.scores ?? {};
          return [i?.name, i?.branch, weekNum(r.stage), r.risk_level, r.final_score, s.engagement_motivation ?? 0, s.guidance_support ?? 0, s.project_clarity ?? 0, s.experience_wellbeing ?? 0, s.composite ?? 0, s.week_multiplier ?? 1, r.submitted_at].map(csvEscape).join(",");
        }).join("\n");
    } else if (dataset === "ppo") {
      csv = "Intern,Branch,W6Intent,W7Intent,Bucket,AvgPulse\n" +
        interns.filter((i) => i.status === "training").map((i) => {
          const rs = byEmp.get(i.id) ?? [];
          const w6 = rs.find((r) => weekNum(r.stage) === 6);
          const w7 = rs.find((r) => weekNum(r.stage) === 7);
          const w6a = w6?.responses?.find((q: any) => /^w6_q3$/i.test(q.question_id))?.answer_text ?? "";
          const w7a = w7?.responses?.find((q: any) => /^w7_q3$/i.test(q.question_id))?.answer_text ?? "";
          return [i.name, i.branch, w6a, w7a, PPO_LABEL[classifyPpo(i, rs)], avgPulse(rs) ?? ""].map(csvEscape).join(",");
        }).join("\n");
    } else {
      csv = "—";
    }
    downloadText(`ascent-${dataset}-${Date.now()}.csv`, csv, "text/csv");
    toast.success("Export downloaded");
  }

  return (
    <AscentLayout title="Reports">
      <div className="grid gap-5 md:grid-cols-2">
        <ReportCard title="Weekly Pulse" desc="Auto-generated summary of the past week for Ascent interns.">
          <button onClick={generateWeeklyPulse} className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Download size={14} /> Download
          </button>
        </ReportCard>

        <ReportCard title="Branch Review" desc="Detailed report for a specific branch.">
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={branchSel} onChange={(e) => setBranchSel(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
              <option value="all">Select branch...</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <button onClick={generateBranchReview} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Download size={14} /> CSV
            </button>
          </div>
        </ReportCard>

        <ReportCard title="PPO Readiness" desc="PPO acceptance prediction and intervention guide. Share before PPO decisions.">
          <button onClick={generatePpoReadiness} className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Download size={14} /> Download
          </button>
        </ReportCard>

        <ReportCard title="Data Export" desc="Download Ascent intern data as CSV.">
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={dataset} onChange={(e) => setDataset(e.target.value as any)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
              <option value="interns">All Interns</option>
              <option value="responses">All Responses</option>
              <option value="responses_full">Responses with Full Scores</option>
              <option value="ppo">PPO Intent Data</option>
            </select>
            <button onClick={exportData} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Download size={14} /> CSV
            </button>
          </div>
        </ReportCard>
      </div>
    </AscentLayout>
  );
}

function ReportCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <FileText size={18} className="mt-0.5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
