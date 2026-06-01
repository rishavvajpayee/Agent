"use client";

import type { EvidenceItem } from "@/lib/api-types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface EvidencePanelProps {
  evidence: EvidenceItem[];
}

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  const [open, setOpen] = useState(false);

  if (evidence.length === 0) return null;

  return (
    <div className="max-w-3xl rounded-xl border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground"
      >
        <span>Saved evidence ({evidence.length})</span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul className="space-y-4 border-t px-4 py-3 text-sm">
          {evidence.map((item, index) => (
            <li key={`${item.source_url}-${index}`} className="space-y-1">
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {item.source_url}
              </a>
              <p className="text-foreground">{item.key_claim}</p>
              <p className="text-muted-foreground italic">
                &ldquo;{item.quote}&rdquo;
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
