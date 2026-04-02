import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CITIES, OPERATORS_MAP, getVertiportsForCity, getCitiesWithOverrides, getCitiesMapWithOverrides } from "@/data/seed";
import { getCorridorsForCity } from "@/lib/corridors";
import { getScoreHistoryFull } from "@/lib/score-history";
import { calculateReadinessScoreFromFkb, getScoreTier } from "@/lib/scoring";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import CityDetail from "@/components/CityDetail";

interface Props {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cityId } = await params;
  const citiesMap = await getCitiesMapWithOverrides();
  const city = citiesMap[cityId];
  if (!city) return { title: "Market Not Found — AirIndex" };

  const { score } = await calculateReadinessScoreFromFkb(city);
  const tier = getScoreTier(score);
  const operators = city.activeOperators.map((id) => OPERATORS_MAP[id]?.name).filter(Boolean);
  const operatorStr = operators.length > 0 ? ` Active operators: ${operators.join(", ")}.` : "";
  const heliportStr = city.heliportCount ? ` ${city.heliportCount} FAA-registered heliports.` : "";

  const title = `${city.city}, ${city.state} UAM Market Readiness — ${score}/100 ${tier} — AirIndex`;
  const description = `${city.city}, ${city.state} scores ${score}/100 (${tier}) on the AirIndex UAM Readiness Index. 7-factor analysis: regulatory posture, state legislation, operator presence, vertiport zoning, pilot programs, infrastructure, and weather.${operatorStr}${heliportStr}`;

  return {
    title,
    description,
    keywords: [
      `${city.city} UAM`, `${city.city} eVTOL`, `${city.city} air taxi`,
      `${city.city} vertiport`, `${city.state} urban air mobility`,
      `${city.city} market readiness`, "UAM readiness score", "AirIndex",
    ],
    openGraph: {
      title,
      description,
      siteName: "AirIndex",
      url: `https://www.airindex.io/city/${cityId}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      site: "@AirIndexHQ",
      title: `${city.city}, ${city.state} — ${score}/100 ${tier}`,
      description,
    },
  };
}

export function generateStaticParams() {
  return CITIES.map((c) => ({ cityId: c.id }));
}

export default async function CityPage({ params }: Props) {
  const { cityId } = await params;
  const cities = await getCitiesWithOverrides();
  const citiesMap = Object.fromEntries(cities.map((c) => [c.id, c]));
  const city = citiesMap[cityId];
  if (!city) notFound();

  const rank = cities.findIndex((c) => c.id === cityId) + 1;
  const operators = city.activeOperators
    .map((id) => OPERATORS_MAP[id])
    .filter(Boolean);
  const vertiports = getVertiportsForCity(cityId);
  const [corridors, scoreHistory, session] = await Promise.all([
    getCorridorsForCity(cityId),
    getScoreHistoryFull(cityId),
    auth(),
  ]);

  let userTier = "free";
  if (session?.user?.id) {
    userTier = await getUserTier(session.user.id);
  }

  return (
    <CityDetail
      city={city}
      rank={rank}
      totalCities={cities.length}
      operators={operators}
      vertiports={vertiports}
      corridors={corridors}
      scoreHistory={scoreHistory}
      userTier={userTier}
    />
  );
}
