/**
 * detectionEngine.js
 * ------------------
 * This is "the brain" for anomaly detection.
 *
 * IMPORTANT ARCHITECTURE RULE:
 * This file receives ONLY a standard sensor-data packet (see
 * sensorProvider.js for the shape). It does NOT know or care whether
 * that packet came from the simulator or from real Bluetooth hardware.
 * That's what makes this code reusable in the final hardware project
 * without any changes.
 *
 * HOW TO USE:
 *   import { detectionEngine } from "./detectionEngine";
 *   const result = detectionEngine.analyze(sensorPacket);
 *   // result looks like:
 *   // { riskLevel: "MODERATE", alertType: "HEAT", reason: "...", timestamp: ... }
 */

import {
  HEAT_RULES,
  RESPIRATORY_RULES,
  FALL_RULES,
  RISK_LEVELS,
  ALERT_TYPES,
} from "./detectionRules";

// --- Fall detection needs to remember state across multiple packets ---
// (an impact by itself isn't a confirmed fall — we need to see NO
// movement for a sustained period afterward). This small bit of state
// lives here, inside the engine, NOT in the UI.
let lastImpactTimestamp = null;
let noMovementSinceTimestamp = null;

/**
 * Checks the heat-stress rule:
 * HR > 120 AND ambient > 38   OR   skin temp > 38.5
 */
function checkHeatRisk(data) {
  const heatByHrAndAmbient =
    data.heartRate > HEAT_RULES.heartRateThreshold &&
    data.ambientTemperature > HEAT_RULES.ambientTemperatureThreshold;

  const heatBySkinTemp = data.skinTemperature > HEAT_RULES.skinTemperatureThreshold;

  if (heatByHrAndAmbient || heatBySkinTemp) {
    return {
      riskLevel: RISK_LEVELS.MODERATE,
      alertType: ALERT_TYPES.HEAT,
      reason: heatByHrAndAmbient
        ? `Elevated heart rate (${data.heartRate} bpm) with high ambient temperature (${data.ambientTemperature}°C)`
        : `Elevated skin temperature (${data.skinTemperature}°C)`,
    };
  }

  return null;
}

/**
 * Checks the respiratory-risk rule:
 * SpO2 < 92 AND AQI > 250
 */
function checkRespiratoryRisk(data) {
  if (data.spo2 < RESPIRATORY_RULES.spo2Threshold && data.aqi > RESPIRATORY_RULES.aqiThreshold) {
    return {
      riskLevel: RISK_LEVELS.MODERATE,
      alertType: ALERT_TYPES.RESPIRATORY,
      reason: `Low oxygen saturation (${data.spo2}%) with poor air quality (AQI ${data.aqi})`,
    };
  }

  return null;
}

/**
 * Checks the fall-detection rule:
 * impact > 3.5G, followed by no movement for 3+ continuous seconds.
 * This one is stateful because it has to track time across packets.
 */
function checkFallRisk(data) {
  const now = data.timestamp || Date.now();

  // Step 1: did an impact just happen?
  if (data.impactG > FALL_RULES.impactGThreshold) {
    lastImpactTimestamp = now;
    noMovementSinceTimestamp = null; // reset — we'll start tracking stillness below
  }

  // Step 2: track how long movement has been false since the last impact
  if (lastImpactTimestamp !== null) {
    if (!data.movement) {
      if (noMovementSinceTimestamp === null) {
        noMovementSinceTimestamp = now;
      }

      const stillDurationMs = now - noMovementSinceTimestamp;

      if (stillDurationMs >= FALL_RULES.noMovementDurationMs) {
        return {
          riskLevel: RISK_LEVELS.HIGH,
          alertType: ALERT_TYPES.FALL,
          reason: `Impact detected followed by ${Math.round(stillDurationMs / 1000)}s of no movement`,
        };
      }
    } else {
      // Movement resumed — person seems okay, clear the fall tracking
      lastImpactTimestamp = null;
      noMovementSinceTimestamp = null;
    }
  }

  return null;
}

/**
 * Main entry point. Runs all detection rules against one sensor packet
 * and returns a single structured result.
 *
 * If multiple risks are true at once, fall takes priority (safety-first),
 * then heat, then respiratory. This priority order can be changed here
 * without touching any individual rule function.
 */
function analyze(sensorData) {
  const fallResult = checkFallRisk(sensorData);
  if (fallResult) return finalize(fallResult);

  const heatResult = checkHeatRisk(sensorData);
  if (heatResult) return finalize(heatResult);

  const respiratoryResult = checkRespiratoryRisk(sensorData);
  if (respiratoryResult) return finalize(respiratoryResult);

  // Nothing triggered — all clear
  return finalize({
    riskLevel: RISK_LEVELS.LOW,
    alertType: ALERT_TYPES.NONE,
    reason: "All readings within normal range",
  });
}

function finalize(result) {
  return {
    ...result,
    timestamp: Date.now(),
  };
}

/**
 * Resets internal fall-tracking state. Useful when switching demo
 * scenarios so leftover state from a previous fall doesn't linger.
 */
function reset() {
  lastImpactTimestamp = null;
  noMovementSinceTimestamp = null;
}

export const detectionEngine = {
  analyze,
  reset,
};
