// PPO intent helpers for Ascent 2026
import { InternResponse, Intern, weekNum, latestResponse, pulseScore, overallRisk } from "./lib";

export type PpoBucket = "ACCEPT" | "FENCE" | "DECLINE" | "NONE";

const W6_ACCEPT = ["accept immediately", "seriously consider"];
const W6_DECLINE = ["probably decline", "definitely decline", "i'd definitely decline"];
const W7_ACCEPT = ["definitely accepting", "leaning towards accepting"];
const W7_FENCE = ["on the fence"];
const W7_DECLINE = ["leaning towards declining", "definitely declining"];

/** Extract PPO intent answer text from a survey response for given week. Q3 of W6/W7. */
export function ppoAnswer(r: InternResponse | undefined): string | null {
  if (!r || !r.responses) return null;
  const w = weekNum(r.stage);
  if (w !== 6 && w !== 7) return null;
  const q = r.responses.find(
    (x) => /^w[67]_q3$/i.test(x.question_id) || /ppo/i.test(x.question_text),
  );
  return q?.answer_text ?? null;
}

export function w6Response(rs: InternResponse[]): InternResponse | undefined {
  return rs.find((r) => weekNum(r.stage) === 6);
}
export function w7Response(rs: InternResponse[]): InternResponse | undefined {
  return rs.find((r) => weekNum(r.stage) === 7);
}

export function classifyPpo(intern: Intern, rs: InternResponse[]): PpoBucket {
  const w7 = w7Response(rs);
  const w6 = w6Response(rs);
  const w7a = (ppoAnswer(w7) ?? "").toLowerCase();
  const w6a = (ppoAnswer(w6) ?? "").toLowerCase();

  if (w7a) {
    if (W7_ACCEPT.some((s) => w7a.includes(s))) return "ACCEPT";
    if (W7_FENCE.some((s) => w7a.includes(s))) return "FENCE";
    if (W7_DECLINE.some((s) => w7a.includes(s))) return "DECLINE";
  }
  if (w6a) {
    if (W6_DECLINE.some((s) => w6a.includes(s))) return "DECLINE";
    if (w6a.includes("accept immediately")) return "ACCEPT";
    if (w6a.includes("seriously consider")) {
      // upgrade to FENCE if overall risk MEDIUM/HIGH
      const risk = overallRisk(intern, rs);
      return risk === "MEDIUM" || risk === "HIGH" ? "FENCE" : "ACCEPT";
    }
  }
  return "NONE";
}

export function avgPulse(rs: InternResponse[]): number | null {
  const vals = rs.map(pulseScore).filter((x): x is number => x != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export const PPO_COLORS = {
  ACCEPT: "#16A34A",
  FENCE: "#D97706",
  DECLINE: "#DC2626",
  NONE: "#94A3B8",
};
export const PPO_LABEL = {
  ACCEPT: "Likely to Accept",
  FENCE: "On the Fence",
  DECLINE: "Likely to Decline",
  NONE: "No data yet",
};

export function shortIntent(answer: string | null): { label: string; tone: "good" | "bad" | "neutral" | "strongBad" } {
  if (!answer) return { label: "—", tone: "neutral" };
  const a = answer.toLowerCase();
  if (a.includes("definitely decline") || a.includes("definitely declining")) return { label: "Definitely decline", tone: "strongBad" };
  if (a.includes("probably decline") || a.includes("leaning towards declining")) return { label: "Probably decline", tone: "bad" };
  if (a.includes("on the fence")) return { label: "On the fence", tone: "neutral" };
  if (a.includes("accept immediately") || a.includes("definitely accepting")) return { label: "Accept", tone: "good" };
  if (a.includes("seriously consider") || a.includes("leaning towards accepting")) return { label: "Consider", tone: "good" };
  return { label: answer.slice(0, 24), tone: "neutral" };
}
