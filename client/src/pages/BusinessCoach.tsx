import { useAuth } from "@/_core/hooks/useAuth";
import { SignInForm } from "@/components/SignInForm";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { CoachChatPanel, INITIAL_COACH_MESSAGE, type ChatMessage } from "@/components/CoachChatPanel";

export default function BusinessCoach() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_COACH_MESSAGE]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {loading ? null : !user ? (
        <SignInForm />
      ) : (
        <>
          <div className="flex items-center gap-3 pb-4 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-primary)" }}
            >
              <Sparkles size={18} color="#0F1923" />
            </div>
            <div>
              <h1 className="text-lg font-serif">Business Coach</h1>
              <p className="text-xs" style={{ color: "var(--color-text-muted, #9CA8B4)" }}>
                Ask anything about what's holding your business back
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CoachChatPanel messages={messages} setMessages={setMessages} />
          </div>
        </>
      )}
    </div>
  );
}
