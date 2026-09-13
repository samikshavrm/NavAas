/**
 * simulator.js
 * ------------
 * This is the FAKE sensor source for the MVP. It generates sensor packets
 * that look realistic (small random jitter, not frozen numbers) and sends
 * them through sensorProvider.emit().
 *
 * This file is the ONLY thing that will be replaced later by a real
 * Bluetooth/ESP32 provider. Everything else (detection engine, UI) never
 * needs to change.
 *
 * HOW TO USE (from the Demo Controller buttons in the UI):
 *   import { simulator } from "./simulator";
 *   simulator.start();                     // begin emitting data
 *   simulator.setScenario("HEATWAVE");      // switch scenario anytime
 *   simulator.stop();                       // stop emitting (optional)
 */

import { sensorProvider } from "./sensorProvider";

// Target values for each scenario. The simulator jitters around these.
const SCENARIOS = {
  BASELINE: {
    heartRate: 72,
    spo2: 98,
    skinTemperature: 36.5,
    ambientTemperature: 28,
    humidity: 50,
    aqi: 50,
    activity: "resting",
  },
  HEATWAVE: {
    heartRate: 138,
    spo2: 98,
    skinTemperature: 38.8,
    ambientTemperature: 43,
    humidity: 65,
    aqi: 60,
    activity: "active",
  },
  RESPIRATORY: {
    heartRate: 110,
    spo2: 89,
    skinTemperature: 37.2,
    ambientTemperature: 30,
    humidity: 55,
    aqi: 340,
    activity: "resting",
  },
  FALL: {
    heartRate: 125,
    spo2: 95,
    skinTemperature: 36.8,
    ambientTemperature: 29,
    humidity: 50,
    aqi: 55,
    activity: "resting",
  },
};

// Internal state
let currentScenarioName = "BASELINE";
let intervalId = null;
let fallSequenceTimeoutIds = [];

/**
 * Adds small random jitter to a number so repeated readings don't look
 * frozen/fake. Example: jitter(138, 2) might return 136.4, 139.1, etc.
 */
function jitter(value, spread) {
  const offset = (Math.random() * 2 - 1) * spread; // range: -spread to +spread
  return Math.round((value + offset) * 10) / 10; // round to 1 decimal place
}

/**
 * Builds one sensor packet for the current scenario, with jitter applied,
 * plus impact/movement fields which only matter for the FALL scenario.
 */
function buildPacket(overrides = {}) {
  const base = SCENARIOS[currentScenarioName];

  return {
    heartRate: Math.round(jitter(base.heartRate, 3)),
    spo2: Math.round(jitter(base.spo2, 1)),
    skinTemperature: jitter(base.skinTemperature, 0.3),
    ambientTemperature: jitter(base.ambientTemperature, 1),
    humidity: Math.round(jitter(base.humidity, 3)),
    aqi: Math.round(jitter(base.aqi, 10)),
    activity: base.activity,
    impactG: 0,
    movement: true,
    timestamp: Date.now(),
    ...overrides, // lets the FALL sequence override impactG/movement briefly
  };
}

/**
 * The FALL scenario isn't a steady state like the others — it's an event:
 * a sudden impact spike, followed by a period of "no movement" (which is
 * what the detection engine watches for), then recovery.
 * This function plays that sequence out over a few seconds.
 *
 * IMPORTANT: while this sequence plays, the regular setInterval loop is
 * paused. Otherwise the interval would keep emitting movement:true
 * packets in between the fall sequence's movement:false packets, and
 * the detection engine would keep resetting instead of confirming the
 * fall. The interval resumes automatically once the sequence finishes.
 */
function playFallSequence() {
  // Clear any previous fall sequence that might still be scheduled
  fallSequenceTimeoutIds.forEach(clearTimeout);
  fallSequenceTimeoutIds = [];

  // Pause the regular periodic emission so it can't interleave with
  // the fall sequence below.
  const wasRunning = intervalId !== null;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  // Moment 0: the impact itself
  sensorProvider.emit(buildPacket({ impactG: 4.2, movement: false }));

  // Over the next few seconds: still no movement (this is what lets the
  // detection engine confirm "impact + no movement for 3+ seconds")
  const noMovementTicks = [1000, 2000, 3000, 4000];
  noMovementTicks.forEach((delay) => {
    const id = setTimeout(() => {
      sensorProvider.emit(buildPacket({ impactG: 0, movement: false }));
    }, delay);
    fallSequenceTimeoutIds.push(id);
  });

  // After ~5 seconds, movement resumes so the demo doesn't get stuck,
  // and normal periodic emission restarts (if it was running before).
  const resumeId = setTimeout(() => {
    sensorProvider.emit(buildPacket({ impactG: 0, movement: true }));
    if (wasRunning) {
      intervalId = setInterval(() => {
        sensorProvider.emit(buildPacket());
      }, 1500);
    }
  }, 5000);
  fallSequenceTimeoutIds.push(resumeId);
}

/**
 * Starts emitting sensor data every 1.5 seconds for the current scenario.
 * Safe to call multiple times — it won't create duplicate intervals.
 */
function start() {
  if (intervalId) return; // already running

  // Emit one packet immediately so the UI doesn't wait 1.5s for first data
  sensorProvider.emit(buildPacket());

  intervalId = setInterval(() => {
    sensorProvider.emit(buildPacket());
  }, 1500);
}

/** Stops emitting sensor data. */
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  fallSequenceTimeoutIds.forEach(clearTimeout);
  fallSequenceTimeoutIds = [];
}

/**
 * Switches the active demo scenario. This is what the Demo Controller
 * buttons (BASELINE / HEATWAVE / RESPIRATORY / FALL) should call.
 * @param {"BASELINE"|"HEATWAVE"|"RESPIRATORY"|"FALL"} name
 */
function setScenario(name) {
  if (!SCENARIOS[name]) {
    console.warn(`Unknown scenario "${name}". Use one of:`, Object.keys(SCENARIOS));
    return;
  }

  currentScenarioName = name;

  if (name === "FALL") {
    // Fall is a one-time event sequence, not a steady jittering state
    playFallSequence();
  } else {
    // Emit an immediate packet for instant UI feedback on switch
    sensorProvider.emit(buildPacket());
  }
}

function getCurrentScenario() {
  return currentScenarioName;
}

export const simulator = {
  start,
  stop,
  setScenario,
  getCurrentScenario,
};
