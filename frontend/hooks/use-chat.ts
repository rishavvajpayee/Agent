"use client";

import { useAccessToken } from "@/lib/auth-token";
import type { EvidenceItem, MessageItem } from "@/lib/api-types";
import { ApiError, chat, getSession } from "@/lib/api";
import { getChatErrorMessage } from "@/lib/api-errors";
import {
  deriveResearchAlerts,
  deriveResearchAlertsFromChat,
  deriveResearchAlertsFromHistory,
  type ResearchAlert,
} from "@/lib/chat-response-quality";
import { filterDisplayMessages } from "@/lib/chat-utils";
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
  const [researchAlerts, setResearchAlerts] = useState<ResearchAlert[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(
    sessionId,
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(sessionId));
  const [isSending, setIsSending] = useState(false);
  const [lastFailedTopic, setLastFailedTopic] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);
  const skipNextHistoryLoad = useRef(false);

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setEvidence([]);
      setResearchAlerts([]);
      setShowRetry(false);
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
          const displayMessages = filterDisplayMessages(data.messages);
          setMessages(displayMessages);
          setEvidence(data.evidence ?? []);
          setActiveSessionId(data.session_id);
          const alerts = deriveResearchAlertsFromHistory(
            data.messages,
            data.evidence?.length ?? 0,
          );
          setResearchAlerts(alerts);
          setShowRetry(alerts.some((a) => a.retryable));
        }
      } catch (error) {
        if (!cancelled) {
          const { message, redirectToLogin } = getChatErrorMessage(error);
          if (error instanceof ApiError && error.status === 401) {
            router.push("/login");
            return;
          }
          if (error instanceof ApiError && error.status === 404) {
            toast.error("Session not found");
            router.push("/");
            return;
          }
          if (redirectToLogin) {
            router.push("/login");
            return;
          }
          toast.error(message);
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
      setShowRetry(false);
      setResearchAlerts([]);

      try {
        const token = await getAccessToken();
        const result = await chat(
          { topic: trimmed, session_id: activeSessionId ?? null },
          token,
        );

        const alerts = deriveResearchAlertsFromChat(result);
        setResearchAlerts(alerts);
        setShowRetry(alerts.some((a) => a.retryable));

        const warningAlert = alerts.find((a) => a.severity === "warning");
        const errorAlert = alerts.find((a) => a.severity === "error");
        if (errorAlert) {
          toast.error(errorAlert.title);
        } else if (warningAlert) {
          toast.warning(warningAlert.title);
        }

        const assistantMessage: MessageItem = {
          role: "assistant",
          content: result.brief,
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [...current, assistantMessage]);
        setActiveSessionId(result.session_id);
        refreshSessions();

        try {
          const sessionData = await getSession(result.session_id, token);
          setEvidence(sessionData.evidence ?? []);
          setMessages(filterDisplayMessages(sessionData.messages));
          setResearchAlerts(
            deriveResearchAlertsFromHistory(
              sessionData.messages,
              sessionData.evidence?.length ?? 0,
            ),
          );
        } catch {
          setEvidence([]);
          setResearchAlerts(
            deriveResearchAlerts(result.brief, {
              truncated: result.truncated,
              evidence_count: result.evidence_count,
            }),
          );
          if (result.evidence_count > 0) {
            toast.warning(
              "Brief saved, but the evidence panel could not be refreshed.",
            );
          }
        }

        if (!sessionId) {
          skipNextHistoryLoad.current = true;
          router.push(`/chat/${result.session_id}`);
        }
      } catch (error) {
        setMessages((current) => current.slice(0, -1));
        setLastFailedTopic(trimmed);
        setShowRetry(true);
        setResearchAlerts([]);

        const { message, redirectToLogin } = getChatErrorMessage(error);

        if (redirectToLogin) {
          router.push("/login");
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          toast.error("Session expired. Starting a new conversation.");
          router.push("/");
          return;
        }

        toast.error(message);
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
      return;
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await sendMessage(lastUser.content);
    }
  }, [lastFailedTopic, messages, sendMessage]);

  return {
    messages,
    evidence,
    researchAlerts,
    isLoadingHistory,
    isSending,
    sendMessage,
    retryLastMessage,
    lastFailedTopic,
    showRetry,
  };
}
