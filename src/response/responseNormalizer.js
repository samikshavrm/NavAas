import { RESPONSES } from "../ask/index.js";

const VALID_RESPONSES = new Set(Object.values(RESPONSES));

/**
 * Normalizes a raw response value into a known RESPONSES constant.
 * Invalid or missing input → NO_RESPONSE (never FINE).
 *
 * @param {*} raw
 * @returns {string} A value from RESPONSES
 */
export function normalizeResponse(raw) {
  if (typeof raw === "string" && VALID_RESPONSES.has(raw)) {
    return raw;
  }
  // Unknown/null/undefined → NO_RESPONSE, never FINE
  return RESPONSES.NO_RESPONSE;
}

/**
 * Returns true only for responses that indicate the user is in distress
 * or unresponsive — i.e. requiring escalation.
 *
 * @param {string} response
 * @returns {boolean}
 */
export function requiresEscalation(response) {
  return (
    response === RESPONSES.UNWELL ||
    response === RESPONSES.BREATHING_DIFFICULTY ||
    response === RESPONSES.HELP ||
    response === RESPONSES.NO_RESPONSE
  );
}