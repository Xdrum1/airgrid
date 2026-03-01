import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock ----
vi.mock("@/lib/changelog", () => ({
  getChangelogEntries: vi.fn(),
}));

import { GET } from "./route";
import { getChangelogEntries } from "@/lib/changelog";
import { NextRequest } from "next/server";

const mockGetEntries = vi.mocked(getChangelogEntries);

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/changelog");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const fakeEntry = {
  id: "cl_1",
  changeType: "new_filing",
  relatedEntityType: "city",
  relatedEntityId: "los_angeles",
  summary: "Test entry",
  timestamp: "2026-02-01T00:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  mockGetEntries.mockResolvedValue([fakeEntry as never]);
});

describe("GET /api/changelog", () => {
  it("defaults to limit 50", async () => {
    await GET(makeRequest());
    expect(mockGetEntries).toHaveBeenCalledWith({
      limit: 50,
      changeType: undefined,
    });
  });

  it("accepts a custom limit", async () => {
    await GET(makeRequest({ limit: "10" }));
    expect(mockGetEntries).toHaveBeenCalledWith({
      limit: 10,
      changeType: undefined,
    });
  });

  it("clamps limit minimum to 1", async () => {
    await GET(makeRequest({ limit: "-5" }));
    expect(mockGetEntries).toHaveBeenCalledWith({
      limit: 1,
      changeType: undefined,
    });
  });

  it("clamps limit maximum to 500", async () => {
    await GET(makeRequest({ limit: "9999" }));
    expect(mockGetEntries).toHaveBeenCalledWith({
      limit: 500,
      changeType: undefined,
    });
  });

  it("passes type filter when provided", async () => {
    await GET(makeRequest({ type: "new_filing" }));
    expect(mockGetEntries).toHaveBeenCalledWith({
      limit: 50,
      changeType: "new_filing",
    });
  });

  it("returns correct response shape", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(body.fetchedAt).toBeDefined();
  });

  it("returns 500 on error", async () => {
    mockGetEntries.mockRejectedValue(new Error("db fail"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed/i);
  });
});
