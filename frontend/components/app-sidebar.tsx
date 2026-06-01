"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessions } from "@/hooks/use-sessions";
import { formatRelativeTime } from "@/lib/format-time";
import { skipAuth } from "@/lib/skip-auth";
import { cn } from "@/lib/utils";
import { useUser } from "@stackframe/stack";
import {
  LogOutIcon,
  MessageSquarePlusIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function SidebarUserMenu() {
  const router = useRouter();
  const user = useUser();

  const initials = useMemo(() => {
    const name = user?.displayName || user?.primaryEmail || "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
            "hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center",
          )}
        >
          <Avatar className="size-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">
              {user?.displayName || "Account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.primaryEmail}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={async () => {
            await user?.signOut();
            router.push("/login");
          }}
        >
          <LogOutIcon className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarDevUserMenu() {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-xl p-2",
        "group-data-[collapsible=icon]:justify-center",
      )}
    >
      <Avatar className="size-9">
        <AvatarFallback>DU</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <p className="truncate text-sm font-medium">Dev User</p>
        <p className="truncate text-xs text-muted-foreground">dev@local</p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const activeSessionId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : undefined;
  const { sessions, isLoading, removeSession } = useSessions(activeSessionId);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="gap-3 p-3">
          <div className="flex items-center gap-2 px-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-semibold">R</span>
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="font-heading text-sm font-medium">Research Agent</p>
              <p className="text-xs text-muted-foreground">Evidence-backed answers</p>
            </div>
          </div>
          <Button
            asChild
            className="w-full justify-start gap-2 rounded-xl group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            variant={pathname === "/" ? "secondary" : "outline"}
          >
            <Link href="/">
              <MessageSquarePlusIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">New chat</span>
            </Link>
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <SidebarMenuItem key={index}>
                      <Skeleton className="mx-2 h-9 rounded-lg" />
                    </SidebarMenuItem>
                  ))
                ) : sessions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                    No conversations yet
                  </div>
                ) : (
                  sessions.map((session) => {
                    const href = `/chat/${session.session_id}`;
                    const isActive = activeSessionId === session.session_id;

                    return (
                      <SidebarMenuItem key={session.session_id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={session.title || "Untitled chat"}
                          className="rounded-lg"
                        >
                          <Link href={href}>
                            <span className="truncate">
                              {session.title || "Untitled chat"}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction
                              showOnHover
                              className="rounded-md"
                              aria-label="Conversation options"
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" side="right">
                            <DropdownMenuItem disabled>
                              {formatRelativeTime(session.updated_at)}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setPendingDeleteId(session.session_id)
                              }
                            >
                              <Trash2Icon className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          {skipAuth ? <SidebarDevUserMenu /> : <SidebarUserMenu />}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes all messages in this session. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) {
                  void removeSession(pendingDeleteId);
                }
                setPendingDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
