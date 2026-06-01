"use client";

import { useAccessToken } from "@/lib/auth-token";
import { ApiError, deleteSession, listSessions } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useSessionsContext } from "@/components/providers/sessions-provider";

export function useSessions(activeSessionId?: string) {
  const router = useRouter();
  const { getAccessToken } = useAccessToken();
  const {
    sessions,
    isLoading,
    setSessions,
    setIsLoading,
    refreshKey,
    refreshSessions,
  } = useSessionsContext();

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setIsLoading(true);
      try {
        const token = await getAccessToken();
        const data = await listSessions(token);
        if (!cancelled) {
          setSessions(
            [...data.sessions].sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime(),
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.status === 401) {
            router.push("/login");
            return;
          }
          toast.error("Failed to load sessions");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, refreshKey, router, setIsLoading, setSessions]);

  const removeSession = useCallback(
    async (sessionId: string) => {
      try {
        const token = await getAccessToken();
        await deleteSession(sessionId, token);
        setSessions((current) =>
          current.filter((session) => session.session_id !== sessionId),
        );
        toast.success("Conversation deleted");
        if (activeSessionId === sessionId) {
          router.push("/");
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.push("/login");
          return;
        }
        toast.error("Failed to delete conversation");
      }
    },
    [activeSessionId, getAccessToken, router, setSessions],
  );

  return {
    sessions,
    isLoading,
    refreshSessions,
    removeSession,
  };
}
