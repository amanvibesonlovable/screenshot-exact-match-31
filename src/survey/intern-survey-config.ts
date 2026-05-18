// Candor Ascent 2026 — Intern survey configuration (single source of truth)
// All weekly question banks, scoring weights, branching, week multipliers, and messages.

export type InternDimension =
  | "engagement_motivation"
  | "guidance_support"
  | "project_clarity"
  | "experience_wellbeing"
  | "none";

export type InternWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface InternQuestionOption {
  label: string;
  points: number;
  dimension: InternDimension;
  criticalFlag?: string;
}

export interface InternQuestion {
  id: string;
  botLabel: string;
  prompt: string;
  type: "single" | "multi";
  kind: "static" | "dynamic";
  options: InternQuestionOption[];
  branch?: { showQuestionId: string; minIndex?: number };
}

export interface InternSurveyConfig {
  week: InternWeek;
  title: string;
  context: string;
  openingMessage: string;
  closingMessage: string;
  freeTextPrompt: string;
  weekMultiplier: number;
  questions: InternQuestion[];
}

// --------- Shared recurring pulse builder ---------
const recurringPulse = (id: string): InternQuestion => ({
  id,
  kind: "static",
  botLabel: "Quick Pulse",
  prompt: "Quick pulse: rate your experience this week",
  type: "single",
  options: [
    { label: "5 — Excellent", points: 0, dimension: "engagement_motivation" },
    { label: "4 — Good", points: 0, dimension: "engagement_motivation" },
    { label: "3 — Average", points: 2, dimension: "engagement_motivation" },
    { label: "2 — Below average", points: 4, dimension: "engagement_motivation" },
    {
      label: "1 — Poor",
      points: 6,
      dimension: "engagement_motivation",
      criticalFlag: "Experience rated 1/5 (Poor)",
    },
  ],
});

// ---------- WEEK 1 — Onboarding ----------
export const INTERN_WEEK_1: InternSurveyConfig = {
  week: 1,
  title: "Week 1 Check-in",
  context: "Just completed Day 1 induction. First week of actual work.",
  openingMessage:
    "Hey [Name]! 👋 Your first week is done! Quick check-in — this is just between you and HR, your AM won't see your answers. How did Week 1 go?",
  closingMessage:
    "Thanks, [Name]! Week 1 is always the adjustment phase. It gets smoother from here! 💪",
  freeTextPrompt: "Anything else about your first week you'd like to share?",
  weekMultiplier: 0.7,
  questions: [
    {
      id: "w1_q1",
      kind: "static",
      botLabel: "Induction",
      prompt: "Did you have a proper induction on Day 1?",
      type: "single",
      branch: { showQuestionId: "w1_q1a", minIndex: 2 },
      options: [
        { label: "Yes, thorough and helpful", points: 0, dimension: "project_clarity" },
        { label: "Yes but brief and unclear", points: 2, dimension: "project_clarity" },
        { label: "Not really — I was just told to show up", points: 4, dimension: "project_clarity" },
        { label: "There was no induction", points: 5, dimension: "project_clarity" },
      ],
    },
    {
      id: "w1_q1a",
      kind: "dynamic",
      botLabel: "Induction Gaps",
      prompt: "What was missing from your induction?",
      type: "multi",
      options: [
        { label: "No one explained what I'll be doing", points: 2, dimension: "project_clarity" },
        { label: "Didn't meet my AM or AE", points: 2, dimension: "guidance_support" },
        { label: "No overview of the internship structure", points: 1, dimension: "project_clarity" },
        { label: "I felt unwelcome", points: 3, dimension: "experience_wellbeing" },
      ],
    },
    {
      id: "w1_q2",
      kind: "static",
      botLabel: "Project Clarity",
      prompt: "Has your internship project been clearly explained to you?",
      type: "single",
      branch: { showQuestionId: "w1_q2a", minIndex: 2 },
      options: [
        { label: "Yes, I know exactly what I need to deliver", points: 0, dimension: "project_clarity" },
        { label: "Broadly yes, but details are fuzzy", points: 1, dimension: "project_clarity" },
        { label: "Not really — I'm figuring it out as I go", points: 3, dimension: "project_clarity" },
        { label: "I still don't know what my project is", points: 5, dimension: "project_clarity" },
      ],
    },
    {
      id: "w1_q2a",
      kind: "dynamic",
      botLabel: "Project Gaps",
      prompt: "What's unclear about your project?",
      type: "multi",
      options: [
        { label: "What the deliverables are", points: 2, dimension: "project_clarity" },
        { label: "How it connects to the business", points: 1, dimension: "project_clarity" },
        { label: "What 'good' looks like", points: 2, dimension: "project_clarity" },
        { label: "Who's supposed to guide me on it", points: 2, dimension: "guidance_support" },
      ],
    },
    {
      id: "w1_q3",
      kind: "static",
      botLabel: "First Week Pulse",
      prompt: "How was your first week of actual work?",
      type: "single",
      options: [
        { label: "Exciting — I'm learning and enjoying it", points: 0, dimension: "engagement_motivation" },
        { label: "Okay — adjusting to the routine", points: 1, dimension: "experience_wellbeing" },
        { label: "Tougher than expected — the fieldwork is demanding", points: 3, dimension: "experience_wellbeing" },
        {
          label: "Honestly, I'm questioning if this was worth it",
          points: 5,
          dimension: "engagement_motivation",
          criticalFlag: "Questioning if internship was worth it at Week 1",
        },
      ],
    },
    {
      id: "w1_q4",
      kind: "static",
      botLabel: "Emotional Pulse",
      prompt: "One word for how you're feeling right now?",
      type: "single",
      options: [
        { label: "Motivated", points: 0, dimension: "engagement_motivation" },
        { label: "Curious", points: 0, dimension: "engagement_motivation" },
        { label: "Exhausted", points: 3, dimension: "experience_wellbeing" },
        { label: "Lost", points: 4, dimension: "project_clarity" },
        {
          label: "Regretful",
          points: 6,
          dimension: "engagement_motivation",
          criticalFlag: "Feeling regretful at Week 1",
        },
      ],
    },
  ],
};

// ---------- WEEK 2 — Early Execution ----------
export const INTERN_WEEK_2: InternSurveyConfig = {
  week: 2,
  title: "Week 2 Check-in",
  context: "Settling into the project. Two weeks in.",
  openingMessage:
    "Hey [Name]! 👋 Two weeks in! Quick check-in — how's the project shaping up?",
  closingMessage:
    "Thanks, [Name]! You're finding your rhythm now. Keep going! 🙌",
  freeTextPrompt: "Anything specific you'd like the HR team to know?",
  weekMultiplier: 0.8,
  questions: [
    {
      id: "w2_q1",
      kind: "static",
      botLabel: "AM Connection",
      prompt: "Have you been able to connect with your AM/AE this week?",
      type: "single",
      branch: { showQuestionId: "w2_q1a", minIndex: 2 },
      options: [
        { label: "Yes, we had a proper conversation about my work", points: 0, dimension: "guidance_support" },
        { label: "Briefly — a quick check-in", points: 1, dimension: "guidance_support" },
        { label: "I tried but they were too busy", points: 3, dimension: "guidance_support" },
        { label: "Haven't had any interaction", points: 5, dimension: "guidance_support" },
      ],
    },
    {
      id: "w2_q1a",
      kind: "dynamic",
      botLabel: "Support Needs",
      prompt: "What would help you most right now?",
      type: "multi",
      options: [
        { label: "Regular 10-min check-ins with my AM", points: 1, dimension: "guidance_support" },
        { label: "Clearer direction on what to prioritize", points: 2, dimension: "project_clarity" },
        { label: "Someone to answer my daily questions", points: 2, dimension: "guidance_support" },
        { label: "Feedback on what I've done so far", points: 2, dimension: "guidance_support" },
      ],
    },
    {
      id: "w2_q2",
      kind: "static",
      botLabel: "Project Progress",
      prompt: "How's your project going?",
      type: "single",
      branch: { showQuestionId: "w2_q2a", minIndex: 2 },
      options: [
        { label: "On track — I'm making good progress", points: 0, dimension: "project_clarity" },
        { label: "Slow but moving — some blockers", points: 2, dimension: "project_clarity" },
        { label: "Stuck — I'm not sure how to proceed", points: 4, dimension: "project_clarity" },
        { label: "I still haven't really started properly", points: 5, dimension: "project_clarity" },
      ],
    },
    {
      id: "w2_q2a",
      kind: "dynamic",
      botLabel: "Blockers",
      prompt: "What's blocking your progress?",
      type: "multi",
      options: [
        { label: "Don't know what to do next", points: 2, dimension: "project_clarity" },
        { label: "Need data/resources I don't have", points: 1, dimension: "project_clarity" },
        { label: "The fieldwork takes all my time, no time for project", points: 2, dimension: "experience_wellbeing" },
        { label: "No one reviews my work, so I don't know if I'm on track", points: 3, dimension: "guidance_support" },
      ],
    },
    {
      id: "w2_q3",
      kind: "static",
      botLabel: "Overall Experience",
      prompt: "How would you rate your overall experience so far?",
      type: "single",
      branch: { showQuestionId: "w2_q3a", minIndex: 2 },
      options: [
        { label: "Great — I'm genuinely enjoying this", points: 0, dimension: "engagement_motivation" },
        { label: "Good — has its ups and downs", points: 1, dimension: "experience_wellbeing" },
        { label: "Average — it's okay, nothing special", points: 3, dimension: "engagement_motivation" },
        { label: "Poor — I'm just getting through the days", points: 5, dimension: "engagement_motivation" },
      ],
    },
    {
      id: "w2_q3a",
      kind: "dynamic",
      botLabel: "Experience Drag",
      prompt: "What's dragging the experience down?",
      type: "multi",
      options: [
        { label: "The work feels repetitive/meaningless", points: 3, dimension: "engagement_motivation" },
        {
          label: "I feel like free labor, not a learner",
          points: 4,
          dimension: "experience_wellbeing",
          criticalFlag: "Feeling like free labor at Week 2",
        },
        { label: "My AM/AE doesn't care about me", points: 3, dimension: "guidance_support" },
        { label: "The physical demands are too much", points: 2, dimension: "experience_wellbeing" },
        { label: "I expected something different from this internship", points: 2, dimension: "engagement_motivation" },
      ],
    },
  ],
};

// ---------- WEEK 3 — Settling In ----------
export const INTERN_WEEK_3: InternSurveyConfig = {
  week: 3,
  title: "Week 3 Check-in",
  context: "Settling into the routine. Building momentum.",
  openingMessage:
    "Hey [Name]! 👋 Week 3! You're settling into the routine now. Quick check-in.",
  closingMessage:
    "Thanks, [Name]! Almost at the halfway mark. Your feedback is making a difference. 💪",
  freeTextPrompt: "Any challenges or suggestions this week?",
  weekMultiplier: 0.9,
  questions: [
    {
      id: "w3_q1",
      kind: "static",
      botLabel: "Deliverables",
      prompt: "Are you meeting your project deliverables?",
      type: "single",
      options: [
        { label: "Yes, ahead of schedule", points: 0, dimension: "project_clarity" },
        { label: "Mostly — a few things pending", points: 1, dimension: "project_clarity" },
        { label: "Behind — struggling to keep up", points: 3, dimension: "project_clarity" },
        { label: "I don't have clear deliverables to measure against", points: 4, dimension: "project_clarity" },
      ],
    },
    {
      id: "w3_q2",
      kind: "static",
      botLabel: "Feedback Quality",
      prompt: "How's the feedback and guidance from your AM/AE?",
      type: "single",
      branch: { showQuestionId: "w3_q2a", minIndex: 2 },
      options: [
        { label: "Regular and helpful — I know where I stand", points: 0, dimension: "guidance_support" },
        { label: "Occasional — I get feedback when I ask", points: 1, dimension: "guidance_support" },
        { label: "Rare — I mostly figure things out alone", points: 3, dimension: "guidance_support" },
        { label: "Non-existent — I haven't received any real feedback", points: 5, dimension: "guidance_support" },
      ],
    },
    {
      id: "w3_q2a",
      kind: "dynamic",
      botLabel: "Guidance Gap",
      prompt: "What does the lack of guidance feel like?",
      type: "multi",
      options: [
        { label: "I'm unsure if my work is good enough", points: 2, dimension: "guidance_support" },
        { label: "I feel invisible — no one notices my effort", points: 3, dimension: "experience_wellbeing" },
        { label: "I'm making mistakes because no one corrects me", points: 2, dimension: "project_clarity" },
        {
          label: "I've stopped caring because they don't care",
          points: 4,
          dimension: "engagement_motivation",
          criticalFlag: "Stopped caring because they don't care",
        },
      ],
    },
    {
      id: "w3_q3",
      kind: "static",
      botLabel: "Motivation Trajectory",
      prompt: "Compared to Week 1, how motivated are you?",
      type: "single",
      branch: { showQuestionId: "w3_q3a", minIndex: 3 },
      options: [
        { label: "More motivated — I'm seeing the value", points: 0, dimension: "engagement_motivation" },
        { label: "About the same", points: 1, dimension: "engagement_motivation" },
        { label: "Less motivated — the novelty has worn off", points: 3, dimension: "engagement_motivation" },
        { label: "Significantly less — I'm going through the motions", points: 5, dimension: "engagement_motivation" },
      ],
    },
    {
      id: "w3_q3a",
      kind: "dynamic",
      botLabel: "Motivation Drain",
      prompt: "What's pulling your motivation down?",
      type: "multi",
      options: [
        { label: "The work is monotonous", points: 2, dimension: "engagement_motivation" },
        { label: "I don't see how this helps my career", points: 3, dimension: "engagement_motivation" },
        { label: "The PPO feels unlikely/uncertain", points: 3, dimension: "engagement_motivation" },
        { label: "I'm physically exhausted", points: 2, dimension: "experience_wellbeing" },
        { label: "Other interns seem to have better projects", points: 2, dimension: "experience_wellbeing" },
      ],
    },
    recurringPulse("w3_q4"),
  ],
};

// ---------- WEEK 4 — Mid-Point ----------
export const INTERN_WEEK_4: InternSurveyConfig = {
  week: 4,
  title: "Week 4 Check-in",
  context: "Mid-point. Mid-review with AM should be happening.",
  openingMessage:
    "Hey [Name]! 👋 Halfway through! Your mid-review with your AM should be happening around now. Quick check-in.",
  closingMessage:
    "Thanks, [Name]! The second half is where things come together. Keep pushing! 🙌",
  freeTextPrompt: "Halfway there — anything you'd like to flag?",
  weekMultiplier: 1.0,
  questions: [
    {
      id: "w4_q1",
      kind: "static",
      botLabel: "Mid-review",
      prompt: "Has your mid-review with your AM been scheduled or completed?",
      type: "single",
      options: [
        { label: "Yes, it was helpful and constructive", points: 0, dimension: "guidance_support" },
        { label: "Yes, but it was a formality — not very useful", points: 2, dimension: "guidance_support" },
        { label: "It's scheduled but hasn't happened yet", points: 1, dimension: "guidance_support" },
        { label: "No one has mentioned a mid-review to me", points: 5, dimension: "guidance_support" },
      ],
    },
    {
      id: "w4_q2",
      kind: "static",
      botLabel: "Value vs Busywork",
      prompt: "At the halfway point, do you feel your project is creating real value — or just keeping you busy?",
      type: "single",
      options: [
        { label: "Real value — I can see the impact of my work", points: 0, dimension: "project_clarity" },
        { label: "Some value — but a lot of it feels like busywork", points: 2, dimension: "project_clarity" },
        { label: "Mostly busywork — I don't see the point", points: 4, dimension: "project_clarity" },
        {
          label: "I genuinely feel like free labor",
          points: 6,
          dimension: "experience_wellbeing",
          criticalFlag: "Feeling like free labor at mid-point",
        },
      ],
    },
    {
      id: "w4_q3",
      kind: "static",
      botLabel: "Recommendation",
      prompt: "If a junior from your college asked about this internship, what would you say?",
      type: "single",
      options: [
        { label: "Definitely do it — great learning", points: 0, dimension: "engagement_motivation" },
        { label: "It's okay — set your expectations", points: 1, dimension: "engagement_motivation" },
        { label: "I'd hesitate to recommend it", points: 4, dimension: "engagement_motivation" },
        {
          label: "I'd say avoid it",
          points: 6,
          dimension: "engagement_motivation",
          criticalFlag: "Would tell juniors to avoid this internship",
        },
      ],
    },
    recurringPulse("w4_q4"),
  ],
};

// ---------- WEEK 5 — Deep Execution ----------
export const INTERN_WEEK_5: InternSurveyConfig = {
  week: 5,
  title: "Week 5 Check-in",
  context: "Past the halfway mark. Second half begins.",
  openingMessage:
    "Hey [Name]! 👋 Past the halfway mark! Quick check-in on how the second half is starting.",
  closingMessage:
    "Thanks, [Name]! Three weeks to go. Your honest feedback drives real change. 💪",
  freeTextPrompt: "Anything on your mind?",
  weekMultiplier: 1.1,
  questions: [
    {
      id: "w5_q1",
      kind: "static",
      botLabel: "Mid-review Outcome",
      prompt: "How did your mid-review go?",
      type: "single",
      options: [
        { label: "Very helpful — I got clear feedback and direction", points: 0, dimension: "guidance_support" },
        { label: "It happened but didn't change much", points: 2, dimension: "guidance_support" },
        { label: "It was negative/discouraging", points: 4, dimension: "guidance_support" },
        {
          label: "It still hasn't happened",
          points: 5,
          dimension: "guidance_support",
          criticalFlag: "Mid-review still hasn't happened by Week 5",
        },
      ],
    },
    {
      id: "w5_q2",
      kind: "static",
      botLabel: "Learning Value",
      prompt: "Are you learning skills or insights you'll carry beyond this internship?",
      type: "single",
      options: [
        { label: "Absolutely — real skills I'll use in my career", points: 0, dimension: "engagement_motivation" },
        { label: "Some — a few useful things", points: 1, dimension: "engagement_motivation" },
        { label: "Not much — mostly execution work without learning", points: 3, dimension: "engagement_motivation" },
        {
          label: "Nothing — this has been a waste of time",
          points: 6,
          dimension: "engagement_motivation",
          criticalFlag: "This has been a waste of time",
        },
      ],
    },
    {
      id: "w5_q3",
      kind: "static",
      botLabel: "Connection to AM",
      prompt: "How connected do you feel to your AM/AE right now?",
      type: "single",
      options: [
        { label: "Very connected — they're invested in my growth", points: 0, dimension: "guidance_support" },
        { label: "Somewhat — professional but distant", points: 1, dimension: "guidance_support" },
        { label: "Disconnected — I rarely interact with them", points: 4, dimension: "guidance_support" },
        {
          label: "Completely alone — I could disappear and no one would notice",
          points: 6,
          dimension: "guidance_support",
          criticalFlag: "Could disappear and no one would notice",
        },
      ],
    },
    recurringPulse("w5_q4"),
  ],
};

// ---------- WEEK 6 — Final Stretch ----------
export const INTERN_WEEK_6: InternSurveyConfig = {
  week: 6,
  title: "Week 6 Check-in",
  context: "Two weeks left. Finish line in sight.",
  openingMessage:
    "Hey [Name]! 👋 Two weeks left! The finish line is in sight. Quick check-in.",
  closingMessage:
    "Thanks, [Name]! Almost there. Two more weeks. You've got this! 🙌",
  freeTextPrompt: "Any final stretch challenges?",
  weekMultiplier: 1.2,
  questions: [
    {
      id: "w6_q1",
      kind: "static",
      botLabel: "Deliverable Confidence",
      prompt: "How confident are you about completing your project deliverables by the end?",
      type: "single",
      options: [
        { label: "Very confident — on track to finish strong", points: 0, dimension: "project_clarity" },
        { label: "Mostly confident — a few things to wrap up", points: 1, dimension: "project_clarity" },
        { label: "Worried — there's a lot left and not much time", points: 3, dimension: "project_clarity" },
        { label: "I don't think I can complete it — expectations were unrealistic", points: 5, dimension: "project_clarity" },
      ],
    },
    {
      id: "w6_q2",
      kind: "static",
      botLabel: "Engagement",
      prompt: "At this point, how engaged do you feel with the internship?",
      type: "single",
      options: [
        { label: "Fully engaged — giving it my best", points: 0, dimension: "engagement_motivation" },
        { label: "Moderately — doing what's needed", points: 1, dimension: "engagement_motivation" },
        { label: "Going through the motions — counting down days", points: 4, dimension: "engagement_motivation" },
        {
          label: "Mentally checked out",
          points: 6,
          dimension: "engagement_motivation",
          criticalFlag: "Mentally checked out",
        },
      ],
    },
    {
      id: "w6_q3",
      kind: "static",
      botLabel: "PPO Signal",
      prompt: "If you were offered a PPO today, what would your gut reaction be?",
      type: "single",
      options: [
        { label: "I'd accept immediately", points: 0, dimension: "engagement_motivation" },
        { label: "I'd seriously consider it", points: 1, dimension: "engagement_motivation" },
        { label: "I'd probably decline", points: 4, dimension: "engagement_motivation" },
        {
          label: "I'd definitely decline",
          points: 6,
          dimension: "engagement_motivation",
          criticalFlag: "Would definitely decline PPO",
        },
      ],
    },
    recurringPulse("w6_q4"),
  ],
};

// ---------- WEEK 7 — Wrap-Up ----------
export const INTERN_WEEK_7: InternSurveyConfig = {
  week: 7,
  title: "Week 7 Final Check-in",
  context: "Final week. Retrospective.",
  openingMessage:
    "Hey [Name]! 👋 Last week! This is your final check-in. Let's hear your honest verdict on the whole experience.",
  closingMessage:
    "Thanks, [Name]! 🎉 You made it through the entire internship. Your honest feedback across these 7 weeks will directly improve the experience for the next batch. We genuinely appreciate your candor. All the best!",
  freeTextPrompt: "Your last chance to tell HR anything. What would you want them to know?",
  weekMultiplier: 1.3,
  questions: [
    {
      id: "w7_q1",
      kind: "static",
      botLabel: "Overall Verdict",
      prompt: "Looking back at the full internship, how would you rate it overall?",
      type: "single",
      options: [
        { label: "Excellent — one of the best experiences I've had", points: 0, dimension: "engagement_motivation" },
        { label: "Good — learned a lot, had some tough moments", points: 1, dimension: "engagement_motivation" },
        { label: "Average — it was okay, nothing special", points: 3, dimension: "engagement_motivation" },
        { label: "Poor — I wouldn't do this again", points: 5, dimension: "engagement_motivation" },
        {
          label: "Terrible — this was a waste of 2 months",
          points: 7,
          dimension: "engagement_motivation",
          criticalFlag: "Overall experience: Terrible",
        },
      ],
    },
    {
      id: "w7_q2",
      kind: "static",
      botLabel: "AM Quality",
      prompt: "How would you rate the quality of guidance from your AM/AE over the full internship?",
      type: "single",
      options: [
        { label: "Outstanding — they genuinely invested in me", points: 0, dimension: "guidance_support" },
        { label: "Good — they did their job", points: 1, dimension: "guidance_support" },
        { label: "Mediocre — I mostly figured things out alone", points: 3, dimension: "guidance_support" },
        { label: "Poor — I felt neglected", points: 5, dimension: "guidance_support" },
        {
          label: "Harmful — they made the experience worse",
          points: 7,
          dimension: "guidance_support",
          criticalFlag: "AM guidance: Harmful",
        },
      ],
    },
    {
      id: "w7_q3",
      kind: "static",
      botLabel: "PPO Intent",
      prompt: "If you get a PPO, how likely are you to accept?",
      type: "single",
      options: [
        { label: "Definitely accepting", points: 0, dimension: "engagement_motivation" },
        { label: "Leaning towards accepting", points: 1, dimension: "engagement_motivation" },
        { label: "On the fence", points: 3, dimension: "engagement_motivation" },
        { label: "Leaning towards declining", points: 5, dimension: "engagement_motivation" },
        {
          label: "Definitely declining",
          points: 6,
          dimension: "engagement_motivation",
          criticalFlag: "Would definitely decline PPO at Week 7",
        },
      ],
    },
    {
      id: "w7_q4",
      kind: "static",
      botLabel: "Change For Next Batch",
      prompt: "One thing you'd change about the Ascent internship for the next batch?",
      type: "single",
      options: [
        { label: "Better project allocation and clarity", points: 0, dimension: "none" },
        { label: "More involved AMs — they need to actually mentor", points: 0, dimension: "none" },
        { label: "Make it paid — unpaid feels exploitative", points: 0, dimension: "none" },
        { label: "Reduce the physical grunt work", points: 0, dimension: "none" },
        { label: "Nothing — it was well-designed", points: 0, dimension: "none" },
      ],
    },
    recurringPulse("w7_q5"),
  ],
};

export const INTERN_SURVEYS: Record<InternWeek, InternSurveyConfig> = {
  1: INTERN_WEEK_1,
  2: INTERN_WEEK_2,
  3: INTERN_WEEK_3,
  4: INTERN_WEEK_4,
  5: INTERN_WEEK_5,
  6: INTERN_WEEK_6,
  7: INTERN_WEEK_7,
};

export const INTERN_WEEK_LABELS: Record<InternWeek, string> = {
  1: "Week 1",
  2: "Week 2",
  3: "Week 3",
  4: "Week 4",
  5: "Week 5",
  6: "Week 6",
  7: "Week 7",
};

export const INTERN_SCORING_CONFIG = {
  dimensions: [
    "engagement_motivation",
    "guidance_support",
    "project_clarity",
    "experience_wellbeing",
  ] as const,
  dimensionLabels: {
    engagement_motivation: "Engagement & Motivation",
    guidance_support: "Guidance & Support",
    project_clarity: "Project Clarity",
    experience_wellbeing: "Experience & Wellbeing",
  },
  dimensionColors: {
    engagement_motivation: "#2563EB",
    guidance_support: "#7C3AED",
    project_clarity: "#0F766E",
    experience_wellbeing: "#F59E0B",
  },
  perDimensionThresholds: { low: 3, medium: 7, high: 8 },
  weekMultipliers: { 1: 0.7, 2: 0.8, 3: 0.9, 4: 1.0, 5: 1.1, 6: 1.2, 7: 1.3 } as Record<number, number>,
  compositeThresholds: { low: 8, medium: 18, high: 19 },
  gamingThresholdSeconds: 30,
};

/**
 * Returns the eligible intern week based on days since DOJ.
 * Returns null if not yet eligible (days < 7).
 */
export function getEligibleInternWeek(daysSinceJoining: number): InternWeek | null {
  if (daysSinceJoining < 7) return null;
  if (daysSinceJoining < 14) return 1;
  if (daysSinceJoining < 21) return 2;
  if (daysSinceJoining < 28) return 3;
  if (daysSinceJoining < 35) return 4;
  if (daysSinceJoining < 42) return 5;
  if (daysSinceJoining < 49) return 6;
  return 7;
}

// ---------- Adapter to reuse the STR SurveyChat shape ----------
// SurveyChat needs: { title, openingMessage, closingMessage, freeTextPrompt,
//   questions: BaseQuestion[] (with botLabel/prompt/options/kind/branch) }
// Our intern questions already follow that shape; the dimension union differs
// but SurveyChat doesn't introspect it, so we can cast through `unknown`.
export function internConfigForChat(week: InternWeek) {
  const cfg = INTERN_SURVEYS[week];
  return {
    stage: week as unknown as number,
    title: cfg.title,
    openingMessage: cfg.openingMessage,
    closingMessage: cfg.closingMessage,
    freeTextPrompt: cfg.freeTextPrompt,
    stageMultiplier: cfg.weekMultiplier,
    questions: cfg.questions,
  };
}
