// src/app/page.tsx
// Main entry point — dashboard renders client-side
import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
