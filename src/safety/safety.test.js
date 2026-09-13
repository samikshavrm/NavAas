import { describe, it, expect } from "vitest";
import { RISK_LEVELS } from "../reassessment/reassessmentConfig.js";
import { getSafetyActions } from "./safetyActions.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReassessment(finalRiskLevel) {
  return {
    finalRiskLevel,
    actionType: "SAFETY_ACTION",
    reason: "Test reason",
    nextStep: "Test next step",
  };
}

function expectValidShape(result) {
  expect(result).toHaveProperty("severity");
  expect(result).toHaveProperty("alertType");
  expect(result).toHaveProperty("instructions");
  expect(result).toHaveProperty("emergency");
  expect(result).toHaveProperty("triggerSOS");
  expect(typeof result.severity).toBe("string");
  expect(typeof result.alertType).toBe("string");
  expect(Array.isArray(result.instructions)).toBe(true);
  expect(result.instructions.length).toBeGreaterThan(0);
  expect(typeof result.emergency).toBe("boolean");
  expect(typeof result.triggerSOS).toBe("boolean");
}

function expectNoEmergency(result) {
  expect(result.emergency).toBe(false);
  expect(result.triggerSOS).toBe(false);
}

// ── HEAT ──────────────────────────────────────────────────────────────────────

describe("HEAT", () => {
  it("LOW — no emergency, heat-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.LOW), "HEAT");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.severity).toBe(RISK_LEVELS.LOW);
    expect(r.alertType).toBe("HEAT");
    expect(r.instructions.some((i) => /cool|shade|water|hydrat/i.test(i))).toBe(true);
  });

  it("MODERATE — no emergency, heat-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.MODERATE), "HEAT");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /cool|shade|hydrat|water/i.test(i))).toBe(true);
  });

  it("HIGH — no SOS, heat-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "HEAT");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /cool|medical|temperature|water/i.test(i))).toBe(true);
  });

  it("CRITICAL — emergency true, triggerSOS true", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.CRITICAL), "HEAT");
    expectValidShape(r);
    expect(r.emergency).toBe(true);
    expect(r.triggerSOS).toBe(true);
    expect(r.severity).toBe(RISK_LEVELS.CRITICAL);
  });
});

// ── RESPIRATORY ───────────────────────────────────────────────────────────────

describe("RESPIRATORY", () => {
  it("LOW — no emergency, respiratory-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.LOW), "RESPIRATORY");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /breath|air|exertion/i.test(i))).toBe(true);
  });

  it("MODERATE — no emergency, respiratory-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.MODERATE), "RESPIRATORY");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /breath|air|upright|calm/i.test(i))).toBe(true);
  });

  it("HIGH — no SOS, respiratory-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "RESPIRATORY");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /breath|air|upright|medical/i.test(i))).toBe(true);
  });

  it("CRITICAL — emergency true, triggerSOS true", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.CRITICAL), "RESPIRATORY");
    expectValidShape(r);
    expect(r.emergency).toBe(true);
    expect(r.triggerSOS).toBe(true);
  });
});

// ── FALL ──────────────────────────────────────────────────────────────────────

describe("FALL", () => {
  it("LOW — no emergency, fall-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.LOW), "FALL");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /injur|rest|careful/i.test(i))).toBe(true);
  });

  it("MODERATE — no emergency, fall-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.MODERATE), "FALL");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /injur|stand|pain|assist/i.test(i))).toBe(true);
  });

  it("HIGH — no SOS, fall-relevant instructions", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "FALL");
    expectValidShape(r);
    expectNoEmergency(r);
    expect(r.instructions.some((i) => /injur|pain|assist|movement/i.test(i))).toBe(true);
  });

  it("CRITICAL — emergency true, triggerSOS true", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.CRITICAL), "FALL");
    expectValidShape(r);
    expect(r.emergency).toBe(true);
    expect(r.triggerSOS).toBe(true);
  });
});

// ── CRITICAL guarantee ────────────────────────────────────────────────────────

describe("CRITICAL always triggers emergency + SOS", () => {
  ["HEAT", "RESPIRATORY", "FALL"].forEach((alertType) => {
    it(`${alertType} + CRITICAL → emergency: true, triggerSOS: true`, () => {
      const r = getSafetyActions(makeReassessment(RISK_LEVELS.CRITICAL), alertType);
      expect(r.emergency).toBe(true);
      expect(r.triggerSOS).toBe(true);
    });
  });
});

// ── LOW/MODERATE/HIGH never trigger SOS ──────────────────────────────────────

describe("LOW/MODERATE/HIGH never trigger SOS", () => {
  [RISK_LEVELS.LOW, RISK_LEVELS.MODERATE, RISK_LEVELS.HIGH].forEach((level) => {
    ["HEAT", "RESPIRATORY", "FALL"].forEach((alertType) => {
      it(`${alertType} + ${level} → triggerSOS: false`, () => {
        const r = getSafetyActions(makeReassessment(level), alertType);
        expect(r.triggerSOS).toBe(false);
        expect(r.emergency).toBe(false);
      });
    });
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("edge cases — invalid/missing inputs never trigger SOS", () => {
  it("null reassessmentResult → safe fallback, no SOS", () => {
    const r = getSafetyActions(null, "HEAT");
    expectValidShape(r);
    expect(r.emergency).toBe(false);
    expect(r.triggerSOS).toBe(false);
  });

  it("undefined reassessmentResult → safe fallback, no SOS", () => {
    const r = getSafetyActions(undefined, "HEAT");
    expectValidShape(r);
    expectNoEmergency(r);
  });

  it("missing finalRiskLevel → safe fallback, no SOS", () => {
    const r = getSafetyActions({ actionType: "EMERGENCY" }, "HEAT");
    expectValidShape(r);
    expectNoEmergency(r);
  });

  it("unknown risk level → safe fallback, no SOS", () => {
    const r = getSafetyActions(makeReassessment("BANANA"), "HEAT");
    expectValidShape(r);
    expectNoEmergency(r);
  });

  it("unknown alert type → fallback instructions, shape valid", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "FIRE");
    expectValidShape(r);
    expect(r.alertType).toBe("FIRE");
    expectNoEmergency(r);
  });

  it("null alert type → safe fallback", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), null);
    expectValidShape(r);
    expect(r.alertType).toBe("UNKNOWN");
    expectNoEmergency(r);
  });

  it("empty object reassessment → safe fallback, no SOS", () => {
    const r = getSafetyActions({}, "HEAT");
    expectValidShape(r);
    expectNoEmergency(r);
  });

  it("does not crash on any combination", () => {
    expect(() => getSafetyActions(null, null)).not.toThrow();
    expect(() => getSafetyActions(undefined, undefined)).not.toThrow();
    expect(() => getSafetyActions({}, {})).not.toThrow();
  });
});

// ── Instructions are alert-specific, not generic ──────────────────────────────

describe("instructions are alert-specific", () => {
  it("HEAT instructions mention heat-related terms", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "HEAT");
    const text = r.instructions.join(" ").toLowerCase();
    expect(/cool|shade|hydrat|temperature|water/.test(text)).toBe(true);
  });

  it("RESPIRATORY instructions mention breathing-related terms", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "RESPIRATORY");
    const text = r.instructions.join(" ").toLowerCase();
    expect(/breath|air|upright|exertion/.test(text)).toBe(true);
  });

  it("FALL instructions mention fall-related terms", () => {
    const r = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "FALL");
    const text = r.instructions.join(" ").toLowerCase();
    expect(/injur|movement|pain|assist/.test(text)).toBe(true);
  });

  it("HEAT and RESPIRATORY instructions are different", () => {
    const heat = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "HEAT");
    const resp = getSafetyActions(makeReassessment(RISK_LEVELS.HIGH), "RESPIRATORY");
    expect(heat.instructions).not.toEqual(resp.instructions);
  });
});