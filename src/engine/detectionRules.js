/**
 * detectionRules.js
 * -----------------
 * All the numeric thresholds used by the detection engine live here,
 * in ONE place. If you ever need to tune sensitivity (e.g. judges say
 * "the heat alert triggers too easily"), you change a number here —
 * you never need to touch detectionEngine.js itself.
 */

export const HEAT_RULES = {
  heartRateThreshold: 120, // bpm
  ambientTemperatureThreshold: 38, // °C
  skinTemperatureThreshold: 38.5, // °C
};

export const RESPIRATORY_RULES = {
  spo2Threshold: 92, // % — below this is concerning
  aqiThreshold: 250, // above this is concerning
};

export const FALL_RULES = {
  impactGThreshold: 3.5, // g-force
  noMovementDurationMs: 3000, // must stay still this long to confirm a fall
};

// Risk level labels used everywhere in the app, so nobody accidentally
// types "moderate" in one file and "Moderate" in another.
export const RISK_LEVELS = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

// Alert type labels, same idea.
export const ALERT_TYPES = {
  HEAT: "HEAT",
  RESPIRATORY: "RESPIRATORY",
  FALL: "FALL",
  NONE: null,
};
