import { supabase } from "@/integrations/supabase/client";
import { SURVEYS, type SurveyConfig, type SurveyStage } from "@/survey/survey-config";
import { scoreSurvey, type RawAnswer } from "@/survey/scoring";

// =============================================================
// EXACT-SPEC SEED — 45 trainees across 5 branches, ~100 responses
// Generates full per-question responses JSONB using survey-config
// =============================================================

type EmployeeSpec = {
  name: string;
  employee_code: string;
  area_manager: string;
  doj: string; // YYYY-MM-DD as provided in PRD
  age: number;
  college: string;
  branch: string;
};

const ROSTER: EmployeeSpec[] = [
  // Mumbai (12)
  { name: "Arjun Nair", employee_code: "STR-2026-001", area_manager: "Anil Kapoor", doj: "2026-01-05", age: 23, college: "SIMSREE Mumbai", branch: "Mumbai" },
  { name: "Meera Iyer", employee_code: "STR-2026-002", area_manager: "Anil Kapoor", doj: "2026-01-12", age: 22, college: "Welingkar Mumbai", branch: "Mumbai" },
  { name: "Rohan Joshi", employee_code: "STR-2026-003", area_manager: "Anil Kapoor", doj: "2026-02-03", age: 24, college: "SCMHRD Pune", branch: "Mumbai" },
  { name: "Kavita Reddy", employee_code: "STR-2026-004", area_manager: "Suresh Menon", doj: "2026-02-10", age: 23, college: "NIBM Pune", branch: "Mumbai" },
  { name: "Vikram Singh", employee_code: "STR-2026-005", area_manager: "Suresh Menon", doj: "2026-02-17", age: 24, college: "IBS Hyderabad", branch: "Mumbai" },
  { name: "Sneha Kulkarni", employee_code: "STR-2026-006", area_manager: "Suresh Menon", doj: "2026-03-03", age: 22, college: "SIMSREE Mumbai", branch: "Mumbai" },
  { name: "Rahul Sharma", employee_code: "STR-2026-007", area_manager: "Deepak Jain", doj: "2026-03-10", age: 23, college: "GIM Goa", branch: "Mumbai" },
  { name: "Ananya Gupta", employee_code: "STR-2026-008", area_manager: "Deepak Jain", doj: "2026-03-17", age: 22, college: "TAPMI Manipal", branch: "Mumbai" },
  { name: "Karan Malhotra", employee_code: "STR-2026-009", area_manager: "Deepak Jain", doj: "2026-03-24", age: 25, college: "BIMTECH Noida", branch: "Mumbai" },
  { name: "Pooja Desai", employee_code: "STR-2026-010", area_manager: "Anil Kapoor", doj: "2026-04-07", age: 23, college: "Welingkar Mumbai", branch: "Mumbai" },
  { name: "Nikhil Patil", employee_code: "STR-2026-011", area_manager: "Suresh Menon", doj: "2026-04-14", age: 24, college: "SCMHRD Pune", branch: "Mumbai" },
  { name: "Ishita Verma", employee_code: "STR-2026-012", area_manager: "Deepak Jain", doj: "2026-04-21", age: 22, college: "XIME Bangalore", branch: "Mumbai" },

  // Ahmedabad (8)
  { name: "Riya Saxena", employee_code: "STR-2026-013", area_manager: "Harshad Patel", doj: "2026-01-08", age: 23, college: "GIM Goa", branch: "Ahmedabad" },
  { name: "Dhruv Shah", employee_code: "STR-2026-014", area_manager: "Harshad Patel", doj: "2026-01-20", age: 24, college: "TAPMI Manipal", branch: "Ahmedabad" },
  { name: "Nisha Trivedi", employee_code: "STR-2026-015", area_manager: "Harshad Patel", doj: "2026-02-05", age: 22, college: "IMT Nagpur", branch: "Ahmedabad" },
  { name: "Aakash Modi", employee_code: "STR-2026-016", area_manager: "Priya Mehta", doj: "2026-02-18", age: 23, college: "BIMTECH Noida", branch: "Ahmedabad" },
  { name: "Jhanvi Rao", employee_code: "STR-2026-017", area_manager: "Priya Mehta", doj: "2026-03-05", age: 22, college: "NIBM Pune", branch: "Ahmedabad" },
  { name: "Kunal Desai", employee_code: "STR-2026-018", area_manager: "Priya Mehta", doj: "2026-03-20", age: 24, college: "IBS Hyderabad", branch: "Ahmedabad" },
  { name: "Tanvi Bhatt", employee_code: "STR-2026-019", area_manager: "Harshad Patel", doj: "2026-04-10", age: 23, college: "XIME Bangalore", branch: "Ahmedabad" },
  { name: "Siddharth Joshi", employee_code: "STR-2026-020", area_manager: "Priya Mehta", doj: "2026-04-22", age: 22, college: "GIM Goa", branch: "Ahmedabad" },

  // Pune (9)
  { name: "Isha Bhandari", employee_code: "STR-2026-021", area_manager: "Manoj Kulkarni", doj: "2026-01-10", age: 23, college: "SCMHRD Pune", branch: "Pune" },
  { name: "Pallavi Rana", employee_code: "STR-2026-022", area_manager: "Manoj Kulkarni", doj: "2026-01-22", age: 22, college: "Welingkar Mumbai", branch: "Pune" },
  { name: "Sahil Deshpande", employee_code: "STR-2026-023", area_manager: "Manoj Kulkarni", doj: "2026-02-08", age: 24, college: "SIMSREE Mumbai", branch: "Pune" },
  { name: "Neha Pawar", employee_code: "STR-2026-024", area_manager: "Varun Shetty", doj: "2026-02-20", age: 23, college: "TAPMI Manipal", branch: "Pune" },
  { name: "Omkar Jadhav", employee_code: "STR-2026-025", area_manager: "Varun Shetty", doj: "2026-03-08", age: 22, college: "NIBM Pune", branch: "Pune" },
  { name: "Shruti More", employee_code: "STR-2026-026", area_manager: "Varun Shetty", doj: "2026-03-22", age: 24, college: "GIM Goa", branch: "Pune" },
  { name: "Aditya Phadke", employee_code: "STR-2026-027", area_manager: "Manoj Kulkarni", doj: "2026-04-05", age: 23, college: "IMT Nagpur", branch: "Pune" },
  { name: "Ritika Chavan", employee_code: "STR-2026-028", area_manager: "Varun Shetty", doj: "2026-04-15", age: 22, college: "BIMTECH Noida", branch: "Pune" },
  { name: "Yash Gokhale", employee_code: "STR-2026-029", area_manager: "Manoj Kulkarni", doj: "2026-04-25", age: 23, college: "IBS Hyderabad", branch: "Pune" },

  // Nagpur (10)
  { name: "Komal Yadav", employee_code: "STR-2026-030", area_manager: "Rajesh Tiwari", doj: "2026-01-06", age: 23, college: "IMT Nagpur", branch: "Nagpur" },
  { name: "Anjali Deshmukh", employee_code: "STR-2026-031", area_manager: "Rajesh Tiwari", doj: "2026-01-15", age: 22, college: "XIME Bangalore", branch: "Nagpur" },
  { name: "Lavanya Krishnan", employee_code: "STR-2026-032", area_manager: "Rajesh Tiwari", doj: "2026-02-01", age: 24, college: "TAPMI Manipal", branch: "Nagpur" },
  { name: "Amit Verma", employee_code: "STR-2026-033", area_manager: "Sanjay Bhosle", doj: "2026-02-12", age: 23, college: "SIMSREE Mumbai", branch: "Nagpur" },
  { name: "Diya Kapoor", employee_code: "STR-2026-034", area_manager: "Sanjay Bhosle", doj: "2026-02-25", age: 22, college: "GIM Goa", branch: "Nagpur" },
  { name: "Prateek Nagare", employee_code: "STR-2026-035", area_manager: "Rajesh Tiwari", doj: "2026-03-10", age: 24, college: "SCMHRD Pune", branch: "Nagpur" },
  { name: "Swati Ingale", employee_code: "STR-2026-036", area_manager: "Sanjay Bhosle", doj: "2026-03-25", age: 23, college: "Welingkar Mumbai", branch: "Nagpur" },
  { name: "Manish Raut", employee_code: "STR-2026-037", area_manager: "Rajesh Tiwari", doj: "2026-04-08", age: 22, college: "NIBM Pune", branch: "Nagpur" },
  { name: "Deepika Wagh", employee_code: "STR-2026-038", area_manager: "Sanjay Bhosle", doj: "2026-04-18", age: 23, college: "BIMTECH Noida", branch: "Nagpur" },
  { name: "Vaibhav Shinde", employee_code: "STR-2026-039", area_manager: "Rajesh Tiwari", doj: "2026-04-28", age: 24, college: "IBS Hyderabad", branch: "Nagpur" },

  // Bhopal (6)
  { name: "Saurabh Dubey", employee_code: "STR-2026-040", area_manager: "Ramesh Mishra", doj: "2026-01-12", age: 23, college: "IMT Nagpur", branch: "Bhopal" },
  { name: "Ankita Sharma", employee_code: "STR-2026-041", area_manager: "Ramesh Mishra", doj: "2026-02-06", age: 22, college: "XIME Bangalore", branch: "Bhopal" },
  { name: "Vivek Pandey", employee_code: "STR-2026-042", area_manager: "Ramesh Mishra", doj: "2026-03-01", age: 24, college: "TAPMI Manipal", branch: "Bhopal" },
  { name: "Megha Tiwari", employee_code: "STR-2026-043", area_manager: "Ramesh Mishra", doj: "2026-03-18", age: 23, college: "GIM Goa", branch: "Bhopal" },
  { name: "Harsh Agarwal", employee_code: "STR-2026-044", area_manager: "Ramesh Mishra", doj: "2026-04-12", age: 22, college: "SIMSREE Mumbai", branch: "Bhopal" },
  { name: "Nandini Singh", employee_code: "STR-2026-045", area_manager: "Ramesh Mishra", doj: "2026-04-26", age: 23, college: "IBS Hyderabad", branch: "Bhopal" },
];

const STAGES: SurveyStage[] = [15, 30, 45, 60, 90, 180];

const FREE_TEXTS = {
  C: [
    "The training dossier exists but no one follows it. I'm just following salesmen around with no clear learning objective.",
    "My area is very rural. I spend 3 hours just commuting to the beat. By the time I get there, I'm already exhausted.",
    "I was told this would be a managerial role. Didn't expect to be walking in the sun all day selling cigarettes.",
    "Nobody cares if I'm learning or not. I could disappear for a week and no one would notice.",
  ],
  E: [
    "Seriously considering going back. Got a call from another company offering a better package.",
    "The culture here is unnecessarily harsh. People shout at each other and it's considered normal.",
    "I was told this would be a managerial role. Didn't expect to be walking in the sun all day selling cigarettes.",
  ],
  A_POSITIVE: "The team here is great. My AE takes time to explain everything. Feeling good about this.",
};

type Profile = "A" | "B" | "C" | "D" | "E";

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

function daysBetween(from: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 86_400_000));
}
function eligibleStages(days: number): SurveyStage[] {
  return STAGES.filter((s) => days >= s);
}
function urlSafeToken(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}
function randomPhone(): string {
  const lead = pick([9, 8, 7]);
  let rest = "";
  for (let i = 0; i < 9; i++) rest += String(rand(0, 9));
  return `${lead}${rest}`;
}
function emailFor(name: string): string {
  const [first, last] = name.toLowerCase().split(/\s+/);
  return `${first}.${last}@company.in`;
}

/**
 * For a given survey config + profile, choose option indices per question.
 * - Profile A: idx 0-1 most questions; never trigger followups beyond 1.
 * - Profile B: idx 1-2 most; 1-2 followups w/ 1-2 multi-select.
 * - Profile C: idx 2-3 several questions; most followups; 2-3 multi-select.
 * - Profile D: ALL static idx 0; no followups.
 * - Profile E: idx 3-4 (max) most; all followups; most multi-select.
 */
function buildAnswers(survey: SurveyConfig, profile: Profile): RawAnswer[] {
  const answers: RawAnswer[] = [];
  const triggered = new Set<string>();

  for (const q of survey.questions) {
    if (q.kind === "dynamic" && !triggered.has(q.id)) continue;

    const optCount = q.options.length;
    let idx: number;
    let multiSelections: number[] = [];

    if (profile === "D") {
      idx = 0;
    } else if (profile === "A") {
      idx = Math.min(optCount - 1, rand(0, 1));
    } else if (profile === "B") {
      idx = Math.min(optCount - 1, rand(1, 2));
    } else if (profile === "C") {
      idx = Math.min(optCount - 1, rand(2, Math.min(3, optCount - 1)));
    } else {
      // E
      idx = Math.min(optCount - 1, rand(Math.max(0, optCount - 2), optCount - 1));
    }

    if (q.type === "multi") {
      // For multi questions, pick a set of indices instead.
      let count: number;
      if (profile === "A") count = 0;
      else if (profile === "B") count = rand(1, 2);
      else if (profile === "C") count = rand(2, 3);
      else if (profile === "D") count = 0;
      else count = Math.max(2, optCount - 1);
      count = Math.min(count, optCount);

      // Bias toward higher-impact options for C/E
      const indices = Array.from({ length: optCount }, (_, i) => i);
      if (profile === "C" || profile === "E") {
        indices.reverse();
      } else {
        indices.sort(() => Math.random() - 0.5);
      }
      multiSelections = indices.slice(0, count).sort((a, b) => a - b);

      if (multiSelections.length === 0) {
        // Multi-select with zero selections — skip recording entirely
        continue;
      }
      answers.push({ question_id: q.id, selected: multiSelections });
    } else {
      answers.push({ question_id: q.id, selected: [idx] });
    }

    // Branching: trigger follow-up if static + branch + idx satisfies minIndex
    if (q.kind === "static" && q.branch) {
      const minIdx = q.branch.minIndex ?? 1;
      if (idx >= minIdx) {
        // Profile A almost never triggers; B sometimes; C/E always; D never
        const triggerProb =
          profile === "A" ? 0.2 :
          profile === "B" ? 0.6 :
          profile === "C" ? 1.0 :
          profile === "D" ? 0 :
          1.0;
        if (Math.random() < triggerProb) triggered.add(q.branch.showQuestionId);
      }
    }
  }
  return answers;
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

/** Returns the profile distribution per branch per spec story. */
function rollProfile(branch: string, manager: string, forced?: Profile): Profile {
  if (forced) return forced;
  const r = Math.random();
  if (manager === "Rajesh Tiwari") {
    // Rajesh's trainees: predominantly C / E
    if (r < 0.15) return "B";
    if (r < 0.65) return "C";
    return "E";
  }
  if (manager === "Sanjay Bhosle") {
    if (r < 0.45) return "B";
    if (r < 0.85) return "C";
    return "A";
  }
  if (branch === "Mumbai" && manager === "Deepak Jain") {
    // Healthiest
    if (r < 0.85) return "A";
    if (r < 0.95) return "B";
    return "D";
  }
  if (branch === "Mumbai") {
    if (r < 0.65) return "A";
    if (r < 0.90) return "B";
    if (r < 0.97) return "C";
    return "D";
  }
  // PRD baseline: A 40 / B 30 / C 20 / D 5 / E 5
  if (r < 0.40) return "A";
  if (r < 0.70) return "B";
  if (r < 0.90) return "C";
  if (r < 0.95) return "D";
  return "E";
}

const TRAJECTORIES: Record<string, Profile[]> = {
  // Worsening
  "STR-2026-030": ["A", "B", "E"], // Komal Yadav: D15 LOW → D30 MED → D45 HIGH
  "STR-2026-034": ["B", "E"],      // Diya Kapoor: D15 MED → D30 HIGH
  // Improving
  "STR-2026-001": ["B", "A"],      // Arjun Nair: D15 MED → D30 LOW
};

const FREE_TEXT_ASSIGNMENTS: Record<string, string> = {
  // Spread across Profile C/E trainees (Nagpur etc.)
  "STR-2026-030": FREE_TEXTS.C[0],
  "STR-2026-031": FREE_TEXTS.C[1],
  "STR-2026-035": FREE_TEXTS.E[0],
  "STR-2026-037": FREE_TEXTS.C[2],
  "STR-2026-039": FREE_TEXTS.E[1],
  "STR-2026-034": FREE_TEXTS.C[3],
  "STR-2026-007": FREE_TEXTS.A_POSITIVE, // Mumbai healthy trainee
};

function completionProbability(branch: string): number {
  if (branch === "Mumbai") return 0.95;
  if (branch === "Nagpur") return 0.65;
  return 0.85;
}

export async function clearAllData(): Promise<{ error?: string }> {
  // Order: survey_responses → hr_actions → employees
  const { error: e1 } = await supabase.from("survey_responses").delete().not("id", "is", null);
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase.from("hr_actions").delete().not("id", "is", null);
  if (e2) return { error: e2.message };
  const { error: e3 } = await supabase.from("employees").delete().not("id", "is", null);
  if (e3) return { error: e3.message };
  return {};
}

export async function seedDemoTrainees(_count = 45): Promise<{
  insertedEmployees: number;
  insertedResponses: number;
  error?: string;
}> {
  // Always wipe first per spec ("Any existing data will be replaced")
  const wipe = await clearAllData();
  if (wipe.error) {
    return { insertedEmployees: 0, insertedResponses: 0, error: wipe.error };
  }

  const employeeRows = ROSTER.map((spec) => ({
    employee_code: spec.employee_code,
    name: spec.name,
    phone: randomPhone(),
    email: emailFor(spec.name),
    age: spec.age,
    college: spec.college,
    branch: spec.branch,
    area_manager: spec.area_manager,
    doj: spec.doj,
    token: urlSafeToken(),
    status: "training" as const,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("employees")
    .insert(employeeRows)
    .select("id, employee_code");

  if (insErr || !inserted) {
    return { insertedEmployees: 0, insertedResponses: 0, error: insErr?.message };
  }

  const codeToId = new Map(inserted.map((r) => [r.employee_code, r.id]));
  const responses: any[] = [];

  for (const spec of ROSTER) {
    const empId = codeToId.get(spec.employee_code);
    if (!empId) continue;
    const days = daysBetween(spec.doj);
    const stages = eligibleStages(days);
    if (stages.length === 0) continue;

    const trajectory = TRAJECTORIES[spec.employee_code];
    const assignedFreeText = FREE_TEXT_ASSIGNMENTS[spec.employee_code];
    const completion = completionProbability(spec.branch);

    let lastFreeTextStage: SurveyStage | null = null;

    for (let si = 0; si < stages.length; si++) {
      const stage = stages[si];
      // Skip some by completion probability, but never if there's a forced trajectory
      if (!trajectory && Math.random() > completion) continue;

      let profile: Profile;
      if (trajectory) {
        profile = trajectory[Math.min(si, trajectory.length - 1)];
      } else {
        profile = rollProfile(spec.branch, spec.area_manager);
      }

      const survey = SURVEYS[stage];
      const rawAnswers = buildAnswers(survey, profile);
      const completionTime = completionTimeForProfile(profile);

      let scored = scoreSurvey(survey, rawAnswers, completionTime);

      // Optional: enforce profile-band on final_score for Profile A guardrail
      if (profile === "A" && scored.scores.final_score >= 11) {
        // Re-roll with safer answers (all idx 0)
        const safe = survey.questions
          .filter((q) => q.kind === "static")
          .map((q) => ({ question_id: q.id, selected: [0] }));
        scored = scoreSurvey(survey, safe, completionTime);
      }

      // Ensure Profile D scoring lines up (already idx 0 for static, no follow-ups)
      // — scoreSurvey already detects gaming flag when ALL static idx==0 AND time<45s.

      // Compute submitted_at: a few days after the milestone
      const milestoneDate = new Date(spec.doj);
      milestoneDate.setDate(milestoneDate.getDate() + stage + rand(0, 4));
      // Don't allow submitted_at in the future
      const subTs = Math.min(Date.now() - rand(0, 3) * 86_400_000, milestoneDate.getTime());

      // Free-text: assign user's mandated text on the latest stage; otherwise per profile
      let freeText: string | null = null;
      const isLast = si === stages.length - 1;
      if (assignedFreeText && isLast) {
        freeText = assignedFreeText;
        lastFreeTextStage = stage;
      } else if (profile === "C" && Math.random() < 0.4) {
        freeText = pick(FREE_TEXTS.C);
      } else if (profile === "E" && Math.random() < 0.7) {
        freeText = pick(FREE_TEXTS.E);
      } else if (profile === "A" && Math.random() < 0.05) {
        freeText = FREE_TEXTS.A_POSITIVE;
      }

      // Convert per-dimension nulls → keep as is for transition_readiness when stage<60
      const scoresOut: Record<string, number | null> = {
        training_effectiveness: scored.scores.training_effectiveness,
        attrition_risk: scored.scores.attrition_risk,
        support_guidance: scored.scores.support_guidance,
        adjustment_wellbeing: scored.scores.adjustment_wellbeing,
        transition_readiness: scored.scores.transition_readiness,
        composite: scored.scores.composite,
        stage_multiplier: scored.scores.stage_multiplier,
        final_score: scored.scores.final_score,
      };

      responses.push({
        employee_id: empId,
        stage: String(stage),
        risk_level: scored.scores.risk_level,
        final_score: scored.scores.final_score,
        gaming_flag: scored.gaming_flag,
        critical_flags: scored.critical_flags,
        completion_time_seconds: completionTime,
        submitted_at: new Date(subTs).toISOString(),
        responses: scored.responses,
        scores: scoresOut,
        free_text_response: freeText,
      });
    }

    // Suppress unused-var warning for lastFreeTextStage (kept for future debugging)
    void lastFreeTextStage;
  }

  // Insert in chunks to stay under payload limits
  const CHUNK = 200;
  let total = 0;
  for (let i = 0; i < responses.length; i += CHUNK) {
    const slice = responses.slice(i, i + CHUNK);
    const { error: rErr, count } = await supabase
      .from("survey_responses")
      .insert(slice, { count: "exact" });
    if (rErr) {
      return { insertedEmployees: inserted.length, insertedResponses: total, error: rErr.message };
    }
    total += count ?? slice.length;
  }

  return {
    insertedEmployees: inserted.length,
    insertedResponses: total,
  };
}
