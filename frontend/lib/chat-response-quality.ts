import type { ChatResponse, MessageItem } from "@/lib/api-types";
import { isInternalMessage } from "@/lib/chat-utils";

export type ResearchAlertKind =
  | "truncated"
  | "incomplete"
  | "agent_error"
  | "length_limited"
  | "thin_evidence";

export type ResearchAlertSeverity = "info" | "warning" | "error";

export interface ResearchAlert {
  kind: ResearchAlertKind;
  severity: ResearchAlertSeverity;
  title: string;
  description: string;
  /** Show retry affordance in the chat footer */
  retryable: boolean;
}

const REQUIRED_SECTIONS = [
  "## Summary",
  "## Key Findings",
  "## Contradictions & Debates",
  "## Confidence Assessment",
  "## Sources",
] as const;

const MIN_BRIEF_LENGTH = 200;
const MIN_EVIDENCE_COUNT = 3;

function isAgentCrashMessage(brief: string): boolean {
  return brief.trim().startsWith("Agent stopped unexpectedly");
}

function isLengthLimitedMessage(brief: string): boolean {
  const lower = brief.toLowerCase();
  return (
    lower.includes("truncated due to length limits") ||
    lower.includes("please try a narrower question")
  );
}

export function isBriefIncomplete(brief: string): boolean {
  const stripped = brief.trim();
  if (stripped.length < MIN_BRIEF_LENGTH) return true;
  if (isAgentCrashMessage(stripped) || isLengthLimitedMessage(stripped)) return true;
  return (
    !stripped.includes("## Summary") || !stripped.includes("## Key Findings")
  );
}

export function isBriefStructurallyWeak(brief: string): boolean {
  const stripped = brief.trim();
  if (stripped.length < 400) return true;
  return REQUIRED_SECTIONS.some((section) => !stripped.includes(section));
}

export function deriveResearchAlerts(
  brief: string,
  options: {
    truncated?: boolean;
    evidence_count?: number;
    evidenceLength?: number;
  } = {},
): ResearchAlert[] {
  const alerts: ResearchAlert[] = [];
  const stripped = brief.trim();
  const evidenceCount =
    options.evidence_count ?? options.evidenceLength ?? 0;

  if (isAgentCrashMessage(stripped)) {
    alerts.push({
      kind: "agent_error",
      severity: "error",
      title: "Research could not finish",
      description:
        "The agent stopped before completing your brief. Try again or ask a narrower question.",
      retryable: true,
    });
    return alerts;
  }

  if (isLengthLimitedMessage(stripped)) {
    alerts.push({
      kind: "length_limited",
      severity: "warning",
      title: "Brief hit length limits",
      description:
        "The model ran out of output space. Try a narrower question for a complete brief.",
      retryable: true,
    });
    return alerts;
  }

  if (options.truncated) {
    alerts.push({
      kind: "truncated",
      severity: "warning",
      title: "Research hit the tool limit",
      description:
        "The agent used all allowed searches and fetches, then synthesized from gathered evidence. Some angles may be missing.",
      retryable: false,
    });
  }

  if (isBriefIncomplete(stripped)) {
    alerts.push({
      kind: "incomplete",
      severity: "warning",
      title: "Brief may be incomplete",
      description:
        "Required sections or depth may be missing. You can retry the same question or narrow the topic.",
      retryable: true,
    });
  } else if (isBriefStructurallyWeak(stripped) && !options.truncated) {
    alerts.push({
      kind: "incomplete",
      severity: "info",
      title: "Some sections may be missing",
      description:
        "The brief might omit contradictions, confidence, or sources. Review before relying on it.",
      retryable: false,
    });
  }

  if (evidenceCount > 0 && evidenceCount < MIN_EVIDENCE_COUNT) {
    alerts.push({
      kind: "thin_evidence",
      severity: "info",
      title: "Limited saved evidence",
      description: `Only ${evidenceCount} source(s) were saved for this brief. Conclusions may be preliminary.`,
      retryable: false,
    });
  } else if (evidenceCount === 0 && stripped.length > 0 && !isAgentCrashMessage(stripped)) {
    alerts.push({
      kind: "thin_evidence",
      severity: "warning",
      title: "No evidence saved",
      description:
        "No claims were stored in the evidence panel for this run. Treat citations in the brief with extra caution.",
      retryable: false,
    });
  }

  return alerts;
}

export function deriveResearchAlertsFromChat(result: ChatResponse): ResearchAlert[] {
  return deriveResearchAlerts(result.brief, {
    truncated: result.truncated,
    evidence_count: result.evidence_count,
  });
}

/** Reconstruct alerts when loading a session from history. */
export function deriveResearchAlertsFromHistory(
  messages: MessageItem[],
  evidenceLength: number,
): ResearchAlert[] {
  const displayMessages = messages.filter((m) => !isInternalMessage(m));
  const lastAssistant = [...displayMessages]
    .reverse()
    .find((m) => m.role === "assistant");

  if (!lastAssistant) return [];

  const truncated = messages.some((m) => isInternalMessage(m));

  return deriveResearchAlerts(lastAssistant.content, {
    truncated,
    evidenceLength,
  });
}

export function shouldRenderAsErrorBrief(alerts: ResearchAlert[]): boolean {
  return alerts.some(
    (a) => a.kind === "agent_error" || a.kind === "length_limited",
  );
}
