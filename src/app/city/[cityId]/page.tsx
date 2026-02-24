import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CITIES, CITIES_MAP, OPERATORS_MAP, getVertiportsForCity, getCorridorsForCity } from "@/data/seed";
import CityDetail from "@/components/CityDetail";

interface Props {
  params: Promise<{ cityId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cityId } = await params;
  const city = CITIES_MAP[cityId];
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
  const city = CITIES_MAP[cityId];
  if (!city) notFound();

  const rank = CITIES.findIndex((c) => c.id === cityId) + 1;
  const operators = city.activeOperators
    .map((id) => OPERATORS_MAP[id])
    .filter(Boolean);
  const vertiports = getVertiportsForCity(cityId);
  const corridors = getCorridorsForCity(cityId);

  return (
    <CityDetail
      city={city}
      rank={rank}
      totalCities={CITIES.length}
      operators={operators}
      vertiports={vertiports}
      corridors={corridors}
    />
  );
}
