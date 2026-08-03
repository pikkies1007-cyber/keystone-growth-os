/**
 * useCoachSession
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks the user's coaching cadence using sessionStorage + localStorage:
 *   - firstLoginToday: true only on the first page load of each calendar day
 *   - daysSinceStart: days elapsed since the user first used the OS
 *   - weekCycle: which 7-day cycle the user is on (1 = days 1-7, 2 = days 8-14…)
 *   - monthCycle: which 30-day cycle the user is on (1 = days 1-30, 2 = days 31-60…)
 *   - isWeekMilestone: true on days 7, 14, 21, 28 (first login of that day)
 *   - isMonthMilestone: true on days 30, 60, 90 (first login of that day)
 *   - dismissDailyCheckin: call to hide the daily banner for the rest of the day
 *   - dismissedToday: true if the user already dismissed the banner today
 */

import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  startDate: "kgos_start_date",          // ISO date string of first ever login
  lastLoginDate: "kgos_last_login_date",  // ISO date string of last login
  dismissedDate: "kgos_dismissed_date",   // ISO date string when banner was dismissed
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

export interface CoachSession {
  firstLoginToday: boolean;
  daysSinceStart: number;
  weekCycle: number;
  monthCycle: number;
  isWeekMilestone: boolean;
  isMonthMilestone: boolean;
  dismissedToday: boolean;
  dismissDailyCheckin: () => void;
}

export function useCoachSession(): CoachSession {
  const today = todayISO();

  // ── Initialise start date on very first use ──────────────────────────────
  if (!localStorage.getItem(STORAGE_KEYS.startDate)) {
    localStorage.setItem(STORAGE_KEYS.startDate, today);
  }

  const startDate = localStorage.getItem(STORAGE_KEYS.startDate) ?? today;
  const lastLoginDate = localStorage.getItem(STORAGE_KEYS.lastLoginDate) ?? "";
  const dismissedDate = localStorage.getItem(STORAGE_KEYS.dismissedDate) ?? "";

  // ── Compute derived values ───────────────────────────────────────────────
  const firstLoginToday = lastLoginDate !== today;
  const daysSinceStart = daysBetween(startDate, today);
  const weekCycle = Math.floor(daysSinceStart / 7) + 1;
  const monthCycle = Math.floor(daysSinceStart / 30) + 1;

  // Milestone: exactly on a 7-day boundary AND first login of that day
  const isWeekMilestone = firstLoginToday && daysSinceStart > 0 && daysSinceStart % 7 === 0;
  // Milestone: exactly on a 30-day boundary AND first login of that day
  const isMonthMilestone = firstLoginToday && daysSinceStart > 0 && daysSinceStart % 30 === 0;

  const dismissedToday = dismissedDate === today;

  const [dismissed, setDismissed] = useState(dismissedToday);

  // ── Record today's login ─────────────────────────────────────────────────
  useEffect(() => {
    if (firstLoginToday) {
      localStorage.setItem(STORAGE_KEYS.lastLoginDate, today);
    }
  }, [firstLoginToday, today]);

  function dismissDailyCheckin() {
    localStorage.setItem(STORAGE_KEYS.dismissedDate, today);
    setDismissed(true);
  }

  return {
    firstLoginToday,
    daysSinceStart,
    weekCycle,
    monthCycle,
    isWeekMilestone,
    isMonthMilestone,
    dismissedToday: dismissed,
    dismissDailyCheckin,
  };
}
