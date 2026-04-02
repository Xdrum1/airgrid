"use client";

import dynamic from "next/dynamic";

import { City, Vertiport, Corridor } from "@/types";
import type { MobilePanel } from "@/components/dashboard-types";

const MapView = dynamic(() => import("../MapView"), {
  ssr: false,
  loading: () => (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#07070e",
      color: "#777",
      fontFamily: "'Inter', sans-serif",
      fontSize: 10,
      letterSpacing: 2,
    }}>
      LOADING MAP...
    </div>
  ),
});

export default function MapTab({
  cities,
  selected,
  onCitySelect,
  vertiports,
  selectedVertiport,
  onVertiportSelect,
  corridors,
  selectedCorridor,
  onCorridorSelect,
  isMobile,
  mobilePanel,
  onOpenCityList,
  onOpenDetail,
  watchedCityIds,
  onToggleWatch,
  isAuthenticated,
  heliportGeoJSON,
  showHeliports,
  onToggleHeliports,
}: {
  cities: City[];
  selected: City;
  onCitySelect: (city: City) => void;
  vertiports: Vertiport[];
  selectedVertiport: Vertiport | null;
  onVertiportSelect: (v: Vertiport | null) => void;
  corridors: Corridor[];
  selectedCorridor: Corridor | null;
  onCorridorSelect: (c: Corridor | null) => void;
  isMobile: boolean;
  mobilePanel: MobilePanel;
  onOpenCityList: () => void;
  onOpenDetail: () => void;
  watchedCityIds: string[];
  onToggleWatch: (cityId: string) => void;
  isAuthenticated: boolean;
  heliportGeoJSON?: GeoJSON.FeatureCollection | null;
  showHeliports?: boolean;
  onToggleHeliports?: () => void;
}) {
  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <MapView
        cities={cities}
        selected={selected}
        onCitySelect={onCitySelect}
        vertiports={vertiports}
        selectedVertiport={selectedVertiport}
        onVertiportSelect={onVertiportSelect}
        corridors={corridors}
        selectedCorridor={selectedCorridor}
        onCorridorSelect={onCorridorSelect}
        isMobile={isMobile}
        watchedCityIds={watchedCityIds}
        onToggleWatch={onToggleWatch}
        isAuthenticated={isAuthenticated}
        heliportGeoJSON={heliportGeoJSON}
        showHeliports={showHeliports}
        onToggleHeliports={onToggleHeliports}
      />

      {/* Mobile: floating MARKETS button */}
      {isMobile && (
        <button
          onClick={onOpenCityList}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 20,
            background: "rgba(5,5,8,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(91,141,184,0.3)",
            borderRadius: 8,
            padding: "10px 16px",
            color: "#5B8DB8",
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          MARKETS ({cities.length})
        </button>
      )}

    </div>
  );
}
