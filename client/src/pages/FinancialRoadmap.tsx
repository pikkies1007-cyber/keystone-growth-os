import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useOSSession } from "@/hooks/useOSSession";
import { trpc } from "@/lib/trpc";
import { useGoalSessionId } from "@/lib/goalSession";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Map,
  Shield,
  AlertTriangle,
  RefreshCw,
  Users,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  Flame,
  Lock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface RoadmapCommitments {
  milestone1: string;
  milestone2: string;
  milestone3: string;
  nonNeg1: string;
  nonNeg2: string;
  nonNeg3: string;
  redFlag: string;
  accountabilityPartner: string;
  completedAt: string;
}

// ── Archetype-aware intro copy ────────────────────────────────────────────────
function getArchetypeIntro(archetype: string | null, bottleneck: string | null): { headline: string; body: string } {
  const bottleneckLabel = bottleneck || "your primary constraint";
  const base = `You have identified ${bottleneckLabel} as the area holding your business back most right now.`;

  if (!archetype) {
    return {
      headline: "The Plan That Carries It Forward.",
      body: `${base} This roadmap gives you a structure to hold your progress across the next twelve months — specific enough to measure, honest enough to trust, and flexible enough to survive contact with real life.`,
    };
  }

  const archetypeMap: Record<string, { headline: string; body: string }> = {
    Hustler: {
      headline: "The Plan That Channels Your Drive.",
      body: `${base} As a Hustler, your energy is your greatest asset — and your greatest risk. This roadmap gives that energy a direction so it builds momentum instead of burning out. Twelve months. Three milestones. One direction.`,
    },
    Giver: {
      headline: "The Plan That Protects What You Build.",
      body: `${base} As a Giver, you build trust and relationships naturally — but the business needs you to protect the financial foundation with the same care you give to others. This roadmap is that protection, built in advance.`,
    },
    Protector: {
      headline: "The Plan That Holds the Ground.",
      body: `${base} As a Protector, you already understand that stability is not the enemy of growth — it is the precondition for it. This roadmap gives your instinct for security a twelve-month structure to build on.`,
    },
    Enjoyer: {
      headline: "The Plan That Makes Growth Sustainable.",
      body: `${base} As an Enjoyer, you know how to live well — this roadmap ensures the business supports that life consistently, not just in good months. Twelve months of intentional direction, built around what you are actually building toward.`,
    },
  };

  // useOSSession returns lowercase values (hustler, giver, protector, enjoyer)
  // archetypeMap uses capitalised keys — normalise before matching
  const normalised = archetype.charAt(0).toUpperCase() + archetype.slice(1).toLowerCase();
  const key = Object.keys(archetypeMap).find((k) => k === normalised || archetype.toLowerCase().includes(k.toLowerCase()));
  return key ? archetypeMap[key] : archetypeMap["Protector"];
}

// ── Milestone data ────────────────────────────────────────────────────────────
const milestones = [
  {
    num: "1",
    period: "Months\n1 – 3",
    title: "Stabilise the Foundation",
    items: [
      { label: "Cash reserve buffer", body: "Tier 1 target reached and protected. Even if small, the account exists and is separate from operating cash." },
      { label: "Budget or cash flow tracker", body: "Running without interruption for three consecutive months. Not perfectly — consistently." },
      { label: "Three non-negotiable habits", body: "Weekly financial review, 24-hour pause on non-essential spend, and one protection fence in place and holding." },
      { label: "Priority debt or supplier account", body: "First extra payment made. The momentum has started, however slowly." },
    ],
    placeholder: "e.g. Build a R5,000 cash buffer by end of Month 3. Review cash flow every Monday morning.",
  },
  {
    num: "2",
    period: "Months\n4 – 8",
    title: "Build Momentum",
    items: [
      { label: "First debt or liability reduced", body: "Or significantly reduced to a defined target. At least one supplier relationship improved or renegotiated." },
      { label: "Cash reserve Tier 2", body: "One full month of essential operating costs in a separate account." },
      { label: "Profit-first allocation", body: "Automated or scheduled — however small. The direction has been set and the habit is in place." },
      { label: "Revenue", body: "At least one step taken toward the growth path identified in your 90-day goals. A conversation had, an offer made, a first new client found." },
    ],
    placeholder: "e.g. Reduce supplier debt by R8,000. Open a separate savings account and move R1,000 per month.",
  },
  {
    num: "3",
    period: "Months\n9 – 12",
    title: "Measure and Recommit",
    items: [
      { label: "Business net worth review", body: "A clear comparison between starting point and now. The direction of change matters more than the size of the change." },
      { label: "Second priority targeted", body: "Or first priority cleared and the freed-up cash directed toward the next goal." },
      { label: "Purpose statement revisited", body: "Does it still feel true? Has the business moved closer to the vision from your Freedom Blueprint? What has the year revealed?" },
      { label: "Next twelve months decided", body: "Continued solo, with an accountability partner, or with coaching support. The journey does not end — the structure for the next phase is chosen." },
    ],
    placeholder: "e.g. Review all financial goals in Month 12. Decide whether to bring in a bookkeeper or financial coach.",
  },
];

const rescueSteps = [
  { num: "1", title: "Name it", body: "Acknowledge the red flag without shame. Name what happened, without story or self-attack." },
  { num: "2", title: "Tell someone", body: "Contact your accountability partner immediately. Accountability breaks the isolation that makes drift permanent." },
  { num: "3", title: "Read the purpose", body: "Return to your Freedom Blueprint vision. The why has not changed. The how is adjustable." },
  { num: "4", title: "One action today", body: "Do one non-negotiable action today. Not a plan. Not a review. The one small action that signals the return." },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function FinancialRoadmap() {
  const [, navigate] = useLocation();
  const session = useOSSession();

  // All hooks must run on every render regardless of the lock-gate branch
  // below -- moved above it to fix the same React error #310 pattern
  // (hooks skipped/added inconsistently between renders) already found and
  // fixed elsewhere today.
  const [commitments, setCommitments] = useState<RoadmapCommitments>(() => {
    const raw = sessionStorage.getItem("roadmapCommitments");
    if (raw) {
      try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    return {
      milestone1: "", milestone2: "", milestone3: "",
      nonNeg1: "", nonNeg2: "", nonNeg3: "",
      redFlag: "", accountabilityPartner: "", completedAt: "",
    };
  });
  const [saved, setSaved] = useState(false);
  const saveSubmission = trpc.toolkitSubmissions.save.useMutation();
  const goalSessionId = useGoalSessionId();

  // ── Lock gate ──────────────────────────────────────────────────────────────
  if (!session.isRoadmapUnlocked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 py-16"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <div
          className="max-w-md w-full rounded-2xl p-10 text-center"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              backgroundColor: "oklch(40% 0 0 / 0.12)",
              border: "1px solid oklch(60% 0 0 / 0.15)",
            }}
          >
            <Lock className="w-7 h-7" style={{ color: "var(--color-text-subtle)" }} />
          </div>
          <h2
            className="text-xl font-bold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            12-Month Roadmap — Locked
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)", lineHeight: "1.7" }}>
            This tool unlocks after you complete the{" "}
            <strong>21-Day Wealth Reset Journey</strong>.
          </p>
          <p className="text-xs mb-8" style={{ color: "var(--color-text-subtle)", lineHeight: "1.6" }}>
            A twelve-month financial roadmap is only as strong as the identity behind it. The Wealth
            Reset ensures you are building on a foundation of financial clarity — not just optimism.
            Without it, most roadmaps are abandoned by Month 3.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/os/wealth-reset")}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-180"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              Start the 21-Day Wealth Reset
            </button>
            <button
              onClick={() => navigate("/os")}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-180"
              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ── End lock gate ──────────────────────────────────────────────────────────

  const archetype = session.moneyIdentity?.archetype ?? null;
  const primaryBottleneck = session.auditResult?.primaryBottleneck ?? null;

  const update = (key: keyof RoadmapCommitments, value: string) => {
    setCommitments((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    const updated = { ...commitments, completedAt: new Date().toISOString() };
    sessionStorage.setItem("roadmapCommitments", JSON.stringify(updated));
    setCommitments(updated);
    setSaved(true);

    const suggestions = [
      updated.milestone1 && `Month 1-3: ${updated.milestone1}`,
      updated.milestone2 && `Month 4-8: ${updated.milestone2}`,
      updated.milestone3 && `Month 9-12: ${updated.milestone3}`,
      updated.nonNeg1 && `Non-negotiable: ${updated.nonNeg1}`,
      updated.nonNeg2 && `Non-negotiable: ${updated.nonNeg2}`,
      updated.nonNeg3 && `Non-negotiable: ${updated.nonNeg3}`,
    ].filter((s): s is string => Boolean(s));

    if (suggestions.length > 0) {
      saveSubmission.mutate({
        toolkitKey: "roadmap",
        inputData: { archetype, primaryBottleneck },
        resultSummary: { milestoneCount: suggestions.length },
        suggestions,
        syncToGoals: { sessionId: goalSessionId, dimension: "Cash Flow" },
      });
    }
  };

  const isComplete = commitments.completedAt !== "";
  const { headline, body } = getArchetypeIntro(archetype, primaryBottleneck);

  return (
    <div className="min-h-screen bg-[#0d1f1a] text-white">
      {/* ── Header ── */}
      <div className="bg-[#0a1a15] border-b border-[#B8962E]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="w-5 h-5 text-[#B8962E]" />
          <div>
            <p className="text-xs font-semibold tracking-[4px] uppercase text-[#B8962E]">Keystone Growth OS</p>
            <p className="text-sm text-white/70">12-Month Financial Roadmap</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/os")} className="text-white/50 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
        </Button>
      </div>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-[#1C3129] via-[#2e4f44] to-[#1a4a3c] px-8 py-16 md:px-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 border border-[#B8962E]/8 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <p className="text-xs font-semibold tracking-[5px] uppercase text-[#B8962E] mb-4">✦ Your 12-Month Commitment</p>
        <h1 className="text-4xl md:text-5xl font-light text-white mb-3 leading-tight">
          {headline.split("Forward.").length > 1 ? (
            <>{headline.split("Forward.")[0]}<em className="italic text-[#d4af5a]">Forward.</em></>
          ) : headline.split("Direction.").length > 1 ? (
            <>{headline.split("Direction.")[0]}<em className="italic text-[#d4af5a]">Direction.</em></>
          ) : headline.split("Sustainable.").length > 1 ? (
            <>{headline.split("Sustainable.")[0]}<em className="italic text-[#d4af5a]">Sustainable.</em></>
          ) : headline.split("Ground.").length > 1 ? (
            <>{headline.split("Ground.")[0]}<em className="italic text-[#d4af5a]">Ground.</em></>
          ) : (
            <>{headline.split("Build.")[0]}<em className="italic text-[#d4af5a]">Build.</em></>
          )}
        </h1>
        <p className="text-lg text-white/50 italic mb-6 font-light">From diagnosis to direction — the bridge between where you are and where you are going</p>
        <p className="text-lg text-white/80 leading-relaxed max-w-2xl font-light">
          {body}
          <br /><br />
          <strong className="text-white font-medium">A roadmap is not a guarantee of perfection. It is a commitment to a direction — specific enough to measure, honest enough to trust, and flexible enough to survive contact with real life.</strong>
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* ── Insight block ── */}
        <div className="bg-[#B8962E]/10 border border-[#B8962E]/25 p-6 rounded-sm">
          <p className="text-xs font-semibold tracking-[3px] uppercase text-[#B8962E] mb-3">What a Roadmap Is Not</p>
          <p className="text-lg text-white/70 leading-relaxed font-light italic">
            It is not a rigid schedule that fails the moment life disrupts it. It is not a set of targets that produce shame when they are missed.{" "}
            <strong className="text-white font-medium not-italic">It is a personal commitment — to the direction, not the perfection — that exists to serve the business you are building.</strong>
          </p>
        </div>

        {/* ── Section label ── */}
        <div className="flex items-center gap-4">
          <p className="text-xs font-semibold tracking-[5px] uppercase text-[#B8962E] whitespace-nowrap">The 12-Month Roadmap — Three Milestones</p>
          <div className="flex-1 h-px bg-gradient-to-r from-[#B8962E]/40 to-transparent" />
        </div>

        <div className="bg-[#1C3129]/50 border border-[#B8962E]/15 p-5 rounded-sm">
          <p className="text-base text-white/70 leading-relaxed font-light">
            These milestones are written as principles rather than fixed numbers — because the specific targets belong to your specific situation. The principle shows the category. Your personal commitment fills it with the numbers and dates that are honest for your business, your cash flow, and your starting point.
          </p>
        </div>

        {/* ── Milestones ── */}
        {milestones.map((m, i) => (
          <div key={i} className="flex gap-0 rounded-sm overflow-hidden border border-[#2e4f44]">
            {/* Number column */}
            <div className="bg-[#1C3129] flex flex-col items-center justify-center px-5 py-6 min-w-[80px]">
              <span className="text-3xl text-[#B8962E] font-light leading-none">{m.num}</span>
              <span className="text-[10px] tracking-[2px] uppercase text-white/30 mt-2 text-center whitespace-pre-line leading-tight">{m.period}</span>
            </div>
            {/* Content */}
            <div className="bg-[#0f2820] flex-1 p-6">
              <h3 className="text-xl text-white font-light mb-4">{m.title}</h3>
              <div className="space-y-3 mb-5">
                {m.items.map((item, j) => (
                  <div key={j} className="flex gap-3 text-white/65 text-base leading-relaxed">
                    <ChevronRight className="w-4 h-4 text-[#B8962E] flex-shrink-0 mt-1" />
                    <span><strong className="text-white/90 font-medium">{item.label}</strong> — {item.body}</span>
                  </div>
                ))}
              </div>
              {/* Personal commitment input */}
              <div className="mt-4">
                <p className="text-xs font-semibold tracking-[3px] uppercase text-[#B8962E] mb-2">Your Personal Commitment for This Milestone</p>
                <Textarea
                  value={commitments[`milestone${i + 1}` as keyof RoadmapCommitments]}
                  onChange={(e) => update(`milestone${i + 1}` as keyof RoadmapCommitments, e.target.value)}
                  placeholder={m.placeholder}
                  className="bg-[#1C3129]/60 border-[#B8962E]/20 text-white/80 placeholder:text-white/25 text-sm resize-none min-h-[80px] focus:border-[#B8962E]/50"
                />
              </div>
            </div>
          </div>
        ))}

        {/* ── Section: Protection System ── */}
        <div className="flex items-center gap-4 pt-4">
          <p className="text-xs font-semibold tracking-[5px] uppercase text-[#B8962E] whitespace-nowrap">The Protection System</p>
          <div className="flex-1 h-px bg-gradient-to-r from-[#B8962E]/40 to-transparent" />
        </div>

        {/* Non-Negotiables */}
        <div className="bg-[#1C3129] p-8 rounded-sm">
          <p className="text-xs font-semibold tracking-[4px] uppercase text-[#B8962E] mb-3">✦ The Three Non-Negotiables</p>
          <h2 className="text-2xl text-white font-light mb-4 leading-tight">The Lines That Hold When Business Gets Hard</h2>
          <p className="text-lg text-white/70 leading-relaxed font-light mb-6">
            What is the one financial behaviour — if nothing else happened this month — that would signal the direction is still held? That is a non-negotiable. Not a target to hit. Not a standard to maintain perfectly.{" "}
            <strong className="text-white font-medium">The line that, when held, tells the truth about where the commitment actually lives.</strong> Name three. Make them specific. Tell someone who will ask about them.
          </p>
          <div className="space-y-4">
            {[
              { key: "nonNeg1" as const, num: "1", label: "Non-Negotiable One", placeholder: "e.g. I review my cash flow every Monday before 9am, without exception." },
              { key: "nonNeg2" as const, num: "2", label: "Non-Negotiable Two", placeholder: "e.g. My profit-first allocation leaves my account on the 25th of every month before any other payment." },
              { key: "nonNeg3" as const, num: "3", label: "Your Own Non-Negotiable", placeholder: "What is the one financial behaviour that, if maintained consistently, makes everything else easier? Name it specifically." },
            ].map((nn) => (
              <div key={nn.key} className="flex gap-4 items-start bg-white/6 border border-[#B8962E]/18 p-4 rounded-sm">
                <span className="text-2xl text-[#B8962E] font-light leading-none flex-shrink-0 mt-1">{nn.num}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold tracking-[2px] uppercase text-[#B8962E] mb-2">{nn.label}</p>
                  <Input
                    value={commitments[nn.key]}
                    onChange={(e) => update(nn.key, e.target.value)}
                    placeholder={nn.placeholder}
                    className="bg-[#0a1a15]/60 border-[#B8962E]/20 text-white/80 placeholder:text-white/25 text-sm focus:border-[#B8962E]/50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Red Flags + The Return */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#0f2820] border border-[#2e4f44] p-6 rounded-sm">
            <AlertTriangle className="w-6 h-6 text-[#B8962E] mb-3" />
            <p className="text-xs font-semibold tracking-[2px] uppercase text-[#B8962E] mb-2">Red Flags</p>
            <h4 className="text-xl text-white font-light mb-3">The Warning Signs of Drift</h4>
            <p className="text-base text-white/65 leading-relaxed font-light">
              A red flag is a personal warning signal — something noticed in behaviour or circumstances that tells you the old patterns are returning. Name them before they arrive. Common ones: avoiding the bank balance, missing the weekly review two weeks running, using business credit for personal expenses, feeling the familiar financial dread without acting on it.{" "}
              <strong className="text-white/90 font-medium">The flag is not the failure. Ignoring the flag is.</strong>
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-[2px] uppercase text-[#B8962E] mb-2">Your Personal Red Flag</p>
              <Input
                value={commitments.redFlag}
                onChange={(e) => update("redFlag", e.target.value)}
                placeholder="e.g. I stop checking my bank balance and avoid opening the accounting app."
                className="bg-[#1C3129]/60 border-[#B8962E]/20 text-white/80 placeholder:text-white/25 text-sm focus:border-[#B8962E]/50"
              />
            </div>
          </div>
          <div className="bg-[#0f2820] border border-[#2e4f44] p-6 rounded-sm">
            <RefreshCw className="w-6 h-6 text-[#B8962E] mb-3" />
            <p className="text-xs font-semibold tracking-[2px] uppercase text-[#B8962E] mb-2">The Return</p>
            <h4 className="text-xl text-white font-light mb-3">What Happens When a Red Flag Appears</h4>
            <p className="text-base text-white/65 leading-relaxed font-light">
              Not shame. Not a complete restart. A return — specific, immediate, and proportionate to the drift. The rescue plan is already built: the non-negotiable habit is done today. The accountability partner is contacted. The purpose is revisited. And then the next day continues.{" "}
              <strong className="text-white/90 font-medium">The return is always available. It costs nothing but the decision.</strong>
            </p>
          </div>
        </div>

        {/* Rescue Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
          {rescueSteps.map((s) => (
            <div key={s.num} className="bg-[#1a2e28] border border-[#2e4f44] p-5 text-center rounded-sm">
              <div className="text-3xl text-[#B8962E] font-light mb-2">{s.num}</div>
              <p className="text-xs font-semibold tracking-[1.5px] uppercase text-white mb-2">{s.title}</p>
              <p className="text-sm text-white/55 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Accountability */}
        <div className="bg-[#FAF7F0]/5 border border-[#B8962E]/25 border-l-4 border-l-[#B8962E] p-8 rounded-sm">
          <p className="text-xs font-semibold tracking-[4px] uppercase text-[#B8962E] mb-3">✦ The Most Underestimated Part of Any Business Plan</p>
          <h2 className="text-2xl text-white font-light mb-4 leading-tight">Financial Transformation Sustained Alone Is Rare. Sustained in Community, It Is Common.</h2>
          <p className="text-lg text-white/70 leading-relaxed font-light mb-5">
            What would it mean to have one person — a partner, a mentor, a fellow business owner — who asks a single question once a month: <em>"How is it going — really?"</em> Not to judge the answer. Not to fix anything. Just to create the space where an honest answer is possible. That space, held consistently, is worth more than any financial tool in this programme.{" "}
            <strong className="text-white font-medium">Drift happens to every business owner. The only difference is how quickly it is named — and that depends almost entirely on whether someone is there to ask the question.</strong>
          </p>
          <div>
            <p className="text-xs font-semibold tracking-[3px] uppercase text-[#B8962E] mb-2">Name Your Accountability Partner</p>
            <Input
              value={commitments.accountabilityPartner}
              onChange={(e) => update("accountabilityPartner", e.target.value)}
              placeholder="e.g. My business partner, or a fellow entrepreneur I trust to ask the hard question."
              className="bg-[#1C3129]/60 border-[#B8962E]/20 text-white/80 placeholder:text-white/25 text-sm focus:border-[#B8962E]/50"
            />
          </div>
        </div>

        {/* Affirmation */}
        <div className="border-t border-b border-[#B8962E]/30 py-7 text-center">
          <p className="text-xl italic font-light text-[#1C3129] bg-[#FAF7F0]/8 text-white/70 max-w-xl mx-auto leading-relaxed px-4">
            <span className="text-[#B8962E]">— </span>
            The roadmap is not a guarantee. It is a commitment — to the direction, renewed daily, held lightly, and strong enough to survive the months ahead.
            <span className="text-[#B8962E]"> —</span>
          </p>
        </div>

        {/* Save button */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4 pb-8">
          <Button
            onClick={handleSave}
            className="bg-[#1C3129] hover:bg-[#B8962E] text-[#d4af5a] hover:text-[#1C3129] border border-[#B8962E]/40 font-semibold tracking-[3px] uppercase text-xs px-10 py-6 transition-all duration-200"
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Roadmap Saved</>
            ) : (
              <><Flame className="w-4 h-4 mr-2" /> Save My Roadmap</>
            )}
          </Button>
          {isComplete && (
            <Button
              variant="outline"
              onClick={() => navigate("/os/goals")}
              className="border-[#B8962E]/30 text-white/60 hover:text-white hover:border-[#B8962E]/60 tracking-[2px] uppercase text-xs px-8 py-6"
            >
              View My 90-Day Goals <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

      </div>

      {/* ── Close block ── */}
      <div className="bg-gradient-to-br from-[#1C3129] via-[#2e4f44] to-[#162e26] px-8 py-16 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-[#B8962E]/6 rounded-full pointer-events-none" />
        <p className="text-xs font-semibold tracking-[5px] uppercase text-[#B8962E] mb-4 relative z-10">✦ Roadmap Complete</p>
        <h2 className="text-3xl text-white font-light mb-3 relative z-10 leading-tight">
          The plan is in place.<br /><em className="italic text-[#d4af5a]">The journey continues.</em>
        </h2>
        <div className="w-14 h-px bg-[#B8962E]/40 mx-auto my-5 relative z-10" />
        <p className="text-lg text-white/70 leading-relaxed max-w-lg mx-auto mb-6 font-light relative z-10">
          The roadmap is built. The non-negotiables are named. The protection system is in place. The accountability partner has been identified. Everything needed to carry the next twelve months with intention is now in front of you.
        </p>
        <div className="bg-white/6 border-l-4 border-[#B8962E] max-w-lg mx-auto text-left p-5 mb-6 relative z-10">
          <p className="text-lg italic text-white/85 font-light leading-relaxed">
            "A roadmap is not the point. The commitment to the destination is. And the destination — the business you described in your Freedom Blueprint — is worth every month of the journey it will take."
          </p>
        </div>
        <Button
          onClick={() => navigate("/os")}
          className="bg-transparent border border-[#B8962E]/40 text-[#d4af5a] hover:bg-[#B8962E] hover:text-[#1C3129] font-semibold tracking-[3px] uppercase text-xs px-10 py-5 transition-all duration-200 relative z-10"
        >
          <Users className="w-4 h-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
