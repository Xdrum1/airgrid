/**
 * One Market Monday — weekly deep-dive series.
 *
 * Editorial discipline:
 *   - ~1000 words max per issue
 *   - One angle, one chart (the 7-factor breakdown for the featured city)
 *   - Every claim cites a primary source
 *   - Three sections: The Score, The Angle, What to Watch
 *   - No quotes, no "further reading", no hedging
 */

export interface OneMarketMondaySection {
  heading: string;
  paragraphs: string[];
}

export interface OneMarketMondayIssue {
  slug: string;
  issueNumber: number;
  publishDate: string; // ISO
  cityId: string; // matches City.id in seed.ts
  headline: string;
  subhead: string;
  sections: OneMarketMondaySection[];
  footerNote: string;
}

export const ONE_MARKET_MONDAY_ISSUES: OneMarketMondayIssue[] = [
  {
    slug: "phoenix-april-2026",
    issueNumber: 1,
    publishDate: "2026-04-06",
    cityId: "phoenix",
    headline: "Phoenix at 50: When a Three-Bill Package Becomes a One-Bill Hope",
    subhead:
      "On March 31, Arizona's flagship Advanced Air Mobility bill failed 6-12 in House Appropriations. Six days earlier, its companion appropriation was quietly withdrawn. A third bill — vertiport zoning — has sat on a Senate consent calendar with no House action for over a month. Three weeks ago, Phoenix's AAM legislative package mirrored the coordinated multi-bill pattern that preceded successful frameworks in Texas and Florida. It has collapsed in six days.",
    sections: [
      {
        heading: "The Score",
        paragraphs: [
          "Phoenix sits at 50 on the AirIndex Readiness Score as of April 5, 2026 — right at the boundary between the EARLY and MODERATE tiers. Its strengths are real: Joby Aviation is conducting autonomous flight technology testing in Arizona, and the Chandler/Tempe testing corridor remains active. Those factors deliver 30 of the score's 50 points.",
          "The remaining 20 come from partial credit: 10 points for state legislation (currently flagged `actively_moving`, under methodology review — see below), 5 for neutral regulatory posture, and 5 for partial weather infrastructure. Zero points come from approved vertiports (none exist in the Phoenix metro), vertiport zoning (no ordinance adopted), or any of the four scoring sub-indicators tied to the three AAM bills that just failed or stalled.",
          "The chart below tells the story of a market that got its operator layer right and its regulatory layer wrong.",
        ],
      },
      {
        heading: "The Angle",
        paragraphs: [
          "Arizona's three-bill package was structured the way successful states have historically structured theirs. SB1827 would have created an Office of Advanced Air Mobility — a dedicated state body to coordinate UAM policy, the kind of institutional home that typically precedes mature markets. SB1826 would have funded it. SB1819 would have added vertiport zoning language to state land-use codes, giving developers the legal clarity they need to commit capital.",
          "Each bill carried a distinct scoring implication. Had SB1827 been enacted, Phoenix's state legislation factor would have moved from 10 to 20, and the newly-created Office would likely have shifted regulatory posture from neutral to friendly, adding another 5 points. Had SB1819 passed with its zoning language intact, Phoenix's vertiport zoning factor would have moved from 0 to 15. The full package, if enacted, would have pushed Phoenix from 50 to roughly 80 — a thirty-point swing and a full tier jump from MODERATE to ADVANCED.",
          "On March 25, SB1826 was withdrawn in House Appropriations. Six days later, on March 31, SB1827 failed on a 6-12 vote in the same committee. SB1819 remains technically alive on a Senate consent calendar but has shown no House movement since March 2 — five weeks of silence in a legislative environment where its companion bills just died.",
          "This is the kind of pattern that doesn't make press releases. Joby's Arizona flight testing generates coverage; committee failures do not. But from a market-readiness standpoint, the committee failures matter more. Operators follow regulatory infrastructure, not the other way around. A state that cannot sustain a coordinated three-bill package through a single appropriations committee has sent a signal about its near-term capacity to build the legal frameworks the industry needs.",
          "AirIndex's scoring model currently flags Phoenix's `stateLegislationStatus` as `actively_moving` — a designation that preserves partial credit based on SB1819's technically-still-alive status. That designation is under methodology review. If SB1819 does not show House movement by the end of the current session, the flag will likely be downgraded to `none`, dropping Phoenix's score from 50 to 40 and moving it from MODERATE into the EARLY tier. That review is visible in Phoenix's detail page on our platform, and any change will be logged to the city's score history with a timestamped citation.",
          "This is what our scoring model is designed to capture: the difference between operator announcements — which dominate the narrative — and the durable regulatory infrastructure that determines whether a market can actually absorb commercial UAM operations. One is a photo op. The other is the market.",
        ],
      },
      {
        heading: "What to Watch",
        paragraphs: [
          "Three forward signals will determine whether Phoenix recovers:",
          "1. SB1819's path over the next 30 days. If the vertiport zoning bill advances out of Senate consent onto the House floor, Phoenix's legislation status survives in its current form. If it dies in committee like its companions, AirIndex will downgrade the flag and the score will drop by 10 points.",
          "2. A revised package. Arizona legislators have until session end to reintroduce a narrower version — either a standalone Office of AAM bill without appropriations, or a zoning-only bill that sidesteps the appropriations fight. Neither has been announced.",
          "3. A formal municipal commitment. The one factor where Phoenix currently shows partial credit under active pilot program is municipal commitment — Chandler and Tempe have permitted testing but have not documented formal partnerships. A city-level MOU would hold partial points regardless of what happens at the state level.",
          "Phoenix is not out of the game. But the path back to 80 just got a lot narrower.",
        ],
      },
    ],
    footerNote:
      "AirIndex tracks regulatory, operator, and infrastructure signals across 21 US UAM markets. Phoenix's full factor breakdown, score history, and live legislative tracking are available on the platform. One Market Monday is AirIndex's weekly deep-dive on a single market in our coverage universe.",
  },
];

export function getIssueBySlug(slug: string): OneMarketMondayIssue | undefined {
  return ONE_MARKET_MONDAY_ISSUES.find((i) => i.slug === slug);
}

export function getLatestIssue(): OneMarketMondayIssue | undefined {
  return [...ONE_MARKET_MONDAY_ISSUES].sort((a, b) =>
    b.publishDate.localeCompare(a.publishDate),
  )[0];
}

export function getAllIssuesSorted(): OneMarketMondayIssue[] {
  return [...ONE_MARKET_MONDAY_ISSUES].sort((a, b) =>
    b.publishDate.localeCompare(a.publishDate),
  );
}
