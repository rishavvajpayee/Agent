import type { MessageItem } from "@/lib/api-types";

export { isBriefIncomplete } from "@/lib/chat-response-quality";

const INTERNAL_USER_PREFIX =
  "You have reached the maximum number of tool calls";

const SYNTHESIS_PREFIXES = [
  "Tools are disabled",
  "Your previous response was incomplete",
  "Your response was cut off",
] as const;

export function isInternalMessage(message: MessageItem): boolean {
  if (message.role !== "user") return false;
  const content = message.content.trimStart();
  if (content.startsWith(INTERNAL_USER_PREFIX)) return true;
  return SYNTHESIS_PREFIXES.some((prefix) => content.startsWith(prefix));
}

export function filterDisplayMessages(messages: MessageItem[]): MessageItem[] {
  return messages.filter((message) => !isInternalMessage(message));
}
