"use client";

import dynamic from "next/dynamic";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

const SignUpForm = dynamic(
  () =>
    import("@/components/auth/sign-up-form").then((module) => module.SignUpForm),
  {
    ssr: false,
    loading: () => <AuthFormSkeleton />,
  },
);

export function AuthSignUpSlot() {
  return <SignUpForm />;
}
