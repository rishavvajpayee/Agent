"use client";

import { healthCheck } from "@/lib/api";
import { AlertTriangleIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ApiStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        await healthCheck();
        if (!cancelled) setIsOffline(false);
      } catch {
        if (!cancelled) setIsOffline(true);
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangleIcon className="size-4 shrink-0" />
      <span>
        API offline — check that the backend is running at{" "}
        {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
      </span>
    </div>
  );
}
