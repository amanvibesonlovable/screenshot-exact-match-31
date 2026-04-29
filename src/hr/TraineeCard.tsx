import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DIM_COLORS, DIM_LABELS, RISK_COLORS } from "./DashboardCharts";

const ACTION_OPTIONS = [
  "Called trainee",
  "Spoke to manager",
  "Scheduled check-in",
  "Escalated to senior HR",
  "Custom note",
];

type Stage = 15 | 30 | 45 | 60 | 90 | 180;
const STAGES: Stage[] = [15, 30, 45, 60, 90, 180];

export type TraineeCardData = {
  employee: {
    id: string;
    employee_code: string;
    name: string;
    branch: string;
    area_manager: string;
    doj: string;
    token: string;
  };
  daysSince: number;
  surveysByStage: Record<number, {
    completed: boolean;
    overdue: boolean;
    eligible: boolean;
    gaming: boolean;
    risk_level?: "LOW" | "MEDIUM" | "HIGH";
    final_score?: number;
  }>;
  latest?: {
    risk_level: "LOW" | "MEDIUM" | "HIGH";
    final_score: number;
    scores: Record<string, number | null>;
    critical_flags: string[];
    gaming_flag: boolean;
    stage: number;
  };
  trend?: "WORSENING" | "STABLE" | "IMPROVING";
};

function riskBadgeStyle(level: "LOW" | "MEDIUM" | "HIGH" | undefined) {
  if (!level) return { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" };
  return { background: `${RISK_COLORS[level]}22`, color: RISK_COLORS[level], border: `1px solid ${RISK_COLORS[level]}55` };
}

export function TraineeCard({ data }: { data: TraineeCardData }) {
  const { employee, daysSince, surveysByStage, latest, trend } = data;
  const dims = ["training_effectiveness", "attrition_risk", "support_guidance", "adjustment_wellbeing", "transition_readiness"] as const;
  const maxDimScore = 25;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-bubble backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-foreground">{employee.name}</h3>
            {trend && (
              <span
                className="text-xs font-bold"
                style={{
                  color:
                    trend === "WORSENING" ? RISK_COLORS.HIGH :
                    trend === "IMPROVING" ? RISK_COLORS.LOW :
                    "hsl(var(--muted-foreground))",
                }}
              >
                {trend === "WORSENING" ? "↗ worsening" : trend === "IMPROVING" ? "↘ improving" : "→ stable"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {employee.employee_code} · {employee.branch} · {employee.area_manager}
          </p>
          <p className="text-xs text-muted-foreground">
            DOJ {employee.doj} · day {daysSince}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-extrabold uppercase"
          style={riskBadgeStyle(latest?.risk_level)}
        >
          {latest ? latest.risk_level : "no data"}
        </span>
      </div>

      {/* 6-stage progress */}
      <div className="mt-4 flex items-center gap-1.5">
        {STAGES.map((s) => {
          const slot = surveysByStage[s];
          let icon = "⬜"; let title = "Not yet eligible"; let cls = "bg-secondary text-muted-foreground";
          if (!slot || !slot.eligible) { icon = "·"; title = "Not yet eligible"; cls = "bg-secondary/60 text-muted-foreground"; }
          else if (slot.completed) {
            icon = slot.gaming ? "⚡" : "✓";
            title = slot.gaming ? "Completed (rushed)" : "Completed";
            cls = "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
          } else if (slot.overdue) {
            icon = "⏰"; title = "Overdue"; cls = "bg-amber-500/25 text-amber-700 dark:text-amber-300";
          } else {
            icon = "○"; title = "Eligible"; cls = "bg-amber-500/15 text-amber-600";
          }
          return (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div title={title} className={`flex h-7 w-full items-center justify-center rounded-md text-xs font-bold ${cls}`}>
                {icon}
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">D{s}</span>
            </div>
          );
        })}
      </div>

      {/* Dimension bars */}
      {latest && (
        <div className="mt-4 grid grid-cols-1 gap-1.5">
          {dims.map((d) => {
            const v = latest.scores[d];
            if (v === null || v === undefined) return null;
            const pct = Math.min(100, (Number(v) / maxDimScore) * 100);
            return (
              <div key={d} className="flex items-center gap-2 text-[11px]">
                <span className="w-36 truncate text-muted-foreground">{DIM_LABELS[d]}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div style={{ width: `${pct}%`, background: DIM_COLORS[d] }} className="h-full" />
                </div>
                <span className="w-7 text-right tabular-nums text-muted-foreground">{Number(v).toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Critical flags */}
      {latest && latest.critical_flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {latest.critical_flags.map((f) => (
            <span key={f} className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
              🚨 {f}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <Link
          to={`/dashboard/trainees/${employee.id}`}
          className="rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-soft hover:-translate-y-0.5 transition"
        >
          View full responses →
        </Link>
        <code className="truncate rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">
          /s/{employee.token}
        </code>
      </div>
    </div>
  );
}
