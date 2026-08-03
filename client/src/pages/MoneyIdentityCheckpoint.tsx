import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { activeBrand } from "../../../shared/brandConfig";
import { ArrowRight, ArrowLeft, Sparkles, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useOSSession, notifyOSSessionChange } from "../hooks/useOSSession";

// ─── Types ────────────────────────────────────────────────────────────────────

type Archetype = "hustler" | "giver" | "protector" | "enjoyer";

interface DiagnosticQuestion {
  id: string;
  archetype: Archetype;
  text: string;
  options: { label: string; value: number }[];
}

interface ArchetypeResult {
  archetype: Archetype;
  score: number;
  title: string;
  tagline: string;
  description: string;
  strength: string;
  challenge: string;
  nextStep: string;
}

// ─── Questions (from the uploaded diagnostic) ─────────────────────────────────

const questions: DiagnosticQuestion[] = [
  // HUSTLER
  {
    id: "h1",
    archetype: "hustler",
    text: "When it comes to money, I believe that hard work and hustle are the only reliable ways to create financial security.",
    options: [
      { label: "Strongly disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Agree", value: 3 },
      { label: "Strongly agree", value: 4 },
    ],
  },
  {
    id: "h2",
    archetype: "hustler",
    text: "I feel most financially secure when I am busy and generating income — rest makes me anxious about money.",
    options: [
      { label: "Rarely true for me", value: 1 },
      { label: "Sometimes true", value: 2 },
      { label: "Often true", value: 3 },
      { label: "Almost always true", value: 4 },
    ],
  },
  {
    id: "h3",
    archetype: "hustler",
    text: "I have a tendency to take on more work or income streams than I can sustainably manage.",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Almost always", value: 4 },
    ],
  },
  {
    id: "h4",
    archetype: "hustler",
    text: "I struggle to delegate or let others handle money-related tasks because I don't trust it will be done properly.",
    options: [
      { label: "Not like me", value: 1 },
      { label: "Somewhat like me", value: 2 },
      { label: "Quite like me", value: 3 },
      { label: "Very much like me", value: 4 },
    ],
  },
  // GIVER
  {
    id: "g1",
    archetype: "giver",
    text: "I find it easier to spend money on others than to invest in myself or my own financial security.",
    options: [
      { label: "Strongly disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Agree", value: 3 },
      { label: "Strongly agree", value: 4 },
    ],
  },
  {
    id: "g2",
    archetype: "giver",
    text: "I often feel guilty charging full price for my products or services — I worry about burdening people.",
    options: [
      { label: "Rarely true", value: 1 },
      { label: "Sometimes true", value: 2 },
      { label: "Often true", value: 3 },
      { label: "Almost always true", value: 4 },
    ],
  },
  {
    id: "g3",
    archetype: "giver",
    text: "I have a pattern of discounting, over-delivering, or giving things away for free in my business.",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Almost always", value: 4 },
    ],
  },
  {
    id: "g4",
    archetype: "giver",
    text: "I feel a deep sense of worth and identity from being the person who provides for others financially.",
    options: [
      { label: "Not like me", value: 1 },
      { label: "Somewhat like me", value: 2 },
      { label: "Quite like me", value: 3 },
      { label: "Very much like me", value: 4 },
    ],
  },
  // PROTECTOR
  {
    id: "p1",
    archetype: "protector",
    text: "I feel most comfortable when I have a financial buffer or reserve — spending it down creates significant anxiety.",
    options: [
      { label: "Strongly disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Agree", value: 3 },
      { label: "Strongly agree", value: 4 },
    ],
  },
  {
    id: "p2",
    archetype: "protector",
    text: "I tend to avoid financial risk even when the opportunity is clearly good — safety feels more important than growth.",
    options: [
      { label: "Rarely true", value: 1 },
      { label: "Sometimes true", value: 2 },
      { label: "Often true", value: 3 },
      { label: "Almost always true", value: 4 },
    ],
  },
  {
    id: "p3",
    archetype: "protector",
    text: "I have a tendency to under-invest in my business or myself because spending money feels dangerous.",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Almost always", value: 4 },
    ],
  },
  {
    id: "p4",
    archetype: "protector",
    text: "I grew up in an environment where money was scarce or unpredictable, and that still shapes how I manage money today.",
    options: [
      { label: "Not like me", value: 1 },
      { label: "Somewhat like me", value: 2 },
      { label: "Quite like me", value: 3 },
      { label: "Very much like me", value: 4 },
    ],
  },
  // ENJOYER
  {
    id: "e1",
    archetype: "enjoyer",
    text: "I believe money is meant to be enjoyed and spent — saving feels like deprivation.",
    options: [
      { label: "Strongly disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Agree", value: 3 },
      { label: "Strongly agree", value: 4 },
    ],
  },
  {
    id: "e2",
    archetype: "enjoyer",
    text: "I find it difficult to delay gratification — I tend to spend money when I have it rather than saving or investing.",
    options: [
      { label: "Rarely true", value: 1 },
      { label: "Sometimes true", value: 2 },
      { label: "Often true", value: 3 },
      { label: "Almost always true", value: 4 },
    ],
  },
  {
    id: "e3",
    archetype: "enjoyer",
    text: "I have a pattern of making good money but not accumulating wealth — money tends to flow out as fast as it comes in.",
    options: [
      { label: "Rarely", value: 1 },
      { label: "Sometimes", value: 2 },
      { label: "Often", value: 3 },
      { label: "Almost always", value: 4 },
    ],
  },
  {
    id: "e4",
    archetype: "enjoyer",
    text: "I use spending as a way to celebrate success, manage stress, or reward myself for hard work.",
    options: [
      { label: "Not like me", value: 1 },
      { label: "Somewhat like me", value: 2 },
      { label: "Quite like me", value: 3 },
      { label: "Very much like me", value: 4 },
    ],
  },
];

const archetypeData: Record<Archetype, Omit<ArchetypeResult, "archetype" | "score">> = {
  hustler: {
    title: "The Hustler",
    tagline: "Your energy is your greatest asset — and your greatest risk.",
    description:
      "You are wired to create. You generate income through sheer effort, resourcefulness, and relentless action. Your business likely exists because of your drive and willingness to outwork everyone around you. But your money identity is also telling you something important: you may have built a business that cannot survive without you.",
    strength: "Extraordinary drive, resourcefulness, and the ability to generate income in almost any environment.",
    challenge:
      "Burnout, over-dependence on personal effort, difficulty delegating, and a belief that rest equals financial risk.",
    nextStep:
      "Your next level of growth requires you to shift from being the engine of the business to being its architect. The Wealth Reset Journey will help you understand the money beliefs driving your hustle — and build a financial strategy that works even when you rest.",
  },
  giver: {
    title: "The Giver",
    tagline: "Your generosity is a gift — but it may be costing you your business.",
    description:
      "You are naturally generous, empathetic, and deeply motivated by the impact your work has on others. You likely undercharge, over-deliver, and find it difficult to say no. Your clients and team love you — but your bank account may tell a different story. Your money identity is rooted in worth: you may not fully believe you deserve to be paid what your work is truly worth.",
    strength:
      "Deep client loyalty, exceptional service, and the ability to build genuine trust and long-term relationships.",
    challenge:
      "Chronic undercharging, discounting, over-delivering, and a pattern of putting others' financial comfort ahead of your own sustainability.",
    nextStep:
      "Charging what you are worth is not greed — it is sustainability. The Wealth Reset Journey will help you separate your self-worth from your pricing and build a financial identity that allows you to give generously from a position of strength, not sacrifice.",
  },
  protector: {
    title: "The Protector",
    tagline: "Your caution has kept you safe — but it may be keeping you small.",
    description:
      "You are careful, disciplined, and deeply aware of financial risk. You have likely survived difficult financial periods through sheer caution and restraint. But your money identity may now be working against you: the same instinct that protected you from loss is also preventing you from making the investments and decisions that would grow your business.",
    strength:
      "Financial discipline, risk awareness, and the ability to maintain stability even in challenging economic conditions.",
    challenge:
      "Under-investment in growth, avoidance of necessary risk, and a tendency to stay in the safety zone even when expansion is clearly the right move.",
    nextStep:
      "Safety and growth are not opposites — but your money identity may be treating them that way. The Wealth Reset Journey will help you build a financial strategy that honours your need for security while creating the structure for confident, strategic growth.",
  },
  enjoyer: {
    title: "The Enjoyer",
    tagline: "You know how to live — now it's time to build.",
    description:
      "You have a natural, healthy relationship with abundance and pleasure. You are not afraid of money, and you know how to enjoy it. But your money identity may be creating a ceiling: you generate income well but struggle to accumulate wealth, build reserves, or invest in long-term financial security. The money flows in — and flows right back out.",
    strength:
      "Positive relationship with money, natural abundance mindset, and the ability to enjoy the fruits of your work without guilt.",
    challenge:
      "Difficulty accumulating wealth, under-saving, reactive financial management, and a pattern of spending that outpaces income growth.",
    nextStep:
      "Enjoying money and building wealth are not in conflict — but they require a structure that your current money identity may not yet have. The Wealth Reset Journey will help you build a 12-month financial roadmap that lets you enjoy the present while securing your future.",
  },
};

const archetypeColors: Record<Archetype, string> = {
  hustler: "var(--color-danger)",
  giver: "var(--color-accent)",
  protector: "var(--color-info)",
  enjoyer: "var(--color-success)",
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calculateArchetype(answers: Record<string, number>): ArchetypeResult {
  const scores: Record<Archetype, number> = { hustler: 0, giver: 0, protector: 0, enjoyer: 0 };
  questions.forEach((q) => {
    const answer = answers[q.id];
    if (answer !== undefined) scores[q.archetype] += answer;
  });

  const dominant = (Object.entries(scores) as [Archetype, number][]).sort(([, a], [, b]) => b - a)[0];
  const archetype = dominant[0];
  const score = Math.round((dominant[1] / 16) * 100);

  return { archetype, score, ...archetypeData[archetype] };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MoneyIdentityCheckpoint() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const source = new URLSearchParams(searchStr).get("source") || "direct";
  const brand = activeBrand;
  const session = useOSSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Pre-populate result from session if already completed (no-repeat)
  const [result, setResult] = useState<ArchetypeResult | null>(() => {
    if (session.moneyIdentity) {
      const mi = session.moneyIdentity;
      const data = archetypeData[mi.archetype];
      return data ? { archetype: mi.archetype, score: mi.score, ...data } : null;
    }
    return null;
  });
  const [showRetake, setShowRetake] = useState(false);
  // Lead capture form
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const captureLead = trpc.leads.capture.useMutation({
    onSuccess: (_, variables) => {
      setLeadSubmitted(true);
      toast.success("Your Money Identity profile has been saved.");
      // Store lead contact info so downstream pages (e.g. Wealth Reset) can use it
      try {
        sessionStorage.setItem(
          "leadProfile",
          JSON.stringify({
            name: variables.name,
            email: variables.email,
            archetype: variables.moneyArchetype ?? null,
          })
        );
        notifyOSSessionChange();
      } catch {
        // non-fatal
      }
    },
    onError: () => {
      toast.error("Could not save your profile right now. Please try again.");
    },
  });

  const currentQuestion = questions[currentIndex];
  const progress = Math.round((currentIndex / questions.length) * 100);
  const isAnswered = answers[currentQuestion?.id] !== undefined;
  const isLast = currentIndex === questions.length - 1;

  function handleAnswer(value: number) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  function handleNext() {
    if (isLast) {
      const r = calculateArchetype(answers);
      setResult(r);
      sessionStorage.setItem("moneyIdentityResult", JSON.stringify(r));
      notifyOSSessionChange();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  // ── Results Screen ──────────────────────────────────────────────────────────
  // If retake is requested, show the quiz (reset state)
  if (showRetake && result) {
    // Allow retake by clearing result
  }

  if (result && !showRetake) {
    const color = archetypeColors[result.archetype];
    return (
      <div className="min-h-screen px-6 py-8 lg:px-10 max-w-3xl mx-auto">
        <div className="animate-fade-in">
          {/* Already-completed notice */}
          {session.hasMoneyIdentity && (
            <div
              className="flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: "oklch(55% 0.12 175 / 0.08)",
                border: "1px solid oklch(55% 0.12 175 / 0.2)",
                color: "var(--color-text-muted)",
              }}
            >
              <span>
                <CheckCircle2 className="w-4 h-4 inline mr-1.5" style={{ color: "var(--color-primary)" }} />
                Your Money Identity is saved and active across this OS.
              </span>
              <button
                onClick={() => {
                  setResult(null);
                  setShowRetake(true);
                  setCurrentIndex(0);
                  setAnswers({});
                }}
                className="flex items-center gap-1.5 text-xs font-medium shrink-0 hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-primary)" }}
              >
                <RefreshCw className="w-3 h-3" />
                Retake
              </button>
            </div>
          )}
          {/* Archetype Header */}
          <div
            className="rounded-2xl p-8 mb-6 text-center"
            style={{
              background: `linear-gradient(135deg, ${color}18 0%, oklch(15% 0.04 220) 100%)`,
              border: `2px solid ${color}30`,
            }}
          >
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Sparkles className="w-3 h-3" />
              Your Money Identity
            </div>
            <h1
              className="text-3xl lg:text-4xl font-bold mb-2"
              style={{ fontFamily: "var(--font-display)", color }}
            >
              {result.title}
            </h1>
            <p className="text-base italic mb-4" style={{ color: "var(--color-text-muted)" }}>
              "{result.tagline}"
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
              style={{ backgroundColor: `${color}15`, color }}
            >
              Dominant archetype · {result.score}% alignment
            </div>
          </div>

          {/* Description */}
          <div
            className="rounded-xl p-6 mb-4"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {result.description}
            </p>
          </div>

          {/* Strength & Challenge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-success)" }}>
                Your Strength
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{result.strength}</p>
            </div>
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-danger)" }}>
                Your Challenge
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{result.challenge}</p>
            </div>
          </div>

          {/* Next Step */}
          <div
            className="rounded-xl p-6 mb-6"
            style={{
              backgroundColor: `${color}08`,
              border: `1px solid ${color}25`,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color }}>
              Your Next Step
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {result.nextStep}
            </p>
          </div>

          {/* Lead Capture Form */}
          {!leadSubmitted ? (
            <div
              className="rounded-xl p-6 mb-6"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-base)" }}>
                Save your Money Identity profile
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                Enter your details to receive your personalised archetype report and 12-month roadmap.
              </p>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-base)",
                  }}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-base)",
                  }}
                />
                <input
                  type="tel"
                  placeholder="WhatsApp number (optional)"
                  value={leadWhatsapp}
                  onChange={(e) => setLeadWhatsapp(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-base)",
                  }}
                />
                <button
                  disabled={!leadName.trim() || !leadEmail.trim() || captureLead.isPending}
                  onClick={() => {
                    if (!leadName.trim() || !leadEmail.trim()) return;
                    captureLead.mutate({
                      name: leadName.trim(),
                      email: leadEmail.trim(),
                      whatsapp: leadWhatsapp.trim() || undefined,
                      moneyArchetype: result.archetype,
                      archetypeScore: result.score,
                      diagnosticAnswers: answers,
                      source,
                      clientId: brand.clientId,
                    });
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-180 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                >
                  {captureLead.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    "Save My Profile"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-5 mb-6 flex items-center gap-3"
              style={{ backgroundColor: "oklch(20% 0.06 160 / 0.3)", border: "1px solid oklch(55% 0.15 160 / 0.4)" }}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--color-success)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Profile saved. Your archetype report will be sent to{" "}
                <strong style={{ color: "var(--color-text-base)" }}>{leadEmail}</strong>.
              </p>
            </div>
          )}
          {/* CTA to Wealth Reset */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/wealth-reset")}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold transition-all duration-180"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              {brand.modules.wealthReset.ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/goals")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-180"
              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
            >
              Go to My Goal Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Intro Screen ────────────────────────────────────────────────────────────
  if (currentIndex === 0 && Object.keys(answers).length === 0) {
    return (
      <div className="min-h-screen px-6 py-8 lg:px-10 max-w-2xl mx-auto flex flex-col justify-center">
        <div className="animate-fade-in">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-6"
            style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)", color: "var(--color-primary)" }}
          >
            <Sparkles className="w-3 h-3" />
            {brand.modules.moneyIdentity.title}
          </div>
          <h1
            className="text-2xl lg:text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            {brand.modules.moneyIdentity.introHeading}
          </h1>
          <p className="text-base mb-6 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {brand.modules.moneyIdentity.introBody}
          </p>
          <div
            className="rounded-xl p-5 mb-8"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
              The Four Money Identities
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["hustler", "giver", "protector", "enjoyer"] as Archetype[]).map((a) => (
                <div
                  key={a}
                  className="flex items-center gap-2 p-2.5 rounded-lg"
                  style={{ backgroundColor: `${archetypeColors[a]}10`, border: `1px solid ${archetypeColors[a]}20` }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: archetypeColors[a] }} />
                  <span className="text-sm font-medium capitalize" style={{ color: "var(--color-text-base)" }}>
                    {archetypeData[a].title.replace("The ", "")}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setCurrentIndex(0)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold w-full sm:w-auto justify-center transition-all duration-180"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            onMouseDown={() => {
              // Force first question to show by setting a dummy answer flag
              setAnswers({});
            }}
            onMouseUp={() => {
              // Trigger re-render to show question 1
              setCurrentIndex(0);
              setAnswers({ _started: 1 } as Record<string, number>);
            }}
          >
            Begin the Diagnostic
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Question Screen ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-6 py-8 lg:px-10 max-w-2xl mx-auto">
      <div className="animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
                Money Identity Checkpoint
              </span>
            </div>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full capitalize"
              style={{
                backgroundColor: `${archetypeColors[currentQuestion.archetype]}15`,
                color: archetypeColors[currentQuestion.archetype],
              }}
            >
              {currentQuestion.archetype} pattern
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {progress}% complete
            </span>
          </div>
        </div>

        <div className="question-card mb-6">
          <h2
            className="text-lg font-semibold mb-6"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)", lineHeight: "1.4" }}
          >
            {currentQuestion.text}
          </h2>
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={cn("option-button", answers[currentQuestion.id] === option.value && "selected")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-180 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-180 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          >
            {isLast ? "Reveal My Identity" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
