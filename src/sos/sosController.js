import { RISK_LEVELS } from "../reassessment/reassessmentConfig.js";
import {
  SOS_COUNTDOWN_SECONDS,
  SOS_STATUS,
  DEMO_LOCATION,
  DEMO_EMERGENCY_CONTACT,
} from "./sosConfig.js";

/**
 * Determines whether SOS should activate given a reassessment result
 * and optional safety actions result.
 *
 * SOS activates ONLY for CRITICAL risk or explicit triggerSOS: true.
 * All other inputs — including invalid/missing — return false.
 *
 * @param {Object|null} reassessmentResult
 * @param {Object|null} [safetyActionsResult]
 * @returns {boolean}
 */
export function shouldActivateSOS(reassessmentResult, safetyActionsResult = null) {
  if (!reassessmentResult || typeof reassessmentResult !== "object") return false;

  const isCriticalRisk = reassessmentResult.finalRiskLevel === RISK_LEVELS.CRITICAL;
  const safetyTrigger =
    !!safetyActionsResult &&
    typeof safetyActionsResult === "object" &&
    safetyActionsResult.triggerSOS === true;

  return !!(isCriticalRisk || safetyTrigger);
}

/**
 * Creates a simulated SOS countdown controller.
 *
 * DEMO ONLY — does not contact real emergency services.
 *
 * @param {Object} options
 * @param {string}   options.alertType          e.g. "FALL"
 * @param {string}   options.reason             From reassessment result
 * @param {function(SOSState): void} options.onTick     Called each second
 * @param {function(SOSState): void} options.onComplete Called when countdown reaches 0
 * @param {function(SOSState): void} options.onCancel   Called when cancelled
 * @returns {{ start: function, cancel: function, getState: function }}
 */
export function createSOSController({
  alertType = "UNKNOWN",
  reason = "Emergency detected",
  onTick,
  onComplete,
  onCancel,
} = {}) {
  let remainingSeconds = SOS_COUNTDOWN_SECONDS;
  let status = SOS_STATUS.IDLE;
  let intervalId = null;
  let finished = false; // prevents double-fire after cancel

  function buildState() {
    return {
      status,
      remainingSeconds,
      alertType,
      reason,
      location: DEMO_LOCATION,
      emergencyContact: DEMO_EMERGENCY_CONTACT,
    };
  }

  function getState() {
    return buildState();
  }

  function cancel() {
    if (finished) return; // safe to call more than once
    finished = true;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    status = SOS_STATUS.CANCELLED;
    onCancel?.(buildState());
  }

  function start() {
    if (intervalId !== null || finished) return; // already running or done

    status = SOS_STATUS.COUNTDOWN;
    remainingSeconds = SOS_COUNTDOWN_SECONDS;

    intervalId = setInterval(() => {
      if (finished) {
        clearInterval(intervalId);
        intervalId = null;
        return;
      }

      remainingSeconds -= 1;
      onTick?.(buildState());

      if (remainingSeconds <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        finished = true;
        status = SOS_STATUS.SOS_SIMULATION_COMPLETE;
        onComplete?.(buildState());
      }
    }, 1000);
  }

  return { start, cancel, getState };
}

/**
 * Convenience: creates and immediately starts an SOS controller
 * if the inputs indicate a CRITICAL situation.
 * Returns null (and does nothing) if SOS should not activate.
 *
 * @param {Object} reassessmentResult
 * @param {Object} safetyActionsResult
 * @param {Object} callbacks  { onTick, onComplete, onCancel }
 * @returns {{ start, cancel, getState } | null}
 */
export function activateSOS(reassessmentResult, safetyActionsResult, callbacks = {}) {
  if (!shouldActivateSOS(reassessmentResult, safetyActionsResult)) return null;

  const controller = createSOSController({
    alertType: safetyActionsResult?.alertType ?? reassessmentResult?.alertType ?? "UNKNOWN",
    reason: reassessmentResult?.reason ?? "Emergency detected",
    ...callbacks,
  });

  controller.start();
  return controller;
}