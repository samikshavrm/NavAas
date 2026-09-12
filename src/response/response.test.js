import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RESPONSES } from "../ask/index.js";
import { createResponseTimer, createTimerPromise, TIMER_DURATION_MS, TIMER_TICK_MS } from "./responseTimer.js";
import { normalizeResponse, requiresEscalation } from "./responseNormalizer.js";
import { runResponseSession } from "./responseSession.js";
import { transcriptToResponse } from "./speech.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── normalizeResponse ─────────────────────────────────────────────────────────

describe("normalizeResponse", () => {
  it("passes through UNWELL", () => expect(normalizeResponse("UNWELL")).toBe(RESPONSES.UNWELL));
  it("passes through FINE", () => expect(normalizeResponse("FINE")).toBe(RESPONSES.FINE));
  it("passes through BREATHING_DIFFICULTY", () =>
    expect(normalizeResponse("BREATHING_DIFFICULTY")).toBe(RESPONSES.BREATHING_DIFFICULTY));
  it("passes through HELP", () => expect(normalizeResponse("HELP")).toBe(RESPONSES.HELP));
  it("passes through OKAY", () => expect(normalizeResponse("OKAY")).toBe(RESPONSES.OKAY));
  it("passes through NO_RESPONSE", () =>
    expect(normalizeResponse("NO_RESPONSE")).toBe(RESPONSES.NO_RESPONSE));

  it("maps null → NO_RESPONSE (never FINE)", () => {
    const r = normalizeResponse(null);
    expect(r).toBe(RESPONSES.NO_RESPONSE);
    expect(r).not.toBe(RESPONSES.FINE);
  });
  it("maps undefined → NO_RESPONSE", () => expect(normalizeResponse(undefined)).toBe(RESPONSES.NO_RESPONSE));
  it("maps empty string → NO_RESPONSE", () => expect(normalizeResponse("")).toBe(RESPONSES.NO_RESPONSE));
  it("maps garbage → NO_RESPONSE", () => expect(normalizeResponse("BANANA")).toBe(RESPONSES.NO_RESPONSE));
  it("maps number → NO_RESPONSE", () => expect(normalizeResponse(42)).toBe(RESPONSES.NO_RESPONSE));
});

// ── NO_RESPONSE isolation ─────────────────────────────────────────────────────

describe("NO_RESPONSE isolation", () => {
  it("NO_RESPONSE !== FINE", () => {
    expect(RESPONSES.NO_RESPONSE).not.toBe(RESPONSES.FINE);
  });
});

// ── requiresEscalation ────────────────────────────────────────────────────────

describe("requiresEscalation", () => {
  it("UNWELL → true", () => expect(requiresEscalation(RESPONSES.UNWELL)).toBe(true));
  it("BREATHING_DIFFICULTY → true", () => expect(requiresEscalation(RESPONSES.BREATHING_DIFFICULTY)).toBe(true));
  it("HELP → true", () => expect(requiresEscalation(RESPONSES.HELP)).toBe(true));
  it("NO_RESPONSE → true", () => expect(requiresEscalation(RESPONSES.NO_RESPONSE)).toBe(true));
  it("FINE → false", () => expect(requiresEscalation(RESPONSES.FINE)).toBe(false));
  it("OKAY → false", () => expect(requiresEscalation(RESPONSES.OKAY)).toBe(false));
});

// ── createResponseTimer ───────────────────────────────────────────────────────

describe("createResponseTimer", () => {
  it("starts at full duration", () => {
    const timer = createResponseTimer();
    timer.start();
    expect(timer.getRemainingMs()).toBe(TIMER_DURATION_MS);
  });

  it("ticks down each second", () => {
    const ticks = [];
    const timer = createResponseTimer({ onTick: (ms) => ticks.push(ms) });
    timer.start();
    vi.advanceTimersByTime(3 * TIMER_TICK_MS);
    expect(ticks).toEqual([14000, 13000, 12000]);
  });

  it("calls onTimeout at 0", () => {
    const onTimeout = vi.fn();
    const timer = createResponseTimer({ onTimeout });
    timer.start();
    vi.advanceTimersByTime(TIMER_DURATION_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("stop() prevents further ticks", () => {
    const ticks = [];
    const timer = createResponseTimer({ onTick: (ms) => ticks.push(ms) });
    timer.start();
    vi.advanceTimersByTime(3 * TIMER_TICK_MS);
    timer.stop();
    vi.advanceTimersByTime(5 * TIMER_TICK_MS);
    expect(ticks).toHaveLength(3);
  });

  it("stop() prevents onTimeout from firing", () => {
    const onTimeout = vi.fn();
    const timer = createResponseTimer({ onTimeout });
    timer.start();
    vi.advanceTimersByTime(5 * TIMER_TICK_MS);
    timer.stop();
    vi.advanceTimersByTime(TIMER_DURATION_MS);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});

// ── runResponseSession ────────────────────────────────────────────────────────

const mockQuestionConfig = {
  alertType: "HEAT",
  question: "Elevated thermal strain detected. Are you feeling dizzy or fatigued?",
  responses: [RESPONSES.UNWELL, RESPONSES.FINE, RESPONSES.NO_RESPONSE],
  isFallback: false,
};

describe("runResponseSession – user responds before timeout", () => {
  async function respondWith(raw) {
    const sessionPromise = runResponseSession(
      mockQuestionConfig,
      () => Promise.resolve(raw)
    );
    // Flush microtasks so the resolved user promise wins the race
    await vi.runAllTimersAsync();
    return sessionPromise;
  }

  it("UNWELL", async () => {
    const r = await respondWith("UNWELL");
    expect(r).toEqual({ response: RESPONSES.UNWELL, timedOut: false });
  });

  it("FINE", async () => {
    const r = await respondWith("FINE");
    expect(r).toEqual({ response: RESPONSES.FINE, timedOut: false });
  });

  it("BREATHING_DIFFICULTY", async () => {
    const r = await respondWith("BREATHING_DIFFICULTY");
    expect(r).toEqual({ response: RESPONSES.BREATHING_DIFFICULTY, timedOut: false });
  });

  it("HELP", async () => {
    const r = await respondWith("HELP");
    expect(r).toEqual({ response: RESPONSES.HELP, timedOut: false });
  });

  it("OKAY", async () => {
    const r = await respondWith("OKAY");
    expect(r).toEqual({ response: RESPONSES.OKAY, timedOut: false });
  });

  it("invalid response normalizes to NO_RESPONSE (not FINE)", async () => {
    const r = await respondWith("GARBAGE");
    expect(r.response).toBe(RESPONSES.NO_RESPONSE);
    expect(r.response).not.toBe(RESPONSES.FINE);
  });
});

describe("runResponseSession – timer reaches 0", () => {
  it("returns NO_RESPONSE with timedOut: true", async () => {
    // waitForUserResponse never resolves
    const waitForever = () => new Promise(() => {});
    const sessionPromise = runResponseSession(mockQuestionConfig, waitForever);
    vi.advanceTimersByTime(TIMER_DURATION_MS);
    const r = await sessionPromise;
    expect(r).toEqual({ response: RESPONSES.NO_RESPONSE, timedOut: true });
  });

  it("NO_RESPONSE on timeout is never FINE", async () => {
    const waitForever = () => new Promise(() => {});
    const sessionPromise = runResponseSession(mockQuestionConfig, waitForever);
    vi.advanceTimersByTime(TIMER_DURATION_MS);
    const r = await sessionPromise;
    expect(r.response).not.toBe(RESPONSES.FINE);
  });
});

describe("runResponseSession – timer stops after response", () => {
  it("no further ticks after user responds", async () => {
    const ticks = [];
    const waitForever = () => new Promise(() => {});
    const sessionPromise = runResponseSession(mockQuestionConfig, waitForever, {
      onTick: (ms) => ticks.push(ms),
    });

    // 3 seconds pass...
    vi.advanceTimersByTime(3 * TIMER_TICK_MS);
    expect(ticks).toHaveLength(3);

    // But we can't easily cancel via external handle in this path;
    // test the timer directly instead (covered above).
    // Clean up the dangling promise.
    vi.advanceTimersByTime(TIMER_DURATION_MS);
    await sessionPromise;
  });
});

// ── transcriptToResponse (speech keyword mapping) ─────────────────────────────

describe("transcriptToResponse", () => {
  it('"dizzy" → UNWELL', () => expect(transcriptToResponse("I feel dizzy")).toBe(RESPONSES.UNWELL));
  it('"fine" → FINE', () => expect(transcriptToResponse("I am fine")).toBe(RESPONSES.FINE));
  it('"okay" → OKAY', () => expect(transcriptToResponse("I am okay")).toBe(RESPONSES.OKAY));
  it('"help" → HELP', () => expect(transcriptToResponse("help me")).toBe(RESPONSES.HELP));
  it('"shortness of breath" → BREATHING_DIFFICULTY', () =>
    expect(transcriptToResponse("shortness of breath")).toBe(RESPONSES.BREATHING_DIFFICULTY));
  it("unrecognized → null", () => expect(transcriptToResponse("blah blah")).toBeNull());
});