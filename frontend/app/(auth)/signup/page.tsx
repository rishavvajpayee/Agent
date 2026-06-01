import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthSignUpSlot } from "@/components/auth/auth-sign-up-slot";

export default function SignupPage() {
  return (
    <AuthFormShell
      eyebrow="Research Agent"
      title="Create your account"
      description="Start researching with evidence-backed AI analysis."
      footerText="Already have an account?"
      footerLinkHref="/login"
      footerLinkLabel="Sign in"
    >
      <AuthSignUpSlot />
    </AuthFormShell>
  );
}
