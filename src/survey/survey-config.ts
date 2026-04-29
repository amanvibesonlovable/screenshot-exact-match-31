// Pulse — Survey configuration (single source of truth)
// All question data, scoring weights, branching, multipliers, and messages.
// The chat UI reads exclusively from this file. Nothing here is hardcoded in components.

export type Dimension =
  | "training_effectiveness"
  | "attrition_risk"
  | "support_guidance"
  | "adjustment_wellbeing"
  | "transition_readiness"
  | "none";

export type SurveyStage = 15 | 30 | 45 | 60 | 90 | 180;

export interface QuestionOption {
  label: string;
  points: number;
  dimension: Dimension;
  /** Optional critical flag triggered when this option is chosen. */
  criticalFlag?: string;
}

export interface BaseQuestion {
  id: string;
  /** Friendly bot persona label e.g. "Field Reality Check Bot" */
  botLabel: string;
  prompt: string;
  type: "single" | "multi";
  options: QuestionOption[];
  /** STATIC questions are always shown; DYNAMIC are only shown when triggered. */
  kind: "static" | "dynamic";
  /** For STATIC questions: branching rule that may queue a DYNAMIC follow-up. */
  branch?: {
    /** Show the dynamic follow-up question with this id when condition matches. */
    showQuestionId: string;
    /** For single-select: trigger when chosen option index is >= this value. */
    minIndex?: number;
  };
}

export interface SurveyConfig {
  stage: SurveyStage;
  title: string;
  /** Use [Name] as a placeholder. */
  openingMessage: string;
  closingMessage: string;
  freeTextPrompt: string;
  /** Multiplier applied to summed dimension score to compute final_score. */
  stageMultiplier: number;
  questions: BaseQuestion[];
}

// ---------- SURVEY 1 — DAY 15 ----------
export const SURVEY_DAY_15: SurveyConfig = {
  stage: 15,
  title: "Day 15 Check-in",
  openingMessage:
    "Hey [Name]! 👋 Welcome to your first check-in. This is just between you and the HR team — your managers won't see your individual answers. We genuinely want to know how your first couple of weeks have been. Ready? Let's go!",
  closingMessage:
    "Thanks, [Name]! ✨ Your inputs genuinely help us make things better. Keep going — the first few weeks are the hardest part. It gets better!",
  freeTextPrompt: "Anything else you'd like to share? No pressure — you can skip this too.",
  stageMultiplier: 1.0,
  questions: [
    {
      id: "q1",
      kind: "static",
      botLabel: "Field Reality Check",
      prompt: "How has your experience in the market been so far?",
      type: "single",
      branch: { showQuestionId: "q1a", minIndex: 2 },
      options: [
        { label: "Enjoying it — learning a lot", points: 0, dimension: "training_effectiveness" },
        { label: "It's okay — still adjusting", points: 1, dimension: "adjustment_wellbeing" },
        { label: "It's tougher than I expected", points: 3, dimension: "adjustment_wellbeing" },
        { label: "Honestly, it's been really hard", points: 5, dimension: "adjustment_wellbeing" },
      ],
    },
    {
      id: "q1a",
      kind: "dynamic",
      botLabel: "What's making it hard?",
      prompt: "What's been the hardest part?",
      type: "multi",
      options: [
        { label: "The physical demands (heat, travel, long hours)", points: 2, dimension: "adjustment_wellbeing" },
        { label: "I don't understand what I'm supposed to learn from this", points: 3, dimension: "training_effectiveness" },
        { label: "The people I go with aren't really teaching me", points: 2, dimension: "support_guidance" },
        { label: "It's hard being in a new city / away from home", points: 2, dimension: "adjustment_wellbeing" },
        { label: "Language barrier in this area", points: 1, dimension: "adjustment_wellbeing" },
      ],
    },
    {
      id: "q2",
      kind: "static",
      botLabel: "Training Clarity",
      prompt: "Do you feel clear about what the next few months of training will look like?",
      type: "single",
      options: [
        { label: "Yes, I have a good picture of the plan", points: 0, dimension: "training_effectiveness" },
        { label: "Somewhat — I know the broad structure", points: 1, dimension: "training_effectiveness" },
        { label: "Not really — I'm taking it day by day", points: 3, dimension: "training_effectiveness" },
        { label: "No one has explained the full training plan to me", points: 5, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q3",
      kind: "static",
      botLabel: "Support Quality",
      prompt: "How's the guidance you're getting from the people training you?",
      type: "single",
      branch: { showQuestionId: "q3a", minIndex: 2 },
      options: [
        { label: "Great — they take time to explain and teach", points: 0, dimension: "support_guidance" },
        { label: "Decent — they help when I ask", points: 1, dimension: "support_guidance" },
        { label: "Not much — they're busy with their own work", points: 3, dimension: "support_guidance" },
        { label: "I'm mostly on my own — figuring things out myself", points: 5, dimension: "support_guidance" },
      ],
    },
    {
      id: "q3a",
      kind: "dynamic",
      botLabel: "Support Gap",
      prompt: "What would help you the most right now?",
      type: "multi",
      options: [
        { label: "Someone dedicated to answer my daily questions", points: 1, dimension: "support_guidance" },
        { label: "A more structured daily plan instead of just 'follow the salesman'", points: 2, dimension: "training_effectiveness" },
        { label: "Regular check-ins from my manager", points: 2, dimension: "support_guidance" },
        { label: "Someone to talk to about how I'm settling in", points: 2, dimension: "adjustment_wellbeing" },
      ],
    },
    {
      id: "q4",
      kind: "static",
      botLabel: "Emotional Pulse",
      prompt: "Pick the one word that best describes how you're feeling about this role right now.",
      type: "single",
      options: [
        { label: "Excited", points: 0, dimension: "adjustment_wellbeing" },
        { label: "Curious", points: 0, dimension: "adjustment_wellbeing" },
        { label: "Overwhelmed", points: 3, dimension: "adjustment_wellbeing" },
        {
          label: "Regretting",
          points: 6,
          dimension: "attrition_risk",
          criticalFlag: "Regretting joining at Day 15",
        },
      ],
    },
    {
      id: "q5",
      kind: "static",
      botLabel: "One Thing to Change",
      prompt: "If you could change one thing about your experience so far, what would it be?",
      type: "single",
      options: [
        { label: "Better explanation of what I should be learning each day", points: 2, dimension: "training_effectiveness" },
        { label: "More involvement from the people training me", points: 2, dimension: "support_guidance" },
        { label: "Better living/accommodation situation", points: 1, dimension: "adjustment_wellbeing" },
        { label: "Honestly, nothing — it's been good so far", points: 0, dimension: "none" },
        {
          label: "I'd rethink my decision to join",
          points: 5,
          dimension: "attrition_risk",
          criticalFlag: "Reconsidering joining at Day 15",
        },
      ],
    },
  ],
};

export const SURVEYS: Record<SurveyStage, SurveyConfig | undefined> = {
  15: SURVEY_DAY_15,
  30: undefined,
  45: undefined,
  60: undefined,
  90: undefined,
  180: undefined,
};

export const STAGE_LABELS: Record<SurveyStage, string> = {
  15: "Day 15",
  30: "Day 30",
  45: "Day 45",
  60: "Day 60",
  90: "Day 90",
  180: "Day 180",
};
