import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock ----
vi.mock("@/lib/corridors", () => ({
  getCorridors: vi.fn(),
  getCorridorsForCity: vi.fn(),
}));

import { GET } from "./route";
import { getCorridors, getCorridorsForCity } from "@/lib/corridors";
import { NextRequest } from "next/server";

const mockGetCorridors = vi.mocked(getCorridors);
const mockGetCorridorsForCity = vi.mocked(getCorridorsForCity);

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/corridors");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const fakeCorridor = {
  id: "cor_test",
  name: "Test Corridor",
  status: "proposed",
  cityId: "los_angeles",
  startPoint: { lat: 33.9, lng: -118.4, label: "Start" },
  endPoint: { lat: 34.0, lng: -118.2, label: "End" },
  distanceKm: 10,
  estimatedFlightMinutes: 6,
  maxAltitudeFt: 1000,
  lastUpdated: "2025-01-01",
};

beforeEach(() => {
  vi.resetAllMocks();
  mockGetCorridors.mockResolvedValue([fakeCorridor as never]);
  mockGetCorridorsForCity.mockResolvedValue([fakeCorridor as never]);
});

describe("GET /api/corridors", () => {
  it("returns all corridors when no cityId", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(mockGetCorridors).toHaveBeenCalled();
    expect(mockGetCorridorsForCity).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.count).toBe(1);
  });

  it("filters by cityId when provided", async () => {
    const res = await GET(makeRequest({ cityId: "los_angeles" }));
    expect(res.status).toBe(200);
    expect(mockGetCorridorsForCity).toHaveBeenCalledWith("los_angeles");
    expect(mockGetCorridors).not.toHaveBeenCalled();
  });

  it("response has data and count fields", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("count");
  });

  it("returns 500 on error", async () => {
    mockGetCorridors.mockRejectedValue(new Error("db fail"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed/i);
  });
});
