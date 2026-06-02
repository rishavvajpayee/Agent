import { ApiError } from "@/lib/api";

export function getChatErrorMessage(error: unknown): {
  message: string;
  retryable: boolean;
  redirectToLogin: boolean;
} {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        message: "Your session expired. Please sign in again.",
        retryable: false,
        redirectToLogin: true,
      };
    }
    if (error.status === 404) {
      return {
        message: "This conversation was not found. Starting fresh may help.",
        retryable: false,
        redirectToLogin: false,
      };
    }
    if (error.status === 429) {
      return {
        message: "Too many requests. Wait a moment and try again.",
        retryable: true,
        redirectToLogin: false,
      };
    }
    if (error.status >= 500) {
      const detail = error.message.toLowerCase();
      if (detail.includes("anthropic") || detail.includes("api key")) {
        return {
          message:
            "The research service is not configured. Check server API keys.",
          retryable: false,
          redirectToLogin: false,
        };
      }
      if (detail.includes("serper")) {
        return {
          message: "Web search is unavailable. Try again later.",
          retryable: true,
          redirectToLogin: false,
        };
      }
      return {
        message: error.message || "Research service error. Please try again.",
        retryable: true,
        redirectToLogin: false,
      };
    }
    return {
      message: error.message || "Research failed.",
      retryable: true,
      redirectToLogin: false,
    };
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return {
        message:
          "Research took too long and was cancelled. Try a narrower question.",
        retryable: true,
        redirectToLogin: false,
      };
    }
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch")
    ) {
      return {
        message:
          "Could not reach the research API. Check your connection and that the backend is running.",
        retryable: true,
        redirectToLogin: false,
      };
    }
  }

  return {
    message: "Something went wrong. Please try again.",
    retryable: true,
    redirectToLogin: false,
  };
}
