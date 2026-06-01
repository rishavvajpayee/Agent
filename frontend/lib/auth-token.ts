"use client";

import { skipAuth } from "@/lib/skip-auth";
import { useUser } from "@stackframe/stack";
import { useCallback } from "react";

export function useAccessToken() {
  if (skipAuth) {
    return useAccessTokenDev();
  }
  return useAccessTokenStack();
}

function useAccessTokenDev() {
  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    return undefined;
  }, []);

  return { user: null, getAccessToken };
}

function useAccessTokenStack() {
  const user = useUser();

  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    if (!user) return undefined;
    const header = await user.getAuthorizationHeader();
    if (!header) return undefined;
    return header.replace(/^Bearer\s+/i, "");
  }, [user]);

  return { user, getAccessToken };
}
