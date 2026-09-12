import { describe, it, expect } from "vitest";
import { RESPONSES } from "../ask/index.js";
import { reassessRisk } from "./reassessmentEngine.js";
import { RISK_LEVELS, ACTION_TYPES } from "./reassessmentConfig.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const heat = { riskLevel: "MODERATE", alertType: "HEAT", reason: "High HR and temp", timestamp: 1 };
const respiratory = { riskLevel: "HIGH", alertType: "RESPIRATORY", reason: "Low SpO2", timestamp: 2 };
const fall = { riskLevel: "CRITICAL", alertType: "FALL", reason: "Impact detected", timestamp: 3 };

// ── Helper: assert result shape is always complete ────────────────────────────

function expectValidShape(result) {
  expect(result).toHaveProperty("finalRiskLevel");
  expect(result).toHaveProperty("actionType");
  expect(result).toHaveProperty("reason");
  expect(result).toHaveProperty("nextStep");
  expect(typeof result.finalRiskLevel).toBe("string");
  expect(typeof result.actionType).toBe("string");
  expect(typeof result.reason).toBe("string");
  expect(typeof result.nextStep).toBe("string");
}

// ── HEAT rules ────────────────────────────────────────────────────────────────

describe("HEAT", () => {
  it("HEAT + UNWELL → HIGH + SAFETY_ACTION", () => {
    const r = reassessRisk(heat, RESPONSES.UNWELL);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.HIGH);
    expect(r.actionType).toBe(ACTION_TYPES.SAFETY_ACTION);
    expectValidShape(r);
  });

  it("HEAT + FINE → MODERATE + SAFETY_ACTION", () => {
    const r = reassessRisk(heat, RESPONSES.FINE);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.MODERATE);
    expect(r.actionType).toBe(ACTION_TYPES.SAFETY_ACTION);
    expectValidShape(r);
  });
});

// ── RESPIRATORY rules ─────────────────────────────────────────────────────────

describe("RESPIRATORY", () => {
  it("RESPIRATORY + BREATHING_DIFFICULTY → HIGH + SAFETY_ACTION", () => {
    const r = reassessRisk(respiratory, RESPONSES.BREATHING_DIFFICULTY);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.HIGH);
    expect(r.actionType).toBe(ACTION_TYPES.SAFETY_ACTION);
    expectValidShape(r);
  });

  it("RESPIRATORY + FINE → MODERATE + SAFETY_ACTION", () => {
    const r = reassessRisk(respiratory, RESPONSES.FINE);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.MODERATE);
    expect(r.actionType).toBe(ACTION_TYPES.SAFETY_ACTION);
    expectValidShape(r);
  });
});

// ── FALL rules ────────────────────────────────────────────────────────────────

describe("FALL", () => {
  it("FALL + HELP → CRITICAL + EMERGENCY", () => {
    const r = reassessRisk(fall, RESPONSES.HELP);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(r.actionType).toBe(ACTION_TYPES.EMERGENCY);
    expectValidShape(r);
  });

  it("FALL + OKAY → LOW + MONITOR", () => {
    const r = reassessRisk(fall, RESPONSES.OKAY);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.LOW);
    expect(r.actionType).toBe(ACTION_TYPES.MONITOR);
    expectValidShape(r);
  });
});

// ── NO_RESPONSE (universal) ───────────────────────────────────────────────────

describe("NO_RESPONSE — any alert type", () => {
  it("HEAT + NO_RESPONSE → CRITICAL + EMERGENCY", () => {
    const r = reassessRisk(heat, RESPONSES.NO_RESPONSE);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(r.actionType).toBe(ACTION_TYPES.EMERGENCY);
    expectValidShape(r);
  });

  it("RESPIRATORY + NO_RESPONSE → CRITICAL + EMERGENCY", () => {
    const r = reassessRisk(respiratory, RESPONSES.NO_RESPONSE);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(r.actionType).toBe(ACTION_TYPES.EMERGENCY);
    expectValidShape(r);
  });

  it("FALL + NO_RESPONSE → CRITICAL + EMERGENCY", () => {
    const r = reassessRisk(fall, RESPONSES.NO_RESPONSE);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(r.actionType).toBe(ACTION_TYPES.EMERGENCY);
    expectValidShape(r);
  });

  it("NO_RESPONSE is never treated as FINE", () => {
    const r = reassessRisk(heat, RESPONSES.NO_RESPONSE);
    expect(r.finalRiskLevel).not.toBe(RISK_LEVELS.LOW);
    expect(r.finalRiskLevel).not.toBe(RISK_LEVELS.MODERATE);
  });
});

// ── Invalid / edge-case responses ─────────────────────────────────────────────

describe("invalid response handling", () => {
  it("null response → CRITICAL (not FINE/LOW/MODERATE)", () => {
    const r = reassessRisk(heat, null);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expect(r.finalRiskLevel).not.toBe(RISK_LEVELS.LOW);
    expectValidShape(r);
  });

  it("undefined response → CRITICAL", () => {
    const r = reassessRisk(heat, undefined);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expectValidShape(r);
  });

  it("garbage string → CRITICAL", () => {
    const r = reassessRisk(heat, "BANANA");
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expectValidShape(r);
  });

  it("invalid response does not become FINE", () => {
    const r = reassessRisk(heat, "NOT_A_REAL_RESPONSE");
    expect(r.finalRiskLevel).not.toBe(RISK_LEVELS.LOW);
    // should never silently pass as FINE
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
  });

  it("mismatched response for alert (HEAT + HELP) → CRITICAL fallback", () => {
    // HELP is not a valid response for HEAT — should not silently become FINE
    const r = reassessRisk(heat, RESPONSES.HELP);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.CRITICAL);
    expectValidShape(r);
  });
});

// ── Invalid / missing detection result ───────────────────────────────────────

describe("invalid detection result handling", () => {
  it("null detectionResult → safe fallback with valid shape", () => {
    const r = reassessRisk(null, RESPONSES.FINE);
    expectValidShape(r);
  });

  it("undefined detectionResult → safe fallback", () => {
    const r = reassessRisk(undefined, RESPONSES.FINE);
    expectValidShape(r);
  });

  it("unknown alertType → safe fallback", () => {
    const r = reassessRisk({ alertType: "FIRE", riskLevel: "HIGH" }, RESPONSES.FINE);
    expectValidShape(r);
    expect(r.finalRiskLevel).toBe(RISK_LEVELS.UNKNOWN);
  });

  it("missing alertType → safe fallback", () => {
    const r = reassessRisk({ riskLevel: "HIGH" }, RESPONSES.FINE);
    expectValidShape(r);
  });

  it("does not crash on empty object", () => {
    expect(() => reassessRisk({}, RESPONSES.OKAY)).not.toThrow();
    expectValidShape(reassessRisk({}, RESPONSES.OKAY));
  });
});

// ── Result shape guarantee ────────────────────────────────────────────────────

describe("result always has required fields", () => {
  const cases = [
    [heat, RESPONSES.UNWELL],
    [heat, RESPONSES.FINE],
    [respiratory, RESPONSES.BREATHING_DIFFICULTY],
    [fall, RESPONSES.HELP],
    [fall, RESPONSES.OKAY],
    [heat, RESPONSES.NO_RESPONSE],
    [null, RESPONSES.FINE],
    [heat, null],
    [{}, "GARBAGE"],
  ];

  cases.forEach(([detection, response]) => {
    it(`shape valid for (${detection?.alertType ?? "null"}, ${response})`, () => {
      expectValidShape(reassessRisk(detection, response));
    });
  });
});