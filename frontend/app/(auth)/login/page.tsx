import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthSignInSlot } from "@/components/auth/auth-sign-in-slot";

export default function LoginPage() {
  return (
    <AuthFormShell
      eyebrow="Research Agent"
      title="Welcome back"
      description="Sign in to continue your research conversations."
      footerText="Don't have an account?"
      footerLinkHref="/signup"
      footerLinkLabel="Sign up"
    >
      <AuthSignInSlot />
    </AuthFormShell>
  );
}
