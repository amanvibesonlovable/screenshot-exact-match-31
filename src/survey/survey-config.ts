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

// ---------- SURVEY 2 — DAY 30 ----------
export const SURVEY_DAY_30: SurveyConfig = {
  stage: 30,
  title: "Day 30 Check-in",
  openingMessage:
    "Hey [Name]! 👋 One month down — that's a milestone! Quick check-in to see how things are going. Same as before — this stays just between you and the HR team.",
  closingMessage:
    "Thanks for being real, [Name]! 💪 Month 2 is where things start clicking. If something's off, we're listening.",
  freeTextPrompt: "Anything on your mind that we didn't ask about?",
  stageMultiplier: 0.9,
  questions: [
    {
      id: "q1",
      kind: "static",
      botLabel: "Product Knowledge",
      prompt: "How confident do you feel about your product knowledge so far?",
      type: "single",
      options: [
        { label: "Strong — I can explain most products and SKUs", points: 0, dimension: "training_effectiveness" },
        { label: "Getting there — know the basics", points: 1, dimension: "training_effectiveness" },
        { label: "Weak — I still get confused between products", points: 3, dimension: "training_effectiveness" },
        { label: "Very weak — no one has properly taught me this", points: 5, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q2",
      kind: "static",
      botLabel: "Channel Exposure",
      prompt: "How many sales channels have you been exposed to so far (CFP, Foods, Personal Care, etc.)?",
      type: "single",
      options: [
        { label: "All major channels", points: 0, dimension: "training_effectiveness" },
        { label: "2-3 channels", points: 1, dimension: "training_effectiveness" },
        { label: "Only 1 channel so far", points: 3, dimension: "training_effectiveness" },
        { label: "I'm not sure which channels are which honestly", points: 5, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q3",
      kind: "static",
      botLabel: "Guidance Quality",
      prompt: "Overall, how would you describe the training support you're getting from people around you?",
      type: "single",
      branch: { showQuestionId: "q3a", minIndex: 2 },
      options: [
        { label: "Excellent — people go out of their way to teach me", points: 0, dimension: "support_guidance" },
        { label: "Good — I learn when I ask", points: 1, dimension: "support_guidance" },
        { label: "Average — I'm mostly figuring things out on my own", points: 3, dimension: "support_guidance" },
        {
          label: "Poor — I feel like I'm in the way",
          points: 5,
          dimension: "support_guidance",
          criticalFlag: "Feeling like a burden at Day 30",
        },
      ],
    },
    {
      id: "q3a",
      kind: "dynamic",
      botLabel: "Guidance Diagnosis",
      prompt: "What specifically could be better?",
      type: "multi",
      options: [
        { label: "People training me need to spend more time explaining", points: 2, dimension: "support_guidance" },
        { label: "I just follow people around — no one explains what they're doing", points: 2, dimension: "training_effectiveness" },
        { label: "My manager hasn't done any review or check-in yet", points: 2, dimension: "support_guidance" },
        { label: "I don't have anyone I can ask basic questions to without feeling judged", points: 3, dimension: "support_guidance" },
      ],
    },
    {
      id: "q4",
      kind: "static",
      botLabel: "Motivation Trajectory",
      prompt: "Compared to Day 1, how motivated are you right now?",
      type: "single",
      branch: { showQuestionId: "q4a", minIndex: 3 },
      options: [
        { label: "More motivated — I'm seeing the bigger picture", points: 0, dimension: "adjustment_wellbeing" },
        { label: "About the same — holding steady", points: 1, dimension: "adjustment_wellbeing" },
        { label: "Dipping — some days are tough", points: 3, dimension: "adjustment_wellbeing" },
        { label: "Dropping fast — I'm questioning if this is for me", points: 5, dimension: "attrition_risk" },
      ],
    },
    {
      id: "q4a",
      kind: "dynamic",
      botLabel: "Motivation Drain",
      prompt: "What's pulling your motivation down?",
      type: "multi",
      options: [
        { label: "The work feels repetitive — not learning new things", points: 2, dimension: "training_effectiveness" },
        { label: "I don't see how this training connects to my future role", points: 3, dimension: "training_effectiveness" },
        { label: "The culture feels too aggressive for me", points: 2, dimension: "adjustment_wellbeing" },
        {
          label: "I'm hearing about better opportunities outside",
          points: 4,
          dimension: "attrition_risk",
          criticalFlag: "Exploring other opportunities at Day 30",
        },
        { label: "Personal reasons / homesickness", points: 1, dimension: "adjustment_wellbeing" },
      ],
    },
    {
      id: "q5",
      kind: "static",
      botLabel: "Peer Connection",
      prompt: "Do you stay in touch with others from your batch?",
      type: "single",
      options: [
        { label: "Yes — most are doing well, we support each other", points: 0, dimension: "adjustment_wellbeing" },
        { label: "Yes — but some are struggling too", points: 2, dimension: "adjustment_wellbeing" },
        { label: "Not much — everyone's scattered, I feel isolated", points: 3, dimension: "adjustment_wellbeing" },
        { label: "Some have already left or are planning to leave", points: 4, dimension: "attrition_risk" },
      ],
    },
    {
      id: "q6",
      kind: "static",
      botLabel: "Recommendation Proxy",
      prompt: "If a junior from your college asked 'should I take this role?', what would you honestly say?",
      type: "single",
      options: [
        { label: "Definitely yes — great learning", points: 0, dimension: "attrition_risk" },
        { label: "Probably yes — but set your expectations", points: 1, dimension: "attrition_risk" },
        { label: "I'd hesitate to recommend it", points: 4, dimension: "attrition_risk" },
        {
          label: "I'd say avoid it",
          points: 6,
          dimension: "attrition_risk",
          criticalFlag: "Would tell juniors to avoid this role",
        },
      ],
    },
  ],
};

// ---------- SURVEY 3 — DAY 45 ----------
export const SURVEY_DAY_45: SurveyConfig = {
  stage: 45,
  title: "Day 45 Check-in",
  openingMessage:
    "Hey [Name]! 👋 You're halfway through training! Quick check-in — how's the journey shaping up? Completely confidential as always.",
  closingMessage:
    "Thanks, [Name]! Halfway done — you've already gotten past the toughest adjustment phase. Keep going! 🙌",
  freeTextPrompt: "Anything else on your mind? Completely optional.",
  stageMultiplier: 1.0,
  questions: [
    {
      id: "q1",
      kind: "static",
      botLabel: "Stint Transitions",
      prompt: "How smooth has the transition between your different training stints been?",
      type: "single",
      options: [
        { label: "Smooth — each phase built on the previous one", points: 0, dimension: "training_effectiveness" },
        { label: "Okay — some gaps but I adapted", points: 1, dimension: "training_effectiveness" },
        { label: "Rough — I felt lost between transitions", points: 3, dimension: "training_effectiveness" },
        { label: "There wasn't really a structured transition", points: 5, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q2",
      kind: "static",
      botLabel: "Guidance During AE Stint",
      prompt: "Now that you're deeper into training, how would you describe the quality of guidance from people around you?",
      type: "single",
      branch: { showQuestionId: "q2a", minIndex: 2 },
      options: [
        { label: "Genuinely investing in teaching me — I'm learning a lot", points: 0, dimension: "support_guidance" },
        { label: "Professional — they teach when they can", points: 1, dimension: "support_guidance" },
        { label: "I'm mostly tagging along — not being actively taught", points: 4, dimension: "support_guidance" },
        { label: "The dynamic is uncomfortable — I don't feel welcome", points: 6, dimension: "support_guidance" },
      ],
    },
    {
      id: "q2a",
      kind: "dynamic",
      botLabel: "Guidance Diagnosis",
      prompt: "What best describes the situation?",
      type: "multi",
      options: [
        { label: "No one explains what they're doing or why", points: 2, dimension: "training_effectiveness" },
        { label: "People seem annoyed when I ask questions", points: 3, dimension: "support_guidance" },
        { label: "I get assigned tasks without any teaching", points: 2, dimension: "support_guidance" },
        { label: "They're not bad people, just too busy to train", points: 1, dimension: "support_guidance" },
        {
          label: "The environment feels hostile or demeaning",
          points: 5,
          dimension: "support_guidance",
          criticalFlag: "Hostile/demeaning training environment",
        },
      ],
    },
    {
      id: "q3",
      kind: "static",
      botLabel: "Beat Plan & Outlet Ops",
      prompt: "At this point, how well do you understand beat plans and outlet-level operations?",
      type: "single",
      options: [
        { label: "Confident — I could explain it to someone new", points: 0, dimension: "training_effectiveness" },
        { label: "Mostly understand — a few gaps", points: 1, dimension: "training_effectiveness" },
        { label: "Shaky — I know the theory but struggle in practice", points: 3, dimension: "training_effectiveness" },
        { label: "Not confident — this hasn't been covered properly", points: 5, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q4",
      kind: "static",
      botLabel: "Personal Adjustment",
      prompt: "How are you doing outside of work — settling into the city, the routine, everything?",
      type: "single",
      branch: { showQuestionId: "q4a", minIndex: 2 },
      options: [
        { label: "Well settled — it's starting to feel normal", points: 0, dimension: "adjustment_wellbeing" },
        { label: "Managing — mix of good and tough days", points: 1, dimension: "adjustment_wellbeing" },
        { label: "Struggling — it's affecting my focus at work", points: 4, dimension: "adjustment_wellbeing" },
        { label: "Really struggling — I feel isolated", points: 5, dimension: "adjustment_wellbeing" },
      ],
    },
    {
      id: "q4a",
      kind: "dynamic",
      botLabel: "Adjustment Diagnosis",
      prompt: "What's been hardest to deal with?",
      type: "multi",
      options: [
        { label: "Living conditions / accommodation", points: 1, dimension: "adjustment_wellbeing" },
        { label: "Missing family and friends", points: 1, dimension: "adjustment_wellbeing" },
        { label: "Physical exhaustion from the daily schedule", points: 2, dimension: "adjustment_wellbeing" },
        { label: "Feeling like I don't belong here", points: 3, dimension: "attrition_risk" },
        { label: "I keep thinking about going back home", points: 4, dimension: "attrition_risk" },
      ],
    },
    {
      id: "q5",
      kind: "static",
      botLabel: "Training Dossier Awareness",
      prompt: "You have a training dossier that outlines what you should be doing when. How much of it have you genuinely covered so far?",
      type: "single",
      options: [
        { label: "Most of it — meaningfully", points: 0, dimension: "training_effectiveness" },
        { label: "It's being followed on paper but real learning is patchy", points: 4, dimension: "training_effectiveness" },
        { label: "Vaguely aware of it — no one walks me through it", points: 3, dimension: "training_effectiveness" },
        { label: "What dossier?", points: 5, dimension: "training_effectiveness" },
      ],
    },
  ],
};

// ---------- SURVEY 4 — DAY 60 ----------
export const SURVEY_DAY_60: SurveyConfig = {
  stage: 60,
  title: "Day 60 Check-in",
  openingMessage:
    "Hey [Name]! 👋 Two months in — the final stretch of training! Quick check-in before things get real.",
  closingMessage:
    "Thanks, [Name]! 💪 The last month of training is where everything clicks. If there are gaps — you just told us. We're listening.",
  freeTextPrompt: "Anything you want to get off your chest?",
  stageMultiplier: 1.1,
  questions: [
    {
      id: "q1",
      kind: "static",
      botLabel: "Distributor & Retailer Competence",
      prompt: "How confident are you about managing distributor relationships and retailer interactions on your own?",
      type: "single",
      options: [
        { label: "Confident — I've had good hands-on exposure", points: 0, dimension: "training_effectiveness" },
        { label: "Somewhat — I get the basics but need more practice", points: 1, dimension: "training_effectiveness" },
        { label: "Not very — I've had limited distributor exposure", points: 4, dimension: "training_effectiveness" },
        { label: "Not at all — this hasn't been covered properly", points: 5, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q2",
      kind: "static",
      botLabel: "Section Readiness",
      prompt: "In about a month, you'll be running your own section. How ready do you feel?",
      type: "single",
      branch: { showQuestionId: "q2a", minIndex: 2 },
      options: [
        { label: "Ready — bring it on", points: 0, dimension: "transition_readiness" },
        { label: "Somewhat — nervous but willing to figure it out", points: 1, dimension: "transition_readiness" },
        { label: "Not ready — there are big gaps in what I've learned", points: 4, dimension: "transition_readiness" },
        { label: "Scared — I don't think I've been trained enough", points: 6, dimension: "transition_readiness" },
      ],
    },
    {
      id: "q2a",
      kind: "dynamic",
      botLabel: "Readiness Gaps",
      prompt: "What are the biggest gaps you feel right now?",
      type: "multi",
      options: [
        { label: "Distributor management — haven't done enough", points: 2, dimension: "training_effectiveness" },
        { label: "Secondary sales and stock management", points: 2, dimension: "training_effectiveness" },
        { label: "How to handle a team of salesmen independently", points: 2, dimension: "training_effectiveness" },
        { label: "Trade schemes and commercial understanding", points: 2, dimension: "training_effectiveness" },
        { label: "Handling pressure and targets on my own", points: 2, dimension: "transition_readiness" },
        { label: "Honestly, everything — I don't feel ready at all", points: 4, dimension: "transition_readiness" },
      ],
    },
    {
      id: "q3",
      kind: "static",
      botLabel: "Manager Review Quality",
      prompt: "Your manager is supposed to do periodic reviews. How have those been?",
      type: "single",
      options: [
        { label: "Helpful — I got genuine feedback and direction", points: 0, dimension: "support_guidance" },
        { label: "They happened but felt like a formality", points: 2, dimension: "support_guidance" },
        { label: "Only happened once, very briefly", points: 3, dimension: "support_guidance" },
        { label: "Haven't had any proper review yet", points: 5, dimension: "support_guidance" },
      ],
    },
    {
      id: "q4",
      kind: "static",
      botLabel: "Pressure & Stress",
      prompt: "How's the pressure feeling these days?",
      type: "single",
      branch: { showQuestionId: "q4a", minIndex: 3 },
      options: [
        { label: "Healthy — it pushes me to learn faster", points: 0, dimension: "adjustment_wellbeing" },
        { label: "Manageable — tough days but I handle it", points: 1, dimension: "adjustment_wellbeing" },
        { label: "Heavy — it's starting to affect my motivation", points: 3, dimension: "adjustment_wellbeing" },
        { label: "Crushing — I don't know how much longer I can keep this up", points: 6, dimension: "attrition_risk" },
      ],
    },
    {
      id: "q4a",
      kind: "dynamic",
      botLabel: "Pressure Source",
      prompt: "What's weighing on you the most?",
      type: "multi",
      options: [
        { label: "Fear of not being ready when I get my own section", points: 2, dimension: "transition_readiness" },
        { label: "The way people talk to me / the culture", points: 3, dimension: "adjustment_wellbeing" },
        { label: "Nobody seems to care whether I'm actually learning", points: 3, dimension: "support_guidance" },
        {
          label: "I'm seriously considering other options",
          points: 5,
          dimension: "attrition_risk",
          criticalFlag: "Considering other options at Day 60",
        },
      ],
    },
    {
      id: "q5",
      kind: "static",
      botLabel: "Intent Signal",
      prompt: "Thinking about the next year — where's your head at?",
      type: "single",
      options: [
        { label: "Committed — I see myself growing here", points: 0, dimension: "attrition_risk" },
        { label: "Taking it one day at a time", points: 2, dimension: "attrition_risk" },
        { label: "Depends on how my posting goes", points: 3, dimension: "attrition_risk" },
        { label: "Keeping my options open honestly", points: 5, dimension: "attrition_risk" },
        {
          label: "I've already started looking elsewhere",
          points: 8,
          dimension: "attrition_risk",
          criticalFlag: "Already looking at Day 60",
        },
      ],
    },
  ],
};

// ---------- SURVEY 5 — DAY 90 ----------
export const SURVEY_DAY_90: SurveyConfig = {
  stage: 90,
  title: "Day 90 Check-in",
  openingMessage:
    "Hey [Name]! 👋 You made it through training — that's a big deal! Now that you're stepping into (or about to step into) your own section, let's do a final check-in.",
  closingMessage:
    "Thanks, [Name]! 🎉 You've been through a lot and you made it. Your honest feedback directly shapes how we train the next batch. Wishing you a great start as Section In-charge!",
  freeTextPrompt: "Any final thoughts? This goes directly to the HR team.",
  stageMultiplier: 1.2,
  questions: [
    {
      id: "q1",
      kind: "static",
      botLabel: "Training Verdict",
      prompt: "Looking back at the full 3-month training, how would you rate it?",
      type: "single",
      branch: { showQuestionId: "q1a", minIndex: 2 },
      options: [
        { label: "Excellent — I feel well-prepared for the real job", points: 0, dimension: "training_effectiveness" },
        { label: "Good — some gaps but mostly solid", points: 1, dimension: "training_effectiveness" },
        { label: "Average — a lot was left to self-learning", points: 3, dimension: "training_effectiveness" },
        { label: "Poor — I don't feel adequately prepared", points: 5, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q1a",
      kind: "dynamic",
      botLabel: "Training Gaps",
      prompt: "What should training have covered better?",
      type: "multi",
      options: [
        { label: "More hands-on distributor interactions, not just observation", points: 2, dimension: "training_effectiveness" },
        { label: "Deeper product and scheme knowledge", points: 1, dimension: "training_effectiveness" },
        { label: "How to actually manage a section day-to-day", points: 3, dimension: "training_effectiveness" },
        { label: "Better quality of people I was paired with for training", points: 2, dimension: "support_guidance" },
        { label: "The dossier should be followed with real assessments, not just ticked off", points: 2, dimension: "training_effectiveness" },
        { label: "Soft skills — handling pressure, team management, communication", points: 1, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q2",
      kind: "static",
      botLabel: "Transition Experience",
      prompt: "How's the transition to your own section going?",
      type: "single",
      options: [
        { label: "Smooth — proper handover, feeling confident", points: 0, dimension: "transition_readiness" },
        { label: "Okay — nervous but I'll figure it out", points: 1, dimension: "transition_readiness" },
        { label: "Rocky — no handover, thrown into the deep end", points: 4, dimension: "transition_readiness" },
        { label: "I genuinely don't feel ready to do this on my own", points: 6, dimension: "transition_readiness" },
      ],
    },
    {
      id: "q3",
      kind: "static",
      botLabel: "Mentorship Retrospective",
      prompt: "Overall, how would you rate the quality of guidance you received during training?",
      type: "single",
      options: [
        { label: "Outstanding — people went above and beyond", points: 0, dimension: "support_guidance" },
        { label: "Good — they did their part", points: 1, dimension: "support_guidance" },
        { label: "Mediocre — I had to figure most things out alone", points: 3, dimension: "support_guidance" },
        { label: "Poor — I felt neglected", points: 5, dimension: "support_guidance" },
        {
          label: "Harmful — the experience was toxic or demoralizing",
          points: 8,
          dimension: "support_guidance",
          criticalFlag: "Toxic/demoralizing training experience",
        },
      ],
    },
    {
      id: "q4",
      kind: "static",
      botLabel: "Retention Intent",
      prompt: "What's your honest plan for the next year?",
      type: "single",
      options: [
        { label: "Fully committed — want to build my career here", points: 0, dimension: "attrition_risk" },
        { label: "Will give it a fair shot", points: 2, dimension: "attrition_risk" },
        { label: "Staying because I don't have a better option right now", points: 5, dimension: "attrition_risk" },
        {
          label: "Actively figuring out my exit",
          points: 9,
          dimension: "attrition_risk",
          criticalFlag: "Planning exit at Day 90",
        },
      ],
    },
    {
      id: "q5",
      kind: "static",
      botLabel: "Program Feedback",
      prompt: "If you could change ONE thing about the training program for the next batch, what would it be?",
      type: "single",
      options: [
        { label: "Pair trainees with more available and better-quality trainers", points: 0, dimension: "none" },
        { label: "Make the training more structured with real assessments", points: 0, dimension: "none" },
        { label: "Prepare trainees better for the reality of field work", points: 0, dimension: "none" },
        { label: "Address the aggressive culture — it pushes people out", points: 0, dimension: "none" },
        { label: "Nothing — the training was solid", points: 0, dimension: "none" },
      ],
    },
  ],
};

// ---------- SURVEY 6 — DAY 180 ----------
export const SURVEY_DAY_180: SurveyConfig = {
  stage: 180,
  title: "Day 180 Check-in",
  openingMessage:
    "Hey [Name]! 👋 6 months since you started — and about 3 months running your own section. This is our last check-in. How's real life? Completely confidential, as always.",
  closingMessage:
    "Thanks, [Name]! 🙏 This was your final check-in. Your feedback across these 6 months is incredibly valuable — it directly shapes how we train every future batch. We appreciate your honesty. All the best!",
  freeTextPrompt: "Last chance — anything you want the HR team to know?",
  stageMultiplier: 1.0,
  questions: [
    {
      id: "q1",
      kind: "static",
      botLabel: "Training Adequacy in Hindsight",
      prompt: "Now that you've been running a section, how well did training actually prepare you for the job?",
      type: "single",
      branch: { showQuestionId: "q1a", minIndex: 2 },
      options: [
        { label: "Very well — I use what I learned every day", points: 0, dimension: "training_effectiveness" },
        { label: "Decently — but there are things I wish I'd learned", points: 1, dimension: "training_effectiveness" },
        { label: "Poorly — I've had to figure out most things on the job", points: 4, dimension: "training_effectiveness" },
        { label: "Training barely scratched the surface of what this job needs", points: 6, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q1a",
      kind: "dynamic",
      botLabel: "Hindsight Gaps",
      prompt: "What did you have to learn the hard way?",
      type: "multi",
      options: [
        { label: "Managing a distributor independently (claims, payments, relationships)", points: 2, dimension: "training_effectiveness" },
        { label: "Handling salesmen and their day-to-day issues", points: 2, dimension: "training_effectiveness" },
        { label: "Secondary sales planning and forecasting", points: 1, dimension: "training_effectiveness" },
        { label: "Dealing with target pressure from seniors", points: 2, dimension: "adjustment_wellbeing" },
        { label: "Internal systems and reporting", points: 1, dimension: "training_effectiveness" },
      ],
    },
    {
      id: "q2",
      kind: "static",
      botLabel: "Current Support",
      prompt: "How supported do you feel in your current role?",
      type: "single",
      options: [
        { label: "Well supported — I get regular guidance", points: 0, dimension: "support_guidance" },
        { label: "Okay — help comes when I escalate", points: 1, dimension: "support_guidance" },
        { label: "Mostly on my own — I figure things out", points: 3, dimension: "support_guidance" },
        { label: "On my own with no backup — I'm struggling", points: 5, dimension: "support_guidance" },
      ],
    },
    {
      id: "q3",
      kind: "static",
      botLabel: "Growth Perception",
      prompt: "Do you feel you're growing professionally?",
      type: "single",
      options: [
        { label: "Absolutely — learning something new every day", points: 0, dimension: "attrition_risk" },
        { label: "Somewhat — it's become routine but I'm still growing", points: 1, dimension: "attrition_risk" },
        { label: "Stagnating — every day feels the same", points: 4, dimension: "attrition_risk" },
        { label: "Declining — the pressure is wearing me down, not building me up", points: 5, dimension: "attrition_risk" },
      ],
    },
    {
      id: "q4",
      kind: "static",
      botLabel: "Long-term Intent",
      prompt: "Where do you see yourself in the next 1-2 years?",
      type: "single",
      options: [
        { label: "Growing here — aiming for AE and beyond", points: 0, dimension: "attrition_risk" },
        { label: "Here for now — will see how it goes", points: 2, dimension: "attrition_risk" },
        { label: "Probably moving on within a year", points: 5, dimension: "attrition_risk" },
        {
          label: "Already exploring other opportunities",
          points: 8,
          dimension: "attrition_risk",
          criticalFlag: "Exploring exit at Day 180",
        },
      ],
    },
    {
      id: "q5",
      kind: "static",
      botLabel: "Final Recommendation",
      prompt: "Knowing everything you know now — would you recommend this role to a junior from your college?",
      type: "single",
      options: [
        { label: "Strongly yes", points: 0, dimension: "attrition_risk" },
        { label: "Yes, with realistic expectations", points: 1, dimension: "attrition_risk" },
        { label: "Probably not", points: 4, dimension: "attrition_risk" },
        {
          label: "Definitely not",
          points: 6,
          dimension: "attrition_risk",
          criticalFlag: "Would not recommend role at Day 180",
        },
      ],
    },
    {
      id: "q6",
      kind: "static",
      botLabel: "Program Feedback",
      prompt: "One thing you'd change about training for the next batch?",
      type: "single",
      options: [
        { label: "More real distributor and section management exposure", points: 0, dimension: "none" },
        { label: "Better quality trainers / more invested people", points: 0, dimension: "none" },
        { label: "Soften the culture — it's unnecessarily harsh", points: 0, dimension: "none" },
        { label: "More structured assessments instead of just ticking boxes", points: 0, dimension: "none" },
        { label: "Training was good — keep it as is", points: 0, dimension: "none" },
      ],
    },
  ],
};

export const SURVEYS: Record<SurveyStage, SurveyConfig> = {
  15: SURVEY_DAY_15,
  30: SURVEY_DAY_30,
  45: SURVEY_DAY_45,
  60: SURVEY_DAY_60,
  90: SURVEY_DAY_90,
  180: SURVEY_DAY_180,
};

export const STAGE_LABELS: Record<SurveyStage, string> = {
  15: "Day 15",
  30: "Day 30",
  45: "Day 45",
  60: "Day 60",
  90: "Day 90",
  180: "Day 180",
};

/**
 * Returns the eligible survey stage for a trainee based on days since DOJ.
 * Returns null if the trainee is not yet eligible for any survey (days < 15).
 */
export function getEligibleStage(daysSinceJoining: number): SurveyStage | null {
  if (daysSinceJoining < 15) return null;
  if (daysSinceJoining < 30) return 15;
  if (daysSinceJoining < 45) return 30;
  if (daysSinceJoining < 60) return 45;
  if (daysSinceJoining < 90) return 60;
  if (daysSinceJoining < 180) return 90;
  return 180;
}

