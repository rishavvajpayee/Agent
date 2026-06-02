"use client";

import { AssistantMessage } from "@/components/chat/assistant-message";
import type { MessageItem } from "@/lib/api-types";
import type { ResearchAlert } from "@/lib/chat-response-quality";

interface MessageBubbleProps {
  message: MessageItem;
  researchAlerts?: ResearchAlert[];
}

export function MessageBubble({
  message,
  researchAlerts,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <AssistantMessage
      content={message.content}
      researchAlerts={researchAlerts}
    />
  );
}
