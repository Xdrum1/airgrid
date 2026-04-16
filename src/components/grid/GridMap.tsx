"use client";

import { useEffect, useRef } from "react";
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

interface GridMapProps {
  cells: GridCellFeature[];
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  mapboxToken: string;
}

// Tier → color mapping (matches Don's 5nm rule visual language)
const TIER_COLORS: Record<GridCellFeature["tier"], string> = {
  full: "#10b981",    // green — within 5nm of ASOS, full credit
  partial: "#f59e0b", // amber — 5–10nm, partial credit
  none: "#dc2626",    // red — beyond 10nm, no credit
};

export default function GridMap({ cells, bounds, mapboxToken }: GridMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

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

    const addGridLayers = () => {
      // Guard against double-adds if effect reruns
      if (map.getSource("grid-cells")) return;

      const features = cells.map((c) => ({
        type: "Feature" as const,
        id: c.id,
        properties: {
          cellId: c.id,
          tier: c.tier,
          centroidCredit: c.centroidCredit,
          nearestAsosId: c.nearestAsosId,
          nearestAsosDistanceNm: c.nearestAsosDistanceNm,
          color: TIER_COLORS[c.tier],
          siteCount: c.siteIds.length,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [c.minLng, c.minLat],
              [c.maxLng, c.minLat],
              [c.maxLng, c.maxLat],
              [c.minLng, c.maxLat],
              [c.minLng, c.minLat],
            ],
          ],
        },
      }));

      map.addSource("grid-cells", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      map.addLayer({
        id: "grid-cells-fill",
        type: "fill",
        source: "grid-cells",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "grid-cells-outline",
        type: "line",
        source: "grid-cells",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.85,
        },
      });
    };

    // Mapbox-gl v3: `load` fires when the style is ready; `idle` as fallback
    if (map.isStyleLoaded()) {
      addGridLayers();
    } else {
      map.on("load", addGridLayers);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [cells, bounds, mapboxToken]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 560,
        borderRadius: 12,
        border: "1px solid #e3e8ee",
        overflow: "hidden",
        background: "#f9fbfd",
      }}
    />
  );
}
