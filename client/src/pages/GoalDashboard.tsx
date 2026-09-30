import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { activeBrand } from "../../../shared/brandConfig";
import { Target, Plus, CheckCircle2, Circle, ArrowRight, Trash2, Calendar, Brain, Sparkles, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useOSSession, archetypeDisplay, archetypeGoalPriority, type MoneyArchetype } from "../hooks/useOSSession";
import { useGoalSessionId } from "@/lib/goalSession";

interface GoalMetric {
  label: string;
  unit?: string;
  start: number;
  current: number;
  target: number;
}

interface Goal {
  id: string;
  dbId?: number;   // Numeric DB ID — set after backend sync, used for toggle status updates
  text: string;
  dimension: string;
  completed: boolean;
  week: 1 | 2 | 3;
  /** FAST method's "Focus" flag — one of the vital ~20% driving most of the result. Backed by the priority column: high = Focus. */
  isFocus?: boolean;
  /** FAST method's "Tracking" — an optional measurable target instead of a plain checkbox. */
  metric?: GoalMetric | null;
}

const dimensionOptions = [
  { value: "sales", label: "Sales" },
  { value: "cash", label: "Cash Flow" },
  { value: "staff", label: "Staff" },
  { value: "systems", label: "Systems" },
  { value: "owner", label: "Owner Behaviour" },
  { value: "money", label: "Money Identity" },
];

const weekLabels = {
  1: "Month 1 — Foundation",
  2: "Month 2 — Momentum",
  3: "Month 3 — Growth",
};

const dimensionColors: Record<string, string> = {
  sales: "var(--color-primary)",
  cash: "var(--color-accent)",
  staff: "var(--color-info)",
  systems: "var(--color-success)",
  owner: "var(--color-danger)",
  money: "oklch(70% 0.10 75)",
};

function generateSuggestedGoals(
  auditResult: Record<string, number> | null,
  blueprintResult: Record<string, number> | null,
  archetype: MoneyArchetype | null,
  primaryBottleneck: string | null
): Goal[] {
  const goals: Goal[] = [];
  const id = () => Math.random().toString(36).slice(2, 9);
  // FOCUS: auto-flag any goal in the person's weakest dimension (from their
  // Bottleneck Audit) as one of the vital ~20% -- this is the mechanical
  // half of Focus; the AI "Suggest My Focus" feature covers the other half.
  const isFocus = (dimension: string) => primaryBottleneck != null && dimension === primaryBottleneck;

  // Always suggest foundational goals
  goals.push({
    id: id(),
    text: "Complete the Business Bottleneck Audit and identify your primary constraint",
    dimension: "systems",
    completed: !!auditResult,
    week: 1,
    isFocus: isFocus("systems"),
  });
  goals.push({
    id: id(),
    text: "Set up a weekly cash flow review — 30 minutes every Monday morning",
    dimension: "cash",
    completed: false,
    week: 1,
    isFocus: isFocus("cash"),
  });
  goals.push({
    id: id(),
    text: "Identify your top 3 revenue-generating activities and protect time for them",
    dimension: "sales",
    completed: false,
    week: 1,
    isFocus: isFocus("sales"),
  });
  goals.push({
    id: id(),
    text: "Document one key business process that currently lives only in your head",
    dimension: "systems",
    completed: false,
    week: 2,
    isFocus: isFocus("systems"),
  });
  goals.push({
    id: id(),
    text: "Have a clear performance conversation with each team member",
    dimension: "staff",
    completed: false,
    week: 2,
    isFocus: isFocus("staff"),
  });
  goals.push({
    id: id(),
    text: "Review your pricing and identify one product or service you are undercharging for",
    dimension: "sales",
    completed: false,
    week: 2,
    isFocus: isFocus("sales"),
  });
  goals.push({
    id: id(),
    text: "Block one full day per month for strategic planning — working ON the business",
    dimension: "owner",
    completed: false,
    week: 3,
    isFocus: isFocus("owner"),
  });
  goals.push({
    id: id(),
    text: "Create a 12-month financial target and break it into quarterly milestones",
    dimension: "cash",
    completed: false,
    week: 3,
    isFocus: isFocus("cash"),
  });

  return goals;
}

export default function GoalDashboard() {
  const [, navigate] = useLocation();
  const brand = activeBrand;
  const session = useOSSession();
  // Stable session ID for backend sync - tied to the signed-in user, not a
  // random per-tab value, so goals show up consistently across tabs/sessions.
  const sessionId = useGoalSessionId();
  const createGoalMutation = trpc.goals.create.useMutation();
  const updateGoalMutation = trpc.goals.updateStatus.useMutation();
  const updateGoalFieldsMutation = trpc.goals.update.useMutation();
  const suggestFocusMutation = trpc.goals.suggestFocus.useMutation();
  const { data: dbGoals } = trpc.goals.list.useQuery({ sessionId });
  const archetype = session.moneyIdentity?.archetype ?? null;
  const archetypeInfo = archetype ? archetypeDisplay[archetype] : null;
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem("keystoneGoals");
    if (saved) {
      const parsed: Goal[] = JSON.parse(saved);
      // Self-heal: collapse any duplicate titles that got saved into
      // localStorage before duplicate-prevention existed. Keeps the first
      // occurrence of each title, preferring one that's completed and one
      // that has a dbId (so sync isn't lost in the cleanup).
      const byTitle = new Map<string, Goal>();
      for (const g of parsed) {
        const existing = byTitle.get(g.text);
        if (!existing || (!existing.dbId && g.dbId) || (!existing.completed && g.completed)) {
          byTitle.set(g.text, g);
        }
      }
      return Array.from(byTitle.values());
    }
    const auditRaw = sessionStorage.getItem("auditResult");
    const blueprintRaw = sessionStorage.getItem("blueprintResult");
    const identityRaw = sessionStorage.getItem("moneyIdentityResult");
    const identity = identityRaw ? JSON.parse(identityRaw) : null;
    const auditParsed = auditRaw ? JSON.parse(auditRaw) : null;
    const goals = generateSuggestedGoals(
      auditParsed,
      blueprintRaw ? JSON.parse(blueprintRaw) : null,
      identity?.archetype ?? null,
      auditParsed?.primaryBottleneck ?? null
    );
    // Sort goals by archetype priority if archetype is known
    if (identity?.archetype && archetypeGoalPriority[identity.archetype as MoneyArchetype]) {
      const priority = archetypeGoalPriority[identity.archetype as MoneyArchetype];
      goals.sort((a, b) => {
        const ai = priority.indexOf(a.dimension);
        const bi = priority.indexOf(b.dimension);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    }
    return goals;
  });

  const [newGoalText, setNewGoalText] = useState("");
  const [newGoalDimension, setNewGoalDimension] = useState("sales");
  const [newGoalWeek, setNewGoalWeek] = useState<1 | 2 | 3>(1);
  const [newGoalIsFocus, setNewGoalIsFocus] = useState(false);
  const [newGoalHasMetric, setNewGoalHasMetric] = useState(false);
  const [newGoalMetricLabel, setNewGoalMetricLabel] = useState("");
  const [newGoalMetricStart, setNewGoalMetricStart] = useState("0");
  const [newGoalMetricTarget, setNewGoalMetricTarget] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeWeek, setActiveWeek] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    localStorage.setItem("keystoneGoals", JSON.stringify(goals));
  }, [goals]);

  // Merge in any real database goals (e.g. synced automatically from a
  // completed toolkit like Flywheel) that aren't already represented
  // locally. Matched by dbId so this never re-adds or duplicates a goal
  // that's already been merged once.
  useEffect(() => {
    if (!dbGoals?.length) return;
    setGoals((prev) => {
      const byDbId = new Map(dbGoals.map((row) => [row.id, row]));
      const existingDbIds = new Set(prev.filter((g) => g.dbId).map((g) => g.dbId));
      const existingTitles = new Set(prev.map((g) => g.text));

      // Reconcile Focus/metric on goals already present locally, in case
      // they were edited from another tab/device -- the DB is the source of
      // truth for these two fields once a goal has a dbId.
      const reconciled = prev.map((g) => {
        if (!g.dbId) return g;
        const row = byDbId.get(g.dbId);
        if (!row) return g;
        return { ...g, isFocus: row.priority === "high", metric: (row.metric as GoalMetric | null) ?? null };
      });

      const toAdd: Goal[] = dbGoals
        .filter((row) => !existingDbIds.has(row.id) && !existingTitles.has(row.title))
        .map((row) => ({
          id: `db-${row.id}`,
          dbId: row.id,
          text: row.title,
          dimension: (row.dimension ?? "systems").toLowerCase(),
          completed: row.status === "completed",
          // Toolkit-synced action plans (e.g. Flywheel's 30-day plan) are all
          // near-term work -- bucket them into Month 1 regardless of their
          // internal week number, which is already visible in the title itself.
          week: 1,
          isFocus: row.priority === "high",
          metric: (row.metric as GoalMetric | null) ?? null,
        }));
      if (toAdd.length === 0 && reconciled === prev) return prev;
      return [...reconciled, ...toAdd];
    });
  }, [dbGoals]);

  // The 8 starter goals generated by generateSuggestedGoals() previously
  // lived in localStorage only and were never persisted to the database at
  // all -- same class of bug fixed on Snapshot/Audit/Blueprint/Delegation/
  // Flywheel earlier: they'd vanish for good if localStorage ever cleared,
  // and Focus/metric edits need a dbId to save anywhere. Sync any goal
  // that's missing one, once, guarded so it never re-fires or duplicates.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    const unsynced = goals.filter((g) => !g.dbId);
    if (unsynced.length === 0) return;
    syncedRef.current = true;
    unsynced.forEach((g) => {
      createGoalMutation.mutate(
        {
          sessionId,
          title: g.text,
          dimension: g.dimension,
          priority: g.isFocus ? "high" : "medium",
          dueWeek: g.week,
          clientId: activeBrand.clientId,
        },
        {
          onSuccess: (data) => {
            if (data.dbId) {
              setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, dbId: data.dbId } : x)));
            }
          },
        }
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedCount = goals.filter((g) => g.completed).length;
  const totalCount = goals.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const focusGoals = goals.filter((g) => g.isFocus);
  const focusCompleted = focusGoals.filter((g) => g.completed).length;

  function toggleFocus(id: string) {
    setGoals((prev) => {
      const goal = prev.find((g) => g.id === id);
      if (!goal) return prev;
      const nextFocus = !goal.isFocus;
      if (goal.dbId) {
        updateGoalFieldsMutation.mutate({ id: goal.dbId, priority: nextFocus ? "high" : "medium" });
      }
      return prev.map((g) => (g.id === id ? { ...g, isFocus: nextFocus } : g));
    });
  }

  function setGoalMetric(id: string, metric: GoalMetric | null) {
    setGoals((prev) => {
      const goal = prev.find((g) => g.id === id);
      if (!goal) return prev;
      if (goal.dbId) {
        updateGoalFieldsMutation.mutate({ id: goal.dbId, metric });
      }
      return prev.map((g) => (g.id === id ? { ...g, metric } : g));
    });
  }

  function bumpMetric(id: string, delta: number) {
    const goal = goals.find((g) => g.id === id);
    if (!goal?.metric) return;
    setGoalMetric(id, { ...goal.metric, current: goal.metric.current + delta });
  }

  const [showFocusSuggestions, setShowFocusSuggestions] = useState(false);
  function runSuggestFocus() {
    setShowFocusSuggestions(true);
    suggestFocusMutation.mutate({ sessionId });
  }
  function applyFocusSuggestion(dbId: number) {
    const goal = goals.find((g) => g.dbId === dbId);
    if (goal && !goal.isFocus) toggleFocus(goal.id);
  }

  function toggleGoal(id: string) {
    setGoals((prev) => {
      const goal = prev.find((g) => g.id === id);
      const updated = prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g));
      // Sync toggle to backend when we have a numeric DB ID from a previously created goal
      if (goal?.dbId) {
        const newStatus = !goal.completed ? "completed" : "pending";
        updateGoalMutation.mutate({ id: goal.dbId, status: newStatus });
      }
      return updated;
    });
  }

  function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function addGoal() {
    if (!newGoalText.trim()) return;
    const metric: GoalMetric | null =
      newGoalHasMetric && newGoalMetricLabel.trim() && newGoalMetricTarget.trim()
        ? {
            label: newGoalMetricLabel.trim(),
            start: Number(newGoalMetricStart) || 0,
            current: Number(newGoalMetricStart) || 0,
            target: Number(newGoalMetricTarget) || 0,
          }
        : null;
    const newGoal: Goal = {
      id: Math.random().toString(36).slice(2, 9),
      text: newGoalText.trim(),
      dimension: newGoalDimension,
      completed: false,
      week: newGoalWeek,
      isFocus: newGoalIsFocus,
      metric,
    };
    setGoals((prev) => [...prev, newGoal]);
    // Persist to backend and capture the returned DB ID for future toggle sync
    createGoalMutation.mutate(
      {
        sessionId,
        title: newGoal.text,
        dimension: newGoal.dimension,
        priority: newGoalIsFocus ? "high" : "medium",
        dueWeek: newGoal.week,
        clientId: activeBrand.clientId,
      },
      {
        onSuccess: (data) => {
          if (data.dbId) {
            // Patch the goal in state with its DB-assigned numeric ID
            setGoals((prev) =>
              prev.map((g) => (g.id === newGoal.id ? { ...g, dbId: data.dbId } : g))
            );
            // The metric can't be sent on create (it's not part of goals.create's
            // input), so a follow-up update call attaches it once the dbId exists.
            if (metric) {
              updateGoalFieldsMutation.mutate({ id: data.dbId, metric });
            }
          }
        },
      }
    );
    setNewGoalText("");
    setNewGoalIsFocus(false);
    setNewGoalHasMetric(false);
    setNewGoalMetricLabel("");
    setNewGoalMetricStart("0");
    setNewGoalMetricTarget("");
    setShowAddForm(false);
  }

  const weekGoals = goals
    .filter((g) => g.week === activeWeek)
    .sort((a, b) => Number(!!b.isFocus) - Number(!!a.isFocus));
  const weekCompleted = weekGoals.filter((g) => g.completed).length;

  return (
    <div className="min-h-screen px-6 py-8 lg:px-10 max-w-4xl mx-auto">
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-primary)" }}
            >
              {brand.modules.goals.title}
            </span>
          </div>
          <h1
            className="text-2xl lg:text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            Your 90-Day Focus
          </h1>
          <p style={{ color: "var(--color-text-muted)" }}>
            {brand.modules.goals.description}
          </p>
          {/* Archetype personalisation banner */}
          {archetypeInfo && archetype && (
            <div
              className="flex items-start gap-3 mt-4 p-3 rounded-xl"
              style={{
                backgroundColor: `${archetypeInfo.color}10`,
                border: `1px solid ${archetypeInfo.color}25`,
              }}
            >
              <Brain className="w-4 h-4 mt-0.5 shrink-0" style={{ color: archetypeInfo.color }} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Your goals are ordered for{" "}
                <span className="font-semibold" style={{ color: archetypeInfo.color }}>
                  {archetypeInfo.label}
                </span>
                {" "}— {archetypeInfo.shortDesc.toLowerCase()}. The actions most aligned with how you naturally operate appear first.
              </p>
            </div>
          )}
        </div>

        {/* Overall Progress */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                Overall Progress
              </p>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
                {completedCount} <span className="text-base font-normal" style={{ color: "var(--color-text-muted)" }}>of {totalCount} actions</span>
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                background: `conic-gradient(var(--color-primary) ${progressPct * 3.6}deg, oklch(25% 0.03 220) 0deg)`,
                color: "var(--color-text-base)",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "var(--color-bg-surface)" }}
              >
                {progressPct}%
              </div>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          {focusGoals.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-accent)" }} />
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span className="font-semibold" style={{ color: "var(--color-accent)" }}>
                  {focusCompleted} of {focusGoals.length} Focus actions done
                </span>
                {" "}— the vital few driving most of your result. Everything else here is worth doing, but these are worth doing first.
              </p>
            </div>
          )}
        </div>

        {/* FOCUS — the FAST method's top-20% layer */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-base)" }}>
                Focus — your top 20%
              </h3>
            </div>
            <button
              onClick={runSuggestFocus}
              disabled={suggestFocusMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 disabled:opacity-50"
              style={{ backgroundColor: "oklch(70% 0.14 75 / 0.14)", color: "var(--color-accent)" }}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", suggestFocusMutation.isPending && "animate-spin")} />
              {suggestFocusMutation.isPending ? "Thinking..." : "Suggest My Focus"}
            </button>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
            The 20% of actions that drive 80% of your results. Goals in your Bottleneck Audit's weakest
            area are flagged automatically — use the button above to have the AI Coach weigh in on the rest,
            using what it knows about your business.
          </p>

          {focusGoals.length === 0 && !showFocusSuggestions && (
            <p className="text-sm py-3" style={{ color: "var(--color-text-subtle)" }}>
              No Focus actions yet. Star a goal below, or ask the AI Coach to suggest some.
            </p>
          )}

          {focusGoals.length > 0 && (
            <div className="space-y-1.5 mb-1">
              {focusGoals.map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-sm py-1">
                  <span style={{ color: "var(--color-accent)" }}>★</span>
                  <span className={cn(g.completed && "line-through opacity-60")} style={{ color: "var(--color-text-base)" }}>
                    {g.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {showFocusSuggestions && (
            <div
              className="rounded-lg p-4 mt-3"
              style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  AI Coach's Focus picks
                </p>
                <button onClick={() => setShowFocusSuggestions(false)} aria-label="Dismiss">
                  <X className="w-3.5 h-3.5" style={{ color: "var(--color-text-subtle)" }} />
                </button>
              </div>
              {suggestFocusMutation.isPending && (
                <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>Reviewing your goals and business context...</p>
              )}
              {suggestFocusMutation.isError && (
                <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                  Couldn't get suggestions just now — try again in a moment.
                </p>
              )}
              {suggestFocusMutation.data?.length === 0 && (
                <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  Nothing to suggest right now — add a few goals first, or everything currently open already looks equally weighted.
                </p>
              )}
              {suggestFocusMutation.data?.map((s) => {
                const goal = goals.find((g) => g.dbId === s.id);
                if (!goal) return null;
                return (
                  <div key={s.id} className="flex items-start justify-between gap-3 py-2" style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: "var(--color-text-base)" }}>{goal.text}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{s.why}</p>
                    </div>
                    <button
                      onClick={() => applyFocusSuggestion(s.id)}
                      disabled={goal.isFocus}
                      className="shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold disabled:opacity-50"
                      style={{ backgroundColor: "var(--color-accent)", color: "#0F1923" }}
                    >
                      {goal.isFocus ? "Added" : "Add to Focus"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SYSTEM — reuses Weekly Rhythm rather than a separate tracker */}
        <div
          className="rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ backgroundColor: "oklch(55% 0.12 175 / 0.06)", border: "1px solid oklch(55% 0.12 175 / 0.18)" }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <RefreshCw className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
                System — stay on track
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              A goal list without a rhythm just sits here. Your Weekly Rhythm sets three priorities each
              Monday — pull straight from your Focus goals above — and reviews progress every Friday.
            </p>
          </div>
          <button
            onClick={() => navigate("/os/weekly")}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-180 hover:opacity-90"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          >
            Open Weekly Rhythm
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Month Tabs */}
        <div className="flex gap-2 mb-6">
          {([1, 2, 3] as const).map((week) => {
            const wGoals = goals.filter((g) => g.week === week);
            const wCompleted = wGoals.filter((g) => g.completed).length;
            return (
              <button
                key={week}
                onClick={() => setActiveWeek(week)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-3 text-xs font-semibold transition-all duration-180 text-center",
                  activeWeek === week ? "text-white" : ""
                )}
                style={{
                  backgroundColor: activeWeek === week ? "var(--color-primary)" : "var(--color-bg-surface)",
                  border: `1px solid ${activeWeek === week ? "var(--color-primary)" : "var(--color-border)"}`,
                  color: activeWeek === week ? "white" : "var(--color-text-muted)",
                }}
              >
                <div className="font-bold mb-0.5">Month {week}</div>
                <div className="opacity-80">{wCompleted}/{wGoals.length}</div>
              </button>
            );
          })}
        </div>

        {/* Active Week Goals */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-base)" }}>
                  {weekLabels[activeWeek]}
                </h3>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {weekCompleted} of {weekGoals.length} completed
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180"
              style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)", color: "var(--color-primary)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Goal
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div
              className="rounded-lg p-4 mb-4"
              style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)" }}
            >
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Describe your action or goal..."
                className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-base)",
                }}
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
              />
              <div className="flex gap-2 mb-3">
                <select
                  value={newGoalDimension}
                  onChange={(e) => setNewGoalDimension(e.target.value)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {dimensionOptions.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <select
                  value={newGoalWeek}
                  onChange={(e) => setNewGoalWeek(Number(e.target.value) as 1 | 2 | 3)}
                  className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <option value={1}>Month 1</option>
                  <option value={2}>Month 2</option>
                  <option value={3}>Month 3</option>
                </select>
              </div>

              <label className="flex items-center gap-2 mb-3 text-xs cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
                <input
                  type="checkbox"
                  checked={newGoalIsFocus}
                  onChange={(e) => setNewGoalIsFocus(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span style={{ color: "var(--color-accent)" }}>★</span> Mark as Focus (one of the vital 20%)
              </label>

              <label className="flex items-center gap-2 mb-2 text-xs cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
                <input
                  type="checkbox"
                  checked={newGoalHasMetric}
                  onChange={(e) => setNewGoalHasMetric(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                Track a measurable target (optional)
              </label>
              {newGoalHasMetric && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newGoalMetricLabel}
                    onChange={(e) => setNewGoalMetricLabel(e.target.value)}
                    placeholder="What to track, e.g. Reviews"
                    className="flex-[2] rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-base)" }}
                  />
                  <input
                    type="number"
                    value={newGoalMetricStart}
                    onChange={(e) => setNewGoalMetricStart(e.target.value)}
                    placeholder="Start"
                    className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-base)" }}
                  />
                  <input
                    type="number"
                    value={newGoalMetricTarget}
                    onChange={(e) => setNewGoalMetricTarget(e.target.value)}
                    placeholder="Target"
                    className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-base)" }}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={addGoal}
                  className="px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                >
                  Add Goal
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Goals List */}
          <div className="space-y-2">
            {weekGoals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  No goals for this month yet. Add your first action above.
                </p>
              </div>
            ) : (
              weekGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-3 p-3 rounded-lg transition-all duration-180"
                  style={{
                    backgroundColor: goal.completed
                      ? "oklch(55% 0.12 175 / 0.06)"
                      : goal.isFocus
                        ? "oklch(70% 0.14 75 / 0.06)"
                        : "transparent",
                    border: `1px solid ${
                      goal.completed
                        ? "oklch(55% 0.12 175 / 0.2)"
                        : goal.isFocus
                          ? "oklch(70% 0.14 75 / 0.3)"
                          : "var(--color-border-light)"
                    }`,
                  }}
                >
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className="shrink-0 mt-0.5 transition-all duration-180"
                  >
                    {goal.completed ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                    ) : (
                      <Circle className="w-5 h-5" style={{ color: "var(--color-border)" }} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn("text-sm", goal.completed && "line-through opacity-60")}
                      style={{ color: "var(--color-text-base)" }}
                    >
                      {goal.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className="inline-block text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${dimensionColors[goal.dimension]}18`,
                          color: dimensionColors[goal.dimension],
                        }}
                      >
                        {dimensionOptions.find((d) => d.value === goal.dimension)?.label}
                      </span>
                      {goal.isFocus && (
                        <span
                          className="inline-block text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ backgroundColor: "oklch(70% 0.14 75 / 0.16)", color: "var(--color-accent)" }}
                        >
                          ★ Focus
                        </span>
                      )}
                    </div>
                    {goal.metric && (
                      <div className="mt-2 max-w-xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: "var(--color-text-muted)" }}>
                            {goal.metric.label}: {goal.metric.current}
                            {goal.metric.unit ? ` ${goal.metric.unit}` : ""} / {goal.metric.target}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => bumpMetric(goal.id, -1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs"
                              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
                            >
                              −
                            </button>
                            <button
                              onClick={() => bumpMetric(goal.id, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs"
                              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="progress-bar" style={{ height: "4px" }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.max(0, Math.min(100, goal.metric.target === goal.metric.start ? 100 : ((goal.metric.current - goal.metric.start) / (goal.metric.target - goal.metric.start)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleFocus(goal.id)}
                    aria-label={goal.isFocus ? "Remove from Focus" : "Mark as Focus"}
                    className="shrink-0 mt-0.5 p-1 rounded transition-all duration-180"
                    style={{ color: goal.isFocus ? "var(--color-accent)" : "var(--color-text-subtle)" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" fill={goal.isFocus ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-180 p-1 rounded"
                    style={{ color: "var(--color-text-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Money Identity quiet card — only shown if archetype not yet completed */}
        {!session.hasMoneyIdentity && (
          <div
            className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 mb-4"
            style={{
              backgroundColor: "oklch(55% 0.12 175 / 0.06)",
              border: "1px solid oklch(55% 0.12 175 / 0.18)",
            }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Brain className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
                  One more question worth asking
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                The goals you have just set are only as strong as the relationship with money behind them.
                What would change if you understood exactly how your money identity is shaping your decisions?
              </p>
            </div>
            <button
              onClick={() => navigate("/os/money-identity?source=goals")}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-180 hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              Map My Money Identity
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/os")}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-180"
            style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
