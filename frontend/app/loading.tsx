export default function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[oklch(0.985_0.004_85)] dark:bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-pulse rounded-full bg-muted" />
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    </div>
  );
}
