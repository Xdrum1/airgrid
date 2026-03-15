// src/app/dashboard/page.tsx
// Dashboard route — requires free account, renders the main interactive dashboard
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCitiesWithOverrides } from "@/data/seed";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?mode=signup&callbackUrl=/dashboard");
  }

  const cities = await getCitiesWithOverrides();
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;

  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#555", fontSize: 13, fontFamily: "'Inter', sans-serif", letterSpacing: 2 }}>LOADING...</div>
      </div>
    }>
      <Dashboard initialCities={cities} adminEmail={adminEmail} />
    </Suspense>
  );
}
