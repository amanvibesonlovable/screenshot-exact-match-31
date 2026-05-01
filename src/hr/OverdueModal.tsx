import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppUrl } from "./whatsapp";

const STAGES = [15, 30, 45, 60, 90, 180] as const;

type Employee = {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  area_manager: string;
  doj: string;
  token: string;
};

type SurveyResponse = {
  employee_id: string;
  stage: string | number;
};

export type OverdueRow = {
  employeeId: string;
  name: string;
  branch: string;
  manager: string;
  daysSinceJoining: number;
  overdueStage: number;
  daysOverdue: number;
  surveyUrl: string;
  email: string;
  phone: string;
};

function daysSinceDOJ(doj: string): number {
  return Math.floor((Date.now() - new Date(doj).getTime()) / 86400000);
}

export function computeOverdueRows(
  employees: Employee[],
  responses: SurveyResponse[],
): OverdueRow[] {
  const completedByEmpStage = new Set<string>();
  for (const r of responses) completedByEmpStage.add(`${r.employee_id}:${r.stage}`);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const rows: OverdueRow[] = [];
  for (const e of employees) {
    const days = daysSinceDOJ(e.doj);
    // Pick the most-overdue eligible stage that is incomplete and >=5d past eligibility
    let worst: { stage: number; daysOverdue: number } | null = null;
    for (const s of STAGES) {
      if (days < s) continue;
      if (completedByEmpStage.has(`${e.id}:${s}`)) continue;
      const od = days - s;
      if (od < 5) continue;
      if (!worst || od > worst.daysOverdue) worst = { stage: s, daysOverdue: od };
    }
    if (!worst) continue;
    rows.push({
      employeeId: e.id,
      name: e.name,
      branch: e.branch,
      manager: e.area_manager,
      daysSinceJoining: days,
      overdueStage: worst.stage,
      daysOverdue: worst.daysOverdue,
      surveyUrl: `${origin}/survey/${e.token}`,
      email: e.email,
      phone: e.phone,
    });
  }
  return rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function csvEscape(v: string | number) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function OverdueModal({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rows: OverdueRow[];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sorted = useMemo(() => rows, [rows]);

  const copyLink = async (row: OverdueRow) => {
    try {
      await navigator.clipboard.writeText(row.surveyUrl);
      setCopiedId(row.employeeId);
      toast.success("Link copied!");
      setTimeout(() => setCopiedId((c) => (c === row.employeeId ? null : c)), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const exportCsv = () => {
    const header = ["Name", "Branch", "Manager", "Phone", "Email", "Overdue Survey", "Days Overdue", "Survey Link"];
    const lines = [header.join(",")];
    for (const r of sorted) {
      lines.push(
        [
          r.name,
          r.branch,
          r.manager,
          r.phone,
          r.email,
          `Day ${r.overdueStage}`,
          r.daysOverdue,
          r.surveyUrl,
        ].map(csvEscape).join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overdue-checkins-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            Overdue Check-ins
            <Badge variant="destructive" className="rounded-full">{sorted.length}</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            These trainees are eligible for a survey but haven't completed it in 5+ days.
          </p>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Branch</th>
                <th className="px-3 py-2.5">Manager</th>
                <th className="px-3 py-2.5 text-right">Days Since Joining</th>
                <th className="px-3 py-2.5">Overdue Survey</th>
                <th className="px-3 py-2.5 text-right">Days Overdue</th>
                <th className="px-3 py-2.5">Survey Link</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No overdue check-ins. 🎉
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.employeeId} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-3 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.branch}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.manager}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.daysSinceJoining}</td>
                    <td className="px-3 py-2.5">Day {r.overdueStage}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Badge
                        variant="outline"
                        className="border-destructive/30 bg-destructive/10 text-destructive tabular-nums"
                      >
                        {r.daysOverdue}d
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => copyLink(r)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary"
                        title={r.surveyUrl}
                      >
                        {copiedId === r.employeeId ? (
                          <>
                            <Check size={12} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Copy
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={sorted.length === 0}>
            <Download size={14} className="mr-1.5" />
            Export as CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
