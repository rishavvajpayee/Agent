"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { EmptyState } from "@/components/chat/empty-state";
import { EvidencePanel } from "@/components/chat/evidence-panel";
import { MessageList } from "@/components/chat/message-list";
import { TruncatedBanner } from "@/components/chat/truncated-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChat } from "@/hooks/use-chat";

interface ChatViewProps {
  sessionId?: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const {
    messages,
    evidence,
    showTruncatedBanner,
    isLoadingHistory,
    isSending,
    sendMessage,
    retryLastMessage,
    lastFailedTopic,
  } = useChat({ sessionId });

  const isNewChat = !sessionId && messages.length === 0 && !isSending;

  if (isLoadingHistory) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-8 py-10">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isNewChat) {
    return <EmptyState onSend={sendMessage} disabled={isSending} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList
        messages={messages}
        isSending={isSending}
        evidence={evidence}
        showTruncatedBanner={showTruncatedBanner}
      />
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm">
        {lastFailedTopic ? (
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-3 md:px-8">
            <p className="text-sm text-destructive">
              The last request failed. You can retry with the same question.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void retryLastMessage()}
              disabled={isSending}
            >
              Retry
            </Button>
          </div>
        ) : null}
        <ChatInput onSend={sendMessage} disabled={isSending} variant="bottom" />
      </div>
    </div>
  );
}
