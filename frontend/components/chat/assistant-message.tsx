"use client";

import { MarkdownContent } from "@/components/chat/markdown-content";
import { SourcesPanel } from "@/components/chat/sources-panel";
import { parseResearchBrief } from "@/lib/research-brief";
import { BookOpenIcon } from "lucide-react";
import { useMemo } from "react";

interface AssistantMessageProps {
  content: string;
}

export function AssistantMessage({ content }: AssistantMessageProps) {
  const parsed = useMemo(() => parseResearchBrief(content), [content]);

  return (
    <article className="max-w-3xl rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        <BookOpenIcon className="size-3.5" />
        Research brief
      </div>

      <MarkdownContent content={parsed.body} />

      <SourcesPanel sources={parsed.sources} />
    </article>
  );
}
