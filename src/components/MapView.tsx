"use client";

import { useRef, useCallback, useState } from "react";
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

// Continental US bounding box — SW corner to NE corner
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
}: {
  city: City;
  isSelected: boolean;
  onClick: () => void;
}) {
  const score = city.score ?? 0;
  const color = getScoreColor(score);

  const size = score >= 75 ? 18 : score >= 50 ? 14 : score >= 30 ? 10 : 8;
  const glowSize = isSelected ? size * 3 : size * 2;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: "pointer", position: "relative" }}
      title={`${city.city} — Score: ${score}`}
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
        fontFamily: "'Space Mono', monospace",
      }}
    >
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
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
        fontFamily: "'Space Mono', monospace",
      }}
    >
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
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
          <div style={{ marginTop: 6, color: "#555", fontStyle: "italic" }}>
            {corridor.notes}
          </div>
        )}
      </div>
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
}: {
  city: City;
  onClose: () => void;
  onSelect: (city: City) => void;
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
        fontFamily: "'Space Mono', monospace",
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
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              color: "#fff",
              lineHeight: 1.1,
            }}
          >
            {city.city}
          </div>
          <div style={{ color: "#444", fontSize: 10, marginTop: 2 }}>
            {city.state} · United States
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 24,
              lineHeight: 1,
            }}
          >
            {score}
          </div>
          <div style={{ color: "#444", fontSize: 8, letterSpacing: 1 }}>
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
        {city.hasStateLegislation && (
          <span
            style={{
              color: "#7c3aed",
              fontSize: 7,
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 3,
              padding: "2px 6px",
              letterSpacing: 1,
            }}
          >
            STATE LAW
          </span>
        )}
      </div>

      {city.keyMilestones?.[0] && (
        <div
          style={{
            color: "#555",
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

      <button
        onClick={() => {
          onSelect(city);
          onClose();
        }}
        style={{
          width: "100%",
          background: `${color}15`,
          border: `1px solid ${color}44`,
          color,
          borderRadius: 5,
          padding: "7px 0",
          fontSize: 9,
          letterSpacing: 2,
          cursor: "pointer",
          fontFamily: "'Space Mono', monospace",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = `${color}25`;
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = `${color}15`;
        }}
      >
        VIEW FULL DETAILS →
      </button>
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
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [vertiportPopup, setVertiportPopup] = useState<Vertiport | null>(null);
  const [corridorPopup, setCorridorPopup] = useState<Corridor | null>(null);

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

  const handleMarkerClick = useCallback(
    (city: City) => {
      setPopup({ city, longitude: city.lng, latitude: city.lat });
      setVertiportPopup(null);
      setCorridorPopup(null);
      onCitySelect(city);
      flyToCity(city);
    },
    [onCitySelect, flyToCity]
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
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: "#fff",
          }}
        >
          Mapbox Token Required
        </div>
        <div
          style={{
            color: "#555",
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
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

      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={isMobile ? INITIAL_VIEW_MOBILE : INITIAL_VIEW_DESKTOP}
        projection={{ name: "mercator" }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        onClick={handleMapClick}
        onMouseEnter={() => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = "pointer";
        }}
        onMouseLeave={() => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = "";
        }}
        interactiveLayerIds={CORRIDOR_LAYER_IDS}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" unit="imperial" />

        {/* Corridor GeoJSON layers */}
        <Source id="corridors" type="geojson" data={corridorGeoJSON}>
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
        </Source>

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
              onClick={() => handleMarkerClick(city)}
            />
          </Marker>
        ))}

        {/* Vertiport markers */}
        {vertiports.map((v) => (
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
            anchor="bottom"
            offset={16}
            onClose={() => setPopup(null)}
            closeOnClick={false}
          >
            <CityPopup
              city={popup.city}
              onClose={() => setPopup(null)}
              onSelect={(city) => {
                onCitySelect(city);
                setPopup(null);
              }}
            />
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
      </Map>

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
        {/* Readiness Score legend */}
        <div
          style={{
            color: "#333",
            fontSize: 8,
            letterSpacing: 2,
            marginBottom: 8,
            fontFamily: "'Space Mono', monospace",
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
                color: "#555",
                fontSize: 9,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {lbl}
            </span>
          </div>
        ))}

        {/* Vertiport legend */}
        <div
          style={{
            color: "#333",
            fontSize: 8,
            letterSpacing: 2,
            marginTop: 12,
            marginBottom: 8,
            fontFamily: "'Space Mono', monospace",
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
                color: "#555",
                fontSize: 9,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {lbl}
            </span>
          </div>
        ))}

        {/* Corridor legend */}
        <div
          style={{
            color: "#333",
            fontSize: 8,
            letterSpacing: 2,
            marginTop: 12,
            marginBottom: 8,
            fontFamily: "'Space Mono', monospace",
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
                color: "#555",
                fontSize: 9,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {lbl}
            </span>
          </div>
        ))}
      </div>}
    </>
  );
}
