"use client";

import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-heading mb-5 text-2xl font-medium tracking-tight text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-heading mb-3 mt-8 border-b border-border/60 pb-2 text-lg font-medium tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 text-base font-semibold text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-7 text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-4 space-y-3 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-3 pl-5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-7 text-foreground/90 [&>p]:my-0">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-[oklch(0.45_0.12_250)] underline decoration-[oklch(0.45_0.12_250)]/30 underline-offset-2 transition-colors hover:text-[oklch(0.38_0.14_250)] hover:decoration-[oklch(0.38_0.14_250)] dark:text-[oklch(0.72_0.12_250)] dark:decoration-[oklch(0.72_0.12_250)]/40"
    >
      {children}
      <ExternalLinkIcon className="size-3 shrink-0 opacity-70" />
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-primary/30 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border/70" />,
};

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("research-brief-markdown", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
