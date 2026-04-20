"use client";

import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GridCellFeature, HeliportPin, PreDevPin } from "./GridMap";

const GridMap = dynamic(() => import("./GridMap").catch(err => {
  console.error("[GridMapWrapper] Failed to load GridMap:", err);
  return { default: () => <div style={{ padding: 24, color: "red" }}>Map failed to load: {String(err)}</div> };
}), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100%", height: 620, borderRadius: 12, background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>
      Loading map...
    </div>
  ),
});

interface Props {
  cells: GridCellFeature[];
  heliports: HeliportPin[];
  preDev: PreDevPin[];
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  mapboxToken: string;
}

export default function GridMapWrapper(props: Props) {
  return <GridMap {...props} />;
}
