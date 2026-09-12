import { RESPONSES } from "../ask/index.js";

// ── Risk levels ───────────────────────────────────────────────────────────────

export const RISK_LEVELS = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
  UNKNOWN: "UNKNOWN",
};

// ── Action types ──────────────────────────────────────────────────────────────

export const ACTION_TYPES = {
  MONITOR: "MONITOR",
  SAFETY_ACTION: "SAFETY_ACTION",
  EMERGENCY: "EMERGENCY",
};

// ── Risk → action mapping ─────────────────────────────────────────────────────

export const RISK_TO_ACTION = {
  [RISK_LEVELS.LOW]: ACTION_TYPES.MONITOR,
  [RISK_LEVELS.MODERATE]: ACTION_TYPES.SAFETY_ACTION,
  [RISK_LEVELS.HIGH]: ACTION_TYPES.SAFETY_ACTION,
  [RISK_LEVELS.CRITICAL]: ACTION_TYPES.EMERGENCY,
  [RISK_LEVELS.UNKNOWN]: ACTION_TYPES.EMERGENCY, // fail-safe
};

// ── Reassessment rules ────────────────────────────────────────────────────────
// Structure: { [alertType]: { [response]: { finalRiskLevel, reason, nextStep } } }
// NO_RESPONSE is handled universally in the engine — not repeated here per alert.

export const REASSESSMENT_RULES = {
  HEAT: {
    [RESPONSES.UNWELL]: {
      finalRiskLevel: RISK_LEVELS.HIGH,
      reason: "User reported feeling unwell after heat-related alert",
      nextStep: "Provide heat safety instructions and monitor closely",
    },
    [RESPONSES.FINE]: {
      finalRiskLevel: RISK_LEVELS.MODERATE,
      reason: "User feels fine but heat risk remains elevated",
      nextStep: "Continue monitoring and advise hydration and rest",
    },
  },

  RESPIRATORY: {
    [RESPONSES.BREATHING_DIFFICULTY]: {
      finalRiskLevel: RISK_LEVELS.HIGH,
      reason: "User confirmed breathing difficulty after low oxygen alert",
      nextStep: "Provide respiratory guidance and prepare for escalation",
    },
    [RESPONSES.FINE]: {
      finalRiskLevel: RISK_LEVELS.MODERATE,
      reason: "User feels fine but oxygen levels remain a concern",
      nextStep: "Continue monitoring SpO2 and advise rest",
    },
  },

  FALL: {
    [RESPONSES.HELP]: {
      finalRiskLevel: RISK_LEVELS.CRITICAL,
      reason: "User confirmed injury or inability to move after impact",
      nextStep: "Trigger emergency SOS and alert contacts immediately",
    },
    [RESPONSES.OKAY]: {
      finalRiskLevel: RISK_LEVELS.LOW,
      reason: "User confirmed they are uninjured after impact detection",
      nextStep: "Log incident and resume normal monitoring",
    },
  },
};

// ── Universal NO_RESPONSE rule ────────────────────────────────────────────────

export const NO_RESPONSE_RULE = {
  finalRiskLevel: RISK_LEVELS.CRITICAL,
  reason: "No response received within the allotted time",
  nextStep: "Trigger emergency SOS and alert contacts immediately",
};

// ── Fallbacks ─────────────────────────────────────────────────────────────────

export const UNKNOWN_ALERT_FALLBACK = {
  finalRiskLevel: RISK_LEVELS.UNKNOWN,
  reason: "Alert type is unrecognized; cannot determine risk",
  nextStep: "Escalate to emergency as a precaution",
};

export const UNKNOWN_RESPONSE_FALLBACK = {
  finalRiskLevel: RISK_LEVELS.CRITICAL,
  reason: "User response is invalid or unrecognized",
  nextStep: "Treat as no-response and trigger emergency pathway",
};