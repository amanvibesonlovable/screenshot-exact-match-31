import { supabase } from "@/integrations/supabase/client";

const FIRSTS = [
  "Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Anaya", "Karan", "Meera",
  "Arjun", "Diya", "Ishaan", "Riya", "Aditya", "Neha", "Yash", "Pooja",
];
const LASTS = [
  "Sharma", "Iyer", "Mehta", "Rao", "Singh", "Kapoor", "Patel", "Reddy",
  "Khan", "Joshi", "Bose", "Nair", "Pillai", "Verma",
];
const BRANCHES = [
  "Mumbai - Andheri",
  "Mumbai - Bandra",
  "Bengaluru - Koramangala",
  "Bengaluru - Whitefield",
  "Delhi - Saket",
  "Pune - Hinjewadi",
];
const MANAGERS = ["Rohan Mehta", "Sneha Rao", "Karan Kapoor", "Anaya Singh"];
const COLLEGES = ["IIT Bombay", "NIT Trichy", "BITS Pilani", "VIT Vellore", "DU"];

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

function dojForStage(stage: number): string {
  // Person joined `stage` days ago (give some jitter)
  return daysAgo(stage + rand(0, 3));
}

const STAGES = [15, 30, 45, 60, 90, 180] as const;

export async function seedDemoTrainees(count = 12): Promise<{
  insertedEmployees: number;
  insertedResponses: number;
  error?: string;
}> {
  const employeesPayload = Array.from({ length: count }).map((_, i) => {
    const stage = pick(STAGES as unknown as number[]);
    const name = `${pick(FIRSTS)} ${pick(LASTS)}`;
    const code = `D${Date.now().toString().slice(-6)}${i.toString().padStart(2, "0")}`;
    return {
      employee_code: code,
      name,
      phone: `9${rand(100000000, 999999999)}`,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}.${i}@demo.pulse.dev`,
      branch: pick(BRANCHES),
      area_manager: pick(MANAGERS),
      doj: dojForStage(stage),
      age: rand(21, 28),
      college: pick(COLLEGES),
      __stage: stage, // local only, stripped before insert
    };
  });

  const toInsert = employeesPayload.map(({ __stage, ...rest }) => rest);
  const { data: inserted, error } = await supabase
    .from("employees")
    .insert(toInsert)
    .select("id, employee_code");

  if (error || !inserted) {
    return { insertedEmployees: 0, insertedResponses: 0, error: error?.message };
  }

  // Build a survey response per employee at their stage
  const codeToStage = new Map(employeesPayload.map((e) => [e.employee_code, e.__stage]));
  const responses = inserted.map((emp) => {
    const stage = codeToStage.get(emp.employee_code) ?? 15;
    // Distribute risk roughly: 50% LOW, 30% MEDIUM, 20% HIGH
    const roll = Math.random();
    const risk = roll < 0.5 ? "LOW" : roll < 0.8 ? "MEDIUM" : "HIGH";
    const baseScore = risk === "HIGH" ? rand(40, 70) : risk === "MEDIUM" ? rand(20, 39) : rand(0, 19);
    const flags: string[] = [];
    if (risk === "HIGH" && Math.random() < 0.5) flags.push("intent_to_leave");
    if (risk === "HIGH" && Math.random() < 0.3) flags.push("manager_unsupportive");
    if (risk === "MEDIUM" && Math.random() < 0.2) flags.push("training_gap");
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - rand(0, 25));
    return {
      employee_id: emp.id,
      stage: String(stage),
      risk_level: risk,
      final_score: Number(baseScore.toFixed(1)),
      gaming_flag: Math.random() < 0.05,
      critical_flags: flags,
      completion_time_seconds: rand(60, 240),
      submitted_at: submittedAt.toISOString(),
      responses: { demo: true },
      scores: {
        training_effectiveness: rand(0, 10),
        attrition_risk: rand(0, 15),
        support_guidance: rand(0, 10),
        adjustment_wellbeing: rand(0, 10),
        transition_readiness: rand(0, 10),
        composite: baseScore,
        stage_multiplier: 1,
        final_score: baseScore,
        risk_level: risk,
      },
      free_text_response:
        risk === "HIGH"
          ? "Honestly, the targets feel impossible some days."
          : risk === "MEDIUM"
          ? "Adjusting, but the commute is rough."
          : null,
    };
  });

  const { error: respErr, count: respCount } = await supabase
    .from("survey_responses")
    .insert(responses as any, { count: "exact" });

  return {
    insertedEmployees: inserted.length,
    insertedResponses: respErr ? 0 : respCount ?? responses.length,
    error: respErr?.message,
  };
}
