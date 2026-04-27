"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface GridCellFeature {
  id: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  centroidLat: number;
  centroidLng: number;
  tier: "full" | "partial" | "none";
  centroidCredit: number;
  nearestAsosId: string | null;
  nearestAsosDistanceNm: number | null;
  siteIds: string[];
}

export interface HeliportPin {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  siteType?: string | null;
  ownership: string;
}

export interface PreDevPin {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  type: string;
  developer: string;
}

interface GridMapProps {
  cells: GridCellFeature[];
  heliports: HeliportPin[];
  preDev: PreDevPin[];
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  mapboxToken: string;
}

// Tier → color mapping (matches Don's 5nm rule visual language)
const TIER_COLORS: Record<GridCellFeature["tier"], string> = {
  full: "#10b981",    // green — within 5nm of ASOS, full credit
  partial: "#f59e0b", // amber — 5–10nm, partial credit
  none: "#dc2626",    // red — beyond 10nm, no credit
};

const TIER_LABEL: Record<GridCellFeature["tier"], string> = {
  full: "FULL COVERAGE",
  partial: "PARTIAL",
  none: "NO COVERAGE",
};

export default function GridMap({ cells, heliports, preDev, bounds, mapboxToken }: GridMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxToken) {
      console.warn("[GridMap] Missing Mapbox token");
      return;
    }
    mapboxgl.accessToken = mapboxToken;

    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [centerLng, centerLat],
      zoom: 9.4,
      bounds: [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      fitBoundsOptions: { padding: 40 },
      attributionControl: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "nautical" }), "bottom-left");

    const addLayers = () => {
      if (map.getSource("grid-cells")) return;

      // ─── Cell polygons ───
      const cellFeatures = cells.map((c) => ({
        type: "Feature" as const,
        id: c.id,
        properties: {
          cellId: c.id,
          tier: c.tier,
          color: TIER_COLORS[c.tier],
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [c.minLng, c.minLat],
            [c.maxLng, c.minLat],
            [c.maxLng, c.maxLat],
            [c.minLng, c.maxLat],
            [c.minLng, c.minLat],
          ]],
        },
      }));

      map.addSource("grid-cells", { type: "geojson", data: { type: "FeatureCollection", features: cellFeatures } });

      map.addLayer({
        id: "grid-cells-fill",
        type: "fill",
        source: "grid-cells",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0.55,
            0.3,
          ],
        },
      });

      map.addLayer({
        id: "grid-cells-outline",
        type: "line",
        source: "grid-cells",
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 3,
            1.3,
          ],
          "line-opacity": 0.9,
        },
      });

      // ─── Heliport pins ───
      if (heliports.length > 0) {
        const heliportFeatures = heliports.map((h) => ({
          type: "Feature" as const,
          properties: { id: h.id, name: h.name, ownership: h.ownership },
          geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
        }));
        map.addSource("heliports", { type: "geojson", data: { type: "FeatureCollection", features: heliportFeatures } });

        map.addLayer({
          id: "heliports-halo",
          type: "circle",
          source: "heliports",
          paint: {
            "circle-radius": 5,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#0a2540",
            "circle-stroke-width": 1.5,
          },
        });
        map.addLayer({
          id: "heliports-dot",
          type: "circle",
          source: "heliports",
          paint: {
            "circle-radius": 2,
            "circle-color": "#0a2540",
          },
        });
      }

      // ─── Pre-development facility markers ───
      if (preDev.length > 0) {
        const preDevFeatures = preDev.map((p) => ({
          type: "Feature" as const,
          properties: { id: p.id, name: p.name, status: p.status, type: p.type, developer: p.developer },
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        }));
        map.addSource("pre-dev", { type: "geojson", data: { type: "FeatureCollection", features: preDevFeatures } });

        map.addLayer({
          id: "pre-dev-marker",
          type: "circle",
          source: "pre-dev",
          paint: {
            "circle-radius": 7,
            "circle-color": "#a78bfa",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
      }

      // ─── Interactions ───
      map.on("click", "grid-cells-fill", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const cellId = feature.properties?.cellId as string;
        setSelectedCellId((prev) => (prev === cellId ? null : cellId));
      });

      map.on("mouseenter", "grid-cells-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "grid-cells-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      // Heliport click → popup
      map.on("click", "heliports-halo", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as { name: string; ownership: string };
        new mapboxgl.Popup({ offset: 10, closeButton: false, className: "grid-popup" })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:'Inter',sans-serif;padding:4px 2px;min-width:160px;">
              <div style="font-size:11px;letter-spacing:0.08em;color:#5B8DB8;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Heliport</div>
              <div style="font-weight:600;color:#0a2540;font-size:13px;line-height:1.3;">${props.name}</div>
              <div style="color:#697386;font-size:11px;margin-top:2px;">Ownership: ${props.ownership}</div>
            </div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "heliports-halo", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "heliports-halo", () => { map.getCanvas().style.cursor = ""; });

      // Pre-dev click → popup
      map.on("click", "pre-dev-marker", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as { name: string; status: string; type: string; developer: string };
        new mapboxgl.Popup({ offset: 10, closeButton: false, className: "grid-popup" })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:'Inter',sans-serif;padding:4px 2px;min-width:200px;">
              <div style="font-size:11px;letter-spacing:0.08em;color:#a78bfa;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Pre-Dev · ${props.status}</div>
              <div style="font-weight:600;color:#0a2540;font-size:13px;line-height:1.3;">${props.name}</div>
              <div style="color:#697386;font-size:11px;margin-top:4px;">${props.type}</div>
              <div style="color:#8792a2;font-size:10px;margin-top:2px;">${props.developer}</div>
            </div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "pre-dev-marker", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "pre-dev-marker", () => { map.getCanvas().style.cursor = ""; });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on("load", addLayers);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [cells, heliports, preDev, bounds, mapboxToken]);

  // Apply feature-state on selection change so the cell highlights
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getSource("grid-cells")) return;

    for (const c of cells) {
      map.setFeatureState(
        { source: "grid-cells", id: c.id },
        { selected: c.id === selectedCellId },
      );
    }
  }, [selectedCellId, cells]);

  const selectedCell = selectedCellId ? cells.find((c) => c.id === selectedCellId) ?? null : null;
  const selectedHeliports = selectedCell
    ? heliports.filter((h) => selectedCell.siteIds.includes(h.id))
    : [];

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: 620,
          borderRadius: 12,
          border: "1px solid #e3e8ee",
          overflow: "hidden",
          background: "#f9fbfd",
        }}
      />

      {selectedCell && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            width: 320,
            maxHeight: 580,
            background: "#ffffff",
            border: "1px solid #e3e8ee",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(10,37,64,0.12)",
            overflowY: "auto",
            zIndex: 5,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px",
              borderBottom: "1px solid #e3e8ee",
              background: TIER_COLORS[selectedCell.tier] + "14",
              borderTop: `3px solid ${TIER_COLORS[selectedCell.tier]}`,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: TIER_COLORS[selectedCell.tier], fontWeight: 700 }}>
                {TIER_LABEL[selectedCell.tier]}
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#0a2540", marginTop: 2 }}>
                Cell {selectedCell.id.split("_").slice(1).join("·")}
              </div>
            </div>
            <button
              onClick={() => setSelectedCellId(null)}
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "#697386",
                padding: 4,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "14px 16px 18px", fontFamily: "'Inter', sans-serif" }}>
            {/* Score breakdown */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#697386", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                Coverage Credit
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#0a2540", letterSpacing: "-0.02em" }}>
                  {selectedCell.centroidCredit}
                </span>
                <span style={{ fontSize: 12, color: "#697386" }}>/ 5</span>
              </div>
            </div>

            {/* ASOS */}
            <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#697386", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                Nearest ASOS
              </div>
              <div style={{ fontSize: 14, color: "#0a2540", fontWeight: 600 }}>
                {selectedCell.nearestAsosId ?? "—"}
              </div>
              {selectedCell.nearestAsosDistanceNm !== null && (
                <div style={{ fontSize: 11, color: "#697386", marginTop: 2 }}>
                  {selectedCell.nearestAsosDistanceNm.toFixed(1)} nautical miles from centroid
                </div>
              )}
            </div>

            {/* Heliports */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#697386", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                Heliports in Cell ({selectedHeliports.length})
              </div>
              {selectedHeliports.length === 0 ? (
                <div style={{ fontSize: 12, color: "#8792a2", fontStyle: "italic" }}>
                  No registered heliports in this cell.
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {selectedHeliports.map((h) => (
                    <li
                      key={h.id}
                      style={{
                        padding: "8px 0",
                        borderBottom: "1px solid #f3f4f6",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: "#0a2540", fontWeight: 600 }}>{h.name}</div>
                      <div style={{ color: "#697386", fontSize: 10, marginTop: 2 }}>
                        {h.id} · {h.ownership} · {h.city}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer hint */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f3f4f6", fontSize: 10, color: "#8792a2", lineHeight: 1.5 }}>
              Coverage credit per the 5nm rule (FAA NPRM Part 108, pp. 96–98). Cell tier derives from nearest-ASOS distance.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
