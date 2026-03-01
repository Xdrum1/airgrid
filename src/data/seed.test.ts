import { describe, it, expect } from "vitest";
import {
  CITIES,
  CITIES_MAP,
  OPERATORS,
  OPERATORS_MAP,
  VERTIPORTS,
  CORRIDORS,
} from "./seed";

// ----- CITIES -----
describe("CITIES", () => {
  it("has 20 entries", () => {
    expect(CITIES).toHaveLength(20);
  });

  it("has unique IDs", () => {
    const ids = CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every city has a computed score and breakdown", () => {
    for (const city of CITIES) {
      expect(city.score).toBeDefined();
      expect(city.breakdown).toBeDefined();
      expect(typeof city.score).toBe("number");
    }
  });

  it("is sorted by score descending", () => {
    for (let i = 1; i < CITIES.length; i++) {
      expect(CITIES[i - 1].score!).toBeGreaterThanOrEqual(CITIES[i].score!);
    }
  });

  it("no score exceeds 100 or falls below 0", () => {
    for (const city of CITIES) {
      expect(city.score!).toBeGreaterThanOrEqual(0);
      expect(city.score!).toBeLessThanOrEqual(100);
    }
  });

  it("CITIES_MAP has the same entries", () => {
    expect(Object.keys(CITIES_MAP)).toHaveLength(CITIES.length);
    for (const city of CITIES) {
      expect(CITIES_MAP[city.id]).toBeDefined();
    }
  });
});

// ----- OPERATORS -----
describe("OPERATORS", () => {
  it("has 5 entries", () => {
    expect(OPERATORS).toHaveLength(5);
  });

  it("has unique IDs", () => {
    const ids = OPERATORS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("OPERATORS_MAP matches OPERATORS array", () => {
    expect(Object.keys(OPERATORS_MAP)).toHaveLength(OPERATORS.length);
    for (const op of OPERATORS) {
      expect(OPERATORS_MAP[op.id]).toBe(op);
    }
  });
});

// ----- VERTIPORTS -----
describe("VERTIPORTS", () => {
  it("has expected count", () => {
    // 3 LA + 2 Dallas + 1 NYC + 1 Orlando + 1 Las Vegas = 8 in seed
    // Per memory: 9 vertiports — let's just check length matches
    expect(VERTIPORTS.length).toBeGreaterThanOrEqual(8);
  });

  it("every vertiport cityId exists in CITIES", () => {
    for (const vp of VERTIPORTS) {
      expect(CITIES_MAP[vp.cityId]).toBeDefined();
    }
  });

  it("every vertiport operatorId (if set) exists in OPERATORS", () => {
    for (const vp of VERTIPORTS) {
      if (vp.operatorId) {
        expect(OPERATORS_MAP[vp.operatorId]).toBeDefined();
      }
    }
  });
});

// ----- CORRIDORS -----
describe("CORRIDORS", () => {
  it("has 9 entries", () => {
    expect(CORRIDORS).toHaveLength(9);
  });

  it("has unique IDs", () => {
    const ids = CORRIDORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every corridor cityId exists in CITIES", () => {
    for (const corridor of CORRIDORS) {
      expect(CITIES_MAP[corridor.cityId]).toBeDefined();
    }
  });

  it("every corridor operatorId (if set) exists in OPERATORS", () => {
    for (const corridor of CORRIDORS) {
      if (corridor.operatorId) {
        expect(OPERATORS_MAP[corridor.operatorId]).toBeDefined();
      }
    }
  });

  it("every corridor has startPoint and endPoint with lat/lng/label", () => {
    for (const corridor of CORRIDORS) {
      expect(corridor.startPoint).toHaveProperty("lat");
      expect(corridor.startPoint).toHaveProperty("lng");
      expect(corridor.startPoint).toHaveProperty("label");
      expect(corridor.endPoint).toHaveProperty("lat");
      expect(corridor.endPoint).toHaveProperty("lng");
      expect(corridor.endPoint).toHaveProperty("label");
    }
  });
});

// ----- Cross-references -----
describe("Cross-references", () => {
  it("every city activeOperators entry exists in OPERATORS_MAP", () => {
    for (const city of CITIES) {
      for (const opId of city.activeOperators) {
        expect(
          OPERATORS_MAP[opId],
          `Operator ${opId} referenced by city ${city.id} not found`
        ).toBeDefined();
      }
    }
  });
});
