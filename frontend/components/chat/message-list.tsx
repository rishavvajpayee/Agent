"use client";

import { EvidencePanel } from "@/components/chat/evidence-panel";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ResearchStatus } from "@/components/chat/research-status";
import { TruncatedBanner } from "@/components/chat/truncated-banner";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EvidenceItem, MessageItem } from "@/lib/api-types";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: MessageItem[];
  isSending: boolean;
  evidence?: EvidenceItem[];
  showTruncatedBanner?: boolean;
}

export function MessageList({
  messages,
  isSending,
  evidence = [],
  showTruncatedBanner = false,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <ScrollArea className="h-full flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-8">
        {messages.map((message, index) => (
          <MessageBubble
            key={`${message.created_at}-${index}`}
            message={message}
          />
        ))}
        {showTruncatedBanner ? <TruncatedBanner /> : null}
        {evidence.length > 0 ? <EvidencePanel evidence={evidence} /> : null}
        {isSending ? <ResearchStatus /> : null}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
