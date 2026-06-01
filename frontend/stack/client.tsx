import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: { type: "custom", url: "/login", version: 1 },
    signUp: { type: "custom", url: "/signup", version: 1 },
    afterSignIn: "/",
    afterSignUp: "/",
    afterSignOut: "/login",
    home: "/",
  },
});
