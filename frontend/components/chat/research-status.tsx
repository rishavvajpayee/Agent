"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Searching sources…",
  "Reading pages…",
  "Analyzing evidence…",
  "Synthesizing findings…",
  "Building your research brief…",
];

export function ResearchStatus() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % STATUS_MESSAGES.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Loader2Icon className="size-4 animate-spin text-primary/70" />
      <span>{STATUS_MESSAGES[messageIndex]}</span>
    </div>
  );
}
