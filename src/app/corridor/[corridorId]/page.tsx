import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CORRIDORS, OPERATORS_MAP, CITIES_MAP } from "@/data/seed";
import { getCorridorById, getCorridorStatusHistory } from "@/lib/corridors";
import { getChangelogEntries } from "@/lib/changelog";
import CorridorDetail from "@/components/CorridorDetail";

interface Props {
  params: Promise<{ corridorId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { corridorId } = await params;
  const corridor = await getCorridorById(corridorId);
  if (!corridor) return { title: "Corridor Not Found — AirIndex" };
  const city = CITIES_MAP[corridor.cityId];
  return {
    title: `${corridor.name} Corridor — AirIndex`,
    description: `${corridor.name} UAM corridor in ${city?.city ?? corridor.cityId}. Status: ${corridor.status}. ${corridor.notes ?? ""}`,
  };
}

export function generateStaticParams() {
  return CORRIDORS.map((c) => ({ corridorId: c.id }));
}

export default async function CorridorPage({ params }: Props) {
  const { corridorId } = await params;
  const corridor = await getCorridorById(corridorId);
  if (!corridor) notFound();

  const statusHistory = await getCorridorStatusHistory(corridorId);
  const city = CITIES_MAP[corridor.cityId] ?? null;
  const operator = corridor.operatorId
    ? OPERATORS_MAP[corridor.operatorId] ?? null
    : null;

  // Fetch related changelog entries
  const allChangelog = await getChangelogEntries({ limit: 50 });
  const relatedChangelog = allChangelog.filter(
    (e) => e.relatedEntityType === "corridor" && e.relatedEntityId === corridorId
  );

  return (
    <CorridorDetail
      corridor={corridor}
      city={city}
      operator={operator}
      statusHistory={statusHistory}
      relatedChangelog={relatedChangelog}
    />
  );
}
