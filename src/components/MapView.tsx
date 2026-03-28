"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  Source,
  Layer,
  MapRef,
  MapLayerMouseEvent,
} from "react-map-gl";
import { City, Vertiport, Corridor } from "@/types";
import { getScoreColor, getScoreTier, getPostureConfig } from "@/lib/scoring";
import WatchlistStar from "./WatchlistStar";
import "mapbox-gl/dist/mapbox-gl.css";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface MapViewProps {
  cities: City[];
  selected: City | null;
  onCitySelect: (city: City) => void;
  vertiports: Vertiport[];
  selectedVertiport: Vertiport | null;
  onVertiportSelect: (v: Vertiport) => void;
  corridors: Corridor[];
  selectedCorridor: Corridor | null;
  onCorridorSelect: (c: Corridor) => void;
  isMobile?: boolean;
  watchedCityIds?: string[];
  onToggleWatch?: (cityId: string) => void;
  isAuthenticated?: boolean;
  heliportGeoJSON?: GeoJSON.FeatureCollection | null;
  showHeliports?: boolean;
  onToggleHeliports?: () => void;
}

interface HeliportPopupInfo {
  longitude: number;
  latitude: number;
  facilityName: string;
  city: string;
  state: string;
  useType: string;
  ownershipType: string;
  elevation: number | null;
  id: string;
}

interface PopupInfo {
  city: City;
  longitude: number;
  latitude: number;
}

// -------------------------------------------------------
// Dark map style — Mapbox custom dark
// -------------------------------------------------------
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

// Continental US bounds — lock map to this region
const US_BOUNDS: [[number, number], [number, number]] = [
  [-140, 15], // SW: wide buffer south (Miami ~25.7N) and west
  [-55, 55],  // NE: wide buffer east (Boston ~71W) and north
];

// Continental US center — mercator projection
const INITIAL_VIEW_DESKTOP = {
  longitude: -96,
  latitude: 41,
  zoom: 4.0,
  padding: { left: 272, right: 296, top: 0, bottom: 0 },
};

const INITIAL_VIEW_MOBILE = {
  longitude: -96,
  latitude: 39,
  zoom: 3.2,
  padding: { left: 0, right: 0, top: 0, bottom: 0 },
};

// -------------------------------------------------------
// Vertiport status colors
// -------------------------------------------------------
const VERTIPORT_STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b",
  permitted: "#00d4ff",
  under_construction: "#7c3aed",
  operational: "#00ff88",
};

// -------------------------------------------------------
// Corridor status styles
// -------------------------------------------------------
const CORRIDOR_STYLES: Record<string, { color: string; dasharray: number[]; label: string }> = {
  proposed: { color: "#f59e0b", dasharray: [4, 4], label: "Proposed" },
  authorized: { color: "#00d4ff", dasharray: [1, 0], label: "Authorized" },
  active: { color: "#00ff88", dasharray: [1, 0], label: "Active" },
  suspended: { color: "#ff4444", dasharray: [2, 4], label: "Suspended" },
};

const CORRIDOR_LAYER_IDS = [
  "corridors-proposed",
  "corridors-authorized",
  "corridors-active",
  "corridors-suspended",
];

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function corridorsToGeoJSON(corridors: Corridor[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: corridors.map((c) => {
      const coords: [number, number][] = [
        [c.startPoint.lng, c.startPoint.lat],
        ...(c.waypoints ?? []).map((wp): [number, number] => [wp.lng, wp.lat]),
        [c.endPoint.lng, c.endPoint.lat],
      ];
      return {
        type: "Feature" as const,
        properties: {
          id: c.id,
          name: c.name,
          status: c.status,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: coords,
        },
      };
    }),
  };
}

// -------------------------------------------------------
// City Marker
// -------------------------------------------------------
function CityMarker({
  city,
  isSelected,
  onClick,
  onHover,
  onHoverEnd,
  dimmed = false,
}: {
  city: City;
  isSelected: boolean;
  onClick: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  dimmed?: boolean;
}) {
  const score = city.score ?? 0;
  const color = dimmed ? "#555" : getScoreColor(score);

  const size = dimmed ? 6 : score >= 75 ? 18 : score >= 50 ? 14 : score >= 30 ? 10 : 8;
  const glowSize = isSelected ? size * 3 : size * 2;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      style={{ cursor: "pointer", position: "relative" }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `${color}22`,
          border: isSelected ? `1px solid ${color}88` : "none",
          transition: "all 0.25s ease",
          pointerEvents: "none",
        }}
      />
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: size * 4,
            height: size * 4,
            borderRadius: "50%",
            border: `1px solid ${color}44`,
            animation: "pulse 2s ease-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          border: isSelected ? "2px solid #fff" : `1px solid ${color}`,
          boxShadow: `0 0 ${isSelected ? 12 : 6}px ${color}`,
          transition: "all 0.25s ease",
          position: "relative",
          zIndex: 1,
        }}
      />
    </div>
  );
}

// -------------------------------------------------------
// Vertiport Marker (diamond shape)
// -------------------------------------------------------
function VertiportMarkerIcon({
  vertiport,
  isSelected,
  onClick,
}: {
  vertiport: Vertiport;
  isSelected: boolean;
  onClick: () => void;
}) {
  const color = VERTIPORT_STATUS_COLORS[vertiport.status] ?? "#888";
  const size = isSelected ? 14 : 10;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer", position: "relative" }}
      title={vertiport.name}
    >
      <div
        style={{
          width: size,
          height: size,
          background: color,
          border: isSelected ? "2px solid #fff" : `1px solid ${color}`,
          boxShadow: `0 0 ${isSelected ? 10 : 4}px ${color}`,
          transform: "rotate(45deg)",
          transition: "all 0.2s ease",
          position: "relative",
          zIndex: 2,
        }}
      />
    </div>
  );
}

// -------------------------------------------------------
// Vertiport Popup
// -------------------------------------------------------
function VertiportPopup({
  vertiport,
  onClose,
}: {
  vertiport: Vertiport;
  onClose: () => void;
}) {
  const color = VERTIPORT_STATUS_COLORS[vertiport.status] ?? "#888";
  const statusLabel = vertiport.status.replace("_", " ").toUpperCase();
  const siteLabel = vertiport.siteType.replace("_", " ").toUpperCase();

  return (
    <div
      style={{
        background: "#0d0d1a",
        border: `1px solid ${color}44`,
        borderRadius: 8,
        padding: "14px 16px",
        minWidth: 200,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: 14,
          color: "#fff",
          marginBottom: 8,
        }}
      >
        {vertiport.name}
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        <span
          style={{
            color,
            fontSize: 7,
            letterSpacing: 1,
            border: `1px solid ${color}44`,
            borderRadius: 3,
            padding: "2px 6px",
          }}
        >
          {statusLabel}
        </span>
        <span
          style={{
            color: "#888",
            fontSize: 7,
            letterSpacing: 1,
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 3,
            padding: "2px 6px",
          }}
        >
          {siteLabel}
        </span>
      </div>
      <div style={{ color: "#666", fontSize: 10, lineHeight: 1.7 }}>
        {vertiport.padCount != null && (
          <div>Pads: {vertiport.padCount}</div>
        )}
        <div>Charging: {vertiport.chargingCapable ? "Yes" : "No"}</div>
        {vertiport.expectedOpenDate && (
          <div>Expected Open: {vertiport.expectedOpenDate}</div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Corridor Popup
// -------------------------------------------------------
function CorridorPopup({
  corridor,
}: {
  corridor: Corridor;
}) {
  const style = CORRIDOR_STYLES[corridor.status] ?? CORRIDOR_STYLES.proposed;

  return (
    <div
      style={{
        background: "#0d0d1a",
        border: `1px solid ${style.color}44`,
        borderRadius: 8,
        padding: "14px 16px",
        minWidth: 220,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: 14,
          color: "#fff",
          marginBottom: 8,
        }}
      >
        {corridor.name}
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        <span
          style={{
            color: style.color,
            fontSize: 7,
            letterSpacing: 1,
            border: `1px solid ${style.color}44`,
            borderRadius: 3,
            padding: "2px 6px",
          }}
        >
          {style.label.toUpperCase()}
        </span>
      </div>
      <div style={{ color: "#666", fontSize: 10, lineHeight: 1.7 }}>
        <div>{corridor.distanceKm} km · {corridor.estimatedFlightMinutes} min · {corridor.maxAltitudeFt} ft</div>
        <div style={{ marginTop: 4 }}>
          {corridor.startPoint.label} → {corridor.endPoint.label}
        </div>
        {corridor.notes && (
          <div style={{ marginTop: 6, color: "#888", fontStyle: "italic" }}>
            {corridor.notes}
          </div>
        )}
      </div>
      <Link
        href={`/corridor/${corridor.id}`}
        style={{
          display: "block",
          marginTop: 10,
          color: "#00d4ff",
          fontSize: 8,
          letterSpacing: 1,
          textDecoration: "none",
          textAlign: "right",
        }}
      >
        VIEW DETAILS →
      </Link>
    </div>
  );
}

// -------------------------------------------------------
// City Popup Card
// -------------------------------------------------------
function CityPopup({
  city,
  onClose,
  onSelect,
  starNode,
}: {
  city: City;
  onClose: () => void;
  onSelect: (city: City) => void;
  starNode?: React.ReactNode;
}) {
  const score = city.score ?? 0;
  const color = getScoreColor(score);
  const tier = getScoreTier(score);
  const posture = getPostureConfig(city.regulatoryPosture);

  return (
    <div
      style={{
        background: "#0d0d1a",
        border: `1px solid ${color}44`,
        borderRadius: 8,
        padding: "14px 16px",
        minWidth: 220,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                color: "#fff",
                lineHeight: 1.1,
              }}
            >
              {city.city}
            </div>
            {starNode}
          </div>
          <div style={{ color: "#777", fontSize: 9, marginTop: 2 }}>
            {city.metro} · {city.state}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              fontSize: 24,
              lineHeight: 1,
            }}
          >
            {score}
          </div>
          <div style={{ color: "#777", fontSize: 8, letterSpacing: 1 }}>
            {tier}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#0a0a0f",
          borderRadius: 2,
          height: 3,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
          }}
        />
      </div>

      <div
        style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}
      >
        <span
          style={{
            color: posture.color,
            fontSize: 7,
            border: `1px solid ${posture.color}44`,
            borderRadius: 3,
            padding: "2px 6px",
            letterSpacing: 1,
          }}
        >
          {posture.label}
        </span>
        {city.hasActivePilotProgram && (
          <span
            style={{
              color: "#00ff88",
              fontSize: 7,
              border: "1px solid rgba(0,255,136,0.3)",
              borderRadius: 3,
              padding: "2px 6px",
              letterSpacing: 1,
            }}
          >
            PILOT
          </span>
        )}
        {city.vertiportCount > 0 && (
          <span
            style={{
              color: "#00d4ff",
              fontSize: 7,
              border: "1px solid rgba(0,212,255,0.3)",
              borderRadius: 3,
              padding: "2px 6px",
              letterSpacing: 1,
            }}
          >
            {city.vertiportCount} VERTIPORT{city.vertiportCount > 1 ? "S" : ""}
          </span>
        )}
        {city.stateLegislationStatus !== "none" && (
          <span
            style={{
              color: city.stateLegislationStatus === "enacted" ? "#7c3aed" : "#f59e0b",
              fontSize: 7,
              border: `1px solid ${city.stateLegislationStatus === "enacted" ? "rgba(124,58,237,0.3)" : "rgba(245,158,11,0.3)"}`,
              borderRadius: 3,
              padding: "2px 6px",
              letterSpacing: 1,
            }}
          >
            {city.stateLegislationStatus === "enacted" ? "STATE LAW" : "BILLS MOVING"}
          </span>
        )}
      </div>

      {city.keyMilestones?.[0] && (
        <div
          style={{
            color: "#888",
            fontSize: 9,
            lineHeight: 1.5,
            marginBottom: 10,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            paddingTop: 8,
          }}
        >
          <span style={{ color: color, marginRight: 5 }}>▶</span>
          {city.keyMilestones[0]}
        </div>
      )}

      <a
        href={`/city/${city.id}`}
        style={{
          display: "block",
          width: "100%",
          background: `${color}15`,
          border: `1px solid ${color}44`,
          color,
          borderRadius: 5,
          padding: "7px 0",
          fontSize: 9,
          letterSpacing: 2,
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          transition: "all 0.15s",
          textAlign: "center",
          textDecoration: "none",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget).style.background = `${color}25`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget).style.background = `${color}15`;
        }}
      >
        VIEW FULL DETAILS →
      </a>
    </div>
  );
}

// -------------------------------------------------------
// Main MapView
// -------------------------------------------------------
export default function MapView({
  cities,
  selected,
  onCitySelect,
  vertiports,
  selectedVertiport,
  onVertiportSelect,
  corridors,
  selectedCorridor,
  onCorridorSelect,
  isMobile = false,
  watchedCityIds = [],
  onToggleWatch,
  isAuthenticated = false,
  heliportGeoJSON,
  showHeliports = true,
  onToggleHeliports,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [vertiportPopup, setVertiportPopup] = useState<Vertiport | null>(null);
  const [corridorPopup, setCorridorPopup] = useState<Corridor | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heliportPopup, setHeliportPopup] = useState<HeliportPopupInfo | null>(null);
  const [currentZoom, setCurrentZoom] = useState(4);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const flyToCity = useCallback(
    (city: City) => {
      mapRef.current?.flyTo({
        center: [city.lng, city.lat],
        zoom: 8,
        duration: 1400,
        essential: true,
      });
    },
    []
  );

  // Fly to corridor bounds when selectedCorridor changes (e.g. from CORRIDORS tab)
  // mapLoaded dep ensures this fires after the map is ready on remount
  useEffect(() => {
    if (!selectedCorridor || !mapLoaded || !mapRef.current) return;
    const allPoints = [
      selectedCorridor.startPoint,
      ...(selectedCorridor.waypoints ?? []),
      selectedCorridor.endPoint,
    ];
    const lngs = allPoints.map((p) => p.lng);
    const lats = allPoints.map((p) => p.lat);
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];

    mapRef.current.fitBounds([sw, ne], {
      padding: isMobile ? 60 : { top: 80, bottom: 80, left: 320, right: 340 },
      duration: 1400,
      maxZoom: 11,
    });
    setCorridorPopup(selectedCorridor);
    setPopup(null);
    setVertiportPopup(null);
    setHasNavigated(true);
  }, [selectedCorridor, mapLoaded, isMobile]);

  const handleMarkerClick = useCallback(
    (city: City) => {
      if (!isMobile) {
        setPopup({ city, longitude: city.lng, latitude: city.lat });
      }
      setVertiportPopup(null);
      setCorridorPopup(null);
      onCitySelect(city);
      flyToCity(city);
      setHasNavigated(true);
    },
    [onCitySelect, flyToCity, isMobile]
  );

  const handleVertiportClick = useCallback(
    (v: Vertiport) => {
      setVertiportPopup(v);
      setPopup(null);
      setCorridorPopup(null);
      onVertiportSelect(v);
    },
    [onVertiportSelect]
  );

  const handleCorridorClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const id = feature.properties?.id;
      const corridor = corridors.find((c) => c.id === id);
      if (corridor) {
        setCorridorPopup(corridor);
        setPopup(null);
        setVertiportPopup(null);
        onCorridorSelect(corridor);
      }
    },
    [corridors, onCorridorSelect]
  );

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      // If a corridor feature was clicked, handleCorridorClick handles it
      if (e.features && e.features.length > 0) return;
      setPopup(null);
      setVertiportPopup(null);
      setCorridorPopup(null);
    },
    []
  );

  // Compute popup anchor based on marker screen position to avoid edge/sidebar clipping
  const getPopupAnchor = useCallback(
    (lng: number, lat: number): "bottom" | "top" | "left" | "right" | "bottom-left" | "bottom-right" | "top-left" | "top-right" => {
      const map = mapRef.current;
      if (!map) return "bottom";
      const point = map.project([lng, lat]);
      const container = map.getContainer();
      const w = container.clientWidth;
      const h = container.clientHeight;
      const popupW = 240; // popup card is ~220px wide
      const leftSidebar = isMobile ? 0 : 292;  // city list panel width + gap
      const rightPanel = isMobile ? 0 : 316;    // detail panel width + gap

      const nearTop = point.y < popupW;
      const nearLeft = point.x < leftSidebar + popupW;
      const nearRight = point.x > w - rightPanel - popupW;

      if (nearTop && nearLeft) return "top-left";
      if (nearTop && nearRight) return "top-right";
      if (nearTop) return "top";
      if (nearLeft) return "bottom-left";
      if (nearRight) return "bottom-right";
      return "bottom";
    },
    [isMobile]
  );

  const corridorGeoJSON = corridorsToGeoJSON(corridors);

  if (!token || token === "your_mapbox_token_here") {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#07070e",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 32 }}>🗺️</div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: "#fff",
          }}
        >
          Mapbox Token Required
        </div>
        <div
          style={{
            color: "#888",
            fontSize: 11,
            fontFamily: "'Inter', sans-serif",
            textAlign: "center",
            lineHeight: 1.8,
            maxWidth: 340,
          }}
        >
          Add your token to <code style={{ color: "#00d4ff" }}>.env.local</code>
          <br />
          <br />
          <code style={{ color: "#00ff88" }}>
            NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
          </code>
          <br />
          <br />
          Get a free key at{" "}
          <a
            href="https://mapbox.com"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#00d4ff" }}
          >
            mapbox.com
          </a>{" "}
          — free tier is 50k loads/month.
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 8px !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
        .mapboxgl-popup-close-button {
          display: none !important;
        }
        .mapboxgl-ctrl-bottom-left,
        .mapboxgl-ctrl-bottom-right {
          display: none;
        }
        .mapboxgl-ctrl-top-right .mapboxgl-ctrl {
          margin: 12px 12px 0 0;
        }
        .mapboxgl-ctrl-group {
          background: #0d0d1a !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 6px !important;
          overflow: hidden;
        }
        .mapboxgl-ctrl-group button {
          background: transparent !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        }
        .mapboxgl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        .mapboxgl-ctrl-icon {
          filter: invert(1) opacity(0.5);
        }
        .mapboxgl-ctrl-icon:hover {
          filter: invert(1) opacity(0.9) !important;
        }
      `}</style>

      {/* Map layer toggle */}
      <div style={{
        position: "absolute",
        top: isMobile ? 56 : 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        background: "rgba(5,5,8,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        overflow: "hidden",
      }}>
        {(["MARKETS", "HELIPORTS"] as const).map((mode) => {
          const isActive = mode === "MARKETS" ? !showHeliports : showHeliports;
          return (
            <button
              key={mode}
              onClick={() => {
                if (onToggleHeliports) onToggleHeliports();
              }}
              style={{
                padding: "8px 18px",
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                color: isActive ? "#fff" : "#555",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
                borderRight: mode === "MARKETS" ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              {mode}
            </button>
          );
        })}
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={isMobile ? INITIAL_VIEW_MOBILE : INITIAL_VIEW_DESKTOP}
        maxBounds={US_BOUNDS}
        minZoom={3}
        maxZoom={12}
        projection={{ name: "mercator" }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        onLoad={() => setMapLoaded(true)}
        onClick={(e) => {
          // Check if a heliport circle was clicked
          const heliportFeatures = e.features?.filter((f) => f.layer?.id === "heliports-circles");
          if (heliportFeatures && heliportFeatures.length > 0) {
            const props = heliportFeatures[0].properties;
            if (props) {
              setHeliportPopup({
                longitude: (heliportFeatures[0].geometry as GeoJSON.Point).coordinates[0],
                latitude: (heliportFeatures[0].geometry as GeoJSON.Point).coordinates[1],
                facilityName: props.facilityName,
                city: props.city,
                state: props.state,
                useType: props.useType,
                ownershipType: props.ownershipType,
                elevation: props.elevation,
                id: props.id,
              });
              setPopup(null);
              setVertiportPopup(null);
              setCorridorPopup(null);
              return;
            }
          }
          setHeliportPopup(null);
          handleMapClick(e);
        }}
        onMove={(evt) => {
          setCurrentZoom(evt.viewState.zoom);
          if (evt.viewState.zoom > (isMobile ? 3.5 : 4.5) && !hasNavigated) {
            setHasNavigated(true);
          }
        }}
        onMouseEnter={() => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = "pointer";
        }}
        onMouseLeave={() => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = "";
        }}
        interactiveLayerIds={[...CORRIDOR_LAYER_IDS, ...(showHeliports ? ["heliports-circles"] : [])]}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" unit="imperial" />

        {/* Corridor GeoJSON layers — hidden in heliport mode */}
        {!showHeliports && <Source id="corridors" type="geojson" data={corridorGeoJSON}>
          <Layer
            id="corridors-proposed"
            type="line"
            filter={["==", ["get", "status"], "proposed"]}
            paint={{
              "line-color": CORRIDOR_STYLES.proposed.color,
              "line-width": 2.5,
              "line-opacity": 0.7,
              "line-dasharray": CORRIDOR_STYLES.proposed.dasharray,
            }}
          />
          <Layer
            id="corridors-authorized"
            type="line"
            filter={["==", ["get", "status"], "authorized"]}
            paint={{
              "line-color": CORRIDOR_STYLES.authorized.color,
              "line-width": 3,
              "line-opacity": 0.8,
            }}
          />
          <Layer
            id="corridors-active"
            type="line"
            filter={["==", ["get", "status"], "active"]}
            paint={{
              "line-color": CORRIDOR_STYLES.active.color,
              "line-width": 3,
              "line-opacity": 0.9,
            }}
          />
          <Layer
            id="corridors-suspended"
            type="line"
            filter={["==", ["get", "status"], "suspended"]}
            paint={{
              "line-color": CORRIDOR_STYLES.suspended.color,
              "line-width": 2,
              "line-opacity": 0.6,
              "line-dasharray": CORRIDOR_STYLES.suspended.dasharray,
            }}
          />
        </Source>}

        {/* Heliport layers */}
        {heliportGeoJSON && showHeliports && (
          <Source id="heliports" type="geojson" data={heliportGeoJSON}>
            {/* Heatmap at low zoom */}
            <Layer
              id="heliports-heat"
              type="heatmap"
              maxzoom={9}
              paint={{
                "heatmap-weight": 1,
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 2],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 3, 8, 8, 20],
                "heatmap-color": [
                  "interpolate", ["linear"], ["heatmap-density"],
                  0, "rgba(200,132,252,0)",
                  0.2, "rgba(200,132,252,0.3)",
                  0.4, "rgba(200,132,252,0.5)",
                  0.6, "rgba(232,121,249,0.6)",
                  0.8, "rgba(232,121,249,0.8)",
                  1, "rgba(232,121,249,1)",
                ],
                "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
              }}
            />
            {/* Circle markers at higher zoom */}
            <Layer
              id="heliports-circles"
              type="circle"
              minzoom={8}
              paint={{
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 6],
                "circle-color": [
                  "case",
                  ["==", ["get", "useType"], "PU"], "#e879f9",
                  "#a855f7",
                ],
                "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0, 9, 0.85],
                "circle-stroke-width": 1,
                "circle-stroke-color": "#e879f9",
                "circle-stroke-opacity": 0.4,
              }}
            />
          </Source>
        )}

        {/* City markers */}
        {cities.map((city) => (
          <Marker
            key={city.id}
            longitude={city.lng}
            latitude={city.lat}
            anchor="center"
          >
            <CityMarker
              city={city}
              isSelected={selected?.id === city.id}
              dimmed={showHeliports}
              onClick={() => handleMarkerClick(city)}
              onHover={!isMobile ? () => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                setPopup({ city, longitude: city.lng, latitude: city.lat });
                setVertiportPopup(null);
                setCorridorPopup(null);
              } : undefined}
              onHoverEnd={!isMobile ? () => {
                hoverTimeoutRef.current = setTimeout(() => setPopup(null), 300);
              } : undefined}
            />
          </Marker>
        ))}

        {/* Vertiport markers — hidden in heliport mode */}
        {!showHeliports && vertiports.map((v) => (
          <Marker
            key={v.id}
            longitude={v.lng}
            latitude={v.lat}
            anchor="center"
          >
            <VertiportMarkerIcon
              vertiport={v}
              isSelected={selectedVertiport?.id === v.id}
              onClick={() => handleVertiportClick(v)}
            />
          </Marker>
        ))}

        {/* City popup */}
        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            anchor={getPopupAnchor(popup.longitude, popup.latitude)}
            offset={16}
            onClose={() => setPopup(null)}
            closeOnClick={false}
          >
            <div
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              }}
              onMouseLeave={() => {
                hoverTimeoutRef.current = setTimeout(() => setPopup(null), 300);
              }}
            >
              <CityPopup
                city={popup.city}
                onClose={() => setPopup(null)}
                onSelect={(city) => {
                  onCitySelect(city);
                  setPopup(null);
                }}
                starNode={
                  !isMobile && onToggleWatch ? (
                    <WatchlistStar
                      cityId={popup.city.id}
                      isWatched={watchedCityIds.includes(popup.city.id)}
                      onToggle={onToggleWatch}
                      isAuthenticated={isAuthenticated}
                      size="sm"
                    />
                  ) : undefined
                }
              />
            </div>
          </Popup>
        )}

        {/* Vertiport popup */}
        {vertiportPopup && (
          <Popup
            longitude={vertiportPopup.lng}
            latitude={vertiportPopup.lat}
            anchor="bottom"
            offset={16}
            onClose={() => setVertiportPopup(null)}
            closeOnClick={false}
          >
            <VertiportPopup
              vertiport={vertiportPopup}
              onClose={() => setVertiportPopup(null)}
            />
          </Popup>
        )}

        {/* Corridor popup */}
        {corridorPopup && (
          <Popup
            longitude={(corridorPopup.startPoint.lng + corridorPopup.endPoint.lng) / 2}
            latitude={(corridorPopup.startPoint.lat + corridorPopup.endPoint.lat) / 2}
            anchor="bottom"
            offset={16}
            onClose={() => setCorridorPopup(null)}
            closeOnClick={false}
          >
            <CorridorPopup corridor={corridorPopup} />
          </Popup>
        )}

        {/* Heliport popup */}
        {heliportPopup && currentZoom >= 8 && (
          <Popup
            longitude={heliportPopup.longitude}
            latitude={heliportPopup.latitude}
            anchor="bottom"
            offset={12}
            onClose={() => setHeliportPopup(null)}
            closeOnClick={false}
          >
            <div style={{
              background: "#0d0d1a",
              border: "1px solid rgba(232,121,249,0.3)",
              borderRadius: 8,
              padding: "14px 16px",
              minWidth: 200,
              maxWidth: 280,
            }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "#e879f9", marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                {heliportPopup.useType === "PU" ? "PUBLIC HELIPORT" : "PRIVATE HELIPORT"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
                {heliportPopup.facilityName}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 10, fontFamily: "'Inter', sans-serif" }}>
                {heliportPopup.city}, {heliportPopup.state}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 8, letterSpacing: 1, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(232,121,249,0.1)", border: "1px solid rgba(232,121,249,0.2)", color: "#e879f9",
                }}>
                  FAA: {heliportPopup.id}
                </span>
                {heliportPopup.elevation != null && (
                  <span style={{
                    fontSize: 8, letterSpacing: 1, padding: "3px 8px", borderRadius: 4,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888",
                  }}>
                    {Math.round(heliportPopup.elevation)} ft MSL
                  </span>
                )}
                <span style={{
                  fontSize: 8, letterSpacing: 1, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#888",
                }}>
                  {heliportPopup.ownershipType === "PU" ? "PUBLIC" : heliportPopup.ownershipType === "PR" ? "PRIVATE" : heliportPopup.ownershipType === "MA" ? "AIR FORCE" : heliportPopup.ownershipType === "MN" ? "NAVY" : heliportPopup.ownershipType === "MR" ? "ARMY" : heliportPopup.ownershipType}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Reset View button */}
      {hasNavigated && (
        <button
          onClick={() => {
            const view = isMobile ? INITIAL_VIEW_MOBILE : INITIAL_VIEW_DESKTOP;
            mapRef.current?.flyTo({
              center: [view.longitude, view.latitude],
              zoom: view.zoom,
              padding: view.padding,
              duration: 1400,
              essential: true,
            });
            setPopup(null);
            setVertiportPopup(null);
            setCorridorPopup(null);
            setHeliportPopup(null);
            setHasNavigated(false);
          }}
          style={{
            position: "absolute",
            top: isMobile ? 56 : 52,
            left: 12,
            zIndex: 20,
            background: "rgba(5,5,8,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: isMobile ? "10px 16px" : "8px 14px",
            color: "#ccc",
            fontSize: isMobile ? 10 : 9,
            letterSpacing: 1.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            transition: "all 0.15s",
          }}
        >
          RESET VIEW
        </button>
      )}

      {/* Legend overlay — hidden on mobile */}
      {!isMobile && <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 18,
          background: "rgba(5,5,8,0.88)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "10px 14px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            color: "#999",
            fontSize: 8,
            lineHeight: 1.5,
            marginBottom: 10,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          US metro markets scored for UAM readiness.
        </div>
        {/* Readiness Score legend */}
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginBottom: 8,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          READINESS SCORE
        </div>
        {(
          [
            ["≥ 75 HIGH", "#00ff88", 18],
            ["50–74 MODERATE", "#00d4ff", 14],
            ["30–49 EARLY", "#f59e0b", 10],
            ["< 30 NASCENT", "#ff4444", 8],
          ] as [string, string, number][]
        ).map(([lbl, color, size]) => (
          <div
            key={lbl}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 4px ${color}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "#888",
                fontSize: 9,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {lbl}
            </span>
          </div>
        ))}

        {/* Vertiport legend */}
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginTop: 12,
            marginBottom: 8,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          VERTIPORTS
        </div>
        {(
          [
            ["PLANNED", "#f59e0b"],
            ["PERMITTED", "#00d4ff"],
            ["CONSTRUCTION", "#7c3aed"],
            ["OPERATIONAL", "#00ff88"],
          ] as [string, string][]
        ).map(([lbl, color]) => (
          <div
            key={lbl}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                background: color,
                transform: "rotate(45deg)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "#888",
                fontSize: 9,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {lbl}
            </span>
          </div>
        ))}

        {/* Corridor legend */}
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginTop: 12,
            marginBottom: 8,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          CORRIDORS
        </div>
        {(
          [
            ["PROPOSED", "#f59e0b", "4,4"],
            ["AUTHORIZED", "#00d4ff", "0"],
            ["ACTIVE", "#00ff88", "0"],
            ["SUSPENDED", "#ff4444", "2,4"],
          ] as [string, string, string][]
        ).map(([lbl, color, dash]) => (
          <div
            key={lbl}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
            }}
          >
            <svg width="20" height="4" style={{ flexShrink: 0 }}>
              <line
                x1="0"
                y1="2"
                x2="20"
                y2="2"
                stroke={color}
                strokeWidth="2"
                strokeDasharray={dash === "0" ? undefined : dash}
              />
            </svg>
            <span
              style={{
                color: "#888",
                fontSize: 9,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {lbl}
            </span>
          </div>
        ))}

        {/* Heliport legend */}
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginTop: 12,
            marginBottom: 8,
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: onToggleHeliports ? "pointer" : "default",
            pointerEvents: "auto",
            opacity: showHeliports ? 1 : 0.4,
          }}
          onClick={onToggleHeliports}
        >
          HELIPORTS (FAA)
          <span style={{ fontSize: 7, color: "#555" }}>{showHeliports ? "ON" : "OFF"}</span>
        </div>
        {showHeliports && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e879f9", flexShrink: 0 }} />
              <span style={{ color: "#888", fontSize: 9, fontFamily: "'Inter', sans-serif" }}>PUBLIC USE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a855f7", flexShrink: 0 }} />
              <span style={{ color: "#888", fontSize: 9, fontFamily: "'Inter', sans-serif" }}>PRIVATE USE</span>
            </div>
            <div style={{ color: "#555", fontSize: 8, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
              Density heatmap at low zoom
            </div>
          </>
        )}
      </div>}
    </>
  );
}
