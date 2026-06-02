"use client";

import { EvidencePanel } from "@/components/chat/evidence-panel";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ResearchAlerts } from "@/components/chat/research-alert";
import { ResearchStatus } from "@/components/chat/research-status";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EvidenceItem, MessageItem } from "@/lib/api-types";
import type { ResearchAlert } from "@/lib/chat-response-quality";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: MessageItem[];
  isSending: boolean;
  evidence?: EvidenceItem[];
  researchAlerts?: ResearchAlert[];
}

export function MessageList({
  messages,
  isSending,
  evidence = [],
  researchAlerts = [],
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, researchAlerts]);

  return (
    <ScrollArea className="h-full flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-8">
        {messages.map((message, index) => (
          <MessageBubble
            key={`${message.created_at}-${index}`}
            message={message}
            researchAlerts={
              message.role === "assistant" && index === messages.length - 1
                ? researchAlerts
                : undefined
            }
          />
        ))}
        <EvidencePanel evidence={evidence} />
        {isSending ? <ResearchStatus /> : null}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
