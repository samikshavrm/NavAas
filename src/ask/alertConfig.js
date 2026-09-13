// Alert type constants
export const ALERT_TYPES = {
  HEAT: "HEAT",
  RESPIRATORY: "RESPIRATORY",
  FALL: "FALL",
};

// Response constants
export const RESPONSES = {
  // HEAT
  UNWELL: "UNWELL",
  // RESPIRATORY
  BREATHING_DIFFICULTY: "BREATHING_DIFFICULTY",
  // FALL
  HELP: "HELP",
  // Shared positive
  FINE: "FINE",
  OKAY: "OKAY",
  // Universal
  NO_RESPONSE: "NO_RESPONSE",
};

/**
 * Configuration map: alertType → { question, responses }
 * NO_RESPONSE is always appended by the Ask Engine — not stored here.
 */
export const ALERT_CONFIG = {
  [ALERT_TYPES.HEAT]: {
    question: "Elevated thermal strain detected. Are you feeling dizzy or fatigued?",
    responses: [RESPONSES.UNWELL, RESPONSES.FINE],
  },
  [ALERT_TYPES.RESPIRATORY]: {
    question: "Low oxygen levels detected. Are you experiencing shortness of breath?",
    responses: [RESPONSES.BREATHING_DIFFICULTY, RESPONSES.FINE],
  },
  [ALERT_TYPES.FALL]: {
    question: "Impact detected. Are you injured or unable to move?",
    responses: [RESPONSES.HELP, RESPONSES.OKAY],
  },
};

/** Fallback used when alertType is unknown or missing. */
export const FALLBACK_CONFIG = {
  question: "An alert was detected. Are you okay?",
  responses: [RESPONSES.FINE],
};