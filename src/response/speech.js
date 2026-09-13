/**
 * speech.js — Optional Web Speech API helpers.
 * Manual/button responses always work without this module.
 * All functions are no-ops when the browser does not support the API.
 */

// ── Feature detection ─────────────────────────────────────────────────────────

export const isSpeechRecognitionSupported =
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const isSpeechSynthesisSupported =
  typeof window !== "undefined" && !!window.speechSynthesis;

// ── Speech Synthesis (read question aloud) ────────────────────────────────────

/**
 * Reads a string aloud using SpeechSynthesis.
 * Resolves when done speaking or immediately if unsupported.
 *
 * @param {string} text
 * @param {Object} [options]
 * @param {number} [options.rate=0.95]
 * @param {number} [options.pitch=1]
 * @returns {Promise<void>}
 */
export function speakText(text, { rate = 0.95, pitch = 1 } = {}) {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel(); // clear any queued utterances

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve(); // fail silently
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stops any ongoing speech synthesis.
 */
export function stopSpeaking() {
  if (isSpeechSynthesisSupported) {
    window.speechSynthesis.cancel();
  }
}

// ── Speech Recognition (listen for user response) ────────────────────────────

const KEYWORD_MAP = {
  unwell: "UNWELL",
  dizzy: "UNWELL",
  fatigued: "UNWELL",
  "not okay": "UNWELL",
  "not fine": "UNWELL",
  fine: "FINE",
  okay: "OKAY",
  ok: "OKAY",
  "i'm okay": "OKAY",
  "i am okay": "OKAY",
  help: "HELP",
  "i need help": "HELP",
  injured: "HELP",
  "cannot move": "HELP",
  "can't move": "HELP",
  "breathing difficulty": "BREATHING_DIFFICULTY",
  "shortness of breath": "BREATHING_DIFFICULTY",
  "can't breathe": "BREATHING_DIFFICULTY",
  "cannot breathe": "BREATHING_DIFFICULTY",
};

/**
 * Maps a transcript string to a RESPONSES constant.
 * Returns null if no keyword matched.
 *
 * @param {string} transcript
 * @returns {string|null}
 */
export function transcriptToResponse(transcript) {
  const lower = transcript.toLowerCase().trim();
  for (const [keyword, response] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return response;
  }
  return null;
}

/**
 * Starts speech recognition and resolves with a matched RESPONSES value.
 * Resolves with null if nothing matched or recognition is unsupported.
 * The caller is responsible for stopping it via the returned stop() function.
 *
 * @param {Object} [options]
 * @param {function(string): void} [options.onTranscript]  Raw transcript callback.
 * @returns {{ promise: Promise<string|null>, stop: function }}
 */
export function startSpeechRecognition({ onTranscript } = {}) {
  if (!isSpeechRecognitionSupported) {
    return { promise: Promise.resolve(null), stop: () => {} };
  }

  let resolveFn;
  const promise = new Promise((resolve) => {
    resolveFn = resolve;
  });

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onTranscript?.(transcript);
    const matched = transcriptToResponse(transcript);
    resolveFn(matched);
  };

  recognition.onerror = () => resolveFn(null);
  recognition.onend = () => resolveFn(null); // no result before end

  recognition.start();

  function stop() {
    try {
      recognition.stop();
    } catch (_) {
      // already stopped
    }
  }

  return { promise, stop };
}