"use client";

import { useEffect, useState } from "react";

export function useRotatingPlaceholder(
  prompts: readonly string[],
  intervalMs = 2000,
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prompts.length <= 1) return;

    const id = setInterval(() => {
      setIndex((current) => (current + 1) % prompts.length);
    }, intervalMs);

    return () => clearInterval(id);
  }, [prompts, intervalMs]);

  return prompts[index] ?? prompts[0] ?? "";
}
