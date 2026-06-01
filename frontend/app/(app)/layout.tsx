import { ApiStatusBanner } from "@/components/api-status-banner";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionsProvider } from "@/components/providers/sessions-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionsProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-h-svh bg-[oklch(0.985_0.004_85)] dark:bg-background">
          <ApiStatusBanner />
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium">Research Agent</span>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SessionsProvider>
  );
}
