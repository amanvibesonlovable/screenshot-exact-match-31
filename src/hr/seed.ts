import { supabase } from "@/integrations/supabase/client";

const FIRSTS = [
  "Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Anaya", "Karan", "Meera",
  "Arjun", "Diya", "Ishaan", "Riya", "Aditya", "Neha", "Yash", "Pooja",
  "Rahul", "Ananya", "Kabir", "Tara", "Nikhil", "Sara", "Dev", "Aisha",
];
const LASTS = [
  "Sharma", "Iyer", "Mehta", "Rao", "Singh", "Kapoor", "Patel", "Reddy",
  "Khan", "Joshi", "Bose", "Nair", "Pillai", "Verma", "Agarwal", "Desai",
];

// PRD branches
const BRANCHES = ["Mumbai", "Ahmedabad", "Pune", "Nagpur", "Bhopal"];
const MANAGERS_BY_BRANCH: Record<string, string[]> = {
  Mumbai: ["Rajesh Khanna", "Sunita Pillai"],
  Ahmedabad: ["Hardik Shah", "Pooja Trivedi"],
  Pune: ["Vivek Joshi", "Nisha Deshmukh"],
  Nagpur: ["Ashok Patil", "Manisha Rane"],
  Bhopal: ["Sandeep Tiwari", "Kavita Saxena"],
};

const COLLEGES = [
  "IIM Indore", "MDI Gurgaon", "SIBM Pune", "XIMB", "NMIMS",
  "TAPMI", "IMT Ghaziabad", "IIFT Delhi", "Welingkar", "FORE School",
];

// Critical flags from PRD
const CRITICAL_FLAGS_BY_STAGE: Record<number, string[]> = {
  15: ["Regretting joining at Day 15", "Reconsidering joining at Day 15"],
  30: ["Feeling like a burden at Day 30", "Exploring other opportunities at Day 30", "Would tell juniors to avoid this role"],
  45: ["Hostile/demeaning training environment"],
  60: ["Considering other options at Day 60", "Already looking at Day 60"],
  90: ["Toxic/demoralizing training experience", "Planning exit at Day 90"],
  180: ["Exploring exit at Day 180", "Would not recommend role at Day 180"],
};

const STAGE_MULTIPLIERS: Record<number, number> = {
  15: 0.7, 30: 0.9, 45: 1.0, 60: 1.2, 90: 1.4, 180: 1.5,
};

function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(d: number): string {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString().slice(0, 10);
}

/** Returns the list of stages this trainee is eligible for given days since joining. */
function eligibleStages(daysSinceJoining: number): number[] {
  const milestones = [15, 30, 45, 60, 90, 180];
  return milestones.filter((m) => daysSinceJoining >= m);
}

function buildScores(stage: number, riskBias: "LOW" | "MEDIUM" | "HIGH") {
  const base = riskBias === "HIGH" ? () => rand(5, 10)
    : riskBias === "MEDIUM" ? () => rand(2, 6)
    : () => rand(0, 3);
  const te = base();
  const ar = base();
  const sg = base();
  const aw = base();
  const tr = stage >= 60 ? base() : null;
  const composite = te + ar + sg + aw + (tr ?? 0);
  const mult = STAGE_MULTIPLIERS[stage] ?? 1;
  const final_score = Math.round(composite * mult * 10) / 10;
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

export async function seedDemoTrainees(count = 20): Promise<{
  insertedEmployees: number;
  insertedResponses: number;
  error?: string;
}> {
  const ts = Date.now().toString().slice(-6);
  const employeesPayload = Array.from({ length: count }).map((_, i) => {
    const branch = pick(BRANCHES);
    const manager = pick(MANAGERS_BY_BRANCH[branch]);
    // Spread DOJ between 10 and 200 days ago to cover all stages
    const daysSince = rand(10, 200);
    const name = `${pick(FIRSTS)} ${pick(LASTS)}`;
    return {
      employee_code: `STR${ts}${i.toString().padStart(2, "0")}`,
      name,
      phone: `9${rand(100000000, 999999999)}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}.${i}@demo.pulse.dev`,
      branch,
      area_manager: manager,
      doj: daysAgo(daysSince),
      age: rand(22, 25),
      college: pick(COLLEGES),
      __daysSince: daysSince,
    };
  });

  const toInsert = employeesPayload.map(({ __daysSince, ...rest }) => rest);
  const { data: inserted, error } = await supabase
    .from("employees")
    .insert(toInsert)
    .select("id, employee_code");

  if (error || !inserted) {
    return { insertedEmployees: 0, insertedResponses: 0, error: error?.message };
  }

  const codeToDays = new Map(employeesPayload.map((e) => [e.employee_code, e.__daysSince]));

  const responses: any[] = [];
  for (const emp of inserted) {
    const days = codeToDays.get(emp.employee_code) ?? 30;
    const stages = eligibleStages(days);
    // Bias each trainee's overall risk
    const roll = Math.random();
    const empBias: "LOW" | "MEDIUM" | "HIGH" =
      roll < 0.5 ? "LOW" : roll < 0.8 ? "MEDIUM" : "HIGH";

    // 80% completion rate per eligible stage
    for (const stage of stages) {
      if (Math.random() > 0.8) continue; // pending
      const scores = buildScores(stage, empBias);
      // Possibly add critical flag for HIGH-bias trainees
      const flags: string[] = [];
      if (empBias === "HIGH" && Math.random() < 0.4) {
        flags.push(pick(CRITICAL_FLAGS_BY_STAGE[stage]));
      }
      const finalRisk = flags.length > 0 ? "HIGH" : scores.risk_level;
      // submitted_at near when they crossed that milestone
      const submittedDaysAgo = Math.max(0, days - stage - rand(0, 5));
      const subDate = new Date();
      subDate.setDate(subDate.getDate() - submittedDaysAgo);

      responses.push({
        employee_id: emp.id,
        stage: String(stage),
        risk_level: finalRisk,
        final_score: scores.final_score,
        gaming_flag: Math.random() < 0.04,
        critical_flags: flags,
        completion_time_seconds: rand(60, 240),
        submitted_at: subDate.toISOString(),
        responses: { demo: true, stage },
        scores: { ...scores, risk_level: finalRisk },
        free_text_response:
          empBias === "HIGH" && Math.random() < 0.5
            ? "The pressure is getting to me. Some days I wonder if this role is right for me."
            : empBias === "MEDIUM" && Math.random() < 0.3
              ? "Adjusting slowly — the field hours are tough but I'm learning."
              : null,
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
