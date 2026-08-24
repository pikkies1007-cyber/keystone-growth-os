import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarDays,
  Target,
  Zap,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Sun,
  Star,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import { useOSSession } from "../hooks/useOSSession";
import { trpc } from "@/lib/trpc";
import { useGoalSessionId } from "@/lib/goalSession";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayBlock {
  focus: string;
  tasks: string[];
  done: boolean[];
}

interface WeekPlan {
  weekStart: string; // ISO date string of Monday
  mondayPriorities: string[];
  tuesday: DayBlock;
  wednesday: DayBlock;
  thursday: DayBlock;
  fridayWins: string;
  fridayStuck: string;
  fridayNextWeek: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getWeekKey(monday: Date): string {
  return monday.toISOString().split("T")[0];
}

function emptyWeek(monday: Date): WeekPlan {
  return {
    weekStart: monday.toISOString(),
    mondayPriorities: ["", "", ""],
    tuesday: { focus: "", tasks: ["", ""], done: [false, false] },
    wednesday: { focus: "", tasks: ["", ""], done: [false, false] },
    thursday: { focus: "", tasks: ["", ""], done: [false, false] },
    fridayWins: "",
    fridayStuck: "",
    fridayNextWeek: "",
  };
}

const DAY_LABELS = ["tuesday", "wednesday", "thursday"] as const;
const DAY_NAMES: Record<(typeof DAY_LABELS)[number], string> = {
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyRhythm() {
  const [, navigate] = useLocation();
  const session = useOSSession();
  const [activeTab, setActiveTab] = useState<"plan" | "review">("plan");

  // All hooks must run on every render regardless of the lock-gate branch
  // below -- moved above it to fix the same React error #310 pattern
  // (hooks skipped/added inconsistently between renders) already found and
  // fixed elsewhere today.
  const monday = getMondayOfWeek(new Date());
  const weekKey = getWeekKey(monday);
  const [plan, setPlan] = useState<WeekPlan>(() => {
    const raw = sessionStorage.getItem(`weekPlan_${weekKey}`);
    return raw ? JSON.parse(raw) : emptyWeek(monday);
  });
  const saveSubmission = trpc.toolkitSubmissions.save.useMutation();
  const goalSessionId = useGoalSessionId();
  const [tracked, setTracked] = useState(false);

  // Persist on every change
  useEffect(() => {
    sessionStorage.setItem(`weekPlan_${weekKey}`, JSON.stringify(plan));
  }, [plan, weekKey]);

  // ── Lock gate ──────────────────────────────────────────────────────────────
  if (!session.isWeeklyRhythmUnlocked) {
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
            Weekly Rhythm — Locked
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)", lineHeight: "1.7" }}>
            This tool unlocks after you complete the{" "}
            <strong>21-Day Wealth Reset Journey</strong>.
          </p>
          <p className="text-xs mb-8" style={{ color: "var(--color-text-subtle)", lineHeight: "1.6" }}>
            The Wealth Reset builds the consistent daily habits and financial identity that make a
            structured weekly rhythm sustainable. Planning your week without that foundation tends to
            create short bursts of discipline followed by collapse.
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

  function trackThisWeek() {
    const priorities = plan.mondayPriorities.filter((p) => p.trim());
    if (priorities.length === 0) return;
    saveSubmission.mutate({
      toolkitKey: "weekly-rhythm",
      inputData: { weekStart: plan.weekStart },
      resultSummary: { weekStart: plan.weekStart, priorityCount: priorities.length },
      suggestions: priorities,
      syncToGoals: { sessionId: goalSessionId, dimension: "Systems" },
    });
    setTracked(true);
  }

  // ── Monday priorities ──────────────────────────────────────────────────────
  function updatePriority(i: number, val: string) {
    const next = [...plan.mondayPriorities];
    next[i] = val;
    setPlan({ ...plan, mondayPriorities: next });
  }

  // ── Execution day blocks ───────────────────────────────────────────────────
  function updateDayFocus(day: (typeof DAY_LABELS)[number], val: string) {
    setPlan({ ...plan, [day]: { ...plan[day], focus: val } });
  }

  function updateDayTask(day: (typeof DAY_LABELS)[number], i: number, val: string) {
    const tasks = [...plan[day].tasks];
    tasks[i] = val;
    setPlan({ ...plan, [day]: { ...plan[day], tasks } });
  }

  function toggleDayTask(day: (typeof DAY_LABELS)[number], i: number) {
    const done = [...plan[day].done];
    done[i] = !done[i];
    setPlan({ ...plan, [day]: { ...plan[day], done } });
  }

  function addDayTask(day: (typeof DAY_LABELS)[number]) {
    const tasks = [...plan[day].tasks, ""];
    const done = [...plan[day].done, false];
    setPlan({ ...plan, [day]: { ...plan[day], tasks, done } });
  }

  function removeDayTask(day: (typeof DAY_LABELS)[number], i: number) {
    const tasks = plan[day].tasks.filter((_, idx) => idx !== i);
    const done = plan[day].done.filter((_, idx) => idx !== i);
    setPlan({ ...plan, [day]: { ...plan[day], tasks, done } });
  }

  // ── Friday review ──────────────────────────────────────────────────────────
  function updateFriday(field: "fridayWins" | "fridayStuck" | "fridayNextWeek", val: string) {
    setPlan({ ...plan, [field]: val });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allTasks = [
    ...plan.tuesday.tasks.map((t, i) => ({ text: t, done: plan.tuesday.done[i] })),
    ...plan.wednesday.tasks.map((t, i) => ({ text: t, done: plan.wednesday.done[i] })),
    ...plan.thursday.tasks.map((t, i) => ({ text: t, done: plan.thursday.done[i] })),
  ].filter((t) => t.text.trim());

  const completedTasks = allTasks.filter((t) => t.done).length;
  const totalTasks = allTasks.length;
  const weekProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const prioritiesSet = plan.mondayPriorities.filter((p) => p.trim()).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <button
              onClick={() => navigate("/os")}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Weekly Rhythm Planner</h1>
                <p className="text-sm text-slate-400">Week of {formatDate(plan.weekStart)}</p>
              </div>
            </div>
          </div>
          {totalTasks > 0 && (
            <Badge className={`${weekProgress >= 80 ? "bg-teal-500/20 text-teal-300 border-teal-500/30" : "bg-slate-700 text-slate-400 border-slate-600"}`}>
              {completedTasks}/{totalTasks} done
            </Badge>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1">
          {(["plan", "review"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab
                  ? "bg-teal-500 text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "plan" ? "📋 Plan (Mon–Thu)" : "✅ Review (Friday)"}
            </button>
          ))}
        </div>

        {/* ── PLAN TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "plan" && (
          <div className="space-y-5">
            {/* Monday planning block */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <h2 className="font-semibold text-white text-sm">Monday — Set Your Three Priorities</h2>
                </div>
                <p className="text-xs text-slate-500">
                  What are the three things that, if completed this week, would make the week a success?
                  Pull from your 90-day goals.
                </p>
                <div className="space-y-2">
                  {plan.mondayPriorities.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-xs flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={p}
                        onChange={(e) => updatePriority(i, e.target.value)}
                        placeholder={`Priority ${i + 1}...`}
                        className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                {prioritiesSet > 0 && (
                  <p className="text-xs text-teal-400">
                    {prioritiesSet} of 3 priorities set for this week
                  </p>
                )}
                {prioritiesSet > 0 && (
                  <button
                    onClick={trackThisWeek}
                    disabled={saveSubmission.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{
                      backgroundColor: tracked ? "transparent" : "var(--color-primary)",
                      color: tracked ? "var(--color-text-muted)" : "white",
                      border: tracked ? "1px solid var(--color-border-light)" : "none",
                    }}
                  >
                    {tracked ? "✓ Tracked in Progress & Goals" : saveSubmission.isPending ? "Tracking…" : "Track this week's priorities"}
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Execution blocks Tue–Thu */}
            {DAY_LABELS.map((day) => (
              <Card key={day} className="bg-slate-800/60 border-slate-700">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-400" />
                    <h2 className="font-semibold text-white text-sm">{DAY_NAMES[day]} — Execute</h2>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Today's main focus</label>
                    <input
                      type="text"
                      value={plan[day].focus}
                      onChange={(e) => updateDayFocus(day, e.target.value)}
                      placeholder="What is the one thing that must get done today?"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Task list</label>
                    {plan[day].tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Checkbox
                          checked={plan[day].done[i]}
                          onCheckedChange={() => toggleDayTask(day, i)}
                          className="border-slate-600 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                        />
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => updateDayTask(day, i, e.target.value)}
                          placeholder={`Task ${i + 1}...`}
                          className={`flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors ${
                            plan[day].done[i] ? "line-through text-slate-500" : "text-white"
                          }`}
                        />
                        {plan[day].tasks.length > 1 && (
                          <button
                            onClick={() => removeDayTask(day, i)}
                            className="text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addDayTask(day)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-400 transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add task
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={() => setActiveTab("review")}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Go to Friday Review
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── REVIEW TAB ───────────────────────────────────────────────────── */}
        {activeTab === "review" && (
          <div className="space-y-5">
            {/* Progress summary */}
            {totalTasks > 0 && (
              <Card className="bg-slate-800/60 border-slate-700">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Week Progress</span>
                    <span className="text-sm text-teal-400 font-semibold">{weekProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${weekProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {completedTasks} of {totalTasks} tasks completed this week
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Friday review blocks */}
            <Card className="bg-slate-800/60 border-slate-700">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <h2 className="font-semibold text-white text-sm">Friday — Weekly Review</h2>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <label className="text-xs text-slate-400 font-medium">What were your wins this week?</label>
                  </div>
                  <textarea
                    value={plan.fridayWins}
                    onChange={(e) => updateFriday("fridayWins", e.target.value)}
                    placeholder="What moved forward? What are you proud of? Even small wins count."
                    rows={3}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-red-400" />
                    <label className="text-xs text-slate-400 font-medium">Where did you get stuck?</label>
                  </div>
                  <textarea
                    value={plan.fridayStuck}
                    onChange={(e) => updateFriday("fridayStuck", e.target.value)}
                    placeholder="What slowed you down? What kept coming up? No judgment — just honest reflection."
                    rows={3}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-teal-400" />
                    <label className="text-xs text-slate-400 font-medium">What is the one priority for next week?</label>
                  </div>
                  <textarea
                    value={plan.fridayNextWeek}
                    onChange={(e) => updateFriday("fridayNextWeek", e.target.value)}
                    placeholder="If you could only do one thing next week, what would move the needle the most?"
                    rows={2}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Calibrated closing question */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
              <p className="text-slate-300 text-sm leading-relaxed">
                Looking at this week — what is the one pattern you keep seeing that, if you changed it,
                would make every future week easier?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate("/os/goals")}
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold"
              >
                Review My 90-Day Goals
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/os")}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Back to Dashboard
              </Button>
            </div>

            <button
              onClick={() => {
                const newMonday = getMondayOfWeek(new Date());
                const newKey = getWeekKey(newMonday);
                const fresh = emptyWeek(newMonday);
                sessionStorage.setItem(`weekPlan_${newKey}`, JSON.stringify(fresh));
                setPlan(fresh);
                setActiveTab("plan");
              }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-400 underline underline-offset-2 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Start fresh week
            </button>
          </div>
        )}
      </div>
    );
}
