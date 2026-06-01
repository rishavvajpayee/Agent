import { Suspense } from "react";
import { StackProvider, StackTheme } from "@stackframe/stack";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { skipAuth } from "@/lib/skip-auth";
import { stackServerApp } from "@/stack/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Research Agent",
  description: "Evidence-backed research conversations powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense
          fallback={
            <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
              Loading…
            </div>
          }
        >
          {skipAuth ? (
            <TooltipProvider>
              {children}
              <Toaster richColors closeButton />
            </TooltipProvider>
          ) : (
            <StackProvider app={stackServerApp}>
              <StackTheme>
                <TooltipProvider>
                  {children}
                  <Toaster richColors closeButton />
                </TooltipProvider>
              </StackTheme>
            </StackProvider>
          )}
        </Suspense>
      </body>
    </html>
  );
}
