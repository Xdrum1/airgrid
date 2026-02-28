import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CITIES, OPERATORS_MAP, getVertiportsForCity, getCitiesWithOverrides, getCitiesMapWithOverrides } from "@/data/seed";
import { getCorridorsForCity } from "@/lib/corridors";
import { getScoreHistory } from "@/lib/score-history";
import CityDetail from "@/components/CityDetail";

interface Props {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cityId } = await params;
  const citiesMap = await getCitiesMapWithOverrides();
  const city = citiesMap[cityId];
  if (!city) return { title: "Market Not Found — AirIndex" };
  return {
    title: `${city.city}, ${city.state} — AirIndex`,
    description: city.notes,
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
  const [corridors, scoreHistory] = await Promise.all([
    getCorridorsForCity(cityId),
    getScoreHistory(cityId),
  ]);

  return (
    <CityDetail
      city={city}
      rank={rank}
      totalCities={cities.length}
      operators={operators}
      vertiports={vertiports}
      corridors={corridors}
      scoreHistory={scoreHistory}
    />
  );
}
