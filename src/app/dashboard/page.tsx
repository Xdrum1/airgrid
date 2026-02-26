// src/app/dashboard/page.tsx
// Dashboard route — renders the main interactive dashboard
import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
