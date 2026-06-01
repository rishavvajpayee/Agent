import type { MessageItem } from "@/lib/api-types";

const INTERNAL_USER_PREFIX =
  "You have reached the maximum number of tool calls";

export function isInternalMessage(message: MessageItem): boolean {
  return (
    message.role === "user" &&
    message.content.trimStart().startsWith(INTERNAL_USER_PREFIX)
  );
}

export function filterDisplayMessages(messages: MessageItem[]): MessageItem[] {
  return messages.filter((message) => !isInternalMessage(message));
}

export function isBriefIncomplete(brief: string): boolean {
  const stripped = brief.trim();
  if (stripped.length < 200) return true;
  return !stripped.includes("## Summary") || !stripped.includes("## Key Findings");
}
