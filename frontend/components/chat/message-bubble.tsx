"use client";

import { AssistantMessage } from "@/components/chat/assistant-message";
import type { MessageItem } from "@/lib/api-types";

interface MessageBubbleProps {
  message: MessageItem;
}

export function MessageBubble({ message }: MessageBubbleProps) {
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

  return <AssistantMessage content={message.content} />;
}
