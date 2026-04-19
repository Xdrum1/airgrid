"use client";

import dynamic from "next/dynamic";

const AirflowMap = dynamic(() => import("./AirflowMap"), { ssr: false });

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

export default function AirflowMapWrapper(props: Props) {
  return <AirflowMap {...props} />;
}
