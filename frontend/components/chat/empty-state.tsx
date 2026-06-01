"use client";

import { ChatInput } from "@/components/chat/chat-input";

interface EmptyStateProps {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
}

export function EmptyState({ onSend, disabled }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8">
      <div className="mb-10 max-w-xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Research Agent
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          What would you like to research?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Ask about markets, technologies, comparisons, or any topic that needs
          evidence-backed analysis.
        </p>
      </div>
      <ChatInput
        onSend={onSend}
        disabled={disabled}
        variant="centered"
        placeholder="Compare vector databases for RAG in 2026…"
      />
    </div>
  );
}
