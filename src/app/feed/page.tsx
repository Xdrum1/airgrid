import type { Metadata } from "next";
import FeedPage from "@/components/FeedPage";
import TrackPageView from "@/components/TrackPageView";

export const metadata: Metadata = {
  title: "UAM Intel Feed — AirIndex",
  description:
    "Curated intelligence on FAA rulings, city policy, operator expansions, and infrastructure developments shaping UAM market readiness across 20+ US markets.",
  openGraph: {
    title: "UAM Intel Feed — AirIndex",
    description:
      "Curated intelligence on FAA rulings, operator expansions, and infrastructure developments shaping UAM market readiness.",
    type: "website",
  },
};

export default function Feed() {
  return (
    <>
      <TrackPageView page="/feed" />
      <FeedPage />
    </>
  );
}
