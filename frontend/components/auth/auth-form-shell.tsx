import Link from "next/link";
import type { ReactNode } from "react";

interface AuthFormShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footerText: string;
  footerLinkHref: string;
  footerLinkLabel: string;
}

export function AuthFormShell({
  eyebrow,
  title,
  description,
  children,
  footerText,
  footerLinkHref,
  footerLinkLabel,
}: AuthFormShellProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 max-w-md text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="font-heading text-4xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-sm">
        {children}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {footerText}{" "}
        <Link
          href={footerLinkHref}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}
