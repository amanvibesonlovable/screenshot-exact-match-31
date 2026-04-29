// Shared aggregation helpers for Branches/Managers/Reports tabs

export type EmpLite = {
  id: string;
  name: string;
  employee_code: string;
  branch: string;
  area_manager: string;
  doj: string;
  status: string;
  phone?: string;
  email?: string;
};

export type RespLite = {
  id: string;
  employee_id: string;
  stage: string | number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  final_score: number;
  gaming_flag: boolean;
  critical_flags: string[] | null;
  scores: Record<string, number | null> | null;
  free_text_response: string | null;
  responses: Array<{
    question_id: string;
    question_text: string;
    answer_text: string;
    points: number;
    dimension: string;
  }> | null;
  submitted_at: string;
  completion_time_seconds: number;
};

export const STAGES = [15, 30, 45, 60, 90, 180] as const;
export const DIM_KEYS = [
  "training_effectiveness",
  "attrition_risk",
  "support_guidance",
  "adjustment_wellbeing",
  "transition_readiness",
] as const;
export const DIM_MAX = 25;

export function daysSince(doj: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(doj).getTime()) / 86_400_000));
}

export function isEligibleForStage(doj: string, stage: number): boolean {
  return daysSince(doj) >= stage;
}

export function latestResponseByEmp(responses: RespLite[]) {
  const m = new Map<string, RespLite>();
  for (const r of responses) {
    const prev = m.get(r.employee_id);
    if (!prev || new Date(r.submitted_at) > new Date(prev.submitted_at)) m.set(r.employee_id, r);
  }
  return m;
}

export function completionForEmployees(emps: EmpLite[], responses: RespLite[]) {
  // eligible employee × stage pairs vs # responded
  let eligible = 0;
  let responded = 0;
  const respondedSet = new Set<string>();
  for (const r of responses) respondedSet.add(`${r.employee_id}:${Number(r.stage)}`);
  for (const e of emps) {
    for (const s of STAGES) {
      if (isEligibleForStage(e.doj, s)) {
        eligible++;
        if (respondedSet.has(`${e.id}:${s}`)) responded++;
      }
    }
  }
  return { eligible, responded, pct: eligible ? Math.round((responded / eligible) * 100) : 0 };
}

export function avgRiskScore(responses: RespLite[]) {
  if (!responses.length) return 0;
  return responses.reduce((s, r) => s + Number(r.final_score || 0), 0) / responses.length;
}

export function riskLevelFromScore(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score >= 23) return "HIGH";
  if (score >= 11) return "MEDIUM";
  return "LOW";
}

export function dimAverages(responses: RespLite[]): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const r of responses) {
    const s = r.scores || {};
    for (const k of DIM_KEYS) {
      const v = s[k];
      if (v == null) continue;
      sums[k] = (sums[k] ?? 0) + Number(v);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  const out: Record<string, number> = {};
  for (const k of DIM_KEYS) out[k] = counts[k] ? sums[k] / counts[k] : 0;
  return out;
}

export function dimRiskBand(score: number): "LOW" | "MEDIUM" | "HIGH" {
  const pct = score / DIM_MAX;
  if (pct >= 0.66) return "HIGH";
  if (pct >= 0.33) return "MEDIUM";
  return "LOW";
}

export function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w > 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo > 1 ? "s" : ""} ago`;
}

export function trend(responsesForEmp: RespLite[]): "up" | "flat" | "down" | "n/a" {
  if (responsesForEmp.length < 2) return "n/a";
  const sorted = [...responsesForEmp].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );
  const a = sorted[sorted.length - 2].final_score;
  const b = sorted[sorted.length - 1].final_score;
  const diff = b - a;
  if (diff <= -2) return "down"; // improving (lower score = better)
  if (diff >= 2) return "up"; // worsening
  return "flat";
}
