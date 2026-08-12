import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Users, CheckCircle2, ClipboardList, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Assessment Questions ─────────────────────────────────────────────────────
interface AssessQuestion {
  id: string;
  text: string;
  options: { label: string; value: number; flag?: "red" | "amber" | "green" }[];
}

const assessQuestions: AssessQuestion[] = [
  {
    id: "a1",
    text: "How often do you find yourself doing tasks that someone else in your team could handle?",
    options: [
      { label: "Almost always — I do most things myself", value: 1, flag: "red" },
      { label: "Often — I hand some things over but take most back", value: 2, flag: "amber" },
      { label: "Sometimes — I delegate but check in constantly", value: 3, flag: "amber" },
      { label: "Rarely — my team runs most tasks independently", value: 4, flag: "green" },
    ],
  },
  {
    id: "a2",
    text: "When you hand a task to someone, what typically happens?",
    options: [
      { label: "I end up redoing it myself because it wasn't done right", value: 1, flag: "red" },
      { label: "I give unclear instructions and they come back with questions", value: 2, flag: "amber" },
      { label: "It gets done but not quite how I imagined", value: 3, flag: "amber" },
      { label: "It gets done well — I just review at the end", value: 4, flag: "green" },
    ],
  },
  {
    id: "a3",
    text: "What is your biggest internal resistance to delegating more?",
    options: [
      { label: "I don't trust others to do it to my standard", value: 1, flag: "red" },
      { label: "It takes longer to explain than to just do it myself", value: 2, flag: "amber" },
      { label: "I'm not sure what to hand over or how to structure it", value: 3, flag: "amber" },
      { label: "I've tried but the team isn't ready yet", value: 4, flag: "red" },
    ],
  },
  {
    id: "a4",
    text: "How many hours per week do you spend on tasks that are NOT in your top 10% zone of genius?",
    options: [
      { label: "More than 30 hours — I'm buried in execution", value: 1, flag: "red" },
      { label: "15–30 hours — I'm still doing too much", value: 2, flag: "amber" },
      { label: "5–15 hours — I'm making progress", value: 3, flag: "amber" },
      { label: "Less than 5 hours — I'm mostly in my zone", value: 4, flag: "green" },
    ],
  },
];

interface AssessResult {
  level: "critical" | "developing" | "strong";
  label: string;
  tagClass: string;
  insights: string[];
}

function calcAssessResult(answers: Record<string, number>): AssessResult {
  const total = Object.values(answers).reduce((s, v) => s + v, 0);
  const redFlags = assessQuestions.filter((q) => {
    const sel = q.options.find((o) => o.value === answers[q.id]);
    return sel?.flag === "red";
  }).length;

  if (total <= 8 || redFlags >= 2) {
    return {
      level: "critical",
      label: "Delegation Gap — Critical",
      tagClass: "tag-red",
      insights: [
        "You are currently the bottleneck in your own business. Most of your time is spent in the 80% zone that should belong to your team.",
        "The cost of not delegating is not just time — it is the strategic thinking and relationship-building that never happens because you are too busy executing.",
        "The 10-80-10 framework will give you a clear structure to start handing over the middle 80% — starting this week.",
      ],
    };
  }
  if (total <= 12) {
    return {
      level: "developing",
      label: "Delegation Gap — Developing",
      tagClass: "tag-amber",
      insights: [
        "You are delegating some tasks but the handover process is unclear — which is why tasks come back to you or don't meet your standard.",
        "The gap is not trust — it is structure. A clear brief at the start and a defined review at the end removes 80% of the friction.",
        "The 10-80-10 framework will help you build a repeatable handover process your team can follow without constant check-ins.",
      ],
    };
  }
  return {
    level: "strong",
    label: "Delegation — Strong Foundation",
    tagClass: "tag-green",
    insights: [
      "You have a healthy delegation habit. The opportunity now is to systematise it — so it works even when you are not there to guide it.",
      "The 10-80-10 framework will help you formalise your handover process into a repeatable brief your team can follow independently.",
    ],
  };
}

// ── Handover Brief Fields ────────────────────────────────────────────────────
interface HandoverBrief {
  taskName: string;
  context: string;
  successCriteria: string;
  deadline: string;
  checkIn: string;
  assignedTo: string;
}

const CHECKLIST_ITEMS = [
  "The task name and outcome are clearly written — not just what to do, but what done looks like",
  "The context is documented — why this task matters and how it fits the bigger picture",
  "Success criteria are specific and measurable — the team member knows when they are finished",
  "A deadline is set — not open-ended",
  "A check-in point is scheduled — not at the end, but at the 50% mark",
  "The assigned person has confirmed they understand the brief — in their own words",
  "You have committed to staying out of the 80% — your next touch point is the review",
];

const STEPS = [
  { id: 1, label: "Assess" },
  { id: 2, label: "Learn" },
  { id: 3, label: "Build Brief" },
  { id: 4, label: "Checklist" },
  { id: 5, label: "Commit" },
];

export default function DelegationToolkit() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [assessAnswers, setAssessAnswers] = useState<Record<string, number>>({});
  const [assessResult, setAssessResult] = useState<AssessResult | null>(null);
  const [brief, setBrief] = useState<HandoverBrief>({
    taskName: "",
    context: "",
    successCriteria: "",
    deadline: "",
    checkIn: "",
    assignedTo: "",
  });
  const [checkedItems, setCheckedItems] = useState<boolean[]>(Array(CHECKLIST_ITEMS.length).fill(false));
  const [firstProject, setFirstProject] = useState("");
  const [done, setDone] = useState(false);

  function handleAssessAnswer(qId: string, value: number) {
    setAssessAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function handleAssessNext() {
    const result = calcAssessResult(assessAnswers);
    setAssessResult(result);
    // Save to sessionStorage so Goal Dashboard can pick it up
    sessionStorage.setItem("delegationResult", JSON.stringify({ level: result.level, completedAt: Date.now() }));
    setStep(2);
  }

  function toggleCheck(i: number) {
    setCheckedItems((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  const allChecked = checkedItems.every(Boolean);
  const assessComplete = assessQuestions.every((q) => assessAnswers[q.id] !== undefined);

  if (done) {
    return (
      <div className="min-h-screen px-6 py-8 lg:px-10 max-w-3xl mx-auto">
        <div className="animate-fade-in text-center py-16">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ backgroundColor: "oklch(55% 0.12 175 / 0.15)" }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: "var(--color-primary)" }} />
          </div>
          <h1
            className="text-2xl lg:text-3xl font-bold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            Your First Delegation Brief Is Ready
          </h1>
          <p className="text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
            First project to delegate:{" "}
            <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
              {firstProject || brief.taskName || "your chosen task"}
            </span>
          </p>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "var(--color-text-muted)" }}>
            What would your business look like in 90 days if you consistently stayed in your top 10%?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/os/goals")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              Add to My 90-Day Goals <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/os")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium"
              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 lg:px-10 max-w-3xl mx-auto">
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
              10-80-10 Delegation Toolkit
            </span>
          </div>
          <h1
            className="text-2xl lg:text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            Stop Being the Bottleneck
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            A structured framework to hand over the right work to the right people — and stay in your zone of genius.
          </p>
        </div>

        {/* Step Progress */}
        <div
          className="flex rounded-xl overflow-hidden mb-8"
          style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-surface)" }}
        >
          {STEPS.map((s) => (
            <div
              key={s.id}
              className="flex-1 py-3 text-center relative"
              style={{
                backgroundColor: step === s.id ? "oklch(55% 0.12 175 / 0.1)" : "transparent",
                borderBottom: step === s.id ? "2px solid var(--color-primary)" : "2px solid transparent",
              }}
            >
              <span
                className="block text-base font-bold"
                style={{ color: step >= s.id ? "var(--color-primary)" : "var(--color-text-subtle)" }}
              >
                {s.id}
              </span>
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: step >= s.id ? "var(--color-text-muted)" : "var(--color-text-subtle)" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Assess ── */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                Step 1 — Delegation Assessment
              </p>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
              >
                Where are you right now?
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Answer honestly. The more accurate your picture, the more useful the framework becomes.
              </p>
            </div>
            <div className="space-y-4 mb-8">
              {assessQuestions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl p-5"
                  style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
                >
                  <p
                    className="text-sm font-medium mb-4"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)", lineHeight: "1.5" }}
                  >
                    {q.text}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleAssessAnswer(q.id, opt.value)}
                        className="px-3 py-2 rounded-lg text-xs text-left transition-all duration-150"
                        style={{
                          backgroundColor:
                            assessAnswers[q.id] === opt.value
                              ? "oklch(55% 0.12 175 / 0.25)"
                              : "oklch(55% 0.12 175 / 0.04)",
                          border:
                            assessAnswers[q.id] === opt.value
                              ? "1px solid var(--color-primary)"
                              : "1px solid var(--color-border)",
                          color:
                            assessAnswers[q.id] === opt.value ? "var(--color-primary)" : "var(--color-text-muted)",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAssessNext}
                disabled={!assessComplete}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-180 disabled:opacity-40"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                See My Assessment <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Learn ── */}
        {step === 2 && assessResult && (
          <div>
            <div className="mb-6">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                Step 2 — Your Assessment Result
              </p>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
              >
                The 10-80-10 Framework
              </h2>
            </div>

            {/* Assessment Result Box */}
            <div
              className="rounded-xl p-5 mb-6"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <span
                className={cn(
                  "inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3",
                  assessResult.level === "critical"
                    ? "bg-red-500/10 text-red-400 border border-red-500/25"
                    : assessResult.level === "developing"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                )}
              >
                {assessResult.label}
              </span>
              <div className="space-y-2">
                {assessResult.insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    />
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      {ins}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  pct: "10%",
                  label: "You — The Brief",
                  title: "Set the Context",
                  desc: "Define the outcome, the why, the success criteria, and the deadline. This is your zone. Do not skip it.",
                  color: "oklch(55% 0.12 175)",
                  bg: "oklch(55% 0.12 175 / 0.1)",
                  border: "oklch(55% 0.12 175 / 0.3)",
                },
                {
                  pct: "80%",
                  label: "Your Team — The Execution",
                  title: "Hand It Over",
                  desc: "This is the work. Your team owns it. Your job is to stay out of it — completely — until the check-in point.",
                  color: "oklch(65% 0.15 160)",
                  bg: "oklch(65% 0.15 160 / 0.07)",
                  border: "oklch(65% 0.15 160 / 0.2)",
                },
                {
                  pct: "10%",
                  label: "You — The Review",
                  title: "Close the Loop",
                  desc: "Review against the success criteria you set. Give specific feedback. Celebrate what worked. Correct what didn't.",
                  color: "oklch(70% 0.10 75)",
                  bg: "oklch(70% 0.10 75 / 0.08)",
                  border: "oklch(70% 0.10 75 / 0.28)",
                },
              ].map((zone) => (
                <div
                  key={zone.pct}
                  className="rounded-xl p-5"
                  style={{ backgroundColor: zone.bg, border: `1px solid ${zone.border}` }}
                >
                  <div
                    className="text-5xl font-bold mb-1"
                    style={{ fontFamily: "var(--font-display)", color: zone.color }}
                  >
                    {zone.pct}
                  </div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: zone.color }}
                  >
                    {zone.label}
                  </div>
                  <div
                    className="text-sm font-semibold mb-2"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
                  >
                    {zone.title}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                    {zone.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                Build My Brief <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Build Brief ── */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                Step 3 — Build Your Handover Brief
              </p>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
              >
                Your First 10%
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Choose one task you are currently doing that someone else could own. Build the brief for it now.
              </p>
            </div>
            <div
              className="rounded-xl p-6 mb-6"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: "taskName", label: "Task Name", placeholder: "e.g. Weekly social media posts", full: true },
                  {
                    key: "assignedTo",
                    label: "Assigned To",
                    placeholder: "e.g. Sarah — marketing assistant",
                    full: false,
                  },
                  { key: "deadline", label: "Deadline", placeholder: "e.g. Every Friday by 3pm", full: false },
                  {
                    key: "context",
                    label: "Context — Why This Matters",
                    placeholder: "e.g. Our social presence drives 30% of new enquiries. Consistency is key.",
                    full: true,
                    multiline: true,
                  },
                  {
                    key: "successCriteria",
                    label: "Success Criteria — What Done Looks Like",
                    placeholder:
                      "e.g. 3 posts per week, on-brand, scheduled in advance, engagement responded to within 24h",
                    full: true,
                    multiline: true,
                  },
                  {
                    key: "checkIn",
                    label: "Check-In Point (50% mark)",
                    placeholder: "e.g. Wednesday review — 5 min call to confirm direction",
                    full: true,
                  },
                ].map((field) => (
                  <div
                    key={field.key}
                    className={cn("flex flex-col gap-1", field.full ? "sm:col-span-2" : "")}
                  >
                    <label
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        rows={2}
                        placeholder={field.placeholder}
                        value={brief[field.key as keyof HandoverBrief]}
                        onChange={(e) => setBrief((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="rounded-lg px-3 py-2 text-sm resize-none outline-none transition-colors"
                        style={{
                          backgroundColor: "oklch(55% 0.12 175 / 0.05)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-base)",
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={brief[field.key as keyof HandoverBrief]}
                        onChange={(e) => setBrief((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                        style={{
                          backgroundColor: "oklch(55% 0.12 175 / 0.05)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-base)",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!brief.taskName}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                Handover Checklist <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Checklist ── */}
        {step === 4 && (
          <div>
            <div className="mb-6">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                Step 4 — Handover Checklist
              </p>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
              >
                Before You Hand It Over
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Tick each item before you hand the task to your team member. This is what separates a delegation that
                works from one that bounces back.
              </p>
            </div>

            {/* Brief Preview */}
            {brief.taskName && (
              <div
                className="rounded-xl p-5 mb-6"
                style={{
                  backgroundColor: "oklch(55% 0.12 175 / 0.05)",
                  border: "1px solid oklch(55% 0.12 175 / 0.2)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
                    Brief Preview
                  </p>
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs underline"
                    style={{ color: "var(--color-text-subtle)" }}
                  >
                    Edit
                  </button>
                </div>
                {[
                  { label: "Task", value: brief.taskName },
                  { label: "Assigned To", value: brief.assignedTo },
                  { label: "Deadline", value: brief.deadline },
                  { label: "Context", value: brief.context },
                  { label: "Success Criteria", value: brief.successCriteria },
                  { label: "Check-In", value: brief.checkIn },
                ]
                  .filter((f) => f.value)
                  .map((f) => (
                    <div key={f.label} className="mb-2">
                      <p
                        className="text-xs uppercase tracking-wider mb-0.5"
                        style={{ color: "oklch(70% 0.10 75 / 0.75)" }}
                      >
                        {f.label}
                      </p>
                      <p className="text-sm italic" style={{ color: "var(--color-text-muted)" }}>
                        {f.value}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            <div className="space-y-2 mb-8">
              {CHECKLIST_ITEMS.map((item, i) => (
                <div
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className="flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-150"
                  style={{
                    backgroundColor: checkedItems[i]
                      ? "oklch(65% 0.15 160 / 0.07)"
                      : "var(--color-bg-surface)",
                    border: checkedItems[i]
                      ? "1px solid oklch(65% 0.15 160 / 0.28)"
                      : "1px solid var(--color-border)",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded shrink-0 mt-0.5 flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: checkedItems[i] ? "oklch(65% 0.15 160)" : "transparent",
                      border: checkedItems[i] ? "none" : "1.5px solid var(--color-border-light)",
                    }}
                  >
                    {checkedItems[i] && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: checkedItems[i] ? "var(--color-text-subtle)" : "var(--color-text-muted)",
                      textDecoration: checkedItems[i] ? "line-through" : "none",
                    }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!allChecked}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                Make My Commitment <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Commit ── */}
        {step === 5 && (
          <div>
            <div className="mb-6">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                Step 5 — Your Commitment
              </p>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
              >
                The Last 10% — Your Review Commitment
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Delegation only works when the loop is closed. What is the first task you are committing to hand over
                this week — and when will you review it?
              </p>
            </div>

            <div
              className="rounded-xl p-6 mb-6 text-center"
              style={{
                backgroundColor: "oklch(70% 0.10 75 / 0.06)",
                border: "1px solid oklch(70% 0.10 75 / 0.22)",
              }}
            >
              <h3
                className="text-lg font-bold mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)" }}
              >
                My First Delegation Project
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
                What is the one task you are handing over this week?
              </p>
              <input
                type="text"
                placeholder={brief.taskName || "e.g. Weekly social media scheduling"}
                value={firstProject}
                onChange={(e) => setFirstProject(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm text-center outline-none mb-4"
                style={{
                  backgroundColor: "oklch(55% 0.12 175 / 0.05)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-base)",
                }}
              />

              {/* Insight cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mt-2">
                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: "oklch(65% 0.15 160 / 0.05)",
                    border: "1px solid oklch(65% 0.15 160 / 0.13)",
                    borderLeft: "3px solid oklch(65% 0.15 160)",
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-base)" }}>
                    The 80% Rule
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Once you hand it over, stay out. Your next touch point is the check-in you scheduled — not before.
                  </p>
                </div>
                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: "oklch(55% 0.12 175 / 0.05)",
                    border: "1px solid oklch(55% 0.12 175 / 0.13)",
                    borderLeft: "3px solid var(--color-primary)",
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-base)" }}>
                    What This Frees Up
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Every hour you reclaim from the 80% is an hour you can invest in the strategic work only you can do.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setDone(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--color-accent)", color: "var(--color-bg-base)" }}
              >
                <Target className="w-4 h-4" /> Commit to This
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
