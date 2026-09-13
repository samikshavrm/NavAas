import { RESPONSES } from "../ask/index.js";
import { normalizeResponse } from "../response/responseNormalizer.js";
import {
  REASSESSMENT_RULES,
  NO_RESPONSE_RULE,
  UNKNOWN_ALERT_FALLBACK,
  UNKNOWN_RESPONSE_FALLBACK,
  RISK_TO_ACTION,
  RISK_LEVELS,
} from "./reassessmentConfig.js";

/**
 * Determines the final risk level and next action given a detection result
 * and the user's normalized response.
 *
 * @param {Object|null} detectionResult
 * @param {string|null} userResponse   Should already be normalized; will be re-normalized defensively.
 * @returns {{
 *   finalRiskLevel: string,
 *   actionType: string,
 *   reason: string,
 *   nextStep: string
 * }}
 */
export function reassessRisk(detectionResult, userResponse) {
  // ── 1. Normalize response defensively (never let invalid become FINE) ──────
  const response = normalizeResponse(userResponse);

  // ── 2. Validate detection result ──────────────────────────────────────────
  if (!detectionResult || typeof detectionResult !== "object") {
    return buildResult(UNKNOWN_ALERT_FALLBACK);
  }

  const alertType = detectionResult.alertType ?? null;

  // ── 3. Universal NO_RESPONSE rule (any alert type) ────────────────────────
  if (response === RESPONSES.NO_RESPONSE) {
    return buildResult(NO_RESPONSE_RULE);
  }

  // ── 4. Look up alert-specific rules ──────────────────────────────────────
  const alertRules = REASSESSMENT_RULES[alertType];

  if (!alertRules) {
    // Unknown alert type — fail safe
    return buildResult(UNKNOWN_ALERT_FALLBACK);
  }

  const rule = alertRules[response];

  if (!rule) {
    // Response not mapped for this alert — treat as unrecognized, not FINE
    return buildResult(UNKNOWN_RESPONSE_FALLBACK);
  }

  return buildResult(rule);
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Attaches actionType derived from finalRiskLevel and returns the full result.
 *
 * @param {{ finalRiskLevel: string, reason: string, nextStep: string }} rule
 * @returns {{ finalRiskLevel: string, actionType: string, reason: string, nextStep: string }}
 */
function buildResult({ finalRiskLevel, reason, nextStep }) {
  const actionType =
    RISK_TO_ACTION[finalRiskLevel] ?? RISK_TO_ACTION[RISK_LEVELS.UNKNOWN];

  return { finalRiskLevel, actionType, reason, nextStep };
}