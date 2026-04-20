/**
 * Operational Exposure Assessment (OEL) — Admin Report
 *
 * Stage 2: heuristic scoring from OSM building heights + NASR pad data.
 * Renders OES score, building analysis, and structural findings.
 * Client-side Mapbox visualization is a separate component.
 */
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { RISK_DEMO_SITE_IDS } from "@/lib/risk-index";
import { loadAirflowData } from "@/lib/airflow-data";
import { computeOES, getBuildingStatuses } from "@/lib/obstruction-score";
import Link from "next/link";
import AirflowMapWrapper from "@/components/airflow/AirflowMapWrapper";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

const T = {
  tierBg: (tier: string) => tier === "CRITICAL" ? "#fef2f2" : tier === "ELEVATED" ? "#fffbeb" : tier === "MODERATE" ? "#eff6ff" : "#ecfdf5",
  tierBorder: (tier: string) => tier === "CRITICAL" ? "#fecaca" : tier === "ELEVATED" ? "#fde68a" : tier === "MODERATE" ? "#bfdbfe" : "#a7f3d0",
};

export default async function AirflowReportPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    const session = await auth();
    if (!session?.user) redirect("/login?callbackUrl=/admin");
    if (session.user.email !== ADMIN_EMAIL) redirect("/");
  }

  const { siteId } = await params;
  const upper = siteId.toUpperCase();
  if (!RISK_DEMO_SITE_IDS.includes(upper)) notFound();

  const data = await loadAirflowData(upper);
  if (!data) notFound();

  const oes = computeOES(data);
  const statuses = getBuildingStatuses(data);

  const hasBuildingData = data.buildings.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", fontSize: 14 }}>
      {/* Nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href={`/admin/reports/risk-assessment/${upper}`} style={{ color: "#5B8DB8", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
            ← RiskIndex Report
          </Link>
          <span style={{ color: "#d1d5db" }}>|</span>
          <span style={{ fontSize: 11, color: "#999", fontFamily: "monospace" }}>Operational Exposure Assessment (OEL)</span>
        </div>
        <span style={{ fontSize: 10, color: "#bbb" }}>Stage 2 · Heuristic</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5B8DB8", fontWeight: 700, marginBottom: 8 }}>
            AirIndex RiskIndex — Operational Exposure Assessment (OEL)
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
            {data.facilityName}
          </h1>
          <div style={{ fontSize: 12, color: "#888", fontFamily: "monospace" }}>
            {data.facilityId} · {data.city} · {data.surface}
          </div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 6 }}>
            Assessment Date: {new Date().toISOString().slice(0, 10)} · Stage 2 (Heuristic)
          </div>
        </div>

        {hasBuildingData ? (
          <>
            {/* OES Score */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "24px 28px", marginBottom: 20, display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "monospace", color: oes.tierColor }}>{oes.totalScore}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: oes.tierColor, letterSpacing: "0.1em" }}>{oes.tier}</div>
                <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>OES (0–100)</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                The Obstruction Environment Score (OES) quantifies the physical and airflow constraints
                surrounding the facility based on building proximity, approach surface penetrations,
                dimensional zone intrusions, and prevailing wind interactions. Higher score = more
                constrained environment.
              </div>
            </div>

            {/* Score bar */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "16px 28px", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 2, height: 10, borderRadius: 5, overflow: "hidden", background: "#f0f0f0" }}>
                <div style={{ width: `${oes.pen81Score}%`, background: "#ef4444", borderRadius: oes.pen81Score > 0 ? "5px 0 0 5px" : "0" }} />
                <div style={{ width: `${oes.fatoScore}%`, background: "#f59e0b" }} />
                <div style={{ width: `${oes.windScore}%`, background: "#3b82f6" }} />
                <div style={{ width: `${oes.ratioScore}%`, background: "#8b5cf6", borderRadius: oes.ratioScore > 0 ? "0 5px 5px 0" : "0" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: "#999" }}>
                <span>● 8:1 Surface ({oes.pen81Score}/25)</span>
                <span>● FATO Zone ({oes.fatoScore}/25)</span>
                <span>● Wind Path ({oes.windScore}/25)</span>
                <span>● Height Ratio ({oes.ratioScore}/25)</span>
              </div>
            </div>

            {/* Satellite Visualization */}
            <div style={{ marginBottom: 20 }}>
              <AirflowMapWrapper
                lat={data.lat}
                lng={data.lng}
                windDeg={data.windDeg}
                windDir={data.windDir}
                buildings={statuses.map(s => {
                  const b = data.buildings.find(b2 => b2.name === s.name);
                  return { name: s.name, heightFt: s.heightFt, lat: b?.lat ?? data.lat, lng: b?.lng ?? data.lng, status: s.status };
                }).filter(b => b.lat !== data.lat)}
                approachFrom={data.approach.includes("°") ? parseInt(data.approach) : undefined}
                approachTo={data.approach.includes("to") ? parseInt(data.approach.split("to")[1]) : undefined}
              />
            </div>

            {/* Score Breakdown */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "20px 28px", marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", fontWeight: 700, marginBottom: 12 }}>Score Breakdown</div>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    { label: "8:1 Approach Surface Penetrations", value: `${oes.pen81Count} structure${oes.pen81Count !== 1 ? "s" : ""}`, score: oes.pen81Score, max: 25, color: oes.pen81Score > 0 ? "#ef4444" : "#10b981" },
                    { label: "FATO Zone Intrusions (2D)", value: `${oes.inFato2D} structure${oes.inFato2D !== 1 ? "s" : ""}`, score: oes.fatoScore, max: 25, color: oes.fatoScore > 0 ? "#f59e0b" : "#10b981" },
                    { label: "Wind Path Obstructions", value: `${oes.inWindPath} structure${oes.inWindPath !== 1 ? "s" : ""}${oes.tallestInWindPathFt > 0 ? ` (tallest: ${oes.tallestInWindPathFt} ft)` : ""}`, score: oes.windScore, max: 25, color: oes.windScore > 0 ? "#f59e0b" : "#10b981" },
                    { label: "Height-to-Distance Ratio", value: `${oes.worstRatio}${oes.worstRatioBldg ? ` (${oes.worstRatioBldg.substring(0, 25)})` : ""}`, score: oes.ratioScore, max: 25, color: oes.ratioScore > 10 ? "#f59e0b" : "#10b981" },
                  ].map(row => (
                    <tr key={row.label} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "8px 0", color: "#555" }}>{row.label}</td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#111", fontWeight: 600 }}>{row.value}</td>
                      <td style={{ padding: "8px 0 8px 16px", textAlign: "right", fontFamily: "monospace", color: row.color }}>{row.score}/{row.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Facility Data */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "20px 28px", marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", fontWeight: 700, marginBottom: 12 }}>Facility Data</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 13 }}>
                <div><span style={{ color: "#999" }}>TLOF</span><br /><span style={{ color: "#111", fontWeight: 500 }}>{data.padFt} ft</span></div>
                <div><span style={{ color: "#999" }}>Surface</span><br /><span style={{ color: "#111", fontWeight: 500 }}>{data.surface}</span></div>
                <div><span style={{ color: "#999" }}>Required FATO (1.5D)</span><br /><span style={{ color: "#b45309", fontWeight: 600 }}>{data.fato15D} ft</span></div>
                <div><span style={{ color: "#999" }}>Required FATO (2D — EB-105A)</span><br /><span style={{ color: "#b91c1c", fontWeight: 600 }}>{data.fato2D} ft</span></div>
                <div><span style={{ color: "#999" }}>Prevailing Wind</span><br /><span style={{ color: "#111", fontWeight: 500 }}>{data.windDir} ({data.windDeg}°)</span></div>
                <div><span style={{ color: "#999" }}>Approach Corridor</span><br /><span style={{ color: "#111", fontWeight: 500 }}>{data.approach}</span></div>
                <div><span style={{ color: "#999" }}>Pad Elevation</span><br /><span style={{ color: "#111", fontWeight: 500 }}>{data.padElevFt} ft MSL</span></div>
                <div><span style={{ color: "#999" }}>Coordinates</span><br /><span style={{ color: "#111", fontWeight: 500, fontFamily: "monospace", fontSize: 11 }}>{data.lat.toFixed(4)}, {data.lng.toFixed(4)}</span></div>
              </div>
            </div>

            {/* Building Environment */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "20px 28px", marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", fontWeight: 700, marginBottom: 12 }}>Building Environment (500m radius)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ textAlign: "center", padding: 12, background: "#f9fafb", borderRadius: 6 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>{data.totalBuildingsInRadius}</div>
                  <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>Total structures</div>
                </div>
                <div style={{ textAlign: "center", padding: 12, background: "#f9fafb", borderRadius: 6 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{statuses.filter(s => s.heightFt >= 100).length}</div>
                  <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>Above 100 ft</div>
                </div>
                <div style={{ textAlign: "center", padding: 12, background: "#f9fafb", borderRadius: 6 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{statuses[0]?.heightFt ?? 0} ft</div>
                  <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>Tallest nearby</div>
                </div>
              </div>

              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "6px 0", color: "#999", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>Structure</th>
                    <th style={{ textAlign: "right", padding: "6px 0", color: "#999", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>Height</th>
                    <th style={{ textAlign: "right", padding: "6px 0", color: "#999", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>Distance</th>
                    <th style={{ textAlign: "right", padding: "6px 0", color: "#999", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.slice(0, 10).map(s => (
                    <tr key={s.name} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "6px 0", color: "#333" }}>{s.name}</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontFamily: "monospace", color: "#111" }}>{s.heightFt} ft</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontFamily: "monospace", color: "#888", fontSize: 11 }}>{s.distM}m</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontSize: 10 }}>
                        {s.status === "penetration" && <span style={{ color: "#ef4444", fontWeight: 600 }}>8:1 PENETRATION</span>}
                        {s.status === "fato_2d" && <span style={{ color: "#f59e0b" }}>In FATO 2D zone</span>}
                        {s.status === "fato_15d" && <span style={{ color: "#f59e0b" }}>In FATO 1.5D zone</span>}
                        {s.status === "wind_path" && <span style={{ color: "#3b82f6" }}>In wind path</span>}
                        {s.status === "clear" && <span style={{ color: "#10b981" }}>Clear</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Structural Finding */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "20px 28px", marginBottom: 20 }}>
              <div style={{ padding: "14px 18px", background: T.tierBg(oes.tier), border: `1px solid ${T.tierBorder(oes.tier)}`, borderRadius: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: oes.tierColor, marginBottom: 4 }}>
                  Structural Finding — {oes.tier}
                </div>
                <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                  {oes.pen81Count > 0 && `Based on available data, ${oes.pen81Count} structure(s) penetrate the 8:1 approach surface. `}
                  {oes.inFato2D > 0 && `${oes.inFato2D} structure(s) fall within the EB-105A FATO zone, constraining potential expansion. `}
                  Prevailing {data.windDir} wind crosses {oes.inWindPath} obstruction(s) before reaching the pad
                  {oes.tallestInWindPathFt > 0 ? `, with the tallest at ${oes.tallestInWindPathFt} ft` : ""}, introducing
                  potential wind channeling and turbulence at approach altitude.
                  {data.surface.includes("ROOF") && " Rooftop configuration presents additional airflow and ventilation exposure not captured in standard compliance assessments."}
                </div>
              </div>
            </div>

            {/* Methodology */}
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "20px 28px", marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", fontWeight: 700, marginBottom: 10 }}>Assessment Methodology</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 6px" }}>The OES evaluates four dimensions of physical constraint:</p>
                <p style={{ margin: "0 0 4px" }}><strong style={{ color: "#444" }}>8:1 Approach Surface (0–25 pts)</strong> — Structures exceeding the FAA 8:1 approach slope from pad elevation. Per AC 150/5390-2C.</p>
                <p style={{ margin: "0 0 4px" }}><strong style={{ color: "#444" }}>FATO Zone Intrusions (0–25 pts)</strong> — Structures within the EB-105A 2D FATO perimeter. TLOF → OL (×1.2) → FATO (OL × 2.0).</p>
                <p style={{ margin: "0 0 4px" }}><strong style={{ color: "#444" }}>Wind Path Obstructions (0–25 pts)</strong> — Structures above 50 ft within ±40° of prevailing wind that may channel or create turbulence.</p>
                <p style={{ margin: "0 0 4px" }}><strong style={{ color: "#444" }}>Height-to-Distance Ratio (0–25 pts)</strong> — Worst-case ratio of building height to distance from pad.</p>
                <p style={{ margin: "8px 0 0", color: "#999", fontSize: 11 }}>Stage 2 heuristic assessment. Validated assessment (Stage 3) requires site-level wind measurement data and engineering analysis.</p>
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", padding: "32px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#888" }}>No building height data available for this facility.</div>
            <div style={{ fontSize: 12, color: "#bbb", marginTop: 8 }}>Building data from OpenStreetMap is required for obstruction analysis. Run the fetch script to populate data for this site.</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, fontSize: 10, color: "#999", lineHeight: 1.5, textAlign: "center" }}>
          Building heights sourced from OpenStreetMap. This assessment is based on observable site configuration
          and does not replace a formal obstruction evaluation or airflow analysis.
          Intended for preliminary screening and risk identification.
        </div>
        <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ccc", textAlign: "center", marginTop: 8 }}>
          AirIndex RiskIndex · Vertical Data Group, LLC · airindex.io
        </div>
      </div>
    </div>
  );
}
