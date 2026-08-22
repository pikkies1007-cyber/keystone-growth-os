import { useState } from "react";
import { Link, useLocation } from "wouter";
import { activeBrand } from "../../../shared/brandConfig";
import {
  Search,
  Compass,
  Target,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Brain,
  RefreshCw,
  AlertTriangle,
  X,
  Star,
  ChevronRight,
  Calendar,
  MessageSquare,
  Map,
  Building2,
  CalendarDays,
  Lock,
} from "lucide-react";
import { useOSSession, archetypeDisplay } from "../hooks/useOSSession";
import { useCoachSession } from "../hooks/useCoachSession";
import { getCoachMessage, type Bottleneck, type Archetype } from "../../../shared/coachMessages";
import { trpc } from "../lib/trpc";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "not-started" | "in-progress" | "complete";
  estimatedTime: string;
  step: number;
  /** If set, the card is locked and this text explains how to unlock it */
  lockHint?: string;
}

const stats = [
  { label: "Business Frameworks", value: "10+", icon: Zap },
  { label: "Avg. Audit Time", value: "8 min", icon: Clock },
  { label: "SMEs Supported", value: "50+", icon: Users },
  { label: "Growth Pillars", value: "3", icon: TrendingUp },
];

function StatusBadge({ status }: { status: ModuleCard["status"] }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full status-complete">
        <CheckCircle2 className="w-3 h-3" />
        Complete
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full status-in-progress">
        <Clock className="w-3 h-3" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full status-not-started">
      <Circle className="w-3 h-3" />
      Not Started
    </span>
  );
}

// ── Bottleneck label helper ───────────────────────────────────────────────────
function formatBottleneck(key: string): string {
  const map: Record<string, string> = {
    cash: "Cash Flow",
    sales: "Sales & Revenue",
    staff: "Staff & Team",
    systems: "Systems & Processes",
    owner: "Owner Behaviour & Delegation",
  };
  return map[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Bottleneck toolkit route helper ──────────────────────────────────────────
function bottleneckToolkitRoute(key: string): string | null {
  if (key === "cash") return "/os/flywheel";
  if (key === "owner" || key === "staff") return "/os/delegation";
  return null;
}

export default function Dashboard() {
  const brand = activeBrand;
  const session = useOSSession();
  const coach = useCoachSession();
  const [, navigate] = useLocation();

  // Derive typed bottleneck and archetype for coach messages
  const coachBottleneck = (session.auditResult?.primaryBottleneck ?? null) as Bottleneck;
  const coachArchetype = (session.moneyIdentity?.archetype ?? null) as Archetype;

  // Stable session ID (same logic as GoalDashboard)
  const sessionId = (() => {
    let id = sessionStorage.getItem("keystoneSessionId");
    if (!id) { id = `anon-${Date.now()}`; sessionStorage.setItem("keystoneSessionId", id); }
    return id;
  })();

  const { data: goalsData } = trpc.goals.list.useQuery(
    { sessionId },
    { enabled: session.hasAuditResult || session.hasBlueprintResult }
  );
  const goalsCompleted = goalsData?.filter((g) => g.status === "completed").length ?? 0;
  const goalsTotal = goalsData?.length ?? 0;

  const coachMessage = getCoachMessage({
    daysSinceStart: coach.daysSinceStart,
    firstLoginToday: coach.firstLoginToday,
    isWeekMilestone: coach.isWeekMilestone,
    isMonthMilestone: coach.isMonthMilestone,
    bottleneck: coachBottleneck,
    archetype: coachArchetype,
    goalsCompleted,
    goalsTotal,
  });

  const [checkinDismissed, setCheckinDismissed] = useState(coach.dismissedToday);

  function handleDismissCheckin() {
    coach.dismissDailyCheckin();
    setCheckinDismissed(true);
  }

  // Roadmap commitments status
  const roadmapCommitments = (() => {
    try { return JSON.parse(sessionStorage.getItem("roadmapCommitments") ?? "null"); } catch { return null; }
  })();
  const hasRoadmap = !!roadmapCommitments?.completedAt;

  // Business Snapshot status
  const businessSnapshot = (() => {
    try { return JSON.parse(sessionStorage.getItem("businessSnapshot") ?? "null"); } catch { return null; }
  })();
  const hasSnapshot = !!businessSnapshot;

  // Derive module status from session data
  const modules: ModuleCard[] = [
    {
      id: "audit",
      title: "Business Bottleneck Audit",
      description:
        "Diagnose the single biggest constraint holding your business back across five dimensions: Sales, Cash, Staff, Systems, and Owner Behaviour.",
      path: "/os/audit",
      icon: Search,
      status: session.hasAuditResult ? "complete" : "not-started",
      estimatedTime: "8–10 min",
      step: 1,
    },
    {
      id: "blueprint",
      title: "Freedom Design Blueprint",
      description:
        "A guided exploration of your owner behaviour, pressure points, goals, and growth vision — surfacing the friction that keeps you stuck.",
      path: "/os/blueprint",
      icon: Compass,
      status: session.hasBlueprintResult ? "complete" : session.hasAuditResult ? "in-progress" : "not-started",
      estimatedTime: "10–12 min",
      step: 2,
    },
    {
      id: "goals",
      title: "Goal Dashboard",
      description:
        "Convert your Audit and Blueprint insights into a prioritised 90-day action plan with progress tracking.",
      path: "/os/goals",
      icon: Target,
      status: session.hasBlueprintResult ? "in-progress" : "not-started",
      estimatedTime: "5 min",
      step: 3,
    },
    {
      id: "snapshot",
      title: "Business Snapshot",
      description:
        "A 3-minute guided profile of your business — revenue, team, time drains, and the one thing you want to change.",
      path: "/os/snapshot",
      icon: Building2,
      status: hasSnapshot ? "complete" : "not-started",
      estimatedTime: "3 min",
      step: 4,
    },
    {
      id: "pricing",
      title: "Pricing Toolkit",
      description:
        "Check your margins, calculate your break-even, and confirm you are charging what your business actually needs.",
      path: "/os/pricing",
      icon: TrendingUp,
      status: "not-started",
      estimatedTime: "5 min",
      step: 6,
      lockHint: session.isPricingUnlocked
        ? undefined
        : session.hasCashBottleneck
        ? undefined
        : "Complete the 21-Day Wealth Reset to unlock — or have Cash as your primary bottleneck",
    },
    {
      id: "weekly",
      title: "Weekly Rhythm",
      description:
        "A structured weekly planning and review cycle to keep your goals moving and your energy focused.",
      path: "/os/weekly",
      icon: CalendarDays,
      status: "not-started",
      estimatedTime: "10 min",
      step: 7,
      lockHint: session.isWeeklyRhythmUnlocked
        ? undefined
        : "Complete the 21-Day Wealth Reset to unlock",
    },
    {
      id: "roadmap",
      title: "12-Month Roadmap",
      description:
        "Set your three financial milestones, name your non-negotiables, and build the protection system that keeps you on track.",
      path: "/os/roadmap",
      icon: Map,
      status: hasRoadmap ? "complete" : session.hasBlueprintResult ? "in-progress" : "not-started",
      estimatedTime: "10 min",
      step: 8,
      lockHint: session.isRoadmapUnlocked
        ? undefined
        : "Complete the 21-Day Wealth Reset to unlock",
    },
  ];

  const archetypeInfo = session.moneyIdentity
    ? archetypeDisplay[session.moneyIdentity.archetype]
    : null;

  const bottleneckLabel = session.auditResult?.primaryBottleneck
    ? formatBottleneck(session.auditResult.primaryBottleneck)
    : null;

  // Second bottleneck (if available)
  const auditScores = session.auditResult?.scores as Record<string, number> | undefined;
  const secondBottleneck = auditScores
    ? Object.entries(auditScores)
        .filter(([k]) => k !== session.auditResult?.primaryBottleneck)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 1)
        .map(([k]) => k)[0]
    : null;

  // Coach message banner colour by type
  const checkinBg =
    coachMessage?.type === "monthly"
      ? "oklch(65% 0.15 55 / 0.08)"
      : coachMessage?.type === "weekly"
      ? "oklch(55% 0.12 175 / 0.08)"
      : "oklch(55% 0.12 220 / 0.06)";
  const checkinBorder =
    coachMessage?.type === "monthly"
      ? "oklch(65% 0.15 55 / 0.3)"
      : coachMessage?.type === "weekly"
      ? "oklch(55% 0.12 175 / 0.3)"
      : "oklch(55% 0.12 220 / 0.2)";
  const checkinAccent =
    coachMessage?.type === "monthly"
      ? "oklch(65% 0.15 55)"
      : coachMessage?.type === "weekly"
      ? "var(--color-primary)"
      : "oklch(55% 0.12 220)";
  const CheckinIcon =
    coachMessage?.type === "monthly" ? Star : coachMessage?.type === "weekly" ? Calendar : MessageSquare;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-base)" }}>

      {/* ── Active Coach Check-In Banner ──────────────────────────────────── */}
      {coachMessage && !checkinDismissed && (
        <div
          className="px-6 py-4 lg:px-10 animate-slide-up"
          style={{
            backgroundColor: checkinBg,
            borderBottom: `1px solid ${checkinBorder}`,
          }}
        >
          <div className="max-w-3xl flex items-start gap-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${checkinAccent}18`, border: `1px solid ${checkinAccent}30` }}
            >
              <CheckinIcon className="w-4 h-4" style={{ color: checkinAccent }} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: checkinAccent }}
              >
                {coachMessage.greeting}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-text-base)" }}
              >
                {coachMessage.body}
              </p>
              <button
                onClick={() => navigate(coachMessage.ctaRoute)}
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold"
                style={{ color: checkinAccent }}
              >
                {coachMessage.cta} <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={handleDismissCheckin}
              className="shrink-0 p-1 rounded-lg transition-colors hover:opacity-70"
              style={{ color: "var(--color-text-subtle)" }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-6 py-12 lg:px-10 lg:py-16"
        style={{
          background: `linear-gradient(135deg, var(--color-bg-sidebar) 0%, var(--color-bg-surface) 100%)`,
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-5 pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
            transform: "translateY(50%)",
          }}
        />

        <div className="relative max-w-3xl">
          {/* Archetype + Bottleneck Badges */}
          {(archetypeInfo || bottleneckLabel) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {archetypeInfo && session.moneyIdentity && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${archetypeInfo.color}18`,
                    border: `1px solid ${archetypeInfo.color}35`,
                    color: archetypeInfo.color,
                  }}
                >
                  <Brain className="w-3 h-3" />
                  {archetypeInfo.label} · {session.moneyIdentity.score}% alignment
                </div>
              )}
              {bottleneckLabel && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "oklch(55% 0.12 25 / 0.1)",
                    border: "1px solid oklch(55% 0.12 25 / 0.25)",
                    color: "oklch(55% 0.12 25)",
                  }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Constraint: {bottleneckLabel}
                </div>
              )}
            </div>
          )}

          <div
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
            style={{
              backgroundColor: "oklch(55% 0.12 175 / 0.15)",
              color: "var(--color-primary)",
              border: "1px solid oklch(55% 0.12 175 / 0.25)",
            }}
          >
            <Zap className="w-3 h-3" />
            {brand.appName}
          </div>

          <h1
            className="text-3xl lg:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            Your Business Growth{" "}
            <span className="gradient-text">Operating System</span>
          </h1>

          <p className="text-base lg:text-lg max-w-2xl" style={{ color: "var(--color-text-muted)" }}>
            Diagnose what is slowing your business down, design a clear growth path, and build the
            financial confidence to execute it — all in one place.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/os/audit">
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-180"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                Start Bottleneck Audit
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-180"
              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div
        className="px-6 py-6 lg:px-10"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`flex items-center gap-3 animate-slide-up stagger-${i + 1}`}>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)" }}
                >
                  <span style={{ color: "var(--color-primary)" }}><Icon className="w-4 h-4" /></span>
                </div>
                <div>
                  <p
                    className="text-xl font-bold"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottleneck Spotlight Card ─────────────────────────────────────── */}
      {session.hasAuditResult && session.auditResult && (
        <div className="px-6 pt-8 lg:px-10">
          <div
            className="rounded-xl p-6 animate-slide-up"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid oklch(55% 0.12 25 / 0.3)",
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: "oklch(55% 0.12 25)" }}
                >
                  Critical Constraint Identified
                </p>
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
                >
                  {bottleneckLabel}
                </h3>
                {session.auditResult.completedAt && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
                    Identified on{" "}
                    {new Date(session.auditResult.completedAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {coach.daysSinceStart > 0 && ` · Day ${coach.daysSinceStart}`}
                  </p>
                )}
              </div>
              {bottleneckToolkitRoute(session.auditResult.primaryBottleneck) && (
                <button
                  onClick={() => navigate(bottleneckToolkitRoute(session.auditResult!.primaryBottleneck)!)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    backgroundColor: "oklch(55% 0.12 25 / 0.12)",
                    border: "1px solid oklch(55% 0.12 25 / 0.25)",
                    color: "oklch(55% 0.12 25)",
                  }}
                >
                  Open Toolkit <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Second bottleneck if present */}
            {secondBottleneck && (
              <div
                className="flex items-center gap-2 text-xs mb-4 pb-4"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <span style={{ color: "var(--color-text-subtle)" }}>Secondary constraint:</span>
                <span
                  className="px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: "oklch(55% 0.12 25 / 0.06)",
                    border: "1px solid oklch(55% 0.12 25 / 0.15)",
                    color: "oklch(55% 0.12 25)",
                  }}
                >
                  {formatBottleneck(secondBottleneck)}
                </span>
              </div>
            )}

            {/* Action link */}
            <button
              onClick={() => navigate("/os/goals")}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: "var(--color-primary)" }}
            >
              View my goals for this constraint
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Module Cards ──────────────────────────────────────────────────── */}
      <div className="px-6 py-8 lg:px-10">
        <div className="mb-6">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            Your Growth Journey
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Complete each module in sequence for the best results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            const locked = !!mod.lockHint;

            const cardInner = (
              <div
                className={`question-card h-full flex flex-col relative overflow-hidden animate-slide-up stagger-${i + 1} ${
                  locked ? "opacity-60" : "card-glow cursor-pointer group"
                }`}
                style={{ transition: "all 200ms var(--ease-out)" }}
              >
                {/* Lock overlay badge */}
                {locked && (
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium z-10"
                    style={{
                      backgroundColor: "oklch(40% 0 0 / 0.4)",
                      border: "1px solid oklch(60% 0 0 / 0.2)",
                      color: "var(--color-text-subtle)",
                    }}
                  >
                    <Lock className="w-3 h-3" />
                    Locked
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: locked
                        ? "oklch(40% 0 0 / 0.08)"
                        : "oklch(55% 0.12 175 / 0.12)",
                      border: locked
                        ? "1px solid oklch(60% 0 0 / 0.15)"
                        : "1px solid oklch(55% 0.12 175 / 0.2)",
                    }}
                  >
                    <span style={{ color: locked ? "var(--color-text-subtle)" : "var(--color-primary)" }}>
                      <Icon className="w-5 h-5" />
                    </span>
                  </div>
                  {!locked && <StatusBadge status={mod.status} />}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: locked ? "var(--color-text-subtle)" : "var(--color-accent)" }}
                  >
                    Step {mod.step}
                  </span>
                  <span style={{ color: "var(--color-border-light)" }}>·</span>
                  <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                    {mod.estimatedTime}
                  </span>
                </div>

                <h3
                  className="text-base font-semibold mb-2 group-hover:text-primary transition-colors"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: locked ? "var(--color-text-muted)" : "var(--color-text-base)",
                  }}
                >
                  {mod.title}
                </h3>

                <p
                  className="text-sm flex-1"
                  style={{ color: "var(--color-text-subtle)", lineHeight: "1.6" }}
                >
                  {locked ? mod.lockHint : mod.description}
                </p>

                {!locked && (
                  <div
                    className="flex items-center gap-1.5 mt-4 text-sm font-medium transition-colors"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {mod.status === "not-started" ? "Begin" : mod.status === "in-progress" ? "Continue" : "Review"}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </div>
            );

            return locked ? (
              <div key={mod.id} title={mod.lockHint}>{cardInner}</div>
            ) : (
              <Link key={mod.id} href={mod.path}>{cardInner}</Link>
            );
          })}
        </div>

        {/* ── Journey Map ─────────────────────────────────────────────────── */}
        <div
          className="mt-8 rounded-xl p-6 animate-slide-up stagger-4"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3
            className="text-sm font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            Your Full Growth Path
          </h3>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            {[
              { label: "Business Snapshot", color: "var(--color-primary)" },
              { label: "Bottleneck Audit", color: "var(--color-primary)" },
              { label: "Freedom Blueprint", color: "var(--color-primary)" },
              { label: "Goal Dashboard", color: "var(--color-primary)" },
              { label: "Money Identity*", color: "var(--color-accent)" },
              { label: "Wealth Reset Journey*", color: "var(--color-accent)" },
              { label: "Pricing Toolkit†", color: session.isPricingUnlocked ? "var(--color-primary)" : "var(--color-text-subtle)" },
              { label: "Weekly Rhythm†", color: session.isWeeklyRhythmUnlocked ? "var(--color-primary)" : "var(--color-text-subtle)" },
              { label: "12-Month Roadmap†", color: session.isRoadmapUnlocked ? "var(--color-primary)" : "var(--color-text-subtle)" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: `${step.color}18`,
                    border: `1px solid ${step.color}30`,
                    color: step.color,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: step.color, color: "white" }}
                  >
                    {i + 1}
                  </span>
                  {step.label}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight
                    className="w-3 h-3 shrink-0 hidden sm:block"
                    style={{ color: "var(--color-text-subtle)" }}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--color-text-subtle)" }}>
            * Money Identity and Wealth Reset Journey are contextual — they appear automatically when money-related friction is detected in your Audit or Blueprint results.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
            † Pricing Toolkit, Weekly Rhythm, and 12-Month Roadmap unlock after completing the 21-Day Wealth Reset Journey. Pricing Toolkit also unlocks early if Cash is your primary bottleneck.
          </p>
        </div>
      </div>
    </div>
  );
}
