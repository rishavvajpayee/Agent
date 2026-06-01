"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowUpIcon } from "lucide-react";
import { useCallback, useRef, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  variant?: "centered" | "bottom";
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask a research question…",
  variant = "bottom",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const value = textareaRef.current?.value.trim();
    if (!value || disabled) return;

    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }

    await onSend(value);
  }, [disabled, onSend]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      className={cn(
        "w-full",
        variant === "centered" ? "max-w-2xl" : "mx-auto max-w-3xl px-4 pb-6 md:px-8",
      )}
    >
      <div
        className={cn(
          "relative flex items-end gap-2 rounded-[1.75rem] border bg-card p-2 shadow-sm",
          "ring-1 ring-border/60 transition-shadow focus-within:ring-ring/40",
        )}
      >
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          disabled={disabled}
          rows={variant === "centered" ? 3 : 1}
          onKeyDown={handleKeyDown}
          onInput={(event) => {
            const target = event.currentTarget;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
          className={cn(
            "min-h-[52px] resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0",
            variant === "bottom" && "max-h-[200px]",
          )}
        />
        <Button
          type="button"
          size="icon"
          disabled={disabled}
          onClick={() => void handleSend()}
          className="mb-1 mr-1 size-10 shrink-0 rounded-full"
          aria-label="Send message"
        >
          <ArrowUpIcon className="size-4" />
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Research may take up to a few minutes while sources are analyzed.
      </p>
    </div>
  );
}
