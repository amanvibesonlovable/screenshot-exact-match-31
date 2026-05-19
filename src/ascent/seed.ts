// Ascent 2026 seed — 50 interns, ~150 responses across 5 branches
import { supabase } from "@/integrations/supabase/client";
import {
  INTERN_SURVEYS,
  type InternSurveyConfig,
  type InternQuestion,
  type InternWeek,
} from "@/survey/intern-survey-config";

type Spec = {
  name: string;
  employee_code: string;
  branch: "Mumbai" | "Ahmedabad" | "Pune" | "Nagpur" | "Bhopal";
  area_manager: string;
  doj: string;
  project: string;
  batch: string;
};

const ROSTER: Spec[] = [
  // Mumbai (15)
  { name: "Aarav Mehta", employee_code: "INT-2026-001", branch: "Mumbai", area_manager: "Anil Kapoor", doj: "2026-03-10", project: "Promoter", batch: "May 2026" },
  { name: "Diya Nair", employee_code: "INT-2026-002", branch: "Mumbai", area_manager: "Anil Kapoor", doj: "2026-03-10", project: "Outlet Addition", batch: "May 2026" },
  { name: "Ishaan Bose", employee_code: "INT-2026-003", branch: "Mumbai", area_manager: "Suresh Menon", doj: "2026-03-10", project: "Form Filling", batch: "May 2026" },
  { name: "Kavya Sharma", employee_code: "INT-2026-004", branch: "Mumbai", area_manager: "Suresh Menon", doj: "2026-03-17", project: "Data Collection", batch: "May 2026" },
  { name: "Aryan Deshmukh", employee_code: "INT-2026-005", branch: "Mumbai", area_manager: "Deepak Jain", doj: "2026-03-17", project: "Promoter", batch: "May 2026" },
  { name: "Myra Iyer", employee_code: "INT-2026-006", branch: "Mumbai", area_manager: "Deepak Jain", doj: "2026-03-17", project: "Market Survey", batch: "May 2026" },
  { name: "Reyansh Patil", employee_code: "INT-2026-007", branch: "Mumbai", area_manager: "Anil Kapoor", doj: "2026-03-24", project: "Outlet Addition", batch: "May 2026" },
  { name: "Ananya Joshi", employee_code: "INT-2026-008", branch: "Mumbai", area_manager: "Suresh Menon", doj: "2026-03-24", project: "Promoter", batch: "May 2026" },
  { name: "Vihaan Kulkarni", employee_code: "INT-2026-009", branch: "Mumbai", area_manager: "Deepak Jain", doj: "2026-04-01", project: "Form Filling", batch: "June 2026" },
  { name: "Saanvi Reddy", employee_code: "INT-2026-010", branch: "Mumbai", area_manager: "Anil Kapoor", doj: "2026-04-01", project: "Data Collection", batch: "June 2026" },
  { name: "Aditya Thakur", employee_code: "INT-2026-011", branch: "Mumbai", area_manager: "Suresh Menon", doj: "2026-04-07", project: "Promoter", batch: "June 2026" },
  { name: "Pari Verma", employee_code: "INT-2026-012", branch: "Mumbai", area_manager: "Deepak Jain", doj: "2026-04-07", project: "Outlet Addition", batch: "June 2026" },
  { name: "Rudra Sawant", employee_code: "INT-2026-013", branch: "Mumbai", area_manager: "Anil Kapoor", doj: "2026-04-14", project: "Market Survey", batch: "June 2026" },
  { name: "Kiara Bhatt", employee_code: "INT-2026-014", branch: "Mumbai", area_manager: "Suresh Menon", doj: "2026-04-21", project: "Form Filling", batch: "June 2026" },
  { name: "Ayaan Singh", employee_code: "INT-2026-015", branch: "Mumbai", area_manager: "Deepak Jain", doj: "2026-04-28", project: "Promoter", batch: "June 2026" },

  // Ahmedabad (8)
  { name: "Pooja Khan", employee_code: "INT-2026-016", branch: "Ahmedabad", area_manager: "Harshad Patel", doj: "2026-03-10", project: "Form Filling", batch: "May 2026" },
  { name: "Rohan Trivedi", employee_code: "INT-2026-017", branch: "Ahmedabad", area_manager: "Harshad Patel", doj: "2026-03-17", project: "Promoter", batch: "May 2026" },
  { name: "Jhanvi Rao", employee_code: "INT-2026-018", branch: "Ahmedabad", area_manager: "Priya Mehta", doj: "2026-03-24", project: "Outlet Addition", batch: "May 2026" },
  { name: "Dev Patel", employee_code: "INT-2026-019", branch: "Ahmedabad", area_manager: "Priya Mehta", doj: "2026-04-01", project: "Data Collection", batch: "June 2026" },
  { name: "Sanya Desai", employee_code: "INT-2026-020", branch: "Ahmedabad", area_manager: "Harshad Patel", doj: "2026-04-07", project: "Promoter", batch: "June 2026" },
  { name: "Krish Modi", employee_code: "INT-2026-021", branch: "Ahmedabad", area_manager: "Priya Mehta", doj: "2026-04-14", project: "Form Filling", batch: "June 2026" },
  { name: "Aanya Shah", employee_code: "INT-2026-022", branch: "Ahmedabad", area_manager: "Harshad Patel", doj: "2026-04-21", project: "Market Survey", batch: "June 2026" },
  { name: "Vivaan Joshi", employee_code: "INT-2026-023", branch: "Ahmedabad", area_manager: "Priya Mehta", doj: "2026-04-28", project: "Outlet Addition", batch: "June 2026" },

  // Pune (10)
  { name: "Sahil Deshpande", employee_code: "INT-2026-024", branch: "Pune", area_manager: "Manoj Kulkarni", doj: "2026-03-10", project: "Promoter", batch: "May 2026" },
  { name: "Naina Pawar", employee_code: "INT-2026-025", branch: "Pune", area_manager: "Manoj Kulkarni", doj: "2026-03-10", project: "Outlet Addition", batch: "May 2026" },
  { name: "Ritvik Jadhav", employee_code: "INT-2026-026", branch: "Pune", area_manager: "Varun Shetty", doj: "2026-03-17", project: "Form Filling", batch: "May 2026" },
  { name: "Anvi Chavan", employee_code: "INT-2026-027", branch: "Pune", area_manager: "Varun Shetty", doj: "2026-03-24", project: "Data Collection", batch: "May 2026" },
  { name: "Kabir More", employee_code: "INT-2026-028", branch: "Pune", area_manager: "Manoj Kulkarni", doj: "2026-04-01", project: "Promoter", batch: "June 2026" },
  { name: "Tara Gokhale", employee_code: "INT-2026-029", branch: "Pune", area_manager: "Varun Shetty", doj: "2026-04-07", project: "Market Survey", batch: "June 2026" },
  { name: "Dhruv Phadke", employee_code: "INT-2026-030", branch: "Pune", area_manager: "Manoj Kulkarni", doj: "2026-04-14", project: "Outlet Addition", batch: "June 2026" },
  { name: "Mira Kale", employee_code: "INT-2026-031", branch: "Pune", area_manager: "Varun Shetty", doj: "2026-04-21", project: "Form Filling", batch: "June 2026" },
  { name: "Arjun Wagh", employee_code: "INT-2026-032", branch: "Pune", area_manager: "Manoj Kulkarni", doj: "2026-04-28", project: "Promoter", batch: "June 2026" },
  { name: "Sia Bhosle", employee_code: "INT-2026-033", branch: "Pune", area_manager: "Varun Shetty", doj: "2026-05-05", project: "Data Collection", batch: "June 2026" },

  // Nagpur (12) — worst branch
  { name: "Amit Verma", employee_code: "INT-2026-034", branch: "Nagpur", area_manager: "Rajesh Tiwari", doj: "2026-03-10", project: "Form Filling", batch: "May 2026" },
  { name: "Sneha Nagare", employee_code: "INT-2026-035", branch: "Nagpur", area_manager: "Rajesh Tiwari", doj: "2026-03-10", project: "Promoter", batch: "May 2026" },
  { name: "Rahul Ingale", employee_code: "INT-2026-036", branch: "Nagpur", area_manager: "Sanjay Bhosle", doj: "2026-03-17", project: "Outlet Addition", batch: "May 2026" },
  { name: "Komal Raut", employee_code: "INT-2026-037", branch: "Nagpur", area_manager: "Rajesh Tiwari", doj: "2026-03-17", project: "Form Filling", batch: "May 2026" },
  { name: "Vaibhav Wagh", employee_code: "INT-2026-038", branch: "Nagpur", area_manager: "Sanjay Bhosle", doj: "2026-03-24", project: "Data Collection", batch: "May 2026" },
  { name: "Deepika Shinde", employee_code: "INT-2026-039", branch: "Nagpur", area_manager: "Rajesh Tiwari", doj: "2026-04-01", project: "Promoter", batch: "June 2026" },
  { name: "Manish Deshmukh", employee_code: "INT-2026-040", branch: "Nagpur", area_manager: "Sanjay Bhosle", doj: "2026-04-07", project: "Outlet Addition", batch: "June 2026" },
  { name: "Priya Yadav", employee_code: "INT-2026-041", branch: "Nagpur", area_manager: "Rajesh Tiwari", doj: "2026-04-14", project: "Form Filling", batch: "June 2026" },
  { name: "Nikhil Wankhede", employee_code: "INT-2026-042", branch: "Nagpur", area_manager: "Sanjay Bhosle", doj: "2026-04-21", project: "Market Survey", batch: "June 2026" },
  { name: "Shreya Gawande", employee_code: "INT-2026-043", branch: "Nagpur", area_manager: "Rajesh Tiwari", doj: "2026-04-28", project: "Promoter", batch: "June 2026" },
  { name: "Rohan Thakre", employee_code: "INT-2026-044", branch: "Nagpur", area_manager: "Sanjay Bhosle", doj: "2026-05-05", project: "Form Filling", batch: "June 2026" },
  { name: "Tanvi Meshram", employee_code: "INT-2026-045", branch: "Nagpur", area_manager: "Rajesh Tiwari", doj: "2026-05-12", project: "Data Collection", batch: "June 2026" },

  // Bhopal (5)
  { name: "Harsh Dubey", employee_code: "INT-2026-046", branch: "Bhopal", area_manager: "Ramesh Mishra", doj: "2026-03-17", project: "Promoter", batch: "May 2026" },
  { name: "Nandini Pandey", employee_code: "INT-2026-047", branch: "Bhopal", area_manager: "Ramesh Mishra", doj: "2026-03-24", project: "Form Filling", batch: "May 2026" },
  { name: "Saurabh Tiwari", employee_code: "INT-2026-048", branch: "Bhopal", area_manager: "Ramesh Mishra", doj: "2026-04-07", project: "Outlet Addition", batch: "June 2026" },
  { name: "Megha Agarwal", employee_code: "INT-2026-049", branch: "Bhopal", area_manager: "Ramesh Mishra", doj: "2026-04-21", project: "Data Collection", batch: "June 2026" },
  { name: "Ankita Sharma", employee_code: "INT-2026-050", branch: "Bhopal", area_manager: "Ramesh Mishra", doj: "2026-05-05", project: "Market Survey", batch: "June 2026" },
];

// Special-case fates
const DROPOUT_CODES = new Set(["INT-2026-035", "INT-2026-020"]); // Nagpur + Ahmedabad
const NONRESPONSIVE_CODES = new Set(["INT-2026-027", "INT-2026-041"]); // Pune + Nagpur — stop after W2

const FREE_TEXTS = {
  badNagpur: [
    "I feel like free labor. The project has no real purpose — I'm just filling forms in the sun all day.",
    "The AM hasn't spoken to me in 2 weeks. I don't even know if they remember I exist.",
    "This is unpaid slavery, not an internship. I'm counting the days.",
  ],
  fence: [
    "Would love a PPO but the work is so draining. Not sure I want to do this full-time.",
    "The project is interesting but I need more guidance to do it properly.",
  ],
  goodMumbai: [
    "My AM is amazing. He explains everything and makes me feel like I'm actually contributing.",
    "Honestly, if they offered a PPO today I'd take it. The learning has been incredible.",
  ],
};

type Profile = "A" | "B" | "C" | "D" | "E";

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function urlSafeToken(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let t = "";
  for (let i = 0; i < 14; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}
function randomPhone(): string {
  const lead = pick([9, 8, 7]);
  let rest = "";
  for (let i = 0; i < 9; i++) rest += String(rand(0, 9));
  return `${lead}${rest}`;
}
function emailFor(name: string): string {
  const parts = name.toLowerCase().split(/\s+/);
  return `${parts[0]}.${parts[parts.length - 1]}@college.edu`;
}
function daysSince(doj: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(doj).getTime()) / 86_400_000));
}
function eligibleWeeks(doj: string): InternWeek[] {
  const d = daysSince(doj);
  const all: InternWeek[] = [1, 2, 3, 4, 5, 6, 7];
  const cap =
    d < 7 ? 0 : d < 14 ? 1 : d < 21 ? 2 : d < 28 ? 3 : d < 35 ? 4 : d < 42 ? 5 : d < 49 ? 6 : 7;
  return all.filter((w) => w <= cap);
}

function rollProfile(branch: string, am: string): Profile {
  const r = Math.random();
  if (am === "Rajesh Tiwari") {
    if (r < 0.10) return "B";
    if (r < 0.55) return "C";
    return "E";
  }
  if (am === "Sanjay Bhosle") {
    if (r < 0.10) return "A";
    if (r < 0.40) return "B";
    if (r < 0.85) return "C";
    return "E";
  }
  if (branch === "Mumbai" && am === "Deepak Jain") {
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
  // Baseline: A40 / B30 / C20 / D5 / E5
  if (r < 0.40) return "A";
  if (r < 0.70) return "B";
  if (r < 0.90) return "C";
  if (r < 0.95) return "D";
  return "E";
}

// Hardcoded pulse trajectories for storytelling
const PULSE_TRAJECTORIES: Record<string, number[]> = {
  // Amit Verma — declining
  "INT-2026-034": [4, 3, 3, 2, 2, 2, 2],
  // Komal Raut — steep decline (reaches 1 → critical flag)
  "INT-2026-037": [3, 2, 2, 1, 1, 1, 1],
  // Aarav Mehta — improving
  "INT-2026-001": [3, 3, 4, 4, 5, 5, 5],
};

// Forced PPO answers for W6/W7 storytelling (W6 = 4 options, W7 = 5 options)
// Index meaning (W6): 0 Accept immediately, 1 Seriously consider, 2 Probably decline, 3 Definitely decline
// Index meaning (W7): 0 Definitely accepting, 1 Leaning towards accepting, 2 On the fence, 3 Leaning towards declining, 4 Definitely declining
const PPO_INTENT: Record<string, { w6?: number; w7?: number }> = {
  "INT-2026-001": { w6: 0, w7: 0 }, // Aarav — accept
  "INT-2026-002": { w6: 1, w7: 1 }, // Diya — accept (leaning)
  "INT-2026-003": { w6: 0, w7: 0 }, // Ishaan
  "INT-2026-005": { w6: 0, w7: 1 },
  "INT-2026-006": { w6: 1, w7: 0 },
  "INT-2026-016": { w6: 1, w7: 2 }, // Pooja — fence
  "INT-2026-017": { w6: 1, w7: 2 }, // Rohan — fence
  "INT-2026-018": { w6: 1, w7: 2 }, // Jhanvi — fence
  "INT-2026-024": { w6: 1, w7: 1 }, // Sahil — accept
  "INT-2026-025": { w6: 1, w7: 2 }, // Naina — fence
  "INT-2026-026": { w6: 1, w7: 2 }, // Ritvik — fence
  "INT-2026-034": { w6: 2, w7: 3 }, // Amit — decline
  "INT-2026-036": { w6: 3, w7: 4 }, // Rahul — decline
  "INT-2026-037": { w6: 3, w7: 4 }, // Komal — decline
  "INT-2026-046": { w6: 0, w7: 0 },
  "INT-2026-047": { w6: 0, w7: 1 },
};

function buildAnswers(
  cfg: InternSurveyConfig,
  profile: Profile,
  forced: { pulseScore?: number; ppoIndex?: number },
): { question_id: string; selected: number[] }[] {
  const out: { question_id: string; selected: number[] }[] = [];
  const triggered = new Set<string>();
  const week = cfg.week;

  for (const q of cfg.questions) {
    if (q.kind === "dynamic" && !triggered.has(q.id)) continue;
    const optCount = q.options.length;
    let selected: number[] = [];

    // Pulse override (last single-select w/ /quick pulse/)
    const isPulse = /quick pulse/i.test(q.prompt);
    if (isPulse && forced.pulseScore != null) {
      // map score 1-5 → index. options: [5,4,3,2,1] so idx = 5 - score
      const idx = Math.max(0, Math.min(optCount - 1, 5 - forced.pulseScore));
      out.push({ question_id: q.id, selected: [idx] });
      continue;
    }

    // PPO Q3 override on W6/W7
    if ((week === 6 || week === 7) && /^w[67]_q3$/i.test(q.id) && forced.ppoIndex != null) {
      const idx = Math.max(0, Math.min(optCount - 1, forced.ppoIndex));
      out.push({ question_id: q.id, selected: [idx] });
      if (q.kind === "static" && q.branch && idx >= (q.branch.minIndex ?? 1)) {
        triggered.add(q.branch.showQuestionId);
      }
      continue;
    }

    let idx: number;
    if (profile === "D") idx = 0;
    else if (profile === "A") idx = Math.min(optCount - 1, rand(0, 1));
    else if (profile === "B") idx = Math.min(optCount - 1, rand(1, 2));
    else if (profile === "C") idx = Math.min(optCount - 1, rand(2, Math.min(3, optCount - 1)));
    else idx = Math.min(optCount - 1, rand(Math.max(0, optCount - 2), optCount - 1));

    if (q.type === "multi") {
      let count =
        profile === "A" ? 0
        : profile === "B" ? rand(1, 2)
        : profile === "C" ? rand(2, 3)
        : profile === "D" ? 0
        : Math.max(2, optCount - 1);
      count = Math.min(count, optCount);
      const indices = Array.from({ length: optCount }, (_, i) => i);
      if (profile === "C" || profile === "E") indices.reverse();
      else indices.sort(() => Math.random() - 0.5);
      selected = indices.slice(0, count).sort((a, b) => a - b);
      if (!selected.length) continue;
    } else {
      selected = [idx];
    }
    out.push({ question_id: q.id, selected });

    if (q.kind === "static" && q.branch && q.type === "single") {
      const minIdx = q.branch.minIndex ?? 1;
      if (idx >= minIdx) {
        const prob = profile === "A" ? 0.2 : profile === "B" ? 0.6 : profile === "D" ? 0 : 1.0;
        if (Math.random() < prob) triggered.add(q.branch.showQuestionId);
      }
    }
  }
  return out;
}

function scoreInternSurvey(
  cfg: InternSurveyConfig,
  answers: { question_id: string; selected: number[] }[],
  completionTime: number,
) {
  let dim_em = 0, dim_gs = 0, dim_pc = 0, dim_ew = 0;
  const flags: string[] = [];
  const records: any[] = [];
  let staticCount = 0, staticIdx0 = 0;

  for (const a of answers) {
    const q = cfg.questions.find((x) => x.id === a.question_id);
    if (!q) continue;
    let pts = 0;
    const labels: string[] = [];
    let firstDim: string | null = null;
    let sel = a.selected;
    if (q.type === "single" && sel.length > 1) sel = [sel[0]];
    for (const i of sel) {
      const o = q.options[i];
      if (!o) continue;
      pts += o.points;
      labels.push(o.label);
      if (!firstDim) firstDim = o.dimension;
      if (o.dimension === "engagement_motivation") dim_em += o.points;
      else if (o.dimension === "guidance_support") dim_gs += o.points;
      else if (o.dimension === "project_clarity") dim_pc += o.points;
      else if (o.dimension === "experience_wellbeing") dim_ew += o.points;
      if (o.criticalFlag) flags.push(o.criticalFlag);
    }
    if (!labels.length) continue;
    if (q.kind === "static" && q.type === "single") {
      staticCount++;
      if (sel[0] === 0) staticIdx0++;
    }
    records.push({
      question_id: q.id,
      question_text: q.prompt,
      answer_text: labels.join(" • "),
      points: pts,
      dimension: firstDim || "none",
    });
  }

  const composite = dim_em + dim_gs + dim_pc + dim_ew;
  const mult = cfg.weekMultiplier;
  const final = Math.round(composite * mult * 10) / 10;
  const risk: "HIGH" | "MEDIUM" | "LOW" =
    flags.length > 0 || final >= 19 ? "HIGH" : final >= 9 ? "MEDIUM" : "LOW";
  const gaming = staticCount > 0 && staticCount === staticIdx0 && completionTime < 30;

  return {
    responses: records,
    scores: {
      engagement_motivation: dim_em,
      guidance_support: dim_gs,
      project_clarity: dim_pc,
      experience_wellbeing: dim_ew,
      composite,
      week_multiplier: mult,
      final_score: final,
      risk_level: risk,
    },
    critical_flags: flags,
    gaming_flag: gaming,
    final_score: final,
    risk_level: risk,
  };
}

function completionTimeFor(profile: Profile): number {
  return profile === "A" ? rand(70, 130)
    : profile === "B" ? rand(90, 180)
    : profile === "C" ? rand(120, 240)
    : profile === "D" ? rand(15, 25)
    : rand(150, 300);
}

export async function clearAscentData(): Promise<{ error?: string }> {
  // 1) find ascent employee ids
  const { data: ascentEmps, error: e0 } = await supabase
    .from("employees")
    .select("id")
    .eq("program", "ascent");
  if (e0) return { error: e0.message };
  const ids = (ascentEmps ?? []).map((r) => r.id);
  if (!ids.length) return {};
  // 2) delete responses + actions for those ids
  const { error: e1 } = await supabase.from("survey_responses").delete().in("employee_id", ids);
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase.from("hr_actions").delete().in("employee_id", ids);
  if (e2) return { error: e2.message };
  // 3) delete employees
  const { error: e3 } = await supabase.from("employees").delete().eq("program", "ascent");
  if (e3) return { error: e3.message };
  return {};
}

export async function seedAscentData(): Promise<{
  insertedEmployees: number;
  insertedResponses: number;
  error?: string;
}> {
  const wipe = await clearAscentData();
  if (wipe.error) return { insertedEmployees: 0, insertedResponses: 0, error: wipe.error };

  const empRows = ROSTER.map((s) => ({
    employee_code: s.employee_code,
    name: s.name,
    phone: randomPhone(),
    email: emailFor(s.name),
    branch: s.branch,
    area_manager: s.area_manager,
    doj: s.doj,
    token: urlSafeToken(),
    status: DROPOUT_CODES.has(s.employee_code) ? ("dropped_out" as const) : ("training" as const),
    program: "ascent" as const,
    project_type: s.project,
    intern_batch: s.batch,
    notification_preference: "email" as const,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("employees")
    .insert(empRows)
    .select("id, employee_code");
  if (insErr || !inserted) {
    return { insertedEmployees: 0, insertedResponses: 0, error: insErr?.message };
  }
  const codeToId = new Map(inserted.map((r) => [r.employee_code, r.id]));

  const respRows: any[] = [];

  for (const spec of ROSTER) {
    const empId = codeToId.get(spec.employee_code);
    if (!empId) continue;

    const weeks = eligibleWeeks(spec.doj);
    if (!weeks.length) continue;

    let weeksToDo = weeks;

    // Non-responsive interns: only W1 and W2
    if (NONRESPONSIVE_CODES.has(spec.employee_code)) {
      weeksToDo = weeks.filter((w) => w <= 2);
    }
    // Dropouts: stop after W2 or W3
    if (DROPOUT_CODES.has(spec.employee_code)) {
      const cap = spec.employee_code === "INT-2026-035" ? 2 : 3;
      weeksToDo = weeks.filter((w) => w <= cap);
    }

    // Completion sampling: skip some surveys
    const completionProb =
      spec.branch === "Mumbai" ? 0.95
      : spec.branch === "Nagpur" ? 0.70
      : 0.85;

    const traj = PULSE_TRAJECTORIES[spec.employee_code];

    for (const w of weeksToDo) {
      if (!traj && !DROPOUT_CODES.has(spec.employee_code) && !NONRESPONSIVE_CODES.has(spec.employee_code)) {
        if (Math.random() > completionProb) continue;
      }

      const cfg = INTERN_SURVEYS[w];
      let profile: Profile;
      if (traj) {
        const p = traj[w - 1];
        profile = p >= 4 ? "A" : p === 3 ? "B" : p === 2 ? "C" : "E";
      } else {
        profile = rollProfile(spec.branch, spec.area_manager);
      }

      const forcedPulse = traj ? traj[w - 1] : undefined;
      const forcedPpo =
        (w === 6 || w === 7) ? PPO_INTENT[spec.employee_code]?.[w === 6 ? "w6" : "w7"] : undefined;

      const answers = buildAnswers(cfg, profile, { pulseScore: forcedPulse, ppoIndex: forcedPpo });
      const time = completionTimeFor(profile);
      const scored = scoreInternSurvey(cfg, answers, time);

      // submitted_at: doj + week*7 + random 0-3
      const submitDate = new Date(spec.doj);
      submitDate.setDate(submitDate.getDate() + w * 7 + rand(0, 3));
      const subTs = Math.min(Date.now() - rand(0, 2) * 86_400_000, submitDate.getTime());

      // Free text — assign to certain interns at later weeks
      let freeText: string | null = null;
      const isLast = w === weeksToDo[weeksToDo.length - 1];
      if (spec.branch === "Nagpur" && (profile === "C" || profile === "E") && (isLast || Math.random() < 0.3)) {
        freeText = pick(FREE_TEXTS.badNagpur);
      } else if (PPO_INTENT[spec.employee_code]?.w7 === 2 && w === 7) {
        freeText = pick(FREE_TEXTS.fence);
      } else if (PPO_INTENT[spec.employee_code]?.w7 === 2 && w === 4) {
        freeText = "The project is fine but I don't see a future here long-term";
      } else if (PPO_INTENT[spec.employee_code]?.w7 === 2 && w === 6) {
        freeText = "Would consider PPO if the role was more strategic";
      } else if (spec.branch === "Mumbai" && profile === "A" && isLast && Math.random() < 0.3) {
        freeText = pick(FREE_TEXTS.goodMumbai);
      }

      respRows.push({
        employee_id: empId,
        stage: String(w),
        risk_level: scored.risk_level,
        final_score: scored.final_score,
        gaming_flag: scored.gaming_flag,
        critical_flags: scored.critical_flags,
        completion_time_seconds: time,
        submitted_at: new Date(subTs).toISOString(),
        responses: scored.responses,
        scores: scored.scores,
        free_text_response: freeText,
      });
    }
  }

  const CHUNK = 200;
  let total = 0;
  for (let i = 0; i < respRows.length; i += CHUNK) {
    const slice = respRows.slice(i, i + CHUNK);
    const { error: rErr, count } = await supabase
      .from("survey_responses")
      .insert(slice, { count: "exact" });
    if (rErr) {
      return { insertedEmployees: inserted.length, insertedResponses: total, error: rErr.message };
    }
    total += count ?? slice.length;
  }

  return { insertedEmployees: inserted.length, insertedResponses: total };
}
