import { supabase } from "@/integrations/supabase/client";

// =============================================================
// PRD-COMPLIANT SEED — 45 trainees, story-driven distribution
// =============================================================

const FEMALE_FIRST = [
  "Priya", "Sneha", "Meera", "Anjali", "Kavita", "Pooja", "Riya", "Diya",
  "Tara", "Sara", "Aisha", "Neha", "Ananya", "Anaya",
];
const MALE_FIRST = [
  "Rahul", "Amit", "Arjun", "Vikram", "Rohan", "Karan", "Ishaan", "Aditya",
  "Yash", "Nikhil", "Dev", "Kabir", "Aarav",
];
const LASTS = [
  "Sharma", "Patel", "Verma", "Kulkarni", "Nair", "Iyer", "Singh", "Deshmukh",
  "Joshi", "Reddy", "Mehta", "Rao", "Kapoor", "Khan", "Bose", "Pillai",
  "Agarwal", "Desai",
];

const COLLEGES = [
  "SIMSREE Mumbai", "GIM Goa", "TAPMI Manipal", "XIME Bangalore", "IMT Nagpur",
  "BIMTECH Noida", "Welingkar Mumbai", "SCMHRD Pune", "NIBM Pune", "IBS Hyderabad",
];

// PRD branch counts: total = 45
const BRANCH_COUNTS: { branch: string; count: number }[] = [
  { branch: "Mumbai", count: 12 },
  { branch: "Ahmedabad", count: 8 },
  { branch: "Pune", count: 9 },
  { branch: "Nagpur", count: 10 },
  { branch: "Bhopal", count: 6 },
];

// Managers per branch — Rajesh Tiwari is the problematic Nagpur manager
const MANAGERS_BY_BRANCH: Record<string, string[]> = {
  Mumbai: ["Anil Kapoor", "Sunita Pillai", "Rajiv Menon"],
  Ahmedabad: ["Hardik Shah", "Pooja Trivedi"],
  Pune: ["Vivek Joshi", "Nisha Deshmukh"],
  Nagpur: ["Rajesh Tiwari", "Manisha Rane"],
  Bhopal: ["Sandeep Verma"],
};

const STAGES = [15, 30, 45, 60, 90, 180] as const;
const STAGE_MULTIPLIERS: Record<number, number> = {
  15: 0.7, 30: 0.9, 45: 1.0, 60: 1.2, 90: 1.4, 180: 1.5,
};

// Critical flag triggers from PRD
const CRITICAL_FLAGS_BY_STAGE: Record<number, string[]> = {
  15: ["'Regretting' emotional state", "'I'd rethink my decision to join'"],
  30: ["'I feel like I'm in the way'", "'Exploring other opportunities'", "'Would tell juniors to avoid this role'"],
  45: ["'Hostile/demeaning environment'"],
  60: ["'Seriously considering other options'", "'Already started looking elsewhere'"],
  90: ["'Toxic/demoralizing training experience'", "'Planning exit'"],
  180: ["'Exploring exit'", "'Would not recommend role'"],
};

const FREE_TEXTS = [
  "The training dossier exists but no one follows it. I'm just following salesmen around with no clear learning objective.",
  "My area is very rural. I spend 3 hours just commuting to the beat. By the time I get there, I'm already exhausted.",
  "The team here is great. My AE takes time to explain everything. Feeling good about this.",
  "I was told this would be a managerial role. Didn't expect to be walking in the sun all day selling cigarettes.",
  "Seriously considering going back. Got a call from another company offering better package.",
  "I don't feel supported at all. The people here don't care about training.",
  "Thinking about leaving. This isn't what was promised during placement.",
];

const PULSE_OPTIONS = [
  "Better trainers / more investment",
  "More structured assessments",
  "Prepare for field reality",
  "Fix aggressive culture",
  "Training is solid",
];

type Profile = "A" | "B" | "C" | "D" | "E";

function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgoIso(d: number): string {
  const t = new Date(); t.setDate(t.getDate() - d);
  return t.toISOString().slice(0, 10);
}
function eligibleStages(daysSinceJoining: number): number[] {
  return STAGES.filter((m) => daysSinceJoining >= m);
}

/** Stage-aware completion probability — Nagpur lower, Mumbai higher. */
function completionProbability(branch: string): number {
  if (branch === "Mumbai") return 0.95;
  if (branch === "Nagpur") return 0.65;
  return 0.85;
}

/** Branch-skewed default profile distribution. */
function rollProfile(branch: string, forceProfile?: Profile): Profile {
  if (forceProfile) return forceProfile;
  const r = Math.random();
  if (branch === "Nagpur") {
    // Worse: more C/E, less A
    if (r < 0.20) return "A";
    if (r < 0.45) return "B";
    if (r < 0.80) return "C";
    if (r < 0.85) return "D";
    return "E";
  }
  if (branch === "Mumbai") {
    if (r < 0.55) return "A";
    if (r < 0.85) return "B";
    if (r < 0.95) return "C";
    if (r < 0.98) return "D";
    return "E";
  }
  // PRD baseline: A 40 / B 30 / C 20 / D 5 / E 5
  if (r < 0.40) return "A";
  if (r < 0.70) return "B";
  if (r < 0.90) return "C";
  if (r < 0.95) return "D";
  return "E";
}

/** Build score numbers for a profile. */
function buildScoresForProfile(stage: number, profile: Profile) {
  let perDim: () => number;
  switch (profile) {
    case "A": perDim = () => rand(0, 2); break;
    case "B": perDim = () => rand(2, 5); break;
    case "C": perDim = () => rand(5, 8); break;
    case "D": perDim = () => 0; break;
    case "E": perDim = () => rand(7, 10); break;
  }
  const te = perDim();
  const ar = perDim();
  const sg = perDim();
  const aw = perDim();
  const tr = stage >= 60 ? perDim() : null;
  const composite = te + ar + sg + aw + (tr ?? 0);
  const mult = STAGE_MULTIPLIERS[stage];
  let final_score = Math.round(composite * mult * 10) / 10;

  // Force final score band by profile (clamp into PRD-target ranges)
  if (profile === "A") final_score = Math.min(final_score, rand(2, 8));
  if (profile === "B") final_score = Math.max(12, Math.min(20, final_score || rand(12, 20)));
  if (profile === "C") final_score = Math.max(24, Math.min(35, final_score || rand(24, 35)));
  if (profile === "D") final_score = rand(0, 2);
  if (profile === "E") final_score = Math.max(30, final_score);

  let risk_level: "LOW" | "MEDIUM" | "HIGH";
  if (final_score >= 23) risk_level = "HIGH";
  else if (final_score >= 11) risk_level = "MEDIUM";
  else risk_level = "LOW";

  return {
    training_effectiveness: te,
    attrition_risk: ar,
    support_guidance: sg,
    adjustment_wellbeing: aw,
    transition_readiness: tr,
    composite,
    stage_multiplier: mult,
    final_score,
    risk_level,
  };
}

function flagsForProfile(stage: number, profile: Profile): string[] {
  const pool = CRITICAL_FLAGS_BY_STAGE[stage] ?? [];
  if (profile === "C") return Math.random() < 0.7 && pool.length ? [pick(pool)] : [];
  if (profile === "E") {
    const n = Math.min(pool.length, 2 + (Math.random() < 0.5 ? 1 : 0));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }
  return [];
}

function completionTimeForProfile(profile: Profile): number {
  switch (profile) {
    case "A": return rand(90, 180);
    case "B": return rand(120, 240);
    case "C": return rand(150, 300);
    case "D": return rand(20, 40);
    case "E": return rand(200, 360);
  }
}

function pulseQA(stage: number) {
  const list: any[] = [];
  if (stage === 90) {
    list.push({
      question_id: "S5_Q5",
      question_text: "If you could change one thing about training, what would it be?",
      answer_text: pick(PULSE_OPTIONS),
      points: 0, dimension: "none",
    });
  } else if (stage === 180) {
    list.push({
      question_id: "S6_Q6",
      question_text: "What's the one thing leadership should know?",
      answer_text: pick(PULSE_OPTIONS),
      points: 0, dimension: "none",
    });
  }
  return list;
}

interface SeedEmployee {
  employee_code: string; name: string; phone: string; email: string;
  branch: string; area_manager: string; doj: string; age: number; college: string;
  // local-only
  __daysSince: number;
  __forcedProfile?: Profile;
  __forcedTrajectory?: "WORSENING" | "IMPROVING";
  __freeTextOverride?: string;
}

function buildEmployees(): SeedEmployee[] {
  const out: SeedEmployee[] = [];
  let idx = 1;

  // DOJ buckets per PRD:
  //   15 trainees: 90-120 days ago (most surveys done)
  //   15 trainees: 45-75 days ago (Day15/30, sometimes 45)
  //   10 trainees: 14-28 days ago (Day15 only)
  //    5 trainees: 0-13 days ago (no surveys yet)
  // We distribute these across branches proportionally.
  const dojBuckets: { range: [number, number]; count: number }[] = [
    { range: [90, 120], count: 15 },
    { range: [45, 75], count: 15 },
    { range: [14, 28], count: 10 },
    { range: [0, 13], count: 5 },
  ];

  // Build flat doj pool of length 45
  const dojPool: number[] = [];
  for (const b of dojBuckets) {
    for (let i = 0; i < b.count; i++) {
      dojPool.push(rand(b.range[0], b.range[1]));
    }
  }
  // Shuffle DOJ pool
  dojPool.sort(() => Math.random() - 0.5);

  // Branch slots: produce list of branch assignments
  const branchSlots: string[] = [];
  for (const b of BRANCH_COUNTS) {
    for (let i = 0; i < b.count; i++) branchSlots.push(b.branch);
  }
  // Shuffle branches so DOJ buckets distribute fairly
  branchSlots.sort(() => Math.random() - 0.5);

  // Pre-allocate Rajesh Tiwari special: 3 Nagpur trainees, all medium-to-high
  const rajeshTraineeIndexes = new Set<number>();
  // Trajectory specials: 2-3 worsening, 1 improving — must have DOJ >= ~45 days for multiple stages
  const worseningCount = 3;
  const improvingCount = 1;

  for (let i = 0; i < branchSlots.length; i++) {
    const branch = branchSlots[i];
    const daysSince = dojPool[i];
    const isFemale = Math.random() < 0.45;
    const first = isFemale ? pick(FEMALE_FIRST) : pick(MALE_FIRST);
    const last = pick(LASTS);
    const name = `${first} ${last}`;
    const code = `STR-2026-${idx.toString().padStart(3, "0")}`;
    out.push({
      employee_code: code, name,
      phone: `${pick([9, 8, 7])}${rand(100000000, 999999999)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@itc.in`,
      branch,
      area_manager: pick(MANAGERS_BY_BRANCH[branch]),
      doj: daysAgoIso(daysSince),
      age: rand(22, 25),
      college: pick(COLLEGES),
      __daysSince: daysSince,
    });
    idx++;
  }

  // Force 3 Nagpur trainees onto Rajesh Tiwari, mid-tenure so they have visible scores
  const nagpurEligible = out
    .map((e, i) => ({ e, i }))
    .filter((x) => x.e.branch === "Nagpur" && x.e.__daysSince >= 30)
    .slice(0, 3);
  for (const { e, i } of nagpurEligible) {
    e.area_manager = "Rajesh Tiwari";
    e.__forcedProfile = Math.random() < 0.5 ? "B" : "C";
    rajeshTraineeIndexes.add(i);
  }

  // Trajectory candidates: any trainee with >=2 eligible stages
  const trajectoryCandidates = out
    .map((e, i) => ({ e, i }))
    .filter((x) => eligibleStages(x.e.__daysSince).length >= 2 && !rajeshTraineeIndexes.has(x.i));
  trajectoryCandidates.sort(() => Math.random() - 0.5);
  for (let k = 0; k < worseningCount && k < trajectoryCandidates.length; k++) {
    trajectoryCandidates[k].e.__forcedTrajectory = "WORSENING";
  }
  for (let k = worseningCount; k < worseningCount + improvingCount && k < trajectoryCandidates.length; k++) {
    trajectoryCandidates[k].e.__forcedTrajectory = "IMPROVING";
  }

  // Distribute the 5 mandated free-text snippets across diverse trainees
  const freeTextTargets = out
    .map((e, i) => ({ e, i }))
    .filter((x) => x.e.__daysSince >= 30)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
  const SCRIPT_TEXTS = FREE_TEXTS.slice(0, 5);
  for (let k = 0; k < freeTextTargets.length; k++) {
    freeTextTargets[k].e.__freeTextOverride = SCRIPT_TEXTS[k];
  }

  return out;
}

export async function seedDemoTrainees(_count = 45): Promise<{
  insertedEmployees: number;
  insertedResponses: number;
  error?: string;
}> {
  const employees = buildEmployees();

  const toInsert = employees.map(
    ({ __daysSince, __forcedProfile, __forcedTrajectory, __freeTextOverride, ...rest }) => rest
  );

  const { data: inserted, error } = await supabase
    .from("employees")
    .insert(toInsert)
    .select("id, employee_code");

  if (error || !inserted) {
    return { insertedEmployees: 0, insertedResponses: 0, error: error?.message };
  }

  const codeToMeta = new Map(employees.map((e) => [e.employee_code, e]));
  const responses: any[] = [];

  for (const emp of inserted) {
    const meta = codeToMeta.get(emp.employee_code);
    if (!meta) continue;
    const days = meta.__daysSince;
    const stages = eligibleStages(days);
    if (stages.length === 0) continue; // "Awaiting" — no responses

    const completionRate = completionProbability(meta.branch);

    // Determine trajectory: list of profiles per stage
    let stageProfiles: Profile[] = [];
    if (meta.__forcedTrajectory === "WORSENING") {
      // Day15=A, Day30=B, Day45=C ... walk up severity
      const ladder: Profile[] = ["A", "B", "C", "E"];
      stageProfiles = stages.map((_, i) => ladder[Math.min(i, ladder.length - 1)]);
    } else if (meta.__forcedTrajectory === "IMPROVING") {
      const ladder: Profile[] = ["C", "B", "A"];
      stageProfiles = stages.map((_, i) => ladder[Math.min(i, ladder.length - 1)]);
    } else if (meta.__forcedProfile) {
      stageProfiles = stages.map(() => meta.__forcedProfile!);
    } else {
      stageProfiles = stages.map(() => rollProfile(meta.branch));
    }

    let freeTextUsed = false;

    for (let si = 0; si < stages.length; si++) {
      const stage = stages[si];
      // Skip some stages by branch completion rate, but never skip all for forced trajectories
      if (Math.random() > completionRate && !meta.__forcedTrajectory) continue;

      const profile = stageProfiles[si];
      const scores = buildScoresForProfile(stage, profile);
      const flags = flagsForProfile(stage, profile);
      const finalRisk: "LOW" | "MEDIUM" | "HIGH" =
        flags.length > 0 ? "HIGH" : scores.risk_level;

      // submitted_at: shortly after the milestone was crossed
      const submittedDaysAgo = Math.max(0, days - stage - rand(0, 4));
      const subDate = new Date(); subDate.setDate(subDate.getDate() - submittedDaysAgo);

      let freeText: string | null = null;
      if (!freeTextUsed && meta.__freeTextOverride && si === stages.length - 1) {
        freeText = meta.__freeTextOverride; freeTextUsed = true;
      } else if (profile === "E") {
        freeText = pick([
          "I don't feel supported at all. The people here don't care about training.",
          "Thinking about leaving. This isn't what was promised during placement.",
        ]);
      }

      responses.push({
        employee_id: emp.id,
        stage: String(stage),
        risk_level: finalRisk,
        final_score: scores.final_score,
        gaming_flag: profile === "D",
        critical_flags: flags,
        completion_time_seconds: completionTimeForProfile(profile),
        submitted_at: subDate.toISOString(),
        responses: pulseQA(stage),
        scores: { ...scores, risk_level: finalRisk },
        free_text_response: freeText,
      });
    }
  }

  const { error: respErr, count: respCount } = await supabase
    .from("survey_responses")
    .insert(responses, { count: "exact" });

  return {
    insertedEmployees: inserted.length,
    insertedResponses: respErr ? 0 : respCount ?? responses.length,
    error: respErr?.message,
  };
}
