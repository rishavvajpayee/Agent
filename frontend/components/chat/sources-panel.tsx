"use client";

import type { ParsedSource } from "@/lib/research-brief";
import { ExternalLinkIcon } from "lucide-react";

interface SourcesPanelProps {
  sources: ParsedSource[];
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (sources.length === 0) return null;

  return (
    <section className="mt-8 border-t border-border/70 pt-6">
      <h3 className="font-heading mb-4 text-base font-medium text-foreground">
        Sources
      </h3>
      <ul className="grid gap-3">
        {sources.map((source) => {
          const headline = source.title || getHostname(source.url);
          const about =
            source.description ||
            (source.publisher ? `From ${source.publisher}` : "");

          return (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-4 transition-colors hover:border-primary/30 hover:bg-accent/40"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ExternalLinkIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug text-foreground group-hover:text-primary">
                    {headline}
                  </span>
                  {source.publisher && source.title ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {source.publisher}
                    </span>
                  ) : null}
                  {about ? (
                    <span className="mt-2 block text-sm leading-relaxed text-foreground/80">
                      {about}
                    </span>
                  ) : null}
                  <span className="mt-2 block truncate text-xs text-muted-foreground/80">
                    {getHostname(source.url)}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
