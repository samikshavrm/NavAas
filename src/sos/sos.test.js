import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RISK_LEVELS } from "../reassessment/reassessmentConfig.js";
import { RESPONSES } from "../ask/index.js";
import { reassessRisk } from "../reassessment/reassessmentEngine.js";
import { getSafetyActions } from "../safety/safetyActions.js";
import {
  shouldActivateSOS,
  createSOSController,
  activateSOS,
} from "./sosController.js";
import { SOS_STATUS, SOS_COUNTDOWN_SECONDS } from "./sosConfig.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.restoreAllMocks());

// ── Fixtures ──────────────────────────────────────────────────────────────────

const criticalReassessment = {
  finalRiskLevel: RISK_LEVELS.CRITICAL,
  actionType: "EMERGENCY",
  reason: "No response after fall detection",
  nextStep: "Emergency assistance required",
};

const highReassessment = {
  finalRiskLevel: RISK_LEVELS.HIGH,
  actionType: "SAFETY_ACTION",
  reason: "User unwell",
  nextStep: "Provide guidance",
};

const moderateReassessment = {
  finalRiskLevel: RISK_LEVELS.MODERATE,
  actionType: "SAFETY_ACTION",
  reason: "Risk remains",
  nextStep: "Monitor",
};

const lowReassessment = {
  finalRiskLevel: RISK_LEVELS.LOW,
  actionType: "MONITOR",
  reason: "User okay",
  nextStep: "Log",
};

const criticalSafety = { triggerSOS: true, alertType: "FALL" };
const nonCriticalSafety = { triggerSOS: false, alertType: "HEAT" };

// ── shouldActivateSOS ─────────────────────────────────────────────────────────

describe("shouldActivateSOS", () => {
  it("CRITICAL reassessment → true", () => {
    expect(shouldActivateSOS(criticalReassessment)).toBe(true);
  });

  it("triggerSOS: true in safety result → true", () => {
    expect(shouldActivateSOS(lowReassessment, criticalSafety)).toBe(true);
  });

  it("HIGH → false", () => expect(shouldActivateSOS(highReassessment)).toBe(false));
  it("MODERATE → false", () => expect(shouldActivateSOS(moderateReassessment)).toBe(false));
  it("LOW → false", () => expect(shouldActivateSOS(lowReassessment)).toBe(false));

  it("triggerSOS: false → false", () => {
    expect(shouldActivateSOS(highReassessment, nonCriticalSafety)).toBe(false);
  });

  it("null input → false", () => expect(shouldActivateSOS(null)).toBe(false));
  it("undefined input → false", () => expect(shouldActivateSOS(undefined)).toBe(false));
  it("empty object → false", () => expect(shouldActivateSOS({})).toBe(false));
  it("missing finalRiskLevel → false", () => {
    expect(shouldActivateSOS({ actionType: "EMERGENCY" })).toBe(false);
  });
});

// ── End-to-end: CRITICAL reassessment activates SOS ──────────────────────────

describe("SOS activation — integrated reassessment paths", () => {
  it("FALL + NO_RESPONSE → CRITICAL → SOS activates", () => {
    const detection = { alertType: "FALL", riskLevel: "HIGH", reason: "Impact", timestamp: 1 };
    const reassessment = reassessRisk(detection, RESPONSES.NO_RESPONSE);
    expect(shouldActivateSOS(reassessment)).toBe(true);
  });

  it("FALL + HELP → CRITICAL → SOS activates", () => {
    const detection = { alertType: "FALL", riskLevel: "CRITICAL", reason: "Impact", timestamp: 2 };
    const reassessment = reassessRisk(detection, RESPONSES.HELP);
    expect(shouldActivateSOS(reassessment)).toBe(true);
  });

  it("FALL + OKAY → LOW → SOS does NOT activate", () => {
    const detection = { alertType: "FALL", riskLevel: "CRITICAL", reason: "Impact", timestamp: 3 };
    const reassessment = reassessRisk(detection, RESPONSES.OKAY);
    expect(shouldActivateSOS(reassessment)).toBe(false);
  });

  it("HEAT + FINE → MODERATE → SOS does NOT activate", () => {
    const detection = { alertType: "HEAT", riskLevel: "MODERATE", reason: "Heat", timestamp: 4 };
    const reassessment = reassessRisk(detection, RESPONSES.FINE);
    expect(shouldActivateSOS(reassessment)).toBe(false);
  });

  it("HEAT + UNWELL → HIGH → SOS does NOT activate", () => {
    const detection = { alertType: "HEAT", riskLevel: "MODERATE", reason: "Heat", timestamp: 5 };
    const reassessment = reassessRisk(detection, RESPONSES.UNWELL);
    expect(shouldActivateSOS(reassessment)).toBe(false);
  });
});

// ── createSOSController — countdown ──────────────────────────────────────────

describe("createSOSController — countdown", () => {
  it("starts at 30 seconds", () => {
    const controller = createSOSController({ alertType: "FALL", reason: "Test" });
    controller.start();
    expect(controller.getState().remainingSeconds).toBe(SOS_COUNTDOWN_SECONDS);
    expect(controller.getState().status).toBe(SOS_STATUS.COUNTDOWN);
  });

  it("decrements once per second", () => {
    const ticks = [];
    const controller = createSOSController({
      alertType: "FALL",
      reason: "Test",
      onTick: (s) => ticks.push(s.remainingSeconds),
    });
    controller.start();
    vi.advanceTimersByTime(3000);
    expect(ticks).toEqual([29, 28, 27]);
  });

  it("completes at 0 with SOS_SIMULATION_COMPLETE", () => {
    const onComplete = vi.fn();
    const controller = createSOSController({
      alertType: "FALL",
      reason: "Test",
      onComplete,
    });
    controller.start();
    vi.advanceTimersByTime(SOS_COUNTDOWN_SECONDS * 1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    const state = onComplete.mock.calls[0][0];
    expect(state.status).toBe(SOS_STATUS.SOS_SIMULATION_COMPLETE);
    expect(state.remainingSeconds).toBe(0);
  });
});

// ── createSOSController — cancellation ───────────────────────────────────────

describe("createSOSController — cancellation", () => {
  it("cancel stops the countdown", () => {
    const ticks = [];
    const controller = createSOSController({
      alertType: "FALL",
      reason: "Test",
      onTick: (s) => ticks.push(s.remainingSeconds),
    });
    controller.start();
    vi.advanceTimersByTime(3000);
    controller.cancel();
    vi.advanceTimersByTime(10000);
    expect(ticks).toHaveLength(3); // only 3 ticks before cancel
  });

  it("cancel produces CANCELLED status", () => {
    const onCancel = vi.fn();
    const controller = createSOSController({
      alertType: "FALL",
      reason: "Test",
      onCancel,
    });
    controller.start();
    vi.advanceTimersByTime(5000);
    controller.cancel();
    expect(onCancel).toHaveBeenCalledTimes(1);
    const state = onCancel.mock.calls[0][0];
    expect(state.status).toBe(SOS_STATUS.CANCELLED);
    expect(state.remainingSeconds).toBe(25);
  });

  it("cancel prevents onComplete from firing", () => {
    const onComplete = vi.fn();
    const controller = createSOSController({
      alertType: "FALL",
      reason: "Test",
      onComplete,
    });
    controller.start();
    vi.advanceTimersByTime(10000);
    controller.cancel();
    vi.advanceTimersByTime(SOS_COUNTDOWN_SECONDS * 1000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("calling cancel more than once is safe", () => {
    const onCancel = vi.fn();
    const controller = createSOSController({ alertType: "FALL", reason: "Test", onCancel });
    controller.start();
    expect(() => {
      controller.cancel();
      controller.cancel();
      controller.cancel();
    }).not.toThrow();
    expect(onCancel).toHaveBeenCalledTimes(1); // fires only once
  });
});

// ── Output shape ──────────────────────────────────────────────────────────────

describe("SOS state shape", () => {
  function expectValidSOSShape(state) {
    expect(state).toHaveProperty("status");
    expect(state).toHaveProperty("remainingSeconds");
    expect(state).toHaveProperty("alertType");
    expect(state).toHaveProperty("reason");
    expect(state).toHaveProperty("location");
    expect(state).toHaveProperty("emergencyContact");
    expect(typeof state.status).toBe("string");
    expect(typeof state.remainingSeconds).toBe("number");
  }

  it("getState() returns valid shape immediately after start", () => {
    const controller = createSOSController({ alertType: "FALL", reason: "Test" });
    controller.start();
    expectValidSOSShape(controller.getState());
  });

  it("onTick state has valid shape", () => {
    let tickState;
    const controller = createSOSController({
      alertType: "HEAT",
      reason: "Heat alert",
      onTick: (s) => { tickState = s; },
    });
    controller.start();
    vi.advanceTimersByTime(1000);
    expectValidSOSShape(tickState);
    expect(tickState.alertType).toBe("HEAT");
    expect(tickState.reason).toBe("Heat alert");
  });

  it("onComplete state has valid shape", () => {
    let completeState;
    const controller = createSOSController({
      alertType: "FALL",
      reason: "Fall",
      onComplete: (s) => { completeState = s; },
    });
    controller.start();
    vi.advanceTimersByTime(SOS_COUNTDOWN_SECONDS * 1000);
    expectValidSOSShape(completeState);
  });

  it("onCancel state has valid shape", () => {
    let cancelState;
    const controller = createSOSController({
      alertType: "RESPIRATORY",
      reason: "Breathing",
      onCancel: (s) => { cancelState = s; },
    });
    controller.start();
    controller.cancel();
    expectValidSOSShape(cancelState);
  });
});

// ── activateSOS convenience function ─────────────────────────────────────────

describe("activateSOS", () => {
  it("returns a controller for CRITICAL input", () => {
    const controller = activateSOS(criticalReassessment, criticalSafety);
    expect(controller).not.toBeNull();
    expect(typeof controller.cancel).toBe("function");
    expect(typeof controller.getState).toBe("function");
    controller.cancel(); // cleanup
  });

  it("returns null for HIGH input", () => {
    expect(activateSOS(highReassessment, nonCriticalSafety)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(activateSOS(null, null)).toBeNull();
  });

  it("controller from activateSOS is already counting down", () => {
    const ticks = [];
    const controller = activateSOS(criticalReassessment, criticalSafety, {
      onTick: (s) => ticks.push(s.remainingSeconds),
    });
    vi.advanceTimersByTime(3000);
    expect(ticks).toEqual([29, 28, 27]);
    controller.cancel();
  });
});