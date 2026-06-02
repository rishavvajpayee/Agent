"use client";

import { MarkdownContent } from "@/components/chat/markdown-content";
import { ResearchAlerts } from "@/components/chat/research-alert";
import { SourcesPanel } from "@/components/chat/sources-panel";
import {
  shouldRenderAsErrorBrief,
  type ResearchAlert,
} from "@/lib/chat-response-quality";
import { parseResearchBrief } from "@/lib/research-brief";
import { AlertCircleIcon, BookOpenIcon } from "lucide-react";
import { useMemo } from "react";

interface AssistantMessageProps {
  content: string;
  researchAlerts?: ResearchAlert[];
}

export function AssistantMessage({
  content,
  researchAlerts = [],
}: AssistantMessageProps) {
  const parsed = useMemo(() => parseResearchBrief(content), [content]);
  const isErrorBrief = shouldRenderAsErrorBrief(researchAlerts);

  if (isErrorBrief) {
    return (
      <article className="max-w-3xl space-y-3">
        <ResearchAlerts alerts={researchAlerts} />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm leading-relaxed text-foreground md:p-6">
          <div className="mb-3 flex items-center gap-2 font-medium text-destructive">
            <AlertCircleIcon className="size-4 shrink-0" aria-hidden />
            Research could not complete
          </div>
          <p>{content}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="max-w-3xl space-y-3">
      {researchAlerts.length > 0 ? (
        <ResearchAlerts alerts={researchAlerts} />
      ) : null}
      <div className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpenIcon className="size-3.5" />
          Research brief
        </div>

        <MarkdownContent content={parsed.body} />

        <SourcesPanel sources={parsed.sources} />
      </div>
    </article>
  );
}
