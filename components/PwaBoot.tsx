"use client";

import { useEffect } from "react";

export function PwaBoot() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration should never block rendering.
    });
  }, []);

  return null;
}
