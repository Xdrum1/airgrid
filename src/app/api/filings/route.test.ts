import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/faa-api", () => ({
  fetchFederalRegisterUAM: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

import { GET } from "./route";
import { auth } from "@/auth";
import { fetchFederalRegisterUAM } from "@/lib/faa-api";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const mockAuth = vi.mocked(auth);
const mockFetch = vi.mocked(fetchFederalRegisterUAM);
const mockRateLimit = vi.mocked(rateLimit);

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/filings");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

beforeEach(() => {
  vi.resetAllMocks();
  // Default: authenticated + allowed
  mockAuth.mockResolvedValue({ user: { id: "u1" } } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
  mockRateLimit.mockReturnValue({ allowed: true, remaining: 19, resetAt: Date.now() + 300_000 });
  mockFetch.mockResolvedValue([]);
});

describe("GET /api/filings", () => {
  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/authentication/i);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/rate limit/i);
  });

  it("returns success with correct shape", async () => {
    const fakeFiling = { document_number: "123", title: "Test" };
    mockFetch.mockResolvedValue([fakeFiling as never]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.count).toBe(1);
    expect(body.fetchedAt).toBeDefined();
  });

  it("defaults to 90 days", async () => {
    await GET(makeRequest());
    expect(mockFetch).toHaveBeenCalledWith(90);
  });

  it("clamps days to minimum 1", async () => {
    await GET(makeRequest({ days: "0" }));
    expect(mockFetch).toHaveBeenCalledWith(1);
  });

  it("clamps days to maximum 730", async () => {
    await GET(makeRequest({ days: "9999" }));
    expect(mockFetch).toHaveBeenCalledWith(730);
  });

  it("returns 500 on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("network fail"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed/i);
  });
});
