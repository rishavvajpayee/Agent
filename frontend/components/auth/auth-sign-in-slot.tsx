"use client";

import dynamic from "next/dynamic";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

const SignInForm = dynamic(
  () =>
    import("@/components/auth/sign-in-form").then((module) => module.SignInForm),
  {
    ssr: false,
    loading: () => <AuthFormSkeleton />,
  },
);

export function AuthSignInSlot() {
  return <SignInForm />;
}
