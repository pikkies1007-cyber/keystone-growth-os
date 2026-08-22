import { useState } from "react";
import { useLocation } from "wouter";
import { activeBrand } from "../../../shared/brandConfig";
import { ArrowRight, ArrowLeft, AlertTriangle, CheckCircle2, TrendingDown, RefreshCw, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useOSSession, notifyOSSessionChange } from "../hooks/useOSSession";

// ─── Types ────────────────────────────────────────────────────────────────────

type Dimension = "sales" | "cash" | "staff" | "systems" | "owner";

interface Question {
  id: string;
  dimension: Dimension;
  text: string;
  options: { label: string; value: number; moneySignal?: boolean }[];
}

interface AuditResult {
  scores: Record<Dimension, number>;
  moneyFrictionDetected: boolean;
  primaryBottleneck: Dimension;
  recommendations: string[];
  completedAt?: number;
}

// ─── Questions ────────────────────────────────────────────────────────────────

const questions: Question[] = [
  // SALES
  {
    id: "s1",
    dimension: "sales",
    text: "How consistently does your business generate new customers or repeat sales each month?",
    options: [
      { label: "Very inconsistently — some months are great, others are dead", value: 1 },
      { label: "Somewhat inconsistently — we rely on a few key customers", value: 2 },
      { label: "Fairly consistently — we have a basic process that works", value: 3 },
      { label: "Very consistently — we have a reliable, repeatable sales system", value: 4 },
    ],
  },
  {
    id: "s2",
    dimension: "sales",
    text: "How confident are you in your pricing? Do you discount to close deals?",
    options: [
      { label: "I discount often — I'm not confident customers will pay full price", value: 1, moneySignal: true },
      { label: "I discount sometimes — it feels necessary to compete", value: 2, moneySignal: true },
      { label: "I rarely discount — my pricing is mostly solid", value: 3 },
      { label: "I never discount — my value is clear and customers pay it", value: 4 },
    ],
  },
  {
    id: "s3",
    dimension: "sales",
    text: "Do you have a clear, documented sales process that your team follows?",
    options: [
      { label: "No — sales happens differently every time", value: 1 },
      { label: "Partially — some steps are documented but not consistently followed", value: 2 },
      { label: "Mostly — we have a process but it needs updating", value: 3 },
      { label: "Yes — documented, trained, and consistently followed", value: 4 },
    ],
  },
  // CASH
  {
    id: "c1",
    dimension: "cash",
    text: "How clearly do you understand your business cash flow at any given moment?",
    options: [
      { label: "I rarely know — I check the bank balance and hope for the best", value: 1, moneySignal: true },
      { label: "I have a rough idea but no formal tracking", value: 2, moneySignal: true },
      { label: "I track it monthly but not in real time", value: 3 },
      { label: "I have a clear, up-to-date cash flow view at all times", value: 4 },
    ],
  },
  {
    id: "c2",
    dimension: "cash",
    text: "How often does cash pressure affect your business decisions?",
    options: [
      { label: "Very often — cash pressure drives most of my decisions", value: 1, moneySignal: true },
      { label: "Often — I frequently feel constrained by cash", value: 2, moneySignal: true },
      { label: "Sometimes — cash is occasionally tight but manageable", value: 3 },
      { label: "Rarely — I make decisions based on strategy, not cash pressure", value: 4 },
    ],
  },
  {
    id: "c3",
    dimension: "cash",
    text: "Do you have a clear picture of your business profitability — not just revenue?",
    options: [
      { label: "No — I focus on revenue and hope the profit takes care of itself", value: 1, moneySignal: true },
      { label: "Partially — I know roughly but haven't done the full calculation", value: 2, moneySignal: true },
      { label: "Mostly — I review profitability quarterly", value: 3 },
      { label: "Yes — I review profitability monthly and adjust accordingly", value: 4 },
    ],
  },
  // STAFF
  {
    id: "st1",
    dimension: "staff",
    text: "How well does your team operate without your direct involvement?",
    options: [
      { label: "Poorly — things fall apart if I'm not there", value: 1 },
      { label: "Somewhat — they manage basics but need me for most decisions", value: 2 },
      { label: "Fairly well — they handle most things independently", value: 3 },
      { label: "Very well — the team runs the operation; I set direction", value: 4 },
    ],
  },
  {
    id: "st2",
    dimension: "staff",
    text: "Do your staff understand their roles, responsibilities, and performance expectations?",
    options: [
      { label: "No — roles are unclear and expectations are informal", value: 1 },
      { label: "Partially — some roles are defined but not all", value: 2 },
      { label: "Mostly — most roles are defined and communicated", value: 3 },
      { label: "Yes — all roles are documented, trained, and measured", value: 4 },
    ],
  },
  // SYSTEMS
  {
    id: "sy1",
    dimension: "systems",
    text: "How much of your business operation relies on documented processes vs. your personal knowledge?",
    options: [
      { label: "Almost entirely on me — nothing is documented", value: 1 },
      { label: "Mostly on me — a few things are written down", value: 2 },
      { label: "Mixed — key processes are documented but not all", value: 3 },
      { label: "Mostly documented — the business can run from the playbook", value: 4 },
    ],
  },
  {
    id: "sy2",
    dimension: "systems",
    text: "How effectively does your business use technology to reduce manual work?",
    options: [
      { label: "Very little — most things are done manually", value: 1 },
      { label: "Some tools — but they're not integrated or consistently used", value: 2 },
      { label: "Good tools — most key areas are automated or systemised", value: 3 },
      { label: "Excellent — technology runs most of the operation efficiently", value: 4 },
    ],
  },
  // OWNER BEHAVIOUR
  {
    id: "o1",
    dimension: "owner",
    text: "How much of your time is spent working IN the business (doing tasks) vs. ON the business (strategy and growth)?",
    options: [
      { label: "Almost entirely IN — I'm doing everything myself", value: 1 },
      { label: "Mostly IN — I occasionally think about strategy", value: 2 },
      { label: "Balanced — I split time between doing and leading", value: 3 },
      { label: "Mostly ON — I lead the business and delegate execution", value: 4 },
    ],
  },
  {
    id: "o2",
    dimension: "owner",
    text: "How do you respond when the business faces financial pressure or unexpected costs?",
    options: [
      { label: "I panic or freeze — financial stress overwhelms my decision-making", value: 1, moneySignal: true },
      { label: "I react emotionally first, then try to think it through", value: 2, moneySignal: true },
      { label: "I stay mostly calm and work through it systematically", value: 3 },
      { label: "I respond calmly with a clear process for managing financial pressure", value: 4 },
    ],
  },
  {
    id: "o3",
    dimension: "owner",
    text: "Do you have a clear personal financial plan that is separate from your business finances?",
    options: [
      { label: "No — my personal and business money are mixed together", value: 1, moneySignal: true },
      { label: "Partially — I try to keep them separate but it's messy", value: 2, moneySignal: true },
      { label: "Mostly — I have separate accounts and a rough personal plan", value: 3 },
      { label: "Yes — clear separation with a documented personal financial strategy", value: 4 },
    ],
  },
];

const dimensionLabels: Record<Dimension, string> = {
  sales: "Sales",
  cash: "Cash Flow",
  staff: "Staff",
  systems: "Systems",
  owner: "Owner Behaviour",
};

const dimensionColors: Record<Dimension, string> = {
  sales: "var(--color-primary)",
  cash: "var(--color-accent)",
  staff: "var(--color-info)",
  systems: "var(--color-success)",
  owner: "var(--color-danger)",
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calculateResults(answers: Record<string, number>): AuditResult {
  const dimensionScores: Record<Dimension, { total: number; count: number }> = {
    sales: { total: 0, count: 0 },
    cash: { total: 0, count: 0 },
    staff: { total: 0, count: 0 },
    systems: { total: 0, count: 0 },
    owner: { total: 0, count: 0 },
  };

  let moneySignalCount = 0;

  questions.forEach((q) => {
    const answer = answers[q.id];
    if (answer !== undefined) {
      dimensionScores[q.dimension].total += answer;
      dimensionScores[q.dimension].count += 1;
      const selectedOption = q.options.find((o) => o.value === answer);
      if (selectedOption?.moneySignal) moneySignalCount++;
    }
  });

  const scores = Object.entries(dimensionScores).reduce(
    (acc, [dim, { total, count }]) => {
      acc[dim as Dimension] = count > 0 ? Math.round((total / (count * 4)) * 100) : 0;
      return acc;
    },
    {} as Record<Dimension, number>
  );

  const primaryBottleneck = (Object.entries(scores) as [Dimension, number][]).sort(
    ([, a], [, b]) => a - b
  )[0][0];

  const moneyFrictionDetected = moneySignalCount >= 3;

  const recommendations: string[] = [];
  if (scores.sales < 50) recommendations.push("Build a repeatable sales process and review your pricing confidence.");
  if (scores.cash < 50) recommendations.push("Implement weekly cash flow tracking and separate personal from business finances.");
  if (scores.staff < 50) recommendations.push("Document roles and create a team accountability framework.");
  if (scores.systems < 50) recommendations.push("Identify your top 3 manual processes and create SOPs for each.");
  if (scores.owner < 50) recommendations.push("Shift from working IN the business to working ON it — start with one delegated task.");

  return { scores, moneyFrictionDetected, primaryBottleneck, recommendations };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BottleneckAudit() {
  const [, navigate] = useLocation();
  const session = useOSSession();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Pre-populate result from session if already completed (no-repeat)
  const [result, setResult] = useState<AuditResult | null>(() => {
    if (session.auditResult) return session.auditResult as AuditResult;
    return null;
  });
  const [showRetake, setShowRetake] = useState(false);
  const brand = activeBrand;

  const currentQuestion = questions[currentIndex];
  const progress = Math.round((currentIndex / questions.length) * 100);
  const isAnswered = answers[currentQuestion?.id] !== undefined;
  const isLast = currentIndex === questions.length - 1;

  function handleAnswer(value: number) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  const saveAudit = trpc.audit.save.useMutation();

  function handleNext() {
    if (isLast) {
      const r = calculateResults(answers);
      // Attach timestamp for monthly re-audit cadence
      const rWithTimestamp = { ...r, completedAt: Date.now() };
      setResult(rWithTimestamp);
      setShowRetake(false);
      // Store in session for Goal Dashboard
      sessionStorage.setItem("auditResult", JSON.stringify(rWithTimestamp));
      notifyOSSessionChange();
      // Persist to backend (fire-and-forget, no blocking)
      // Map frontend 'owner' key to backend 'ownerBehaviour' key
      const { owner, ...rest } = r.scores;
      const sessionId = sessionStorage.getItem("keystoneSessionId") ?? `anon-${Date.now()}`;
      sessionStorage.setItem("keystoneSessionId", sessionId);
      saveAudit.mutate({
        sessionId,
        primaryBottleneck: r.primaryBottleneck,
        moneyFrictionDetected: r.moneyFrictionDetected,
        scores: { ...rest, ownerBehaviour: owner },
        clientId: activeBrand.clientId,
      });
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  function handleContinue() {
    if (result?.moneyFrictionDetected) {
      navigate("/os/money-identity?source=audit");
    } else {
      navigate("/os/blueprint");
    }
  }

  // ── Results Screen ──────────────────────────────────────────────────────────
  if (result && !showRetake) {
    const auditDate = result.completedAt
      ? new Date(result.completedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
      : null;
    return (
      <div className="min-h-screen px-6 py-8 lg:px-10 max-w-3xl mx-auto">
        <div className="animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)", color: "var(--color-primary)" }}
              >
                <CheckCircle2 className="w-3 h-3" />
                Audit Complete
              </div>
              {auditDate && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <Clock className="w-3 h-3" />
                  {auditDate}
                </div>
              )}
            </div>
            {/* Re-audit nudge: show if 30+ days since last audit */}
            {session.reAuditDue && (
              <div
                className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "oklch(70% 0.10 75 / 0.08)",
                  border: "1px solid oklch(70% 0.10 75 / 0.25)",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>
                  <RefreshCw className="w-4 h-4 inline mr-1.5" style={{ color: "var(--color-accent)" }} />
                  It has been {session.daysSinceAudit} days since your last audit. How much has shifted in your business since then?
                </span>
                <button
                  onClick={() => {
                    setResult(null);
                    setShowRetake(true);
                    setCurrentIndex(0);
                    setAnswers({});
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium shrink-0 hover:opacity-80 transition-opacity"
                  style={{ color: "var(--color-accent)" }}
                >
                  Re-audit
                </button>
              </div>
            )}
            <h1
              className="text-2xl lg:text-3xl font-bold mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
            >
              Your Bottleneck Report
            </h1>
            <p style={{ color: "var(--color-text-muted)" }}>
              What would your business look like if this constraint were no longer running the show?
            </p>
          </div>

          {/* Primary Bottleneck */}
          <div
            className="rounded-xl p-6 mb-6"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: `2px solid ${dimensionColors[result.primaryBottleneck]}40`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${dimensionColors[result.primaryBottleneck]}18` }}
              >
                <TrendingDown className="w-5 h-5" style={{ color: dimensionColors[result.primaryBottleneck] }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Primary Bottleneck
                </p>
                <h2
                  className="text-xl font-bold mb-1"
                  style={{ fontFamily: "var(--font-display)", color: dimensionColors[result.primaryBottleneck] }}
                >
                  {dimensionLabels[result.primaryBottleneck]}
                </h2>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Your lowest-scoring dimension below — the one holding the others back.
                </p>
              </div>
            </div>
          </div>

          {/* Dimension Scores */}
          <div
            className="rounded-xl p-6 mb-6"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
          >
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Five-Dimension Score
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-subtle)" }}>
              Higher = stronger in that area. Your lowest score is your primary bottleneck, above.
            </p>
            <div className="space-y-4">
              {(Object.entries(result.scores) as [Dimension, number][]).map(([dim, score]) => (
                <div key={dim}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-base)" }}>
                      {dimensionLabels[dim]}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: score < 50 ? "var(--color-danger)" : score < 70 ? "var(--color-warning)" : "var(--color-success)" }}
                    >
                      {score}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${score}%`,
                        background: score < 50
                          ? "linear-gradient(90deg, var(--color-danger), oklch(60% 0.18 25 / 0.7))"
                          : score < 70
                          ? "linear-gradient(90deg, var(--color-warning), oklch(75% 0.12 75 / 0.7))"
                          : "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div
              className="rounded-xl p-6 mb-6"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Priority Actions
              </h3>
              <div className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                      style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{rec}</p>
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
                    A Pattern Worth Understanding
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {brand.modules.moneyIdentity.triggerMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contextual Toolkit CTAs */}
          {(result.primaryBottleneck === "owner" || result.primaryBottleneck === "staff") && (
            <div
              className="rounded-xl p-5 mb-4"
              style={{ backgroundColor: "oklch(55% 0.12 175 / 0.06)", border: "1px solid oklch(55% 0.12 175 / 0.22)" }}
            >
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-base)" }}>
                    What would your business look like if you were no longer the bottleneck in your own operation?
                  </p>
                  <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                    The 10-80-10 Delegation Toolkit gives you a structured framework to hand over the right work to the right people — and stay in your zone of genius.
                  </p>
                  <button
                    onClick={() => navigate("/os/delegation")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                  >
                    Open Delegation Toolkit <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {result.primaryBottleneck === "cash" && !result.moneyFrictionDetected && (
            <div
              className="rounded-xl p-5 mb-4"
              style={{ backgroundColor: "oklch(65% 0.15 160 / 0.06)", border: "1px solid oklch(65% 0.15 160 / 0.22)" }}
            >
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "oklch(65% 0.15 160)" }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-base)" }}>
                    How many of your past customers have heard from you in the last 90 days?
                  </p>
                  <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                    The fastest cash is always from people who already know you. The Flywheel Toolkit gives you a 30-day reactivation plan — reviews, referrals, and repeat revenue.
                  </p>
                  <button
                    onClick={() => navigate("/os/flywheel")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: "oklch(65% 0.15 160)", color: "white" }}
                  >
                    Open Flywheel Toolkit <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-180"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              {result.moneyFrictionDetected ? "Understand My Money Pattern" : "Continue to Freedom Blueprint"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/os/blueprint")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-180"
              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
            >
              Skip to Blueprint
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
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-primary)" }}
            >
              {brand.modules.audit.title}
            </span>
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
                backgroundColor: `${dimensionColors[currentQuestion.dimension]}18`,
                color: dimensionColors[currentQuestion.dimension],
              }}
            >
              {dimensionLabels[currentQuestion.dimension]}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
              {progress}% complete
            </span>
          </div>
        </div>

        {/* Question */}
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

        {/* Navigation */}
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
            {isLast ? "See My Results" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
