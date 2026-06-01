"use client";

import type { SessionSummary } from "@/lib/api-types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

interface SessionsContextValue {
  sessions: SessionSummary[];
  isLoading: boolean;
  setSessions: Dispatch<SetStateAction<SessionSummary[]>>;
  setIsLoading: (loading: boolean) => void;
  refreshKey: number;
  refreshSessions: () => void;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshSessions = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      isLoading,
      setSessions,
      setIsLoading,
      refreshKey,
      refreshSessions,
    }),
    [sessions, isLoading, refreshKey, refreshSessions],
  );

  return (
    <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>
  );
}

export function useSessionsContext() {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error("useSessionsContext must be used within SessionsProvider");
  }
  return context;
}
