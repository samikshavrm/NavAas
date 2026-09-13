/**
 * testDrive.js
 * ------------
 * A quick standalone test to prove the whole Person 2 pipeline works,
 * WITHOUT needing any UI from Person 1 or 3.
 *
 * This subscribes to the sensor provider, runs every packet through the
 * detection engine, and prints the result to the console. Then it also
 * demonstrates the reassessment engine with a fake user response.
 *
 * HOW TO RUN THIS FILE:
 * 1. Copy sensors/ and engine/ folders into your project's src/ folder.
 * 2. Copy this file into src/ as well (e.g. src/testDrive.js).
 * 3. In your main.jsx (or App.jsx) temporarily add this line at the top:
 *      import "./testDrive";
 * 4. Run `npm run dev` and open the browser.
 * 5. Open the browser DevTools console (F12) — you'll see log output
 *    showing risk level changing as scenarios switch.
 * 6. Once you've confirmed it works, remove the `import "./testDrive"`
 *    line so it doesn't run during the real demo.
 */

import { sensorProvider } from "./sensors/sensorProvider";
import { simulator } from "./sensors/simulator";
import { detectionEngine } from "./engine/detectionEngine";
import { reassessmentEngine } from "./engine/reassessmentEngine";

console.log("=== Person 2 pipeline test starting ===");

// Listen to every sensor packet and run it through detection.
sensorProvider.subscribe((sensorData) => {
  const result = detectionEngine.analyze(sensorData);
  console.log(
    `[${result.riskLevel}]`,
    result.alertType ? `ALERT: ${result.alertType}` : "no alert",
    "-",
    result.reason,
    sensorData
  );
});

// Start with baseline, then switch scenarios every few seconds so you
// can watch the risk level change automatically in the console.
simulator.start();

setTimeout(() => {
  console.log("\n--- Switching to HEATWAVE scenario ---\n");
  detectionEngine.reset();
  simulator.setScenario("HEATWAVE");
}, 4000);

setTimeout(() => {
  console.log("\n--- Testing reassessment: user says UNWELL during heat alert ---\n");
  const fakeDetection = {
    riskLevel: "MODERATE",
    alertType: "HEAT",
    reason: "Elevated heart rate with high ambient temperature",
  };
  const finalResult = reassessmentEngine.reassess(fakeDetection, "UNWELL");
  console.log("Final reassessed result:", finalResult);
}, 8000);

setTimeout(() => {
  console.log("\n--- Switching to FALL scenario ---\n");
  detectionEngine.reset();
  simulator.setScenario("FALL");
}, 12000);

setTimeout(() => {
  console.log("\n--- Testing reassessment: NO RESPONSE during fall alert ---\n");
  const fakeDetection = {
    riskLevel: "HIGH",
    alertType: "FALL",
    reason: "Impact detected followed by no movement",
  };
  const finalResult = reassessmentEngine.reassess(fakeDetection, "NO_RESPONSE");
  console.log("Final reassessed result:", finalResult);
}, 18000);
