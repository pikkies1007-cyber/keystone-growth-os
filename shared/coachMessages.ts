/**
 * coachMessages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Context-aware coaching message templates.
 * Language style: Voss calibrated questions + mirroring (no "it sounds like",
 * no labelling phrases). The message reflects the user's own situation back
 * at them and ends with a question that makes them arrive at their own answer.
 *
 * Selection logic:
 *   1. If isMonthMilestone → use 30-day celebration message
 *   2. If isWeekMilestone → use 7-day check-in message
 *   3. If firstLoginToday → use daily message (selected by bottleneck + archetype + day)
 */

export type Bottleneck = "cash" | "sales" | "staff" | "systems" | "owner" | null;
export type Archetype = "Hustler" | "Giver" | "Protector" | "Enjoyer" | null;

export interface CoachMessage {
  greeting: string;       // Short opener, e.g. "Day 7 — well done for showing up."
  body: string;           // The main calibrated question or reflection
  cta: string;            // Button label
  ctaRoute: string;       // Where the button goes
  type: "daily" | "weekly" | "monthly";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dayGreeting(day: number): string {
  if (day === 0 || day === 1) return "Welcome to Day 1.";
  if (day === 2) return "Day 2 — you came back.";
  if (day <= 6) return `Day ${day} — still here.`;
  if (day <= 13) return `Day ${day} — building momentum.`;
  if (day <= 29) return `Day ${day} — this is becoming a habit.`;
  return `Day ${day} — you are in the work.`;
}

// ── Daily messages by bottleneck ─────────────────────────────────────────────

const dailyByBottleneck: Record<NonNullable<Bottleneck>, string[]> = {
  cash: [
    "How many of your past customers have heard from you in the last 30 days?",
    "What would change in your business if cash was no longer the thing keeping you up at night?",
    "Which one customer, if they came back today, would make the biggest difference to your cash position?",
    "What is the one action you could take before the end of today that would move cash in your direction?",
    "How much of your current cash pressure is about the business — and how much is about the pattern behind it?",
    "What would it look like if your next 30 days were focused entirely on reactivating people who already trust you?",
    "Which invoice or follow-up have you been putting off that, if you sent it today, would change this week?",
  ],
  sales: [
    "What is the one conversation you have been avoiding that could change your sales this week?",
    "How many people in your network right now know exactly what you do and who you help?",
    "What would your pipeline look like if you followed up with every lead from the last 90 days?",
    "Which part of your sales process do you trust the least — and what would it take to fix just that one part?",
    "What would change if every person who said 'not now' heard from you again today?",
    "How clear is your offer to someone who has never heard of you before?",
    "What is the one thing your best customers say about you that you are not saying about yourself?",
  ],
  staff: [
    "What would your business look like if you were no longer the bottleneck in your own operation?",
    "Which task on your plate today could someone else own with the right brief?",
    "How much of your team's confusion comes from unclear expectations — and how much from unclear processes?",
    "What is the one thing your team does not know that, if they did, would free up two hours of your day?",
    "How would your business change if your team could make decisions without coming to you first?",
    "Which role in your business is currently being filled by you — but should not be?",
    "What would it look like if your team ran the 80% without you, and you only touched the first and last 10%?",
  ],
  systems: [
    "Which part of your business would break first if you were not there for a week?",
    "What is the one process you do the same way every time — but have never written down?",
    "How much time do you spend fixing things that a checklist would have prevented?",
    "What would change if every repeated task in your business had a clear owner and a clear process?",
    "Which system, if you built it once, would save you the most time over the next 12 months?",
    "How much of your team's mistakes come from unclear systems — and how much from unclear expectations?",
    "What would your business look like if the way you do things did not depend on who was in the room?",
  ],
  owner: [
    "What would your business look like if you were working in your zone of genius every day?",
    "How much of your week is spent on things only you can do — versus things you are just used to doing?",
    "What is the one decision you keep making that your business should be making without you?",
    "How would your energy change if you handed over the one task that drains you the most?",
    "What would it look like if your business needed you less — and you chose to show up more?",
    "Which part of your role are you holding onto out of habit rather than necessity?",
    "What would change in your business if you protected your best four hours every day for your highest-value work?",
  ],
};

const dailyGeneric: string[] = [
  "What is the one thing, if you did it today, that would move your business forward the most?",
  "How clear is the gap between where your business is now and where you want it to be in 90 days?",
  "What would change if you spent the next hour working on your business instead of in it?",
  "Which conversation have you been putting off that, if you had it today, would unlock something?",
  "What does your business need from you today that it is not getting?",
];

// ── 7-day check-in messages ───────────────────────────────────────────────────

const weeklyMessages: Record<NonNullable<Bottleneck> | "generic", string> = {
  cash: "Seven days in. What has actually shifted in your cash position since you identified this as your primary constraint? Not what you planned — what actually happened?",
  sales: "A week has passed since you identified sales as your primary constraint. What is one conversation you had this week that moved things forward — even slightly?",
  staff: "Seven days since you identified delegation as your primary constraint. What is the one task you handed over this week — and how did it go?",
  systems: "One week in. Which process did you document or improve this week? What is still running on memory that should be running on a system?",
  owner: "Seven days since you identified owner behaviour as your primary constraint. How many hours this week did you spend in your zone of genius — versus in the 80% that someone else could own?",
  generic: "A week has passed since you started this journey. What is the one thing that has shifted — even slightly — in how you see your business?",
};

// ── 30-day celebration messages ───────────────────────────────────────────────

const monthlyMessages: Record<NonNullable<Bottleneck> | "generic", string> = {
  cash: "Thirty days. You identified cash as your critical constraint and you kept showing up. How many customers did you reactivate? How many reviews did you collect? What has actually changed in your cash position — and what do you want the next 30 days to look like?",
  sales: "One month in. You identified sales as your primary constraint and you kept working on it. What is the one win from this month that you want to build on? What would the next 30 days look like if you doubled down on what worked?",
  staff: "Thirty days since you committed to changing how you delegate. What has your team taken off your plate? What are you still holding onto — and why? What would the next 30 days look like if you let go of one more thing?",
  systems: "One month in. How many processes did you document or improve? Where is your business running more smoothly — and where is it still running on memory? What is the one system you want to build in the next 30 days?",
  owner: "Thirty days. You identified that you were the bottleneck — and you kept showing up anyway. How much of your week is now in your zone of genius? What has changed in how your business runs without you? What do you want the next 30 days to look like?",
  generic: "One month in. You showed up. You did the work. What is the one win from this month that you are most proud of? What does the next 30 days look like if you build on that?",
};

// ── Archetype-specific suffix ─────────────────────────────────────────────────

const archetypeSuffix: Record<NonNullable<Archetype>, string> = {
  Hustler: "You move fast — make sure the speed is pointed at the right target.",
  Giver: "Your instinct is to give before you receive. Make sure your business is receiving too.",
  Protector: "Your instinct to guard what you have built is an asset. Make sure it is not also keeping you from growing.",
  Enjoyer: "You know how to live well. Make sure your business is funding that life — not competing with it.",
};

// ── Main selector function ────────────────────────────────────────────────────

export function getCoachMessage(params: {
  daysSinceStart: number;
  firstLoginToday: boolean;
  isWeekMilestone: boolean;
  isMonthMilestone: boolean;
  bottleneck: Bottleneck;
  archetype: Archetype;
  goalsCompleted: number;
  goalsTotal: number;
}): CoachMessage | null {
  const {
    daysSinceStart,
    firstLoginToday,
    isWeekMilestone,
    isMonthMilestone,
    bottleneck,
    archetype,
    goalsCompleted,
    goalsTotal,
  } = params;

  // Only show a message on first login of the day
  if (!firstLoginToday) return null;

  // ── 30-day celebration ────────────────────────────────────────────────────
  if (isMonthMilestone) {
    const cycle = Math.floor(daysSinceStart / 30);
    const key = bottleneck ?? "generic";
    const body = monthlyMessages[key as keyof typeof monthlyMessages] ?? monthlyMessages.generic;
    const suffix = archetype ? `\n\n${archetypeSuffix[archetype]}` : "";
    return {
      greeting: `Day ${daysSinceStart} — ${cycle === 1 ? "one month" : `${cycle * 30} days`} in. This is worth pausing for.`,
      body: body + suffix,
      cta: "Review My Goals",
      ctaRoute: "/goals",
      type: "monthly",
    };
  }

  // ── 7-day check-in ────────────────────────────────────────────────────────
  if (isWeekMilestone) {
    const key = bottleneck ?? "generic";
    const body = weeklyMessages[key as keyof typeof weeklyMessages] ?? weeklyMessages.generic;
    const progressNote =
      goalsTotal > 0
        ? `\n\nYou have completed ${goalsCompleted} of ${goalsTotal} goals so far.`
        : "";
    return {
      greeting: `Day ${daysSinceStart} — time for a real check-in.`,
      body: body + progressNote,
      cta: "Check My Progress",
      ctaRoute: "/goals",
      type: "weekly",
    };
  }

  // ── Daily message ─────────────────────────────────────────────────────────
  const pool = bottleneck ? dailyByBottleneck[bottleneck] : dailyGeneric;
  // Select message deterministically by day number so it rotates without being random
  const message = pool[daysSinceStart % pool.length];
  const suffix = archetype ? ` ${archetypeSuffix[archetype]}` : "";

  return {
    greeting: dayGreeting(daysSinceStart),
    body: message + (daysSinceStart > 0 ? suffix : ""),
    cta: "View My Goals",
    ctaRoute: "/goals",
    type: "daily",
  };
}
