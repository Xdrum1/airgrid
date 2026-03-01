import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use fake timers BEFORE importing the module so the module-level
// setInterval is captured by the fake timer.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Dynamic import to get a fresh module per describe isn't needed —
// we use unique keys per test to avoid shared state.
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows the first request", () => {
    const result = rateLimit("test-first-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests up to the limit", () => {
    const key = "test-at-limit-1";
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
    // 5th request: remaining should be 0
    const last = rateLimit(key, 5, 60_000);
    expect(last.allowed).toBe(false);
    expect(last.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const key = "test-over-limit-1";
    // exhaust limit
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    const result = rateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const key = "test-window-reset-1";
    // exhaust limit
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 10_000);
    }
    expect(rateLimit(key, 3, 10_000).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(11_000);

    const result = rateLimit(key, 3, 10_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("tracks separate keys independently", () => {
    const keyA = "test-key-a-1";
    const keyB = "test-key-b-1";

    // exhaust keyA
    for (let i = 0; i < 2; i++) {
      rateLimit(keyA, 2, 60_000);
    }
    expect(rateLimit(keyA, 2, 60_000).allowed).toBe(false);

    // keyB should still be fresh
    const resultB = rateLimit(keyB, 2, 60_000);
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(1);
  });

  it("returns correct resetAt timestamp", () => {
    const now = Date.now();
    const result = rateLimit("test-reset-at-1", 5, 30_000);
    expect(result.resetAt).toBe(now + 30_000);
  });

  it("returns consistent resetAt within the same window", () => {
    const key = "test-reset-consistent-1";
    const first = rateLimit(key, 5, 30_000);
    vi.advanceTimersByTime(5_000);
    const second = rateLimit(key, 5, 30_000);
    expect(second.resetAt).toBe(first.resetAt);
  });
});
