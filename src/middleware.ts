export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|overview\\.html|api/auth|api/ingest|api/snapshot).*)",
  ],
};
