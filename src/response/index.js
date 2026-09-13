export { createResponseTimer, createTimerPromise, TIMER_DURATION_MS, TIMER_TICK_MS } from "./responseTimer.js";
export { normalizeResponse, requiresEscalation } from "./responseNormalizer.js";
export { runResponseSession } from "./responseSession.js";
export {
  speakText,
  stopSpeaking,
  startSpeechRecognition,
  transcriptToResponse,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from "./speech.js";