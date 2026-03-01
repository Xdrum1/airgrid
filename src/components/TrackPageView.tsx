"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { trackEvent, beaconEvent } from "@/lib/track";

/**
 * Tracks page_view on mount and page_leave with duration via sendBeacon on unmount/unload.
 * entityType defaults to "page"; override for city/corridor detail pages.
 */
export default function TrackPageView({
  page,
  entityType = "page",
}: {
  page: string;
  entityType?: string;
}) {
  const { data: session } = useSession();
  const startRef = useRef<number>(0);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!session?.user) return;

    startRef.current = Date.now();
    sentRef.current = false;
    trackEvent("page_view", entityType, page);

    const sendLeave = () => {
      if (sentRef.current || !startRef.current) return;
      sentRef.current = true;
      const durationMs = Date.now() - startRef.current;
      beaconEvent("page_leave", entityType, page, {
        durationMs,
        durationSec: Math.round(durationMs / 1000),
      });
    };

    // visibilitychange is more reliable than beforeunload in modern browsers
    const onVisChange = () => {
      if (document.visibilityState === "hidden") sendLeave();
    };

    window.addEventListener("beforeunload", sendLeave);
    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      sendLeave();
      window.removeEventListener("beforeunload", sendLeave);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [session?.user, page, entityType]);

  return null;
}
