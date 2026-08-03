/**
 * useOSSession
 *
 * Centralised hook for reading and writing the Keystone Growth OS session state.
 * All modules (Dashboard, GoalDashboard, FreedomBlueprint, etc.) use this hook
 * to access archetype, bottleneck, and unlock data so the OS can personalise
 * the experience without requiring the user to repeat completed steps.
 *
 * Storage keys:
 *   keystoneSessionId    — stable anonymous session ID
 *   moneyIdentityResult  — { archetype, title, score, ... } from MoneyIdentityCheckpoint
 *   auditResult          — { scores, primaryBottleneck, moneyFrictionDetected } from BottleneckAudit
 *   blueprintResult      — { scores, primaryTheme, ... } from FreedomBlueprint
 *   wealthResetComplete  — "true" string set by WealthResetJourney on completion
 *
 * Two-tier unlock model:
 *   Tier 1 (always available): Snapshot, Audit, Blueprint, Goals, Delegation, Flywheel
 *   Tier 2A (cash-sensitive): Pricing Toolkit — unlocked when cash bottleneck detected OR Wealth Reset complete
 *   Tier 2B (Wealth Reset gate): Weekly Rhythm, 12-Month Roadmap — unlocked only after Wealth Reset complete
 */

import { useState, useEffect } from "react";

export type MoneyArchetype = "hustler" | "giver" | "protector" | "enjoyer";

export interface OSSessionState {
  /** Stable anonymous session ID */
  sessionId: string;

  /** Money Identity Checkpoint result (null if not yet completed) */
  moneyIdentity: {
    archetype: MoneyArchetype;
    title: string;
    score: number;
    description?: string;
  } | null;

  /** Whether the Money Identity Checkpoint has been completed */
  hasMoneyIdentity: boolean;

  /** Bottleneck Audit result (null if not yet completed) */
  auditResult: {
    scores: Record<string, number>;
    primaryBottleneck: string;
    moneyFrictionDetected: boolean;
    completedAt?: number;
  } | null;

  /** Whether the Bottleneck Audit has been completed */
  hasAuditResult: boolean;

  /** Days since the last bottleneck audit was completed (null if never done) */
  daysSinceAudit: number | null;

  /** Whether a monthly re-audit is due (>= 30 days since last audit) */
  reAuditDue: boolean;

  /** Freedom Blueprint result (null if not yet completed) */
  blueprintResult: {
    scores: Record<string, number>;
    primaryTheme: string;
    moneyFrictionDetected: boolean;
  } | null;

  /** Whether the Freedom Blueprint has been completed */
  hasBlueprintResult: boolean;

  // ── Unlock flags ────────────────────────────────────────────────────────────

  /** Whether the 21-Day Wealth Reset Journey has been completed */
  isWealthResetComplete: boolean;

  /**
   * Whether the audit detected a Cash bottleneck as the primary constraint.
   * Used to unlock Pricing Toolkit early (before Wealth Reset).
   */
  hasCashBottleneck: boolean;

  /**
   * Pricing Toolkit unlock:
   * Unlocked when cash is the primary bottleneck OR Wealth Reset is complete.
   */
  isPricingUnlocked: boolean;

  /**
   * Weekly Rhythm unlock:
   * Unlocked only after Wealth Reset is complete.
   */
  isWeeklyRhythmUnlocked: boolean;

  /**
   * 12-Month Roadmap unlock:
   * Unlocked only after Wealth Reset is complete.
   */
  isRoadmapUnlocked: boolean;
}

export function getSessionId(): string {
  let id = sessionStorage.getItem("keystoneSessionId");
  if (!id) {
    id = `anon-${Date.now()}`;
    sessionStorage.setItem("keystoneSessionId", id);
  }
  return id;
}

function readSessionState(): OSSessionState {
  const sessionId = getSessionId();

  // Money Identity
  let moneyIdentity: OSSessionState["moneyIdentity"] = null;
  try {
    const raw = sessionStorage.getItem("moneyIdentityResult");
    if (raw) moneyIdentity = JSON.parse(raw);
  } catch { /* ignore */ }

  // Audit Result
  let auditResult: OSSessionState["auditResult"] = null;
  try {
    const raw = sessionStorage.getItem("auditResult");
    if (raw) auditResult = JSON.parse(raw);
  } catch { /* ignore */ }

  // Blueprint Result
  let blueprintResult: OSSessionState["blueprintResult"] = null;
  try {
    const raw = sessionStorage.getItem("blueprintResult");
    if (raw) blueprintResult = JSON.parse(raw);
  } catch { /* ignore */ }

  const daysSinceAudit = auditResult?.completedAt
    ? Math.floor((Date.now() - auditResult.completedAt) / (1000 * 60 * 60 * 24))
    : null;

  const isWealthResetComplete =
    sessionStorage.getItem("wealthResetComplete") === "true";

  const hasCashBottleneck =
    auditResult?.primaryBottleneck?.toLowerCase() === "cash";

  const isPricingUnlocked = hasCashBottleneck || isWealthResetComplete;
  const isWeeklyRhythmUnlocked = isWealthResetComplete;
  const isRoadmapUnlocked = isWealthResetComplete;

  return {
    sessionId,
    moneyIdentity,
    hasMoneyIdentity: moneyIdentity !== null,
    auditResult,
    hasAuditResult: auditResult !== null,
    daysSinceAudit,
    reAuditDue: daysSinceAudit !== null && daysSinceAudit >= 30,
    blueprintResult,
    hasBlueprintResult: blueprintResult !== null,
    isWealthResetComplete,
    hasCashBottleneck,
    isPricingUnlocked,
    isWeeklyRhythmUnlocked,
    isRoadmapUnlocked,
  };
}

/**
 * Dispatch this event anywhere you call sessionStorage.setItem() for OS keys
 * so that useOSSession consumers re-read and re-render immediately.
 */
export function notifyOSSessionChange() {
  window.dispatchEvent(new Event("os-session-change"));
}

export function useOSSession(): OSSessionState {
  const [state, setState] = useState<OSSessionState>(readSessionState);

  useEffect(() => {
    function handleChange() {
      setState(readSessionState());
    }
    window.addEventListener("os-session-change", handleChange);
    // Also listen for storage events from other tabs (localStorage)
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("os-session-change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return state;
}

/** Archetype display metadata */
export const archetypeDisplay: Record<MoneyArchetype, { label: string; color: string; shortDesc: string }> = {
  hustler: {
    label: "The Hustler",
    color: "#f59e0b",
    shortDesc: "Revenue-driven, high-energy, growth-focused",
  },
  giver: {
    label: "The Giver",
    color: "#10b981",
    shortDesc: "Relationship-first, generous, community-builder",
  },
  protector: {
    label: "The Protector",
    color: "#3b82f6",
    shortDesc: "Risk-aware, stability-focused, long-term thinker",
  },
  enjoyer: {
    label: "The Enjoyer",
    color: "#8b5cf6",
    shortDesc: "Experience-driven, present-focused, lifestyle-oriented",
  },
};

/** Goals to surface first by archetype (dimension priority order) */
export const archetypeGoalPriority: Record<MoneyArchetype, string[]> = {
  hustler: ["sales", "owner", "systems", "staff", "cash"],
  giver: ["staff", "systems", "owner", "sales", "cash"],
  protector: ["cash", "systems", "owner", "staff", "sales"],
  enjoyer: ["owner", "cash", "systems", "sales", "staff"],
};
