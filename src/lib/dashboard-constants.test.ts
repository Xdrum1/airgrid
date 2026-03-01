import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "./dashboard-constants";

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-02-28T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for < 60 seconds ago', () => {
    const ts = new Date(NOW.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(ts)).toBe("just now");
  });

  it('returns "1m ago" for 60 seconds ago', () => {
    const ts = new Date(NOW.getTime() - 60_000).toISOString();
    expect(formatRelativeTime(ts)).toBe("1m ago");
  });

  it('returns "59m ago" for 59 minutes ago', () => {
    const ts = new Date(NOW.getTime() - 59 * 60_000).toISOString();
    expect(formatRelativeTime(ts)).toBe("59m ago");
  });

  it('returns "1h ago" for 1 hour ago', () => {
    const ts = new Date(NOW.getTime() - 60 * 60_000).toISOString();
    expect(formatRelativeTime(ts)).toBe("1h ago");
  });

  it('returns "23h ago" for 23 hours ago', () => {
    const ts = new Date(NOW.getTime() - 23 * 3600_000).toISOString();
    expect(formatRelativeTime(ts)).toBe("23h ago");
  });

  it('returns "1d ago" for 1 day ago', () => {
    const ts = new Date(NOW.getTime() - 24 * 3600_000).toISOString();
    expect(formatRelativeTime(ts)).toBe("1d ago");
  });

  it('returns "29d ago" for 29 days ago', () => {
    const ts = new Date(NOW.getTime() - 29 * 86400_000).toISOString();
    expect(formatRelativeTime(ts)).toBe("29d ago");
  });

  it('returns "Mon DD" for 30+ days ago in the current year', () => {
    // Use midday to avoid UTC→local date shift
    const ts = "2026-01-15T12:00:00Z";
    expect(formatRelativeTime(ts)).toBe("Jan 15");
  });

  it('returns "Mon DD, YYYY" for dates in a past year', () => {
    const ts = "2025-06-15T12:00:00Z";
    expect(formatRelativeTime(ts)).toBe("Jun 15, 2025");
  });
});
