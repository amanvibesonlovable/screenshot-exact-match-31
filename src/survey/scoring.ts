// Pulse — Risk scoring engine
import type { Dimension, QuestionOption, SurveyConfig, SurveyStage } from "./survey-config";

export interface ResponseRecord {
  question_id: string;
  question_text: string;
  answer_text: string; // joined for multi
  points: number; // total points contributed (sum across selected options)
  dimension: Dimension; // for multi, "none" sentinel since spread; we keep per-option in raw
}

export interface RawAnswer {
  question_id: string;
  /** indices of selected options (length 1 for single-select) */
  selected: number[];
}

export interface DimensionScores {
  training_effectiveness: number;
  attrition_risk: number;
  support_guidance: number;
  adjustment_wellbeing: number;
  transition_readiness: number | null;
  composite: number;
  stage_multiplier: number;
  final_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}

export interface ScoredSurvey {
  responses: ResponseRecord[];
  scores: DimensionScores;
  critical_flags: string[];
  gaming_flag: boolean;
}

const STAGE_MULTIPLIERS: Record<SurveyStage, number> = {
  15: 0.7,
  30: 0.9,
  45: 1.0,
  60: 1.2,
  90: 1.4,
  180: 1.5,
};

export function scoreSurvey(
  config: SurveyConfig,
  rawAnswers: RawAnswer[],
  completionTimeSeconds: number,
): ScoredSurvey {
  const dims: DimensionScores = {
    training_effectiveness: 0,
    attrition_risk: 0,
    support_guidance: 0,
    adjustment_wellbeing: 0,
    transition_readiness: config.stage >= 60 ? 0 : null,
    composite: 0,
    stage_multiplier: STAGE_MULTIPLIERS[config.stage],
    final_score: 0,
    risk_level: "LOW",
  };

  const responses: ResponseRecord[] = [];
  const criticalFlags: string[] = [];
  const staticQuestionsAnswered: { isMostPositive: boolean }[] = [];

  for (const raw of rawAnswers) {
    const q = config.questions.find((x) => x.id === raw.question_id);
    if (!q) continue;
    const chosen: QuestionOption[] = raw.selected.map((i) => q.options[i]).filter(Boolean);
    if (chosen.length === 0) continue;

    let totalPoints = 0;
    for (const opt of chosen) {
      totalPoints += opt.points;
      if (opt.dimension !== "none") {
        if (opt.dimension === "transition_readiness") {
          dims.transition_readiness = (dims.transition_readiness ?? 0) + opt.points;
        } else {
          dims[opt.dimension] += opt.points;
        }
      }
      if (opt.criticalFlag) criticalFlags.push(opt.criticalFlag);
    }

    if (q.kind === "static" && q.type === "single") {
      staticQuestionsAnswered.push({ isMostPositive: raw.selected[0] === 0 });
    }

    responses.push({
      question_id: q.id,
      question_text: q.prompt,
      answer_text: chosen.map((o) => o.label).join(" • "),
      points: totalPoints,
      dimension: chosen[0].dimension,
    });
  }

  dims.composite =
    dims.training_effectiveness +
    dims.attrition_risk +
    dims.support_guidance +
    dims.adjustment_wellbeing +
    (dims.transition_readiness ?? 0);

  dims.final_score = Math.round(dims.composite * dims.stage_multiplier * 10) / 10;

  // PRD risk levels: LOW 0-10, MEDIUM 11-22, HIGH 23+ (or any critical flag)
  if (criticalFlags.length > 0 || dims.final_score >= 23) dims.risk_level = "HIGH";
  else if (dims.final_score >= 11) dims.risk_level = "MEDIUM";
  else dims.risk_level = "LOW";

  // Gaming detection: ALL static-single answers are index 0 AND completion < 45s
  const allMostPositive =
    staticQuestionsAnswered.length > 0 &&
    staticQuestionsAnswered.every((a) => a.isMostPositive);
  const gaming_flag = allMostPositive && completionTimeSeconds < 45;

  return { responses, scores: dims, critical_flags: criticalFlags, gaming_flag };
}
