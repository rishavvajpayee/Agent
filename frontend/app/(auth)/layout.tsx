export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[oklch(0.98_0.005_85)] dark:bg-background">
      {children}
    </div>
  );
}
