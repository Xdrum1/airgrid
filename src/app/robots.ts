import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/feed/", "/city/", "/corridor/"],
        disallow: [
          "/dashboard",
          "/admin",
          "/api/v1/",
          "/api/admin/",
          "/api/auth/",
          "/api/access-request",
          "/api/health",
          "/api/cron/",
          "/api/webhooks/",
          "/api/keys/",
          "/reports/gap/",
          "/monitoring",
          "/demo/",
        ],
      },
    ],
    sitemap: "https://www.airindex.io/sitemap.xml",
  };
}
