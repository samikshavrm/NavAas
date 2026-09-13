import { RESPONSES } from "../ask/index.js";
import { createTimerPromise } from "./responseTimer.js";
import { normalizeResponse } from "./responseNormalizer.js";

/**
 * Runs a full response session for a given Ask Engine question config.
 *
 * The caller provides a `waitForUserResponse` function that returns a Promise
 * resolving to the user's raw response string (from a button click, speech, etc.).
 * This keeps the session logic UI-agnostic.
 *
 * @param {Object} questionConfig   Return value of getQuestionForAlert()
 * @param {function(): Promise<string>} waitForUserResponse
 * @param {Object} [options]
 * @param {function(number): void} [options.onTick]   Called each second with remaining ms.
 * @returns {Promise<{ response: string, timedOut: boolean }>}
 */
export async function runResponseSession(
  questionConfig,
  waitForUserResponse,
  { onTick } = {}
) {
  const { promise: timerPromise, cancel: cancelTimer } = createTimerPromise({ onTick });

  // Race: user responds vs timer expiry
  const result = await Promise.race([
    waitForUserResponse().then((raw) => {
      cancelTimer();
      const normalized = normalizeResponse(raw);
      return {
        response: normalized,
        timedOut: false,
      };
    }),
    timerPromise,
  ]);

  // Guarantee: NO_RESPONSE is never converted to FINE
  if (result.timedOut && result.response !== RESPONSES.NO_RESPONSE) {
    result.response = RESPONSES.NO_RESPONSE;
  }

  return result;
}