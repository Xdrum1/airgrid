/**
 * Typed Plausible Analytics wrapper.
 *
 * Plausible is loaded globally in layout.tsx. This module provides a typed
 * helper so call sites don't deal with `window.plausible` directly.
 *
 * Usage:
 *   import { plausible } from "@/lib/plausible";
 *   plausible("City Detail", { city: "miami", score: 85 });
 */

type PlausibleProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: PlausibleProps }
    ) => void;
  }
}

export function plausible(event: string, props?: PlausibleProps): void {
  if (typeof window === "undefined") return;
  window.plausible?.(event, props ? { props } : undefined);
}
