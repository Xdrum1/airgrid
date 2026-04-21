/**
 * AIS Alerts — event-driven market intelligence.
 *
 * Not notifications. Not content fillers. Market-moving signals
 * packaged for decision-makers.
 *
 * Send threshold:
 *   ✅ SEND if:  ≥5 point movement, tier change, legislation passes/fails,
 *                first-of-kind event, clear decision impact
 *   ❌ HOLD if:  minor +1/+2 changes, low-impact signals, ambiguous events
 *
 * Filter before sending: "Would a serious operator forward this internally?"
 *
 * Cadence: 1–3 per week MAX. Selectivity is the edge.
 */

export interface AisAlert {
  slug: string;
  alertNumber: number;
  publishDate: string;
  cityId: string;
  headline: string;
  whatHappened: string;
  aisImpact: {
    scoreBefore: number;
    scoreAfter: number;
    factor: string;
    factorChange: string;
    tierBefore?: string;
    tierAfter?: string;
  };
  whyItMatters: string;
  source: string;
  sourceUrl?: string;
}

export const AIS_ALERTS: AisAlert[] = [
  {
    slug: "phoenix-sb1827-failure",
    alertNumber: 1,
    publishDate: "2026-04-01",
    cityId: "phoenix",
    headline: "Phoenix drops 10 AIS after SB1827 fails in committee",
    whatHappened:
      "Arizona SB1827, the state's flagship Advanced Air Mobility bill that would have created an Office of Advanced Air Mobility, failed 6-12 in House Appropriations on March 31. Its companion appropriation (SB1826) was withdrawn six days earlier. A third bill (SB1819, vertiport zoning) remains technically alive but has shown no House movement in five weeks.",
    aisImpact: {
      scoreBefore: 50,
      scoreAfter: 40,
      factor: "State Legislation",
      factorChange: "actively_moving → none (under methodology review)",
      tierBefore: "MODERATE",
      tierAfter: "EARLY",
    },
    whyItMatters:
      "A coordinated three-bill package that mirrored successful legislative patterns in Texas and Florida collapsed in six days. The score drop reflects the loss of the legislative foundation that infrastructure developers and operators require before committing capital. Phoenix retains strong operator presence (Joby flight testing) but now lacks the regulatory infrastructure to translate that into commercial readiness. The path from 40 back to 80 just narrowed significantly.",
    source: "Arizona State Legislature / LegiScan",
    sourceUrl: "https://legiscan.com/AZ/bill/SB1827/2026",
  },
  {
    slug: "phoenix-sb1457-advancing",
    alertNumber: 2,
    publishDate: "2026-04-21",
    cityId: "phoenix",
    headline: "Phoenix rebounds after legislative setback as new air mobility bill advances",
    whatHappened:
      "Arizona SB1457 — an air mobility fund bill — received a 'Do Pass' from the House Committee of the Whole on April 20. This follows the failure of SB1827 in House Appropriations on March 31. Unlike the prior standalone AAM package, SB1457 ties air mobility infrastructure funding to border security operations, expanding the coalition of support.",
    aisImpact: {
      scoreBefore: 40,
      scoreAfter: 50,
      factor: "State Legislation",
      factorChange: "none → actively_moving (SB1457 advancing)",
      tierBefore: "EARLY",
      tierAfter: "MODERATE",
    },
    whyItMatters:
      "Phoenix dropped from 50 to 40 on April 10 after a three-bill AAM package failed. SB1457 represents a second attempt through a different legislative strategy — bundling AAM funding with border security. A 'Do Pass' from committee is a meaningful signal, but the bill still requires a House floor vote and governor signature before it can be classified as enacted. AirIndex has classified this as actively_moving, not enacted. If signed, Phoenix would move to 60 — recovering fully from the March legislative collapse. This reflects a broader pattern: markets that fail standalone AAM legislation may re-emerge through multi-use funding vehicles with wider political support. Watch for: House floor scheduling and related funding language in adjacent bills.",
    source: "LegiScan / Arizona State Legislature",
    sourceUrl: "https://legiscan.com/AZ/bill/SB1457/2026",
  },
];

export function getAlertBySlug(slug: string): AisAlert | undefined {
  return AIS_ALERTS.find((a) => a.slug === slug);
}

export function getLatestAlert(): AisAlert | undefined {
  return [...AIS_ALERTS].sort((a, b) =>
    b.publishDate.localeCompare(a.publishDate),
  )[0];
}

export function getAllAlertsSorted(): AisAlert[] {
  return [...AIS_ALERTS].sort((a, b) =>
    b.publishDate.localeCompare(a.publishDate),
  );
}
