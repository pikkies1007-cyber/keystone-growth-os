import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function SignInForm() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setAuthError(null);
    try {
      await signInWithEmail(email);
      setLinkSent(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to send sign-in link");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-2xl font-semibold tracking-tight text-center">
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {linkSent
              ? "Check your inbox for a sign-in link."
              : "Enter your email and we'll send you a magic link — no password needed."}
          </p>
        </div>
        {!linkSent && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <Button type="submit" size="lg" className="w-full shadow-lg hover:shadow-xl transition-all" disabled={sending}>
              {sending ? "Sending..." : "Send sign-in link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
