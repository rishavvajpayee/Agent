"use client";

import { useAccessToken } from "@/lib/auth-token";
import type { EvidenceItem, MessageItem } from "@/lib/api-types";
import { ApiError, chat, getSession } from "@/lib/api";
import {
  filterDisplayMessages,
  isBriefIncomplete,
  isInternalMessage,
} from "@/lib/chat-utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSessionsContext } from "@/components/providers/sessions-provider";

interface UseChatOptions {
  sessionId?: string;
}

export function useChat({ sessionId }: UseChatOptions) {
  const router = useRouter();
  const { getAccessToken } = useAccessToken();
  const { refreshSessions } = useSessionsContext();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [showTruncatedBanner, setShowTruncatedBanner] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    sessionId,
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(sessionId));
  const [isSending, setIsSending] = useState(false);
  const [lastFailedTopic, setLastFailedTopic] = useState<string | null>(null);
  const skipNextHistoryLoad = useRef(false);

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setEvidence([]);
      setShowTruncatedBanner(false);
      setIsLoadingHistory(false);
      return;
    }

    if (skipNextHistoryLoad.current) {
      skipNextHistoryLoad.current = false;
      setIsLoadingHistory(false);
      return;
    }

    let cancelled = false;
    const currentSessionId = sessionId;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const token = await getAccessToken();
        const data = await getSession(currentSessionId, token);
        if (!cancelled) {
          setMessages(filterDisplayMessages(data.messages));
          setEvidence(data.evidence ?? []);
          setActiveSessionId(data.session_id);
          setShowTruncatedBanner(
            data.messages.some((message) => isInternalMessage(message)),
          );
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError) {
            if (error.status === 401) {
              router.push("/login");
              return;
            }
            if (error.status === 404) {
              toast.error("Session not found");
              router.push("/");
              return;
            }
          }
          toast.error("Failed to load conversation");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, router, sessionId]);

  const sendMessage = useCallback(
    async (topic: string) => {
      const trimmed = topic.trim();
      if (!trimmed || isSending) return;

      const optimisticUserMessage: MessageItem = {
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      setMessages((current) => [...current, optimisticUserMessage]);
      setIsSending(true);
      setLastFailedTopic(null);
      setShowTruncatedBanner(false);

      try {
        const token = await getAccessToken();
        const result = await chat(
          { topic: trimmed, session_id: activeSessionId ?? null },
          token,
        );

        if (isBriefIncomplete(result.brief)) {
          setLastFailedTopic(trimmed);
          toast.error(
            "The research brief looks incomplete. Try again with the same question.",
          );
        }

        const assistantMessage: MessageItem = {
          role: "assistant",
          content: result.brief,
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [...current, assistantMessage]);
        setActiveSessionId(result.session_id);
        setShowTruncatedBanner(result.truncated);
        refreshSessions();

        const sessionData = await getSession(result.session_id, token);
        setEvidence(sessionData.evidence ?? []);
        setMessages(filterDisplayMessages(sessionData.messages));

        if (!sessionId) {
          skipNextHistoryLoad.current = true;
          router.push(`/chat/${result.session_id}`);
        }
      } catch (error) {
        setMessages((current) => current.slice(0, -1));
        setLastFailedTopic(trimmed);

        if (error instanceof ApiError) {
          if (error.status === 401) {
            router.push("/login");
            return;
          }
          if (error.status === 404) {
            toast.error("Session expired. Starting a new conversation.");
            router.push("/");
            return;
          }
          toast.error(error.message || "Research failed");
          return;
        }

        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsSending(false);
      }
    },
    [
      activeSessionId,
      getAccessToken,
      isSending,
      refreshSessions,
      router,
      sessionId,
    ],
  );

  const retryLastMessage = useCallback(async () => {
    if (lastFailedTopic) {
      await sendMessage(lastFailedTopic);
    }
  }, [lastFailedTopic, sendMessage]);

  return {
    messages,
    evidence,
    showTruncatedBanner,
    isLoadingHistory,
    isSending,
    sendMessage,
    retryLastMessage,
    lastFailedTopic,
  };
}
