import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  DollarSign,
  Clock,
  Target,
  Lock,
} from "lucide-react";
import { useOSSession } from "../hooks/useOSSession";

// ─── Types ────────────────────────────────────────────────────────────────────

type PricingResult = {
  monthlyRevenue: number;
  monthlyCosts: number;
  avgSaleValue: number;
  hoursPerMonth: number;
  desiredTakeHome: number;
  profitMargin: number;
  breakEvenSales: number;
  effectiveHourlyRate: number;
  requiredHourlyRate: number;
  verdict: "undercharging" | "breakeven" | "healthy";
  completedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatZAR(value: number): string {
  return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function calcResults(
  monthlyRevenue: number,
  monthlyCosts: number,
  avgSaleValue: number,
  hoursPerMonth: number,
  desiredTakeHome: number
): Omit<PricingResult, "completedAt"> {
  const profit = monthlyRevenue - monthlyCosts;
  const profitMargin = monthlyRevenue > 0 ? (profit / monthlyRevenue) * 100 : 0;
  const breakEvenSales = avgSaleValue > 0 ? Math.ceil(monthlyCosts / avgSaleValue) : 0;
  const effectiveHourlyRate = hoursPerMonth > 0 ? monthlyRevenue / hoursPerMonth : 0;
  const requiredHourlyRate = hoursPerMonth > 0 ? (monthlyCosts + desiredTakeHome) / hoursPerMonth : 0;

  let verdict: PricingResult["verdict"] = "healthy";
  if (profitMargin < 5) verdict = "undercharging";
  else if (profitMargin < 20) verdict = "breakeven";

  return {
    monthlyRevenue,
    monthlyCosts,
    avgSaleValue,
    hoursPerMonth,
    desiredTakeHome,
    profitMargin,
    breakEvenSales,
    effectiveHourlyRate,
    requiredHourlyRate,
    verdict,
  };
}

// ─── Recommendations ──────────────────────────────────────────────────────────

const RECOMMENDATIONS: Record<PricingResult["verdict"], { title: string; steps: string[] }> = {
  undercharging: {
    title: "Your pricing is not covering your costs",
    steps: [
      "Calculate your true cost per hour or per job — include your own time at a realistic rate.",
      "Identify your three lowest-margin products or services and raise their price by 10–15% this week.",
      "Stop competing on price. Position on value, reliability, and outcome instead.",
    ],
  },
  breakeven: {
    title: "You are covering costs but leaving money on the table",
    steps: [
      "Review your top 3 revenue sources — which one has the most room to increase price without losing customers?",
      "Add a premium tier or package to your offering so customers who want more can pay more.",
      "Track your effective hourly rate weekly. If it drops below your target, something needs to change.",
    ],
  },
  healthy: {
    title: "Your pricing is working — now protect and grow it",
    steps: [
      "Document your pricing model so it is consistent across every quote and invoice.",
      "Review your costs quarterly — margin erosion often happens slowly and silently.",
      "Use your healthy margin to invest in one thing that reduces your time drain.",
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingToolkit() {
  const [, navigate] = useLocation();
  const session = useOSSession();
  const [step, setStep] = useState(0);

  // ── Lock gate ──────────────────────────────────────────────────────────────
  if (!session.isPricingUnlocked) {
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
            Pricing Toolkit — Locked
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)", lineHeight: "1.7" }}>
            This tool unlocks in one of two ways: complete the{" "}
            <strong>21-Day Wealth Reset Journey</strong>, or have{" "}
            <strong>Cash Flow</strong> identified as your primary bottleneck in the Audit.
          </p>
          <p className="text-xs mb-8" style={{ color: "var(--color-text-subtle)", lineHeight: "1.6" }}>
            The Wealth Reset builds the financial identity foundation that makes pricing decisions
            stick. Without it, most business owners undercharge again within weeks of adjusting their
            prices.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/os/audit")}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-180"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              Run Bottleneck Audit
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
  const [result, setResult] = useState<PricingResult | null>(() => {
    const raw = sessionStorage.getItem("pricingResult");
    return raw ? JSON.parse(raw) : null;
  });

  // Input state — stored as strings for input fields
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [monthlyCosts, setMonthlyCosts] = useState("");
  const [avgSaleValue, setAvgSaleValue] = useState("");
  const [hoursPerMonth, setHoursPerMonth] = useState("");
  const [desiredTakeHome, setDesiredTakeHome] = useState("");

  const totalSteps = 5;
  const progress = Math.round((step / totalSteps) * 100);

  function parseNum(val: string): number {
    const n = parseFloat(val.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  function handleComplete() {
    const r = calcResults(
      parseNum(monthlyRevenue),
      parseNum(monthlyCosts),
      parseNum(avgSaleValue),
      parseNum(hoursPerMonth),
      parseNum(desiredTakeHome)
    );
    const full: PricingResult = { ...r, completedAt: new Date().toISOString() };
    sessionStorage.setItem("pricingResult", JSON.stringify(full));
    setResult(full);
    setStep(totalSteps + 1);
  }

  function handleRetake() {
    setResult(null);
    setStep(0);
    setMonthlyRevenue("");
    setMonthlyCosts("");
    setAvgSaleValue("");
    setHoursPerMonth("");
    setDesiredTakeHome("");
  }

  const verdictColour = {
    undercharging: "text-red-400",
    breakeven: "text-amber-400",
    healthy: "text-teal-400",
  };

  const verdictBg = {
    undercharging: "bg-red-500/10 border-red-500/30",
    breakeven: "bg-amber-500/10 border-amber-500/30",
    healthy: "bg-teal-500/10 border-teal-500/30",
  };

  const verdictIcon = {
    undercharging: <TrendingDown className="w-5 h-5 text-red-400" />,
    breakeven: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    healthy: <TrendingUp className="w-5 h-5 text-teal-400" />,
  };

  // ── Results screen ─────────────────────────────────────────────────────────
  if (result && step === totalSteps + 1) {
    const rec = RECOMMENDATIONS[result.verdict];
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Pricing Confidence Report</h1>
              <p className="text-sm text-slate-400">Based on your numbers</p>
            </div>
          </div>

          {/* Verdict banner */}
          <div className={`rounded-xl border p-5 ${verdictBg[result.verdict]}`}>
            <div className="flex items-center gap-3 mb-2">
              {verdictIcon[result.verdict]}
              <span className={`font-semibold ${verdictColour[result.verdict]}`}>{rec.title}</span>
            </div>
            <p className="text-sm text-slate-400">
              {result.verdict === "undercharging" &&
                "What would it mean for your business if every job you quoted was actually profitable?"}
              {result.verdict === "breakeven" &&
                "How much of your time are you trading for a margin that barely moves the needle?"}
              {result.verdict === "healthy" &&
                "What would it look like if this margin was protected and growing — not just maintained?"}
            </p>
          </div>

          {/* Numbers */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Profit Margin",
                value: `${result.profitMargin.toFixed(1)}%`,
                sub: "of revenue is profit",
                highlight: result.profitMargin >= 20,
              },
              {
                label: "Break-Even Sales",
                value: `${result.breakEvenSales} sales/month`,
                sub: "to cover your costs",
                highlight: false,
              },
              {
                label: "Effective Hourly Rate",
                value: formatZAR(result.effectiveHourlyRate),
                sub: "what you earn per hour now",
                highlight: result.effectiveHourlyRate >= result.requiredHourlyRate,
              },
              {
                label: "Required Hourly Rate",
                value: formatZAR(result.requiredHourlyRate),
                sub: "to hit your take-home goal",
                highlight: false,
              },
            ].map(({ label, value, sub, highlight }) => (
              <Card key={label} className="bg-slate-800/60 border-slate-700">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-lg font-bold ${highlight ? "text-teal-400" : "text-white"}`}>
                    {value}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recommendations */}
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">Your three next steps</h3>
              {rec.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate("/os/goals")}
              className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold"
            >
              Add Pricing Goal to Dashboard
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
            onClick={handleRetake}
            className="text-xs text-slate-500 hover:text-slate-400 underline underline-offset-2 transition-colors"
          >
            Recalculate with different numbers
          </button>
        </div>
      );
  }

  // ── Intro screen ───────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <button
            onClick={() => navigate("/os")}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Pricing Confidence Toolkit</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Most South African small business owners are either undercharging or not sure whether
              they are. This 5-question diagnostic tells you exactly where you stand — your profit
              margin, your break-even point, and your effective hourly rate — and gives you three
              specific steps to improve it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: DollarSign, label: "Profit margin check" },
              { icon: Target, label: "Break-even calculator" },
              { icon: Clock, label: "Hourly rate reality" },
              { icon: TrendingUp, label: "3 actionable steps" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                <Icon className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-sm text-slate-300">{label}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-slate-500">
              Your numbers stay on your device only — nothing is shared or stored externally.
              Use round estimates if you do not have exact figures.
            </p>
          </div>

          <Button
            onClick={() => setStep(1)}
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold py-3"
          >
            Check My Pricing
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      );
  }

  // ── Input steps ────────────────────────────────────────────────────────────
  const questions = [
    {
      label: "What is your average monthly revenue?",
      hint: "Total money coming into the business before any expenses. Use last month as a guide.",
      placeholder: "e.g. 45000",
      prefix: "R",
      value: monthlyRevenue,
      setter: setMonthlyRevenue,
    },
    {
      label: "What are your total monthly business costs?",
      hint: "Include rent, stock, salaries, fuel, data, subscriptions — everything you pay out.",
      placeholder: "e.g. 32000",
      prefix: "R",
      value: monthlyCosts,
      setter: setMonthlyCosts,
    },
    {
      label: "What is the average value of a single sale or job?",
      hint: "If you sell products, use your average basket value. If you do jobs, use your average invoice.",
      placeholder: "e.g. 1500",
      prefix: "R",
      value: avgSaleValue,
      setter: setAvgSaleValue,
    },
    {
      label: "How many hours do you work in the business per month?",
      hint: "Include everything — admin, delivery, client work, marketing. Be honest.",
      placeholder: "e.g. 160",
      prefix: "hrs",
      value: hoursPerMonth,
      setter: setHoursPerMonth,
    },
    {
      label: "What do you want to take home each month?",
      hint: "Your personal salary goal — what would feel like you are actually paying yourself properly.",
      placeholder: "e.g. 25000",
      prefix: "R",
      value: desiredTakeHome,
      setter: setDesiredTakeHome,
    },
  ];

  const q = questions[step - 1];
  const canProceed = q && parseNum(q.value) > 0;

  function handleNext() {
    if (step < totalSteps) setStep(step + 1);
    else handleComplete();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Question {step} of {totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-slate-700" />
        </div>

        {/* Question */}
        {q && (
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">{q.label}</h2>
              <p className="text-sm text-slate-400">{q.hint}</p>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                {q.prefix === "R" ? "R" : ""}
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={q.value}
                onChange={(e) => q.setter(e.target.value)}
                placeholder={q.placeholder}
                className={`w-full bg-slate-800 border border-slate-600 rounded-lg py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors ${
                  q.prefix === "R" ? "pl-8 pr-4" : "px-4"
                }`}
                autoFocus
              />
              {q.prefix !== "R" && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {q.prefix}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold disabled:opacity-40"
          >
            {step === totalSteps ? "Calculate My Numbers" : "Next"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
}
