"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Building {
  name: string;
  heightFt: number;
  lat: number;
  lng: number;
  status: string;
}

interface Props {
  lat: number;
  lng: number;
  windDeg: number;
  windDir: string;
  buildings: Building[];
  approachFrom?: number;
  approachTo?: number;
}

export default function AirflowMap({ lat, lng, windDeg, windDir, buildings, approachFrom, approachTo }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [lng, lat],
      zoom: 16.5,
      pitch: 50,
      bearing: windDeg - 180,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
      // Helipad
      map.addSource("pad", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} },
      });
      map.addLayer({ id: "pad-glow", type: "circle", source: "pad", paint: { "circle-radius": 25, "circle-color": "rgba(239,68,68,0.1)", "circle-stroke-width": 1, "circle-stroke-color": "rgba(239,68,68,0.3)" } });
      map.addLayer({ id: "pad-core", type: "circle", source: "pad", paint: { "circle-radius": 8, "circle-color": "rgba(239,68,68,0.6)", "circle-stroke-width": 2, "circle-stroke-color": "#ef4444" } });

      // Buildings
      if (buildings.length > 0) {
        const features = buildings.map(b => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] },
          properties: { name: b.name, height: b.heightFt, status: b.status, radius: Math.max(5, b.heightFt / 20) },
        }));

        map.addSource("bldgs", { type: "geojson", data: { type: "FeatureCollection", features } });

        map.addLayer({
          id: "bldg-circles",
          type: "circle",
          source: "bldgs",
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": [
              "match", ["get", "status"],
              "penetration", "rgba(239,68,68,0.3)",
              "fato_2d", "rgba(245,158,11,0.2)",
              "fato_15d", "rgba(245,158,11,0.1)",
              "wind_path", "rgba(59,130,246,0.2)",
              "rgba(255,255,255,0.05)"
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": [
              "match", ["get", "status"],
              "penetration", "rgba(239,68,68,0.6)",
              "fato_2d", "rgba(245,158,11,0.4)",
              "fato_15d", "rgba(245,158,11,0.3)",
              "wind_path", "rgba(59,130,246,0.3)",
              "rgba(255,255,255,0.15)"
            ],
          },
        });
      }

      // Approach corridor
      if (approachFrom != null && approachTo != null && !(approachFrom === 0 && approachTo === 360)) {
        const arcPoints: [number, number][] = [];
        const arcRadius = 0.004;
        let deg = approachFrom;
        while (true) {
          const rad = deg * Math.PI / 180;
          arcPoints.push([lng + Math.sin(rad) * arcRadius, lat + Math.cos(rad) * arcRadius]);
          if (deg === approachTo) break;
          deg = (deg + 5) % 360;
          if (arcPoints.length > 100) break;
        }
        arcPoints.push([lng, lat]);
        arcPoints.push(arcPoints[0]);
        map.addSource("approach", { type: "geojson", data: { type: "Feature", geometry: { type: "Polygon", coordinates: [arcPoints] }, properties: {} } });
        map.addLayer({ id: "approach-fill", type: "fill", source: "approach", paint: { "fill-color": "rgba(59,130,246,0.06)" } });
        map.addLayer({ id: "approach-line", type: "line", source: "approach", paint: { "line-color": "rgba(59,130,246,0.3)", "line-width": 1, "line-dasharray": [4, 3] } });
      }

      // Wind direction line
      const windRad = windDeg * Math.PI / 180;
      const windEnd: [number, number] = [lng + Math.sin(windRad) * 0.006, lat + Math.cos(windRad) * 0.006];
      const windStart: [number, number] = [lng - Math.sin(windRad) * 0.002, lat - Math.cos(windRad) * 0.002];
      map.addSource("wind", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [windEnd, windStart] }, properties: {} } });
      map.addLayer({ id: "wind-line", type: "line", source: "wind", paint: { "line-color": "rgba(59,130,246,0.4)", "line-width": 2, "line-dasharray": [6, 4] } });

      startParticles();
    });

    function startParticles() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const W = rect.width, H = rect.height;
      const WIND_RAD = windDeg * Math.PI / 180;
      const COUNT = 300;

      interface Particle { x: number; y: number; vx: number; vy: number; life: number; age: number; }
      const particles: Particle[] = [];

      function create(init: boolean): Particle {
        const wvx = Math.sin(WIND_RAD) * 0.8;
        const wvy = -Math.cos(WIND_RAD) * 0.8;
        if (init) return { x: Math.random() * W, y: Math.random() * H, vx: wvx + (Math.random() - 0.5) * 0.3, vy: wvy + (Math.random() - 0.5) * 0.3, life: 200 + Math.random() * 300, age: Math.random() * 250 };
        const spread = (Math.random() - 0.5) * H * 0.8;
        const perpR = WIND_RAD + Math.PI / 2;
        return { x: W / 2 + Math.sin(WIND_RAD) * W * 0.5 + Math.sin(perpR) * spread, y: H / 2 - Math.cos(WIND_RAD) * H * 0.5 - Math.cos(perpR) * spread, vx: wvx + (Math.random() - 0.5) * 0.3, vy: wvy + (Math.random() - 0.5) * 0.3, life: 200 + Math.random() * 300, age: 0 };
      }

      for (let i = 0; i < COUNT; i++) particles.push(create(true));

      function animate() {
        if (!mapRef.current) return;
        ctx!.clearRect(0, 0, W, H);

        const padScreen = mapRef.current.project([lng, lat]);
        const bScreens = buildings.map(b => {
          const p = mapRef.current!.project([b.lng, b.lat]);
          return { x: p.x, y: p.y, h: b.heightFt, r: Math.max(8, b.heightFt / 15), status: b.status };
        });

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          let fx = 0, fy = 0, zone = "free";

          for (const b of bScreens) {
            const dx = p.x - b.x, dy = p.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < b.r && dist > 0) {
              fx += dx / dist * 0.15 * b.h / 100;
              fy += dy / dist * 0.15 * b.h / 100;
              zone = "channeling";
            }
            const wdx = -Math.sin(WIND_RAD), wdy = Math.cos(WIND_RAD);
            const lee = (p.x - b.x) * wdx + (p.y - b.y) * wdy;
            const lat2 = Math.abs((p.x - b.x) * wdy - (p.y - b.y) * wdx);
            if (lee > 0 && lee < b.r * 2 && lat2 < b.r) { fx += (Math.random() - 0.5) * 0.15; fy += (Math.random() - 0.5) * 0.15; zone = "channeling"; }
          }

          const pdx = p.x - padScreen.x, pdy = p.y - padScreen.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pdist < 50 && pdist > 0) { const a = Math.atan2(pdy, pdx); fx += Math.cos(a + Math.PI * 0.6) * 0.08; fy += Math.sin(a + Math.PI * 0.6) * 0.08; zone = "recirculation"; }

          p.vx += (Math.sin(WIND_RAD) * 0.6 - p.vx) * 0.008 + fx;
          p.vy += (-Math.cos(WIND_RAD) * 0.6 - p.vy) * 0.008 + fy;
          p.vx *= 0.995; p.vy *= 0.995;
          p.x += p.vx; p.y += p.vy; p.age++;

          const fi = Math.min(p.age / 20, 1), fo = Math.max((p.life - p.age) / 40, 0), alpha = Math.min(fi, fo);
          let r: number, g: number, b2: number;
          switch (zone) { case "recirculation": r = 239; g = 68; b2 = 68; break; case "channeling": r = 245; g = 158; b2 = 11; break; default: r = 59; g = 130; b2 = 246; }

          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          ctx!.beginPath(); ctx!.moveTo(p.x, p.y); ctx!.lineTo(p.x - p.vx * spd * 5, p.y - p.vy * spd * 5);
          ctx!.strokeStyle = `rgba(${r},${g},${b2},${alpha * (zone === "free" ? 0.15 : 0.4)})`; ctx!.lineWidth = zone === "free" ? 0.8 : 1.3; ctx!.stroke();
          ctx!.beginPath(); ctx!.arc(p.x, p.y, zone === "free" ? 1 : 1.5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${r},${g},${b2},${alpha * (zone === "free" ? 0.2 : 0.55)})`; ctx!.fill();

          if (p.age > p.life || p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) particles[i] = create(false);
        }

        animRef.current = requestAnimationFrame(animate);
      }

      setTimeout(animate, 2000);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, windDeg, windDir, buildings, approachFrom, approachTo]);

  return (
    <div style={{ position: "relative", width: "100%", height: 500, borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }} />
      <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 6, padding: "6px 10px", zIndex: 10, fontSize: 10, color: "#ccc" }}>
        Wind: {windDir} ({windDeg}°) · {buildings.length} structures mapped
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", borderRadius: 6, padding: "8px 10px", zIndex: 10 }}>
        <div style={{ fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5B8DB8", fontWeight: 700, marginBottom: 4 }}>Particle Flow</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 9, color: "#999" }}>
          <span>● <span style={{ color: "#3b82f6" }}>Free airflow</span></span>
          <span>● <span style={{ color: "#f59e0b" }}>Channeling</span></span>
          <span>● <span style={{ color: "#ef4444" }}>Recirculation</span></span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 8, color: "rgba(255,255,255,0.25)", zIndex: 10 }}>
        Stage 2 · Heuristic
      </div>
    </div>
  );
}
