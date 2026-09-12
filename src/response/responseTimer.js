import { RESPONSES } from "../ask/index.js";

export const TIMER_DURATION_MS = 15_000;
export const TIMER_TICK_MS = 1_000;

/**
 * Creates a 15-second response timer.
 *
 * @param {Object} options
 * @param {function(number): void} [options.onTick]      Called each second with remaining ms.
 * @param {function(): void}       [options.onTimeout]   Called when timer reaches 0.
 * @returns {{ start: function, stop: function, getRemainingMs: function }}
 */
export function createResponseTimer({ onTick, onTimeout } = {}) {
  let intervalId = null;
  let remainingMs = TIMER_DURATION_MS;
  let stopped = false;

  function getRemainingMs() {
    return remainingMs;
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    stopped = true;
  }

  function start() {
    if (intervalId !== null) return; // already running
    stopped = false;
    remainingMs = TIMER_DURATION_MS;

    intervalId = setInterval(() => {
      if (stopped) {
        stop();
        return;
      }

      remainingMs -= TIMER_TICK_MS;
      onTick?.(remainingMs);

      if (remainingMs <= 0) {
        stop();
        onTimeout?.();
      }
    }, TIMER_TICK_MS);
  }

  return { start, stop, getRemainingMs };
}

/**
 * Promise-based wrapper.
 * Resolves with { response: NO_RESPONSE, timedOut: true } after 15 s.
 * Caller must call cancel() if the user responds before timeout.
 *
 * @param {Object} [options]
 * @param {function(number): void} [options.onTick]
 * @returns {{ promise: Promise<{response: string, timedOut: boolean}>, cancel: function }}
 */
export function createTimerPromise({ onTick } = {}) {
  let resolveFn;

  const promise = new Promise((resolve) => {
    resolveFn = resolve;
  });

  const timer = createResponseTimer({
    onTick,
    onTimeout: () => resolveFn({ response: RESPONSES.NO_RESPONSE, timedOut: true }),
  });

  function cancel() {
    timer.stop();
  }

  timer.start();

  return { promise, cancel, getRemainingMs: timer.getRemainingMs };
}