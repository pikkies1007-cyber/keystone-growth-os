import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function SignInForm() {
  const { signInWithEmail, verifyEmailCode } = useAuth();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

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

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setCodeError(null);
    try {
      await verifyEmailCode(email, code);
      // On success, onAuthStateChange picks up the new session automatically.
    } catch (err) {
      setCodeError(
        err instanceof Error ? err.message : "That code didn't work — check it and try again."
      );
    } finally {
      setVerifying(false);
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
              ? "Check your inbox — click the link, or enter the 6-digit code from the same email below."
              : "Enter your email and we'll send you a sign-in link and code — no password needed."}
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
        {linkSent && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-3 w-full">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {codeError && <p className="text-sm text-destructive">{codeError}</p>}
            <Button type="submit" size="lg" className="w-full shadow-lg hover:shadow-xl transition-all" disabled={verifying || code.length < 6}>
              {verifying ? "Verifying..." : "Verify code"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 self-center"
              onClick={() => {
                setLinkSent(false);
                setCode("");
                setCodeError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
