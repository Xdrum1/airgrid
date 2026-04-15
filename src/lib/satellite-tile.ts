/**
 * Mapbox Static Images helper for RiskIndex site renders.
 *
 * Generates a satellite image URL for a facility at given coords, with
 * a marker pin and (optional) overlay annotations. Used by the
 * risk-assessment report to give underwriters a visceral "that's MY
 * facility" view — the OpenClaw move.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BASE = "https://api.mapbox.com/styles/v1/mapbox";

export interface SatelliteTileOptions {
  lat: number;
  lng: number;
  zoom?: number;           // 15-19, default 17 (building scale)
  width?: number;          // px, default 640
  height?: number;         // px, default 360
  pinColor?: string;       // hex without #, default "c2303c" (accent red)
  style?: "satellite-streets-v12" | "satellite-v9";
}

/**
 * Build a Mapbox Static Images URL for a facility.
 * Returns null if MAPBOX token missing (graceful degradation).
 */
export function buildSatelliteTileUrl(opts: SatelliteTileOptions): string | null {
  if (!MAPBOX_TOKEN) return null;

  const {
    lat, lng,
    zoom = 17,
    width = 640,
    height = 360,
    pinColor = "c2303c",
    style = "satellite-streets-v12",
  } = opts;

  // URL-encode the marker overlay: pin-l-circle+color(lng,lat)
  const overlay = `pin-l+${pinColor}(${lng},${lat})`;
  const center = `${lng},${lat},${zoom},0`;
  const size = `${width}x${height}@2x`;

  return `${BASE}/${style}/static/${overlay}/${center}/${size}?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
}

/**
 * Wide-zoom context view — shows surrounding airspace / obstructions.
 */
export function buildContextTileUrl(opts: SatelliteTileOptions): string | null {
  return buildSatelliteTileUrl({ ...opts, zoom: opts.zoom ?? 14 });
}
