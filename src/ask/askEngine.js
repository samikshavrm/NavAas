import { ALERT_CONFIG, FALLBACK_CONFIG, RESPONSES } from "./alertConfig.js";

/**
 * Returns the question config for a given detection result.
 * NO_RESPONSE is always appended and is NEVER aliased to FINE.
 *
 * @param {Object} detectionResult
 * @param {string} detectionResult.riskLevel
 * @param {string} detectionResult.alertType
 * @param {string} detectionResult.reason
 * @param {number} detectionResult.timestamp
 * @returns {{
 *   alertType: string,
 *   question: string,
 *   responses: string[],
 *   isFallback: boolean
 * }}
 */
export function getQuestionForAlert(detectionResult) {
  const alertType = detectionResult?.alertType ?? null;
  const config = ALERT_CONFIG[alertType];
  const isFallback = !config;

  const base = isFallback ? FALLBACK_CONFIG : config;

  return {
    alertType: alertType ?? "UNKNOWN",
    question: base.question,
    // NO_RESPONSE appended last; never merged with or replaced by FINE
    responses: [...base.responses, RESPONSES.NO_RESPONSE],
    isFallback,
  };
}

/**
 * Validates that a given response string is legal for the alert type.
 * NO_RESPONSE is always valid.
 *
 * @param {string} alertType
 * @param {string} response
 * @returns {boolean}
 */
export function isValidResponse(alertType, response) {
  if (response === RESPONSES.NO_RESPONSE) return true;
  const config = ALERT_CONFIG[alertType];
  if (!config) return false;
  return config.responses.includes(response);
}