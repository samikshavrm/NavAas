import { RISK_LEVELS } from "../reassessment/reassessmentConfig.js";
import {
  SAFETY_INSTRUCTIONS,
  FALLBACK_INSTRUCTIONS,
  SOS_TRIGGER_LEVELS,
} from "./safetyConfig.js";

const KNOWN_RISK_LEVELS = new Set(Object.values(RISK_LEVELS));

/**
 * Determines the appropriate safety instructions and emergency pathway
 * based on the Reassessment Engine output.
 *
 * @param {Object|null} reassessmentResult  Return value of reassessRisk()
 * @param {string|null} alertType           e.g. "HEAT" | "RESPIRATORY" | "FALL"
 * @returns {{
 *   severity: string,
 *   alertType: string,
 *   instructions: string[],
 *   emergency: boolean,
 *   triggerSOS: boolean
 * }}
 */
export function getSafetyActions(reassessmentResult, alertType) {
  // ── 1. Validate inputs ────────────────────────────────────────────────────
  if (!reassessmentResult || typeof reassessmentResult !== "object") {
    return safeUnknownResult(alertType);
  }

  const severity = reassessmentResult.finalRiskLevel ?? null;

  if (!severity || !KNOWN_RISK_LEVELS.has(severity)) {
    return safeUnknownResult(alertType);
  }

  // ── 2. Resolve instructions ───────────────────────────────────────────────
  const normalizedAlertType = typeof alertType === "string" ? alertType : null;
  const alertInstructions = SAFETY_INSTRUCTIONS[normalizedAlertType];
  const instructions = alertInstructions?.[severity] ?? FALLBACK_INSTRUCTIONS;

  // ── 3. Determine emergency flags ──────────────────────────────────────────
  // CRITICAL always → emergency + SOS. UNKNOWN never triggers SOS.
  const isCritical = severity === RISK_LEVELS.CRITICAL;
  const emergency = isCritical;
  const triggerSOS = isCritical && SOS_TRIGGER_LEVELS.has(severity);

  return {
    severity,
    alertType: normalizedAlertType ?? "UNKNOWN",
    instructions,
    emergency,
    triggerSOS,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Safe fallback result for invalid/missing inputs.
 * Never triggers SOS or emergency.
 */
function safeUnknownResult(alertType) {
  return {
    severity: RISK_LEVELS.UNKNOWN,
    alertType: typeof alertType === "string" ? alertType : "UNKNOWN",
    instructions: FALLBACK_INSTRUCTIONS,
    emergency: false,
    triggerSOS: false,
  };
}