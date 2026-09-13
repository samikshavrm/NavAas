import { RISK_LEVELS } from "../reassessment/reassessmentConfig.js";

// ── Severity labels (mirrors finalRiskLevel) ──────────────────────────────────

export const SEVERITY = RISK_LEVELS; // LOW | MODERATE | HIGH | CRITICAL | UNKNOWN

// ── Per-alert, per-severity instruction sets ──────────────────────────────────

export const SAFETY_INSTRUCTIONS = {
  HEAT: {
    [RISK_LEVELS.LOW]: [
      "Take a short break from physical activity.",
      "Move to a cooler or shaded area if possible.",
      "Drink water or a hydrating beverage.",
    ],
    [RISK_LEVELS.MODERATE]: [
      "Stop strenuous activity immediately.",
      "Move to a cool or shaded area.",
      "Remove excess clothing and cool yourself down.",
      "Hydrate if conscious and able to drink.",
      "Seek help from someone nearby if symptoms continue or worsen.",
    ],
    [RISK_LEVELS.HIGH]: [
      "Stop all physical activity now.",
      "Move to the coolest available environment.",
      "Apply cool water to skin or use a fan to reduce body temperature.",
      "Drink cool water slowly if you are able to.",
      "Inform someone nearby of your condition.",
      "Seek medical attention if symptoms do not improve quickly.",
    ],
    [RISK_LEVELS.CRITICAL]: [
      "Stop all activity immediately.",
      "Move to the coolest available environment.",
      "Cool yourself down with water or ice if available.",
      "Ask someone nearby for immediate assistance.",
      "Emergency assistance may be required — SOS is being triggered.",
    ],
  },

  RESPIRATORY: {
    [RISK_LEVELS.LOW]: [
      "Stop physical exertion and rest.",
      "Move to an area with fresh, clean air.",
      "Breathe slowly and steadily.",
    ],
    [RISK_LEVELS.MODERATE]: [
      "Stop physical exertion immediately.",
      "Move away from polluted, smoky, or irritating air if possible.",
      "Sit upright and remain calm.",
      "Breathe slowly and try to regulate your breathing.",
      "Seek nearby assistance if breathing difficulty continues.",
    ],
    [RISK_LEVELS.HIGH]: [
      "Stop all activity immediately.",
      "Move to fresh air as quickly as safely possible.",
      "Sit upright — do not lie flat.",
      "Remain calm and breathe slowly.",
      "Inform someone nearby of your difficulty breathing.",
      "Seek medical attention urgently if symptoms worsen.",
    ],
    [RISK_LEVELS.CRITICAL]: [
      "Stop all activity immediately.",
      "Move to fresh air if you are safely able to do so.",
      "Sit upright and remain as calm as possible.",
      "Ask someone nearby for immediate assistance.",
      "Emergency assistance may be required — SOS is being triggered.",
    ],
  },

  FALL: {
    [RISK_LEVELS.LOW]: [
      "Take a moment to rest before continuing.",
      "Check yourself for any minor injuries.",
      "Move carefully and avoid rushing.",
    ],
    [RISK_LEVELS.MODERATE]: [
      "Stay still for a moment and assess how you feel.",
      "Check for any pain or injuries before standing.",
      "Ask someone nearby for assistance if needed.",
    ],
    [RISK_LEVELS.HIGH]: [
      "Do not move suddenly — assess your condition carefully.",
      "Avoid putting weight on any area that feels painful.",
      "Ask someone nearby for assistance.",
      "Seek medical attention if you suspect an injury.",
    ],
    [RISK_LEVELS.CRITICAL]: [
      "Avoid unnecessary movement if you may be injured.",
      "Ask someone nearby for immediate assistance.",
      "Do not attempt to stand if you feel pain or dizziness.",
      "Emergency assistance may be required — SOS is being triggered.",
    ],
  },
};

// ── Fallback instructions for unknown/invalid inputs ──────────────────────────

export const FALLBACK_INSTRUCTIONS = [
  "Stay calm and assess your surroundings.",
  "Seek assistance from someone nearby if you feel unwell.",
];

// ── SOS trigger threshold ─────────────────────────────────────────────────────

export const SOS_TRIGGER_LEVELS = new Set([RISK_LEVELS.CRITICAL]);