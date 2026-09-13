/**
 * sensorProvider.js
 * ------------------
 * This file is the "middleman" between whoever is producing sensor data
 * (right now: the fake simulator, later: Bluetooth/ESP32) and whoever is
 * consuming sensor data (the detection engine, the UI).
 *
 * IMPORTANT ARCHITECTURE RULE:
 * Nothing outside this file should know HOW sensor data is produced.
 * The UI and detection engine only ever call `subscribe()` and receive
 * data in the standard shape below. That's what makes it possible to
 * swap the simulator for real Bluetooth sensors later without touching
 * any other file.
 *
 * STANDARD SENSOR DATA SHAPE (every packet looks like this):
 * {
 *   heartRate: number,            // beats per minute
 *   spo2: number,                 // blood oxygen %, 0-100
 *   skinTemperature: number,      // degrees Celsius
 *   ambientTemperature: number,   // degrees Celsius
 *   humidity: number,             // percentage, 0-100
 *   aqi: number,                  // air quality index
 *   activity: "resting" | "active",
 *   impactG: number,              // g-force of last impact, 0 if none
 *   movement: boolean,            // true = still moving/breathing normally
 *   timestamp: number             // Date.now()
 * }
 */

// Internal list of functions that want to be notified when new data arrives.
let listeners = [];

/**
 * Call this to start receiving sensor data.
 * @param {(data: object) => void} callback - runs every time new data arrives
 * @returns {() => void} unsubscribe function - call it to stop listening
 */
function subscribe(callback) {
  listeners.push(callback);

  // Return an "unsubscribe" function so React components can clean up
  // in a useEffect return statement.
  return function unsubscribe() {
    listeners = listeners.filter((fn) => fn !== callback);
  };
}

/**
 * Call this whenever a new sensor packet is ready to be sent out.
 * Only the simulator (or later, the Bluetooth provider) should call this.
 * The UI and detection engine should NEVER call emit() directly.
 * @param {object} data - a sensor packet matching the standard shape above
 */
function emit(data) {
  listeners.forEach((callback) => callback(data));
}

/**
 * Utility: builds a default/baseline sensor packet.
 * Useful as a safe starting point before any scenario is selected.
 */
function createBaselinePacket() {
  return {
    heartRate: 72,
    spo2: 98,
    skinTemperature: 36.5,
    ambientTemperature: 28,
    humidity: 50,
    aqi: 50,
    activity: "resting",
    impactG: 0,
    movement: true,
    timestamp: Date.now(),
  };
}

// This is what other files import. Keeping it as a single object makes
// it easy to later swap this whole file for a "bluetoothProvider.js"
// that exposes the exact same subscribe/emit interface.
export const sensorProvider = {
  subscribe,
  emit,
  createBaselinePacket,
};
