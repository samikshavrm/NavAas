import { describe, it, expect } from "vitest";
import { getQuestionForAlert, isValidResponse } from "./askEngine.js";
import { RESPONSES } from "./alertConfig.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const heatDetection = {
  riskLevel: "MODERATE",
  alertType: "HEAT",
  reason: "High heart rate and ambient temperature",
  timestamp: 123456789,
};

const respiratoryDetection = {
  riskLevel: "HIGH",
  alertType: "RESPIRATORY",
  reason: "Low SpO2 reading",
  timestamp: 123456790,
};

const fallDetection = {
  riskLevel: "CRITICAL",
  alertType: "FALL",
  reason: "Sudden impact detected",
  timestamp: 123456791,
};

const unknownDetection = {
  riskLevel: "LOW",
  alertType: "UNKNOWN_TYPE",
  reason: "Mystery sensor",
  timestamp: 123456792,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getQuestionForAlert – HEAT", () => {
  const result = getQuestionForAlert(heatDetection);

  it("returns correct question", () => {
    expect(result.question).toBe(
      "Elevated thermal strain detected. Are you feeling dizzy or fatigued?"
    );
  });
  it("includes UNWELL", () => expect(result.responses).toContain(RESPONSES.UNWELL));
  it("includes FINE", () => expect(result.responses).toContain(RESPONSES.FINE));
  it("includes NO_RESPONSE", () => expect(result.responses).toContain(RESPONSES.NO_RESPONSE));
  it("is not a fallback", () => expect(result.isFallback).toBe(false));
});

describe("getQuestionForAlert – RESPIRATORY", () => {
  const result = getQuestionForAlert(respiratoryDetection);

  it("returns correct question", () => {
    expect(result.question).toBe(
      "Low oxygen levels detected. Are you experiencing shortness of breath?"
    );
  });
  it("includes BREATHING_DIFFICULTY", () =>
    expect(result.responses).toContain(RESPONSES.BREATHING_DIFFICULTY));
  it("includes FINE", () => expect(result.responses).toContain(RESPONSES.FINE));
  it("includes NO_RESPONSE", () => expect(result.responses).toContain(RESPONSES.NO_RESPONSE));
  it("is not a fallback", () => expect(result.isFallback).toBe(false));
});

describe("getQuestionForAlert – FALL", () => {
  const result = getQuestionForAlert(fallDetection);

  it("returns correct question", () => {
    expect(result.question).toBe("Impact detected. Are you injured or unable to move?");
  });
  it("includes HELP", () => expect(result.responses).toContain(RESPONSES.HELP));
  it("includes OKAY", () => expect(result.responses).toContain(RESPONSES.OKAY));
  it("includes NO_RESPONSE", () => expect(result.responses).toContain(RESPONSES.NO_RESPONSE));
  it("is not a fallback", () => expect(result.isFallback).toBe(false));
});

describe("getQuestionForAlert – unknown alert type", () => {
  const result = getQuestionForAlert(unknownDetection);

  it("uses fallback", () => expect(result.isFallback).toBe(true));
  it("fallback question is a non-empty string", () => {
    expect(typeof result.question).toBe("string");
    expect(result.question.length).toBeGreaterThan(0);
  });
  it("includes NO_RESPONSE", () => expect(result.responses).toContain(RESPONSES.NO_RESPONSE));
});

describe("getQuestionForAlert – null input", () => {
  const result = getQuestionForAlert(null);

  it("safe fallback", () => expect(result.isFallback).toBe(true));
  it("includes NO_RESPONSE", () => expect(result.responses).toContain(RESPONSES.NO_RESPONSE));
});

describe("NO_RESPONSE isolation", () => {
  it("NO_RESPONSE is distinct from FINE", () => {
    expect(RESPONSES.NO_RESPONSE).not.toBe(RESPONSES.FINE);
  });
  it("FINE and NO_RESPONSE coexist independently in HEAT", () => {
    const result = getQuestionForAlert(heatDetection);
    expect(result.responses).toContain(RESPONSES.FINE);
    expect(result.responses).toContain(RESPONSES.NO_RESPONSE);
  });
});

describe("isValidResponse", () => {
  it("HEAT + UNWELL → valid", () => expect(isValidResponse("HEAT", RESPONSES.UNWELL)).toBe(true));
  it("HEAT + FINE → valid", () => expect(isValidResponse("HEAT", RESPONSES.FINE)).toBe(true));
  it("HEAT + NO_RESPONSE → valid", () => expect(isValidResponse("HEAT", RESPONSES.NO_RESPONSE)).toBe(true));
  it("HEAT + HELP → invalid", () => expect(isValidResponse("HEAT", RESPONSES.HELP)).toBe(false));
  it("FALL + OKAY → valid", () => expect(isValidResponse("FALL", RESPONSES.OKAY)).toBe(true));
  it("FALL + UNWELL → invalid", () => expect(isValidResponse("FALL", RESPONSES.UNWELL)).toBe(false));
  it("UNKNOWN + NO_RESPONSE → valid", () => expect(isValidResponse("UNKNOWN_TYPE", RESPONSES.NO_RESPONSE)).toBe(true));
  it("UNKNOWN + FINE → invalid", () => expect(isValidResponse("UNKNOWN_TYPE", RESPONSES.FINE)).toBe(false));
});