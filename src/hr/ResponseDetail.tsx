import { Link } from "react-router-dom";
import { DIM_LABELS, RISK_COLORS } from "./DashboardCharts";

export type QA = {
  question_id: string;
  question_text: string;
  answer_text: string;
  points: number;
  dimension: string;
  critical_flag?: boolean;
  is_followup?: boolean;
  parent_id?: string;
};

export type ResponseLite = {
  id: string;
  employee_id: string;
  stage: string | number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  final_score: number;
  gaming_flag: boolean;
  critical_flags: string[];
  scores: Record<string, number | null>;
  responses: QA[] | any;
  free_text_response: string | null;
  submitted_at: string;
  completion_time_seconds: number;
};

export type EmpLite = {
  id: string;
  name: string;
  employee_code: string;
  branch: string;
  area_manager: string;
};

function dimRiskLabel(score: number, max: number): "LOW" | "MEDIUM" | "HIGH" | "N/A" {
  if (max <= 0) return "N/A";
  const pct = score / max;
  if (pct >= 0.66) return "HIGH";
  if (pct >= 0.33) return "MEDIUM";
  return "LOW";
}

const DIM_MAX: Record<string, number> = {
  training_effectiveness: 25,
  attrition_risk: 25,
  support_guidance: 25,
  adjustment_wellbeing: 25,
  transition_readiness: 25,
};

export function formatTime(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} sec`;
  return `${m} min ${s} sec`;
}

function badgeForRisk(r: "LOW" | "MEDIUM" | "HIGH" | "N/A") {
  if (r === "N/A") return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">N/A</span>;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
      style={{ background: RISK_COLORS[r] }}
    >
      {r}
    </span>
  );
}

export function ResponseDetail({
  response,
  employee,
}: {
  response: ResponseLite;
  employee: EmpLite;
}) {
  const dimKeys = ["training_effectiveness", "attrition_risk", "support_guidance", "adjustment_wellbeing", "transition_readiness"];
  const responsesList: QA[] = Array.isArray(response.responses) ? response.responses : [];

  // Group QAs in original order; identify followups by id pattern (e.g., S2_Q2a) — anything not matching base id "_Q\d+$"
  const isFollowup = (qid: string) => /Q\d+[a-z]$/.test(qid);

  const composite = response.final_score; // already final
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-4">
      {/* Header line */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to={`/dashboard/trainees/${employee.id}`} className="font-bold text-foreground hover:underline">
          {employee.name}
        </Link>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{employee.employee_code}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{employee.branch}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-bold">Day {response.stage}</span>
        <span className="text-muted-foreground">·</span>
        {badgeForRisk(response.risk_level)}
        <span className="text-muted-foreground">·</span>
        <span className="font-bold tabular-nums">Score: {response.final_score.toFixed(1)}</span>
        {response.gaming_flag && (
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-600">⚡ Gaming</span>
        )}
      </div>

      {/* Dimension breakdown */}
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Dimension breakdown</h4>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {dimKeys.map((k) => {
            const v = response.scores?.[k];
            const max = DIM_MAX[k];
            const risk = v === null || v === undefined ? "N/A" : dimRiskLabel(Number(v), max);
            return (
              <div key={k} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/60 px-3 py-1.5 text-xs">
                <span className="text-foreground">{DIM_LABELS[k]}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums text-foreground">
                    {v === null || v === undefined ? "—" : Number(v).toFixed(0)}
                  </span>
                  {badgeForRisk(risk)}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Composite: {composite.toFixed(1)} | Final: {composite.toFixed(1)}
        </p>
      </div>

      {/* Q&A */}
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">— Questions &amp; Answers —</h4>
        <ol className="space-y-2.5">
          {responsesList.map((qa, idx) => {
            const followup = isFollowup(qa.question_id);
            const dim = qa.dimension && qa.dimension !== "none" ? DIM_LABELS[qa.dimension] ?? qa.dimension : null;
            const flagged = !!qa.critical_flag;
            return (
              <li
                key={`${qa.question_id}-${idx}`}
                className={`text-xs ${followup ? "ml-5 border-l-2 border-border/60 pl-3" : ""}`}
              >
                <div className="font-bold text-foreground">
                  {qa.question_id}
                  {followup ? " (follow-up)" : ""}: {qa.question_text}
                </div>
                <div className="mt-0.5 flex items-start gap-1.5 text-muted-foreground">
                  <span>{qa.answer_text?.includes(" • ") ? "☑" : "➤"}</span>
                  <span className="flex-1">
                    "{qa.answer_text}"
                    {dim && qa.points > 0 && (
                      <span className="ml-1 text-foreground/70">→ +{qa.points} {dim}</span>
                    )}
                    {flagged && <span className="ml-1.5">🚨</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Free text */}
      {response.free_text_response && (
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Free-text response</h4>
          <blockquote className="rounded-xl border-l-4 border-primary/50 bg-card/80 px-4 py-3 text-sm italic text-foreground">
            "{response.free_text_response}"
          </blockquote>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>⏱ Completed in {formatTime(response.completion_time_seconds)}</span>
        <Link
          to={`/dashboard/trainees/${employee.id}`}
          className="font-bold text-primary hover:underline"
        >
          View Full Trainee Profile →
        </Link>
      </div>
    </div>
  );
}

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}
