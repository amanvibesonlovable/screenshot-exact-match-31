// Ascent 2026 — shared data layer, types, computations
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type Intern = {
  id: string;
  name: string;
  employee_code: string;
  email: string;
  phone: string;
  branch: string;
  area_manager: string;
  doj: string;
  status: string;
  program: string;
  project_type: string | null;
  intern_batch: string | null;
};

export type InternResponse = {
  id: string;
  employee_id: string;
  stage: string | number; // week as text/number
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

export const ASCENT_WEEKS = [1, 2, 3, 4, 5, 6, 7] as const;
export type AscentWeek = (typeof ASCENT_WEEKS)[number];

export const DIM_KEYS = [
  "engagement_motivation",
  "guidance_support",
  "project_clarity",
  "experience_wellbeing",
] as const;
export type DimKey = (typeof DIM_KEYS)[number];

export const DIM_LABELS: Record<DimKey, string> = {
  engagement_motivation: "Engagement & Motivation",
  guidance_support: "Guidance & Support",
  project_clarity: "Project Clarity",
  experience_wellbeing: "Experience & Wellbeing",
};
export const DIM_SHORT: Record<DimKey, string> = {
  engagement_motivation: "Engagement",
  guidance_support: "Guidance",
  project_clarity: "Project",
  experience_wellbeing: "Experience",
};
export const DIM_COLORS: Record<DimKey, string> = {
  engagement_motivation: "#2563EB",
  guidance_support: "#7C3AED",
  project_clarity: "#0F766E",
  experience_wellbeing: "#F59E0B",
};
export const DIM_MAX = 10;
export const ASCENT_TEAL = "#0F766E";

export const RISK_COLORS = { LOW: "#16A34A", MEDIUM: "#D97706", HIGH: "#DC2626" };

export function daysSince(doj: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(doj).getTime()) / 86_400_000));
}

/** Returns the highest eligible week (1..7). Null if days < 7. */
export function eligibleWeek(doj: string): AscentWeek | null {
  const d = daysSince(doj);
  if (d < 7) return null;
  if (d < 14) return 1;
  if (d < 21) return 2;
  if (d < 28) return 3;
  if (d < 35) return 4;
  if (d < 42) return 5;
  if (d < 49) return 6;
  return 7;
}

export function eligibleWeeks(doj: string): AscentWeek[] {
  const w = eligibleWeek(doj);
  if (!w) return [];
  return ASCENT_WEEKS.filter((x) => x <= w);
}

export function weekNum(stage: string | number): number {
  return typeof stage === "number" ? stage : parseInt(String(stage), 10);
}

export function responsesByIntern(rs: InternResponse[]): Map<string, InternResponse[]> {
  const m = new Map<string, InternResponse[]>();
  for (const r of rs) {
    if (!m.has(r.employee_id)) m.set(r.employee_id, []);
    m.get(r.employee_id)!.push(r);
  }
  for (const arr of m.values()) arr.sort((a, b) => weekNum(a.stage) - weekNum(b.stage));
  return m;
}

export function latestResponse(rs: InternResponse[]): InternResponse | null {
  if (!rs.length) return null;
  return [...rs].sort((a, b) => weekNum(b.stage) - weekNum(a.stage))[0];
}

/** The recurring pulse Q is the LAST question of each weekly survey (W4-W7 explicit; W1-W2 may not have it). */
export function pulseScore(r: InternResponse): number | null {
  if (!r.responses) return null;
  // Find the response with botLabel/question that is the pulse — by points pattern 0/0/2/4/6
  // Easiest: question_text contains "Quick pulse" OR question_id ends "_q4"/"_q5"
  const pulseQ = r.responses.find(
    (x) =>
      /quick pulse/i.test(x.question_text) ||
      /one word/i.test(x.question_text) ||
      /how was your first week/i.test(x.question_text) ||
      /overall experience so far/i.test(x.question_text),
  );
  if (!pulseQ) return null;
  // Map points back to 1-5 scale: 0→5 (best), 0→4, 2→3, 4→2, 6→1
  const p = pulseQ.points;
  if (p === 0) return 5; // best; we lose 4 vs 5 distinction, but acceptable approximation
  if (p === 1) return 4;
  if (p === 2) return 3;
  if (p === 3) return 3;
  if (p === 4) return 2;
  if (p >= 5) return 1;
  return null;
}

export function pulseSeries(rs: InternResponse[]): { week: number; pulse: number | null }[] {
  const sorted = [...rs].sort((a, b) => weekNum(a.stage) - weekNum(b.stage));
  return sorted.map((r) => ({ week: weekNum(r.stage), pulse: pulseScore(r) }));
}

export function pulseTrend(rs: InternResponse[]): "improving" | "stable" | "declining" | "n/a" {
  const series = pulseSeries(rs).filter((x) => x.pulse != null);
  if (series.length < 2) return "n/a";
  const a = series[series.length - 2].pulse!;
  const b = series[series.length - 1].pulse!;
  if (b > a) return "improving";
  if (b < a) return "declining";
  return "stable";
}

/** Did intern miss the last 2 consecutive eligible weeks? */
export function isNonResponsive(intern: Intern, rs: InternResponse[]): boolean {
  const eligible = eligibleWeeks(intern.doj);
  if (eligible.length < 2) return false;
  const last2 = eligible.slice(-2);
  const completed = new Set(rs.map((r) => weekNum(r.stage)));
  return last2.every((w) => !completed.has(w));
}

/** The intern's "current" week — the highest eligible week they have NOT yet completed. */
export function currentOpenWeek(intern: Intern, rs: InternResponse[]): AscentWeek | null {
  const e = eligibleWeek(intern.doj);
  if (!e) return null;
  const done = new Set(rs.map((r) => weekNum(r.stage)));
  return done.has(e) ? null : e;
}

export function overallRisk(intern: Intern, rs: InternResponse[]): "LOW" | "MEDIUM" | "HIGH" | "N/A" {
  const last = latestResponse(rs);
  if (!last) return "N/A";
  return last.risk_level;
}

export function dimAverages(rs: InternResponse[]): Record<DimKey, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const r of rs) {
    const s = r.scores || {};
    for (const k of DIM_KEYS) {
      const v = s[k];
      if (v == null) continue;
      sums[k] = (sums[k] ?? 0) + Number(v);
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  const out = {} as Record<DimKey, number>;
  for (const k of DIM_KEYS) out[k] = counts[k] ? sums[k] / counts[k] : 0;
  return out;
}

export function dimRisk(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score >= 7) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

/** Compute completion across a population. */
export function completionStats(
  interns: Intern[],
  responses: InternResponse[],
): { eligible: number; completed: number; pct: number } {
  const respondedSet = new Set(responses.map((r) => `${r.employee_id}:${weekNum(r.stage)}`));
  let eligible = 0;
  let completed = 0;
  for (const i of interns) {
    for (const w of eligibleWeeks(i.doj)) {
      eligible++;
      if (respondedSet.has(`${i.id}:${w}`)) completed++;
    }
  }
  return { eligible, completed, pct: eligible ? Math.round((completed / eligible) * 100) : 0 };
}

export function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// =================== DATA HOOKS ===================

export function useAscentInterns() {
  return useQuery({
    queryKey: ["ascent-interns"],
    queryFn: async (): Promise<Intern[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id,name,employee_code,email,phone,branch,area_manager,doj,status,program,project_type,intern_batch",
        )
        .eq("program", "ascent")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Intern[];
    },
  });
}

export function useAscentResponses(internIds: string[] | undefined) {
  return useQuery({
    queryKey: ["ascent-responses", internIds?.length ?? 0, internIds?.join(",").slice(0, 200)],
    enabled: !!internIds && internIds.length > 0,
    queryFn: async (): Promise<InternResponse[]> => {
      if (!internIds || !internIds.length) return [];
      const { data, error } = await supabase
        .from("survey_responses")
        .select(
          "id,employee_id,stage,risk_level,final_score,gaming_flag,critical_flags,scores,free_text_response,responses,submitted_at,completion_time_seconds",
        )
        .in("employee_id", internIds)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InternResponse[];
    },
  });
}

// =================== FILTERS ===================

export type AscentFilters = {
  date: "all" | "7d" | "30d" | "custom";
  customFrom?: string;
  customTo?: string;
  branch: string; // "all" | branch name
  week: "all" | AscentWeek;
  risk: "all" | "HIGH" | "MEDIUM" | "LOW";
  batch: string; // "all" | batch
};

export const DEFAULT_FILTERS: AscentFilters = {
  date: "all",
  branch: "all",
  week: "all",
  risk: "all",
  batch: "all",
};

export function applyFilters(
  interns: Intern[],
  responses: InternResponse[],
  f: AscentFilters,
): { interns: Intern[]; responses: InternResponse[] } {
  let R = responses;
  // Date filter applies to responses
  const now = Date.now();
  if (f.date === "7d") R = R.filter((r) => now - new Date(r.submitted_at).getTime() <= 7 * 86400000);
  else if (f.date === "30d")
    R = R.filter((r) => now - new Date(r.submitted_at).getTime() <= 30 * 86400000);
  else if (f.date === "custom" && (f.customFrom || f.customTo)) {
    const from = f.customFrom ? new Date(f.customFrom).getTime() : 0;
    const to = f.customTo ? new Date(f.customTo).getTime() + 86400000 : Infinity;
    R = R.filter((r) => {
      const t = new Date(r.submitted_at).getTime();
      return t >= from && t <= to;
    });
  }
  if (f.week !== "all") R = R.filter((r) => weekNum(r.stage) === f.week);
  if (f.risk !== "all") R = R.filter((r) => r.risk_level === f.risk);

  let I = interns;
  if (f.branch !== "all") I = I.filter((i) => i.branch === f.branch);
  if (f.batch !== "all") I = I.filter((i) => i.intern_batch === f.batch);
  // If filtering by risk, also constrain interns to those with at least one matching latest response
  if (f.risk !== "all") {
    const byEmp = responsesByIntern(responses);
    const ok = new Set<string>();
    for (const i of I) {
      const last = latestResponse(byEmp.get(i.id) ?? []);
      if (last && last.risk_level === f.risk) ok.add(i.id);
    }
    I = I.filter((i) => ok.has(i.id));
  }
  // Keep only responses whose employee is in I
  const okIds = new Set(I.map((i) => i.id));
  R = R.filter((r) => okIds.has(r.employee_id));
  return { interns: I, responses: R };
}

export function uniqueBranches(interns: Intern[]): string[] {
  return Array.from(new Set(interns.map((i) => i.branch).filter(Boolean))).sort();
}
export function uniqueBatches(interns: Intern[]): string[] {
  return Array.from(new Set(interns.map((i) => i.intern_batch).filter(Boolean) as string[])).sort();
}
export function uniqueAMs(interns: Intern[]): string[] {
  return Array.from(new Set(interns.map((i) => i.area_manager).filter(Boolean))).sort();
}
