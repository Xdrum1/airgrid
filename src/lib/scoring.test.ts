import { describe, it, expect } from "vitest";
import {
  SCORE_WEIGHTS,
  calculateReadinessScore,
  getScoreColor,
  getScoreTier,
  getPostureConfig,
  getLegislationConfig,
} from "./scoring";
import type { City, RegulatoryPosture, LegislationStatus } from "@/types";

// Helper to build a minimal City with all factors on or off
function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: "test",
    city: "Test City",
    metro: "Test City Metro",
    state: "TX",
    country: "US",
    lat: 0,
    lng: 0,
    hasActivePilotProgram: false,
    hasVertiportZoning: false,
    vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "restrictive",
    stateLegislationStatus: "none",
    hasLaancCoverage: false,
    notes: "",
    keyMilestones: [],
    lastUpdated: "2025-01-01",
    ...overrides,
  };
}

function allFactorsCity(): City {
  return makeCity({
    hasActivePilotProgram: true,
    hasVertiportZoning: true,
    vertiportCount: 3,
    activeOperators: ["op_joby"],
    regulatoryPosture: "friendly",
    stateLegislationStatus: "enacted",
    hasLaancCoverage: true,
  });
}

// ----- SCORE_WEIGHTS -----
describe("SCORE_WEIGHTS", () => {
  it("has 7 keys", () => {
    expect(Object.keys(SCORE_WEIGHTS)).toHaveLength(7);
  });

  it("sums to 100", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

// ----- calculateReadinessScore -----
describe("calculateReadinessScore", () => {
  it("returns 100 when all factors are present", () => {
    const { score } = calculateReadinessScore(allFactorsCity());
    expect(score).toBe(100);
  });

  it("returns 0 when no factors are present", () => {
    const { score } = calculateReadinessScore(makeCity());
    expect(score).toBe(0);
  });

  it("activePilotProgram contributes its weight", () => {
    const { score } = calculateReadinessScore(
      makeCity({ hasActivePilotProgram: true })
    );
    expect(score).toBe(SCORE_WEIGHTS.activePilotProgram);
  });

  it("approvedVertiport contributes when vertiportCount > 0", () => {
    const { score } = calculateReadinessScore(makeCity({ vertiportCount: 1 }));
    expect(score).toBe(SCORE_WEIGHTS.approvedVertiport);
  });

  it("activeOperatorPresence contributes when operators present", () => {
    const { score } = calculateReadinessScore(
      makeCity({ activeOperators: ["op_joby"] })
    );
    expect(score).toBe(SCORE_WEIGHTS.activeOperatorPresence);
  });

  it("regulatoryPosture 'friendly' gives full weight", () => {
    const { breakdown } = calculateReadinessScore(
      makeCity({ regulatoryPosture: "friendly" })
    );
    expect(breakdown.regulatoryPosture).toBe(SCORE_WEIGHTS.regulatoryPosture);
  });

  it("regulatoryPosture 'neutral' gives 5 points", () => {
    const { breakdown } = calculateReadinessScore(
      makeCity({ regulatoryPosture: "neutral" })
    );
    expect(breakdown.regulatoryPosture).toBe(5);
  });

  it("regulatoryPosture 'restrictive' gives 0 points", () => {
    const { breakdown } = calculateReadinessScore(
      makeCity({ regulatoryPosture: "restrictive" })
    );
    expect(breakdown.regulatoryPosture).toBe(0);
  });

  it("stateLegislation 'enacted' gives full weight", () => {
    const { breakdown } = calculateReadinessScore(
      makeCity({ stateLegislationStatus: "enacted" })
    );
    expect(breakdown.stateLegislation).toBe(SCORE_WEIGHTS.stateLegislation);
  });

  it("stateLegislation 'actively_moving' gives 5 points", () => {
    const { breakdown } = calculateReadinessScore(
      makeCity({ stateLegislationStatus: "actively_moving" })
    );
    expect(breakdown.stateLegislation).toBe(5);
  });

  it("stateLegislation 'none' gives 0 points", () => {
    const { breakdown } = calculateReadinessScore(
      makeCity({ stateLegislationStatus: "none" })
    );
    expect(breakdown.stateLegislation).toBe(0);
  });

  it("breakdown values sum to score", () => {
    const partial = makeCity({
      hasActivePilotProgram: true,
      vertiportCount: 2,
      regulatoryPosture: "neutral",
      hasLaancCoverage: true,
    });
    const { score, breakdown } = calculateReadinessScore(partial);
    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBe(score);
  });

  it("partial combo: pilot + zoning + legislation enacted", () => {
    const city = makeCity({
      hasActivePilotProgram: true,
      hasVertiportZoning: true,
      stateLegislationStatus: "enacted",
    });
    const { score } = calculateReadinessScore(city);
    expect(score).toBe(
      SCORE_WEIGHTS.activePilotProgram +
        SCORE_WEIGHTS.vertiportZoning +
        SCORE_WEIGHTS.stateLegislation
    );
  });

  it("partial combo: pilot + zoning + legislation actively_moving", () => {
    const city = makeCity({
      hasActivePilotProgram: true,
      hasVertiportZoning: true,
      stateLegislationStatus: "actively_moving",
    });
    const { score } = calculateReadinessScore(city);
    expect(score).toBe(
      SCORE_WEIGHTS.activePilotProgram +
        SCORE_WEIGHTS.vertiportZoning +
        5
    );
  });
});

// ----- getScoreColor -----
describe("getScoreColor", () => {
  it("returns green (#00ff88) for score >= 75", () => {
    expect(getScoreColor(75)).toBe("#00ff88");
    expect(getScoreColor(100)).toBe("#00ff88");
  });

  it("returns blue (#00d4ff) for score 50-74", () => {
    expect(getScoreColor(50)).toBe("#00d4ff");
    expect(getScoreColor(74)).toBe("#00d4ff");
  });

  it("returns amber (#f59e0b) for score 30-49", () => {
    expect(getScoreColor(30)).toBe("#f59e0b");
    expect(getScoreColor(49)).toBe("#f59e0b");
  });

  it("returns red (#ff4444) for score < 30", () => {
    expect(getScoreColor(0)).toBe("#ff4444");
    expect(getScoreColor(29)).toBe("#ff4444");
  });
});

// ----- getScoreTier -----
describe("getScoreTier", () => {
  it("returns ADVANCED for score >= 75", () => {
    expect(getScoreTier(75)).toBe("ADVANCED");
    expect(getScoreTier(100)).toBe("ADVANCED");
  });

  it("returns MODERATE for score 50-74", () => {
    expect(getScoreTier(50)).toBe("MODERATE");
    expect(getScoreTier(74)).toBe("MODERATE");
  });

  it("returns EARLY for score 30-49", () => {
    expect(getScoreTier(30)).toBe("EARLY");
    expect(getScoreTier(49)).toBe("EARLY");
  });

  it("returns NASCENT for score < 30", () => {
    expect(getScoreTier(0)).toBe("NASCENT");
    expect(getScoreTier(29)).toBe("NASCENT");
  });
});

// ----- getPostureConfig -----
describe("getPostureConfig", () => {
  it("returns FRIENDLY config", () => {
    const cfg = getPostureConfig("friendly");
    expect(cfg).toEqual({ label: "FRIENDLY", color: "#00ff88" });
  });

  it("returns NEUTRAL config", () => {
    const cfg = getPostureConfig("neutral");
    expect(cfg).toEqual({ label: "NEUTRAL", color: "#f59e0b" });
  });

  it("returns RESTRICTIVE config", () => {
    const cfg = getPostureConfig("restrictive");
    expect(cfg).toEqual({ label: "RESTRICTIVE", color: "#ff4444" });
  });

  it("returns UNKNOWN for unrecognized posture", () => {
    const cfg = getPostureConfig("unknown" as RegulatoryPosture);
    expect(cfg).toEqual({ label: "UNKNOWN", color: "#555555" });
  });
});

// ----- getLegislationConfig -----
describe("getLegislationConfig", () => {
  it("returns ENACTED config", () => {
    const cfg = getLegislationConfig("enacted");
    expect(cfg).toEqual({ label: "ENACTED", color: "#00ff88" });
  });

  it("returns ACTIVELY MOVING config", () => {
    const cfg = getLegislationConfig("actively_moving");
    expect(cfg).toEqual({ label: "ACTIVELY MOVING", color: "#f59e0b" });
  });

  it("returns NONE config", () => {
    const cfg = getLegislationConfig("none");
    expect(cfg).toEqual({ label: "NONE", color: "#ff4444" });
  });
});
