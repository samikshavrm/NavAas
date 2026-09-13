/**
 * useSensorData.js
 * ----------------
 * This is the bridge between Person 2's pipeline (sensorProvider,
 * simulator, detectionEngine) and Person 1's React UI.
 *
 * It starts the simulator, listens for every new sensor packet, runs it
 * through the detection engine, and keeps the latest values in React
 * state — so any component using this hook automatically re-renders
 * whenever new (fake, for now) sensor data arrives.
 *
 * HOW TO USE IN A COMPONENT:
 *   import { useSensorData } from "../hooks/useSensorData";
 *
 *   function Dashboard() {
 *     const { sensorData, riskResult, setScenario } = useSensorData();
 *     // sensorData   -> latest raw packet, e.g. { heartRate: 138, ... }
 *     // riskResult   -> latest detection result, e.g. { riskLevel: "MODERATE", ... }
 *     // setScenario  -> call this from Demo Controller buttons,
 *     //                 e.g. setScenario("HEATWAVE")
 *   }
 */

import { useEffect, useState } from "react";
import { sensorProvider } from "../sensors/sensorProvider";
import { simulator } from "../sensors/simulator";
import { detectionEngine } from "../engine/detectionEngine";

export function useSensorData() {
  const [sensorData, setSensorData] = useState(sensorProvider.createBaselinePacket());
  const [riskResult, setRiskResult] = useState({
    riskLevel: "LOW",
    alertType: null,
    reason: "Waiting for first reading...",
    timestamp: Date.now(),
  });

  useEffect(() => {
    // Start generating fake sensor data as soon as this hook mounts.
    simulator.start();

    // Subscribe to every new packet. This function runs every ~1.5s
    // (or during a fall sequence, more often for a few seconds).
    const unsubscribe = sensorProvider.subscribe((data) => {
      setSensorData(data);
      const result = detectionEngine.analyze(data);
      setRiskResult(result);
    });

    // Cleanup: stop the simulator and unsubscribe if this component
    // ever unmounts, so we don't leak timers.
    return () => {
      unsubscribe();
      simulator.stop();
    };
  }, []); // empty array = run this setup only once, on mount

  /**
   * Call this from Demo Controller buttons to switch scenarios.
   * Also resets the detection engine's internal fall-tracking state,
   * so switching away from FALL and back doesn't carry over stale timing.
   */
  function setScenario(scenarioName) {
    detectionEngine.reset();
    simulator.setScenario(scenarioName);
  }

  return { sensorData, riskResult, setScenario };
}
