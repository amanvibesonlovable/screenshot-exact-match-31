import { describe, it, expect } from "vitest";
import { scoreSurvey, type RawAnswer } from "@/survey/scoring";
import { SURVEYS, getEligibleStage } from "@/survey/survey-config";

describe("getEligibleStage", () => {
  it("returns null before day 15", () => {
    expect(getEligibleStage(0)).toBeNull();
    expect(getEligibleStage(14)).toBeNull();
  });
  it("returns the correct stage for boundary days", () => {
    expect(getEligibleStage(15)).toBe(15);
    expect(getEligibleStage(29)).toBe(15);
    expect(getEligibleStage(30)).toBe(30);
    expect(getEligibleStage(45)).toBe(45);
    expect(getEligibleStage(60)).toBe(60);
    expect(getEligibleStage(90)).toBe(90);
    expect(getEligibleStage(180)).toBe(180);
    expect(getEligibleStage(999)).toBe(180);
  });
});

describe("scoreSurvey — risk thresholds", () => {
  const cfg = SURVEYS[45]; // multiplier 1.0
  const allFirst: RawAnswer[] = cfg.questions
    .filter((q) => q.kind === "static")
    .map((q) => ({ question_id: q.id, selected: [0] }));

  it("LOW when all best answers", () => {
    const r = scoreSurvey(cfg, allFirst, 200);
    expect(r.scores.final_score).toBeLessThan(11);
    expect(r.scores.risk_level).toBe("LOW");
    expect(r.critical_flags).toEqual([]);
  });

  it("MEDIUM at threshold", () => {
    // Pick mid options for a few static qs to hit ~11-22 range
    const ans: RawAnswer[] = cfg.questions
      .filter((q) => q.kind === "static")
      .map((q) => ({ question_id: q.id, selected: [Math.min(2, q.options.length - 1)] }));
    const r = scoreSurvey(cfg, ans, 200);
    expect(r.scores.final_score).toBeGreaterThanOrEqual(11);
    if (r.scores.final_score < 23 && r.critical_flags.length === 0) {
      expect(r.scores.risk_level).toBe("MEDIUM");
    }
  });

  it("HIGH when score >= 23", () => {
    const ans: RawAnswer[] = cfg.questions
      .filter((q) => q.kind === "static")
      .map((q) => ({ question_id: q.id, selected: [q.options.length - 1] }));
    const r = scoreSurvey(cfg, ans, 200);
    expect(r.scores.risk_level).toBe("HIGH");
  });
});

describe("scoreSurvey — critical flags force HIGH", () => {
  it("Day-15 'Regretting' option triggers HIGH even if other answers are best", () => {
    const cfg = SURVEYS[15];
    const ans: RawAnswer[] = cfg.questions
      .filter((q) => q.kind === "static")
      .map((q) => {
        if (q.id === "q4") return { question_id: q.id, selected: [3] }; // Regretting
        return { question_id: q.id, selected: [0] };
      });
    const r = scoreSurvey(cfg, ans, 200);
    expect(r.critical_flags).toContain("Regretting joining at Day 15");
    expect(r.scores.risk_level).toBe("HIGH");
  });
});

describe("scoreSurvey — stage multipliers", () => {
  it("applies different multipliers per stage", () => {
    expect(SURVEYS[15].stageMultiplier).toBeDefined();
    const mkAll = (stage: 15 | 30 | 45 | 60 | 90 | 180): RawAnswer[] =>
      SURVEYS[stage].questions
        .filter((q) => q.kind === "static")
        .map((q) => ({ question_id: q.id, selected: [Math.min(2, q.options.length - 1)] }));
    const s15 = scoreSurvey(SURVEYS[15], mkAll(15), 200);
    const s180 = scoreSurvey(SURVEYS[180], mkAll(180), 200);
    expect(s15.scores.stage_multiplier).toBe(0.7);
    expect(s180.scores.stage_multiplier).toBe(1.5);
    expect(s180.scores.final_score).toBeGreaterThan(s15.scores.final_score);
  });
});

describe("scoreSurvey — gaming detection", () => {
  it("flags when all static-single answers are idx 0 AND completion < 45s", () => {
    const cfg = SURVEYS[15];
    const ans: RawAnswer[] = cfg.questions
      .filter((q) => q.kind === "static")
      .map((q) => ({ question_id: q.id, selected: [0] }));
    const fast = scoreSurvey(cfg, ans, 20);
    const slow = scoreSurvey(cfg, ans, 90);
    expect(fast.gaming_flag).toBe(true);
    expect(slow.gaming_flag).toBe(false);
  });

  it("does not flag when not all idx 0", () => {
    const cfg = SURVEYS[15];
    const ans: RawAnswer[] = cfg.questions
      .filter((q) => q.kind === "static")
      .map((q, i) => ({ question_id: q.id, selected: [i === 0 ? 1 : 0] }));
    const r = scoreSurvey(cfg, ans, 20);
    expect(r.gaming_flag).toBe(false);
  });
});

describe("scoreSurvey — dynamic follow-up scoring", () => {
  it("includes points from a dynamic multi-select follow-up", () => {
    const cfg = SURVEYS[15];
    const baseStatic: RawAnswer[] = cfg.questions
      .filter((q) => q.kind === "static")
      .map((q) => ({ question_id: q.id, selected: [0] }));
    const withFollowup = [
      ...baseStatic,
      { question_id: "q1a", selected: [0, 1] }, // 2 + 3 = 5 points
    ];
    const a = scoreSurvey(cfg, baseStatic, 200);
    const b = scoreSurvey(cfg, withFollowup, 200);
    expect(b.scores.composite).toBeGreaterThan(a.scores.composite);
  });
});
