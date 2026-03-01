import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/scoring.ts",
        "src/lib/safe-url.ts",
        "src/lib/dashboard-constants.ts",
        "src/lib/rate-limit.ts",
        "src/data/seed.ts",
        "src/app/api/filings/route.ts",
        "src/app/api/corridors/route.ts",
        "src/app/api/changelog/route.ts",
      ],
    },
  },
});
