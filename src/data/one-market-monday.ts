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
  {
    slug: "miami-april-2026",
    issueNumber: 2,
    publishDate: "2026-04-13",
    cityId: "miami",
    headline: "Miami at 80: The 20-Point Gap Between ADVANCED and Full Readiness",
    subhead:
      "Miami scores 80 on the AirIndex Readiness Score, placing it in the ADVANCED tier alongside Orlando and behind only Los Angeles and Dallas at 95. It has enacted state legislation, two committed operators, an operational vertiport, and friendly regulatory posture. The 20 points it doesn't have tell a more interesting story than the 80 it does.",
    sections: [
      {
        heading: "The Score",
        paragraphs: [
          "Miami sits at 80 on the AirIndex Readiness Score — ADVANCED tier, one of five US markets to reach it, and the highest-scoring Florida market alongside Orlando. That score reflects a regulatory and operator stack that most markets are still trying to assemble: Florida's Advanced Air Mobility Act is enacted law, not a pending bill. Joby Aviation is operating helicopter air taxi routes out of the Blade Lounge at Opa-Locka Executive Airport, acquired in its August 2025 Blade acquisition. Archer Aviation has publicly committed to a MIA–Fort Lauderdale corridor in partnership with United Airlines. The Miami-Dade TPO published a UAM Policy Framework and Strategic Roadmap in November 2023, and the county rezoned Watson Island for heliport and vertiport use.",
          "Six of seven scoring factors deliver points. State legislation: 20/20. Active operators: 15/15. Approved vertiport: 15/15. Vertiport zoning: 15/15. Regulatory posture: 10/10. Weather infrastructure: 5/10. The chart tells the story of a market where almost everything is in place.",
          "Almost. One factor scores zero: Active Pilot Program, worth 15 points. And weather infrastructure caps at 5 of a possible 10. Those two gaps account for the entire distance between 80 and 100.",
        ],
      },
      {
        heading: "The Angle",
        paragraphs: [
          "Last week's Issue 01 featured Phoenix — a market where the legislative stack collapsed, dropping the score from 50 to 40. Miami is the inverse case. It demonstrates what happens when the regulatory infrastructure holds: enacted legislation creates the legal foundation, friendly posture removes friction, and operators commit capital. The result is a market where commercial operations are not theoretical.",
          "But an 80 is not a 100, and the gap is instructive. Miami's missing 15 points on Active Pilot Program reflect a specific structural absence: no formal municipal partnership with an eVTOL operator. Joby operates out of a commercial helipad. Archer has announced a corridor. Neither has a documented MOU with Miami-Dade County or any municipal authority in the metro. The distinction matters because MOUs create institutional accountability — they bind city planning, permitting, and community engagement processes to the operator's timeline. Without one, operations depend entirely on private-sector initiative.",
          "This is a pattern we see across ADVANCED-tier markets. Operators announce. They even operate. But the municipal layer — the part that turns an operator's business decision into a city's infrastructure commitment — lags behind. Miami-Dade's 2023 TPO policy framework was a signal of intent, not a binding commitment.",
          "The weather gap is narrower but worth noting. Miami International and Fort Lauderdale-Hollywood airports provide standard ASOS coverage, which earns partial credit. What's missing is dedicated low-altitude weather sensing — the kind of hyperlocal wind, turbulence, and visibility data that eVTOL operations at 500–1,500 feet require. This is a gap across nearly every US market, but it matters more in South Florida, where convective weather systems can produce microbursts and wind shear events that conventional airport weather stations don't capture at vertiport altitude.",
          "AirIndex's pipeline classified 16 Miami-relevant signals in the last 30 days, placing it in the top five markets nationally behind San Francisco, Phoenix, and Austin. The composition is the more interesting number: 10 of the 13 operator expansion events tracked in the last 90 days arrived inside the last 30 days, meaning operator activity has concentrated rather than just persisted. Add an FAA corridor filing for MIA–FLL classified at high confidence on March 30, and a state vertiport bill (FL H1093) signed three days ago, and the pipeline is showing a market where forward signals are clustered, not scattered. Miami's MarketWatch status is POSITIVE_WATCH with an IMPROVING outlook.",
        ],
      },
      {
        heading: "What to Watch",
        paragraphs: [
          "Three forward signals are tracked in Miami's pipeline. Each has a probable timeline and a quantified score impact if it lands.",
          "1. FAA decision on the MIA–FLL corridor (next 30–60 days). Archer's filing was classified March 30; FAA corridor determinations under similar profiles typically resolve in 60–90 days, putting the decision window between late May and late June 2026. An operational approval — even limited test authorization — would not move the score (Miami already has full credit on operator presence and approved vertiport) but would validate that the score is leading the actual deployment, not lagging it. This is the most predictable signal on the calendar.",
          "2. Watson Island Heliport occupancy (Q3 2026). The Skyports/Linden facility has been in occupancy permitting since January 2026; standard local cycles run four to six months, putting expected operational status in the third quarter. When Watson Island enters the FAA NASR registry, it becomes the first purpose-built AAM hub in the Miami metro. No score change — Miami already credits the vertiport — but it shifts the audit narrative from one objectionable facility (per the AirIndex case study) to one operational one.",
          "3. A municipal MOU (timing unknown, highest score impact). If Miami-Dade County or any metro municipality formalizes a partnership with Joby or Archer covering vertiport siting, permitting timelines, and community engagement, the Active Pilot Program factor moves from 0 to 15 — pushing Miami to 95 and into a tie with Los Angeles and Dallas at the top of the rankings. There is no public indication this is in motion, which is why this is the slowest of the three signals despite being the largest in score impact.",
          "What the platform expects: a market that holds at 80 through Q2 2026, with the FAA corridor decision and Watson Island occupancy arriving as validation events rather than score movers. The next score change in Miami likely comes from one of two sources — a municipal MOU (+15) or a TruWeather-class low-altitude weather deployment (+5). Until then, Miami at 80 is not a market waiting for permission. It's a market waiting for the last institutional commitments to catch up with commercial reality.",
        ],
      },
    ],
    footerNote:
      "AirIndex tracks regulatory, operator, and infrastructure signals across 25 US UAM markets. Miami's full factor breakdown, score history, and live intelligence feed are available on the platform. One Market Monday is AirIndex's weekly deep-dive on a single market in our coverage universe.",
  },
  {
    slug: "dallas-april-2026",
    issueNumber: 3,
    publishDate: "2026-04-21",
    cityId: "dallas",
    headline: "Dallas at 95: The Only Market With an Authorized Corridor — and No Weather Infrastructure to Fly It",
    subhead:
      "Dallas scores 95 on the AirIndex Score, tied with Los Angeles at the top of the index. It has enacted legislation, an authorized corridor, a vertiport under construction, and the only autonomous eVTOL operator in the country flight-testing in its airspace. The 5 points it's missing expose a structural gap that applies to every market in the index — and one that no operator can solve on its own.",
    sections: [
      {
        heading: "The Score",
        paragraphs: [
          "Dallas is the most operationally ready eVTOL market in the United States — and still cannot support commercial operations. It sits at 95 on the AirIndex Score, LEADING tier, tied with Los Angeles at the top of the 25-market index. Six of seven factors deliver full credit. Enacted state legislation: TX HB 1735, signed into law in June 2023, remains the most comprehensive AAM enabling framework in the country. Active pilot program: Wisk Aero is conducting autonomous eVTOL flight testing in the DFW area under FAA coordination. Approved vertiport: DFW Vertiport Texas is under construction with permits filed. Vertiport zoning: the City of Dallas adopted a vertiport-specific zoning code amendment in June 2024. Active operator presence: Wisk is committed to the market. Regulatory posture: Texas maintains a pro-innovation aviation regulatory framework rated friendly.",
          "The only factor not at full credit is weather infrastructure, which scores partial. DFW International and Dallas Love Field provide standard ASOS coverage, but no dedicated low-altitude sensing exists in the market. That gap is worth 5 points. It is the entire distance between 95 and 100.",
          "Five points sounds small. It is not. The missing 5 points represent the absence of the infrastructure required to safely operate the authorized corridor.",
        ],
      },
      {
        heading: "The Angle",
        paragraphs: [
          "Dallas is the only market in the AirIndex coverage universe with an authorized air taxi corridor. The DFW-to-Downtown Dallas route has cleared regulatory hurdles that most markets have not begun. That makes Dallas the first real test of whether a market can move from regulatory readiness to operational readiness — and it is the weather gap that determines the answer.",
          "Dallas has regulatory clearance to operate — but no validated visibility into whether those operations can be conducted safely. An authorized corridor without adequate weather infrastructure is a regulatory green light with no visibility on the road ahead. Standard ASOS stations at DFW and DAL report surface conditions — temperature, pressure, visibility, wind speed at runway level. They do not report what happens at 500 feet, where eVTOL aircraft will operate. They do not capture wind shear between buildings in the downtown approach zone. They do not measure the gust spread and turbulence that will determine whether an aircraft can safely hold its approach corridor on any given day.",
          "This is not an AirIndex judgment. The USDOT National AAM Strategy, published December 2025, identifies weather as one of four infrastructure pillars for advanced air mobility alongside physical infrastructure, energy, and spectrum. ASTM International published F3673-24 in November 2024 — a formal standard for weather information performance at vertiports that defines 16 required weather parameters, most of which ASOS stations do not measure. The FAA NPRM Part 108, which governs vertiport operations, establishes distance-based proximity rules for weather station coverage. By those rules, a facility that relies on an ASOS station miles away does not meet the standard for full weather readiness.",
          "Nationally, only 18 heliports out of 5,669 in the FAA registry have their own weather station. Dallas has 69 heliports in the metro area. None has dedicated weather sensing. The gap is not unique to Dallas — it is structural across every market in the index. But it is most visible in Dallas because Dallas is closest to actually needing it.",
          "This is where the AirIndex Score exposes something the market narrative misses. Trade press covers operator milestones: Wisk's Gen 6 first flight in December 2025, the White House selection of Texas for autonomous eVTOL integration. Those are real achievements. But they describe the aircraft side of the equation, not the infrastructure side. The scoring model is designed to surface the infrastructure gaps that will constrain operations regardless of how ready the aircraft are. Weather is the constraint Dallas hasn't addressed yet, and it is the one factor that a single operator or a single city cannot solve alone.",
        ],
      },
      {
        heading: "What to Watch",
        paragraphs: [
          "Three forward signals will determine whether Dallas closes the gap between 95 and 100 — and in doing so, becomes the first market in the index to demonstrate full operational readiness.",
          "1. Low-altitude weather sensing deployment. NTCOG (North Central Texas Council of Governments) is identified in federal stakeholder catalogs as a priority vertiport location for weather infrastructure evaluation. A single deployment of low-altitude sensing at the vertiport site — covering surface winds, winds aloft, gust spread, and visibility at approach altitude — would close the entire remaining gap and move Dallas to 100 AIS. No other market is one factor away from that threshold. The gap is identifiable. The solution is known. What remains is deployment.",
          "2. Corridor weather characterization. The authorized DFW-to-Downtown corridor does not yet have a weather profile. IFR frequency, freezing precipitation patterns, and winds aloft along the route are unmeasured. Before the corridor can support scheduled operations, that data needs to exist. This is not scored directly in the current model, but it is tracked as a forward signal because corridor weather readiness will become a scoring input in future methodology versions.",
          "3. A second operator. Dallas currently has one committed operator: Wisk Aero. The active operator presence factor scores full credit with one, but a second operator — particularly one pursuing Part 135 commercial operations rather than autonomous testing — would signal that the market supports more than one business model. Joby Aviation has selected Texas as an eIPP state; whether DFW specifically becomes a Joby operational market is the signal to watch.",
          "Dallas at 95 is not a market waiting for regulatory permission. It has more regulatory infrastructure in place than any other market in the country. It is a market waiting for the physical infrastructure to match. If the highest-scoring market in the index cannot yet support safe commercial operations, the question every other market should be asking is: how far off are we?",
        ],
      },
    ],
    footerNote:
      "AirIndex tracks regulatory, operator, and infrastructure signals across 25 US UAM markets. Dallas's full factor breakdown, score history, and live intelligence feed are available on the platform. One Market Monday is AirIndex's weekly deep-dive on a single market in our coverage universe.",
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
