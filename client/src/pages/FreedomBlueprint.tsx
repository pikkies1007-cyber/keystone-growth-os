import { useState } from "react";
import { useLocation } from "wouter";
import { activeBrand } from "../../../shared/brandConfig";
import { ArrowRight, ArrowLeft, Compass, AlertTriangle, CheckCircle2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOSSession, notifyOSSessionChange } from "../hooks/useOSSession";

interface BlueprintQuestion {
  id: string;
  section: string;
  text: string;
  type: "scale" | "choice";
  options: { label: string; value: number; moneySignal?: boolean }[];
}

const questions: BlueprintQuestion[] = [
  // OWNER BEHAVIOUR
  {
    id: "b1",
    section: "Owner Behaviour",
    text: "On a scale of 1–4, how much does fear of financial failure influence your daily business decisions?",
    type: "scale",
    options: [
      { label: "1 — Rarely. I make decisions based on strategy and data.", value: 1 },
      { label: "2 — Sometimes. Fear occasionally clouds my thinking.", value: 2, moneySignal: true },
      { label: "3 — Often. Financial fear is a regular part of how I operate.", value: 3, moneySignal: true },
      { label: "4 — Almost always. Fear drives most of my decisions.", value: 4, moneySignal: true },
    ],
  },
  {
    id: "b2",
    section: "Owner Behaviour",
    text: "When you think about growing your business, what is your biggest internal resistance?",
    type: "choice",
    options: [
      { label: "I don't know what to do next — I lack clarity on the path.", value: 1 },
      { label: "I'm afraid of taking on more financial risk or debt.", value: 2, moneySignal: true },
      { label: "I don't trust myself to manage more money or a bigger operation.", value: 3, moneySignal: true },
      { label: "I'm worried about losing control or burning out.", value: 4 },
    ],
  },
  // PRESSURE POINTS
  {
    id: "p1",
    section: "Pressure Points",
    text: "Which of the following creates the most pressure for you as a business owner right now?",
    type: "choice",
    options: [
      { label: "Not knowing if I'll have enough money at the end of the month.", value: 1, moneySignal: true },
      { label: "Staff problems — performance, attitude, or turnover.", value: 2 },
      { label: "Not enough customers or inconsistent sales.", value: 3 },
      { label: "Feeling like I'm doing everything myself with no support.", value: 4 },
    ],
  },
  {
    id: "p2",
    section: "Pressure Points",
    text: "How do you typically respond when your business faces an unexpected financial setback?",
    type: "choice",
    options: [
      { label: "I stay calm and work through it with a clear plan.", value: 1 },
      { label: "I feel anxious but eventually find a way forward.", value: 2, moneySignal: true },
      { label: "I feel overwhelmed and it takes time to recover mentally.", value: 3, moneySignal: true },
      { label: "I avoid thinking about it and hope it resolves itself.", value: 4, moneySignal: true },
    ],
  },
  // GOALS
  {
    id: "g1",
    section: "Goals & Vision",
    text: "What does business success look like for you in the next 12 months?",
    type: "choice",
    options: [
      { label: "Financial stability — consistent income and no cash stress.", value: 1, moneySignal: true },
      { label: "Growth — more customers, more revenue, bigger operation.", value: 2 },
      { label: "Freedom — a business that runs without me being there every day.", value: 3 },
      { label: "Impact — making a real difference in my community or industry.", value: 4 },
    ],
  },
  {
    id: "g2",
    section: "Goals & Vision",
    text: "What is the single biggest thing holding you back from achieving that vision right now?",
    type: "choice",
    options: [
      { label: "I don't have enough money or financial resources.", value: 1, moneySignal: true },
      { label: "I don't have the right team or support structure.", value: 2 },
      { label: "I don't have a clear enough plan or strategy.", value: 3 },
      { label: "I don't believe I'm capable of operating at that level.", value: 4, moneySignal: true },
    ],
  },
  // GROWTH VISION
  {
    id: "v1",
    section: "Growth Vision",
    text: "How do you feel about charging premium prices for your products or services?",
    type: "scale",
    options: [
      { label: "1 — Very uncomfortable. I worry customers won't pay.", value: 1, moneySignal: true },
      { label: "2 — Somewhat uncomfortable. I discount to feel safer.", value: 2, moneySignal: true },
      { label: "3 — Mostly comfortable. I know my value.", value: 3 },
      { label: "4 — Very comfortable. I charge what I'm worth confidently.", value: 4 },
    ],
  },
  {
    id: "v2",
    section: "Growth Vision",
    text: "How clearly have you designed the life you want your business to fund?",
    type: "scale",
    options: [
      { label: "1 — Not at all. I haven't thought about it beyond survival.", value: 1, moneySignal: true },
      { label: "2 — Vaguely. I have a rough idea but nothing specific.", value: 2 },
      { label: "3 — Fairly clearly. I know what I want but haven't written it down.", value: 3 },
      { label: "4 — Very clearly. I have a written vision and financial target.", value: 4 },
    ],
  },
];

interface BlueprintResult {
  moneyFrictionDetected: boolean;
  primaryTheme: string;
  insights: string[];
}

function calculateBlueprintResult(answers: Record<string, number>): BlueprintResult {
  let moneySignalCount = 0;
  questions.forEach((q) => {
    const answer = answers[q.id];
    if (answer !== undefined) {
      const option = q.options.find((o) => o.value === answer);
      if (option?.moneySignal) moneySignalCount++;
    }
  });

  const moneyFrictionDetected = moneySignalCount >= 3;

  // Determine primary theme from answers
  const fearScore = (answers["b1"] || 1) + (answers["p2"] || 1);
  const clarityScore = (answers["g2"] || 1) + (answers["v2"] || 1);
  const confidenceScore = (answers["v1"] || 1) + (answers["b2"] || 1);

  let primaryTheme = "Systems & Structure";
  if (fearScore >= 5) primaryTheme = "Financial Confidence";
  else if (confidenceScore >= 5) primaryTheme = "Owner Mindset";
  else if (clarityScore >= 5) primaryTheme = "Strategic Clarity";

  const insights: string[] = [];
  if (moneyFrictionDetected) {
    insights.push("Your responses indicate that money-related patterns — fear, avoidance, or lack of confidence — are influencing your business decisions.");
  }
  if (answers["b2"] >= 3) {
    insights.push("You may be holding yourself back from growth due to self-trust issues around managing a larger operation.");
  }
  if (answers["v1"] <= 2) {
    insights.push("Pricing discomfort is limiting your revenue potential. This is often rooted in money identity, not market conditions.");
  }
  if (answers["g1"] === 1) {
    insights.push("Financial stability is your primary goal — this suggests that cash pressure is currently your most urgent constraint.");
  }

  return { moneyFrictionDetected, primaryTheme, insights };
}

export default function FreedomBlueprint() {
  const [, navigate] = useLocation();
  const session = useOSSession();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<BlueprintResult | null>(null);
  const brand = activeBrand;

  const currentQuestion = questions[currentIndex];
  const progress = Math.round((currentIndex / questions.length) * 100);
  const isAnswered = answers[currentQuestion?.id] !== undefined;
  const isLast = currentIndex === questions.length - 1;

  function handleAnswer(value: number) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  function handleNext() {
    if (isLast) {
      const r = calculateBlueprintResult(answers);
      setResult(r);
      sessionStorage.setItem("blueprintResult", JSON.stringify(r));
      notifyOSSessionChange();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  function handleContinue() {
    if (result?.moneyFrictionDetected) {
      navigate("/money-identity?source=blueprint");
    } else {
      navigate("/goals");
    }
  }

  // ── Results Screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen px-6 py-8 lg:px-10 max-w-3xl mx-auto">
        <div className="animate-fade-in">
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)", color: "var(--color-primary)" }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Blueprint Complete
            </div>
            <h1
              className="text-2xl lg:text-3xl font-bold mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
            >
              Your Freedom Blueprint
            </h1>
            <p style={{ color: "var(--color-text-muted)" }}>
              Here is what your responses reveal about the patterns shaping your business journey.
            </p>
          </div>

          {/* Primary Theme */}
          <div
            className="rounded-xl p-6 mb-6"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "2px solid oklch(55% 0.12 175 / 0.3)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Primary Growth Theme
            </p>
            <h2
              className="text-2xl font-bold gradient-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {result.primaryTheme}
            </h2>
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              This is the central theme that most needs your attention to unlock your next level of growth.
            </p>
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div
              className="rounded-xl p-6 mb-6"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
                Key Insights
              </h3>
              <div className="space-y-3">
                {result.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    />
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Money Friction Alert */}
          {result.moneyFrictionDetected && (
            <div
              className="rounded-xl p-5 mb-6"
              style={{
                backgroundColor: "oklch(70% 0.10 75 / 0.08)",
                border: "1px solid oklch(70% 0.10 75 / 0.3)",
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-accent)" }}>
                    Money Pattern Detected
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {brand.modules.moneyIdentity.triggerMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reflective Money Identity line — only shown if no friction detected AND archetype not yet done */}
          {!result.moneyFrictionDetected && !session.hasMoneyIdentity && (
            <div
              className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: "oklch(55% 0.12 175 / 0.06)",
                border: "1px solid oklch(55% 0.12 175 / 0.15)",
              }}
            >
              <Brain className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-primary)" }} />
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Your growth vision is clear. What would it look like if your money mindset was equally clear?{" "}
                <button
                  onClick={() => navigate("/money-identity?source=blueprint")}
                  className="underline font-medium hover:opacity-80 transition-opacity"
                  style={{ color: "var(--color-primary)" }}
                >
                  Map your money identity
                </button>
                {" "}before building your goals.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-180"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              {result.moneyFrictionDetected ? "Explore My Money Identity" : "Build My Goal Dashboard"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/goals")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-180"
              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
            >
              Skip to Goals
            </button>
          </div>
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
              <Compass className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
                {brand.modules.blueprint.title}
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
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "oklch(55% 0.12 175 / 0.12)",
                color: "var(--color-primary)",
              }}
            >
              {currentQuestion.section}
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
            {isLast ? "See My Blueprint" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
