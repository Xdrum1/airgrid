// src/app/dashboard/page.tsx
// Dashboard route — renders the main interactive dashboard
import { Suspense } from "react";
import { getCitiesWithOverrides } from "@/data/seed";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const cities = await getCitiesWithOverrides();
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;

  return (
    <Suspense>
      <Dashboard initialCities={cities} adminEmail={adminEmail} />
    </Suspense>
  );
}
