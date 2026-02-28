// src/app/dashboard/page.tsx
// Dashboard route — renders the main interactive dashboard
import { Suspense } from "react";
import { getCitiesWithOverrides } from "@/data/seed";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const cities = await getCitiesWithOverrides();
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;

  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#555", fontSize: 13, fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}>LOADING...</div>
      </div>
    }>
      <Dashboard initialCities={cities} adminEmail={adminEmail} />
    </Suspense>
  );
}
