"use client";

import type { ResearchAlert, ResearchAlertSeverity } from "@/lib/chat-response-quality";
import { AlertCircleIcon, AlertTriangleIcon, InfoIcon } from "lucide-react";

const STYLES: Record<
  ResearchAlertSeverity,
  { container: string; icon: typeof InfoIcon }
> = {
  info: {
    container:
      "border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100",
    icon: InfoIcon,
  },
  warning: {
    container:
      "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
    icon: AlertTriangleIcon,
  },
  error: {
    container:
      "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15",
    icon: AlertCircleIcon,
  },
};

interface ResearchAlertBannerProps {
  alert: ResearchAlert;
}

export function ResearchAlertBanner({ alert }: ResearchAlertBannerProps) {
  const style = STYLES[alert.severity];
  const Icon = style.icon;

  return (
    <div
      role="status"
      className={`max-w-3xl rounded-lg border px-4 py-3 text-sm ${style.container}`}
    >
      <div className="flex gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{alert.title}</p>
          <p className="leading-relaxed opacity-90">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

interface ResearchAlertsProps {
  alerts: ResearchAlert[];
}

export function ResearchAlerts({ alerts }: ResearchAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex max-w-3xl flex-col gap-2">
      {alerts.map((alert) => (
        <ResearchAlertBanner key={alert.kind} alert={alert} />
      ))}
    </div>
  );
}
