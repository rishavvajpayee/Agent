import { skipAuth } from "@/lib/skip-auth";
import { stackServerApp } from "@/stack/server";
import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = ["/chat"];
const authPaths = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (skipAuth) {
    const isAuthPath = authPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    if (isAuthPath) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  let user = null;
  try {
    user = await stackServerApp.getUser({ tokenStore: request });
  } catch (error) {
    console.error("Stack Auth middleware error:", error);
  }
  const isAuthenticated = user !== null;

  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isProtected =
    pathname === "/" ||
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  if (isProtected && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("after_auth_return_to", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && isAuthenticated) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup", "/chat/:path*"],
};
