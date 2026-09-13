/**
 * reassessmentEngine.js
 * ----------------------
 * This is where sensor evidence + human response combine into a final
 * decision. It takes:
 *   1. The detection result (from detectionEngine.js)
 *   2. The user's response (from Person 3's Ask engine)
 * ...and returns the FINAL risk level for the app to act on.
 *
 * IMPORTANT: This file does NOT touch the UI at all. It just returns
 * data. Whoever calls this decides what to show on screen.
 *
 * SAFETY PRINCIPLE (matches the research/concept note):
 * When uncertain, escalate rather than downgrade. No response is NEVER
 * treated as "the user is fine" — it always escalates to CRITICAL.
 *
 * HOW TO USE:
 *   import { reassessmentEngine } from "./reassessmentEngine";
 *   const finalResult = reassessmentEngine.reassess(detectionResult, userResponse);
 *
 * `userResponse` is one of:
 *   "UNWELL"      - user pressed "Yes / Unwell" or said something concerning
 *   "FINE"        - user pressed "I'm Fine" / "I'm Okay"
 *   "HELP"        - user pressed "Help" (used in fall scenario)
 *   "NO_RESPONSE" - the 15-second timer ran out with no answer
 */

import { RISK_LEVELS, ALERT_TYPES } from "./detectionRules";

/**
 * Combines a detection result with a user response to produce the
 * final risk state for the app.
 *
 * @param {object} detectionResult - output from detectionEngine.analyze()
 * @param {"UNWELL"|"FINE"|"HELP"|"NO_RESPONSE"} userResponse
 * @returns {object} finalResult - same shape as detectionResult, but
 *                    with the risk level updated based on user input
 */
function reassess(detectionResult, userResponse) {
  const { alertType, reason } = detectionResult;

  // Rule 1: No response is ALWAYS treated as potentially serious.
  // This applies no matter what the alert type was.
  if (userResponse === "NO_RESPONSE") {
    return build(RISK_LEVELS.CRITICAL, alertType, `${reason} — no response from user, escalating for safety`);
  }

  // Rule 2: Fall-specific responses
  if (alertType === ALERT_TYPES.FALL) {
    if (userResponse === "HELP") {
      return build(RISK_LEVELS.CRITICAL, alertType, `${reason} — user requested help`);
    }
    if (userResponse === "FINE") {
      // User confirmed they're okay — stand down the alert
      return build(RISK_LEVELS.LOW, ALERT_TYPES.NONE, "User confirmed they are okay after fall event");
    }
  }

  // Rule 3: Heat-specific responses
  if (alertType === ALERT_TYPES.HEAT) {
    if (userResponse === "UNWELL") {
      return build(RISK_LEVELS.HIGH, alertType, `${reason} — user reports dizziness/fatigue`);
    }
    if (userResponse === "FINE") {
      // Sensors still show a heat risk, so we don't downgrade below
      // what the sensors already detected — we just don't escalate further.
      return build(RISK_LEVELS.MODERATE, alertType, `${reason} — user reports feeling fine, continuing to monitor`);
    }
  }

  // Rule 4: Respiratory-specific responses
  if (alertType === ALERT_TYPES.RESPIRATORY) {
    if (userResponse === "UNWELL") {
      return build(RISK_LEVELS.HIGH, alertType, `${reason} — user reports breathing difficulty`);
    }
    if (userResponse === "FINE") {
      return build(RISK_LEVELS.MODERATE, alertType, `${reason} — user reports feeling fine, continuing to monitor`);
    }
  }

  // Fallback: if none of the above matched, just pass the original
  // detection result through unchanged.
  return build(detectionResult.riskLevel, alertType, reason);
}

function build(riskLevel, alertType, reason) {
  return {
    riskLevel,
    alertType,
    reason,
    timestamp: Date.now(),
  };
}

export const reassessmentEngine = {
  reassess,
};
