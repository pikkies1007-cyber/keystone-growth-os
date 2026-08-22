import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SignInForm } from "@/components/SignInForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { useRef, useState, useEffect, Fragment } from "react";
import { Link } from "wouter";

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Renders a chat message's text, turning any `[label](/os/path)` markdown-style
 * links into real, clickable in-app navigation. Intentionally minimal (no full
 * markdown parser) -- this is model output, not trusted markup, so we only
 * recognize this one narrow, safe pattern rather than rendering arbitrary HTML.
 */
function renderMessageContent(content: string) {
  const linkPattern = /\[([^\]]+)\]\((\/os\/[a-z0-9\-/]*)\)/gi;
  const parts: (string | { label: string; href: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push({ label: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));

  return parts.map((part, i) =>
    typeof part === "string" ? (
      <Fragment key={i}>{part}</Fragment>
    ) : (
      <Link key={i} href={part.href}>
        <a
          className="underline font-medium underline-offset-2 hover:opacity-80 transition-opacity"
          style={{ color: "inherit" }}
        >
          {part.label}
        </a>
      </Link>
    )
  );
}

export default function BusinessCoach() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "What's the one thing about your business that's been on your mind the most this week?",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.coach.chat.useMutation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");

    chatMutation.mutate(
      { history: nextMessages },
      {
        onSuccess: data => {
          setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        },
        onError: error => {
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: `Something went wrong: ${error.message}` },
          ]);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {loading ? null : !user ? (
        <SignInForm />
      ) : (
        <>
      <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "var(--color-border)" }}>
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap"
              style={{
                background: m.role === "user" ? "var(--color-primary)" : "var(--color-surface)",
                color: m.role === "user" ? "#0F1923" : "var(--color-text)",
              }}
            >
              {renderMessageContent(m.content)}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--color-surface)", color: "var(--color-text-muted, #9CA8B4)" }}
            >
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type your question..."
          className="min-h-[48px] max-h-32 resize-none"
        />
        <Button onClick={send} disabled={chatMutation.isPending || !input.trim()} size="icon" className="h-12 w-12 shrink-0">
          <Send size={18} />
        </Button>
      </div>
        </>
      )}
    </div>
  );
}
