import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VoiceOrTextInput } from "@/components/VoiceOrTextInput";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Users,
  TrendingUp,
  Clock,
  Lightbulb,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SnapshotResult {
  businessName: string;
  revenueRange: string;
  staffCount: string;
  primaryRevenue: string;
  biggestTimeDrain: string;
  oneChange: string;
  completedAt: string;
}

// ─── Question definitions ─────────────────────────────────────────────────────

const REVENUE_RANGES = [
  "Less than R10,000/month",
  "R10,000 – R30,000/month",
  "R30,000 – R80,000/month",
  "R80,000 – R200,000/month",
  "More than R200,000/month",
  "I'm not sure",
];

const STAFF_OPTIONS = [
  "Just me (solopreneur)",
  "1–2 people (including me)",
  "3–5 people",
  "6–10 people",
  "More than 10 people",
];

const REVENUE_STREAMS = [
  "Products / retail sales",
  "Services / consulting / coaching",
  "Trade work (plumbing, electrical, painting, building)",
  "Food & hospitality",
  "Digital / online / social media",
  "Mixed (products + services)",
  "Other",
];

const TIME_DRAINS = [
  "Admin and paperwork",
  "Chasing payments and invoices",
  "Managing staff or contractors",
  "Finding new customers / marketing",
  "Doing work I should be delegating",
  "Dealing with customer complaints",
  "Everything — I wear all the hats",
];

// ─── Diagnosis + toolkit routing ────────────────────────────────────────────
// Maps each time-drain answer to the same 5 dimensions the Bottleneck Audit
// uses (Sales/Cash/Staff/Systems/Owner), a short specific diagnosis, and the
// toolkit that's the most direct next step for it.
const DRAIN_DIAGNOSIS: Record<
  string,
  { dimension: string; diagnosis: string; toolkitLabel: string; toolkitRoute: string }
> = {
  "Admin and paperwork": {
    dimension: "Systems",
    diagnosis:
      "Admin eats hours that should go into the business, not the business's paperwork. This is almost always a delegation problem, not a time-management one — someone else can do this at 80% of your quality for a fraction of your hourly value.",
    toolkitLabel: "Delegation Toolkit",
    toolkitRoute: "/os/delegation",
  },
  "Chasing payments and invoices": {
    dimension: "Cash",
    diagnosis:
      "Chasing money you've already earned is a cash flow leak, not a sales problem. Before anything else, this needs a repeatable collections process — and a stronger pipeline of paying customers reduces how much you're relying on any one late payer.",
    toolkitLabel: "Flywheel Toolkit",
    toolkitRoute: "/os/flywheel",
  },
  "Managing staff or contractors": {
    dimension: "Staff",
    diagnosis:
      "If managing people is the drain, the fix is rarely 'manage harder' — it's clearer roles and a framework so decisions don't all have to run through you.",
    toolkitLabel: "Delegation Toolkit",
    toolkitRoute: "/os/delegation",
  },
  "Finding new customers / marketing": {
    dimension: "Sales",
    diagnosis:
      "Chasing brand-new customers is the most expensive way to grow. The fastest lever is usually the one already sitting in your database — people who've bought before and would again with the right nudge.",
    toolkitLabel: "Flywheel Toolkit",
    toolkitRoute: "/os/flywheel",
  },
  "Doing work I should be delegating": {
    dimension: "Owner Behaviour",
    diagnosis:
      "You've already diagnosed this one yourself — you said it. The real question isn't whether to delegate, it's what to hand off first without it costing you quality.",
    toolkitLabel: "Delegation Toolkit",
    toolkitRoute: "/os/delegation",
  },
  "Dealing with customer complaints": {
    dimension: "Systems",
    diagnosis:
      "Complaints eating your time usually means there's no first line of defense before they reach you. A clear process — and someone besides you empowered to run it — stops most of these before they escalate.",
    toolkitLabel: "Delegation Toolkit",
    toolkitRoute: "/os/delegation",
  },
  "Everything — I wear all the hats": {
    dimension: "Owner Behaviour",
    diagnosis:
      "Wearing every hat is the single most common ceiling on growth — the business can only grow as fast as you personally can work. The starting point isn't doing more, it's identifying the one task this month that's safest to hand off first.",
    toolkitLabel: "Delegation Toolkit",
    toolkitRoute: "/os/delegation",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusinessSnapshot() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SnapshotResult | null>(() => {
    const raw = sessionStorage.getItem("businessSnapshot");
    return raw ? JSON.parse(raw) : null;
  });

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [staffCount, setStaffCount] = useState("");
  const [primaryRevenue, setPrimaryRevenue] = useState("");
  const [biggestTimeDrain, setBiggestTimeDrain] = useState("");
  const [oneChange, setOneChange] = useState("");

  const totalSteps = 6;
  const progress = Math.round((step / totalSteps) * 100);

  const saveSubmission = trpc.toolkitSubmissions.save.useMutation();

  function handleComplete() {
    const snapshot: SnapshotResult = {
      businessName: businessName.trim() || "Your Business",
      revenueRange,
      staffCount,
      primaryRevenue,
      biggestTimeDrain,
      oneChange: oneChange.trim(),
      completedAt: new Date().toISOString(),
    };
    sessionStorage.setItem("businessSnapshot", JSON.stringify(snapshot));
    setResult(snapshot);
    setStep(totalSteps);

    // Persist to the database too (in addition to sessionStorage) so it
    // shows up in Progress tracking and survives across devices/sessions.
    // Fire-and-forget: a failure here shouldn't block the user seeing their
    // result, which is already saved locally.
    const diagnosis = DRAIN_DIAGNOSIS[biggestTimeDrain];
    saveSubmission.mutate({
      toolkitKey: "business-snapshot",
      inputData: { businessName: snapshot.businessName, revenueRange, staffCount, primaryRevenue, biggestTimeDrain, oneChange: snapshot.oneChange },
      resultSummary: { dimension: diagnosis?.dimension ?? null, diagnosis: diagnosis?.diagnosis ?? null },
      suggestions: diagnosis ? [`Open ${diagnosis.toolkitLabel}`] : undefined,
    });
  }

  function handleRetake() {
    setResult(null);
    setStep(0);
    setBusinessName("");
    setRevenueRange("");
    setStaffCount("");
    setPrimaryRevenue("");
    setBiggestTimeDrain("");
    setOneChange("");
  }

  // ── Already completed ──────────────────────────────────────────────────────
  if (result && step === totalSteps) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Business Snapshot Complete</h1>
              <p className="text-sm text-slate-400">
                Completed {new Date(result.completedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetake}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
          >
            Start a new snapshot
          </Button>
        </div>

        {/* Snapshot card */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{result.businessName}</h2>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">Snapshot</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Monthly Revenue</p>
                <p className="text-sm text-slate-200 font-medium">{result.revenueRange}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Team Size</p>
                <p className="text-sm text-slate-200 font-medium">{result.staffCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Primary Revenue Stream</p>
                <p className="text-sm text-slate-200 font-medium">{result.primaryRevenue}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Biggest Time Drain</p>
                <p className="text-sm text-slate-200 font-medium">{result.biggestTimeDrain}</p>
              </div>
            </div>

            {result.oneChange && (
              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">If you could change one thing</p>
                <p className="text-sm text-slate-200 italic">"{result.oneChange}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis */}
        {DRAIN_DIAGNOSIS[result.biggestTimeDrain] && (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-teal-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-400">
                {DRAIN_DIAGNOSIS[result.biggestTimeDrain].dimension} — What This Means
              </p>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {DRAIN_DIAGNOSIS[result.biggestTimeDrain].diagnosis}
            </p>
            <Button
              onClick={() => navigate(DRAIN_DIAGNOSIS[result.biggestTimeDrain].toolkitRoute)}
              className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold"
            >
              Open {DRAIN_DIAGNOSIS[result.biggestTimeDrain].toolkitLabel}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/os/audit")}
            className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold"
          >
            Start Bottleneck Audit
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
          Start over completely (clears all answers)
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
            <Building2 className="w-6 h-6 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Business Snapshot</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Before you can grow your business, you need to see it clearly. This 3-minute snapshot
            gives you a one-page picture of where your business stands right now — and it makes
            every other tool in this OS more accurate and more personal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Clock, label: "3 minutes" },
            { icon: Users, label: "6 questions" },
            { icon: TrendingUp, label: "Personalised output" },
            { icon: Lightbulb, label: "Feeds your audit" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
              <Icon className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="text-sm text-slate-300">{label}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={() => setStep(1)}
          className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold py-3"
        >
          Build My Snapshot
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // ── Question steps ─────────────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return businessName.trim().length > 0;
    if (step === 2) return revenueRange !== "";
    if (step === 3) return staffCount !== "";
    if (step === 4) return primaryRevenue !== "";
    if (step === 5) return biggestTimeDrain !== "";
    if (step === 6) return true; // oneChange is optional
    return false;
  };

  const [advancing, setAdvancing] = useState(false);
  function handleNext() {
    if (advancing) return;
    setAdvancing(true);
    setTimeout(() => setAdvancing(false), 400);

    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
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

      {/* Step 1: Business name */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">What is your business called?</h2>
            <p className="text-sm text-slate-400">
              This helps the OS personalise your experience throughout.
            </p>
          </div>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Thabo's Electrical Services"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            autoFocus
          />
        </div>
      )}

      {/* Step 2: Revenue range */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">What is your approximate monthly revenue?</h2>
            <p className="text-sm text-slate-400">
              An honest estimate is fine — this is for your eyes only.
            </p>
          </div>
          <div className="space-y-2">
            {REVENUE_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setRevenueRange(range)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                  revenueRange === range
                    ? "bg-teal-500/20 border-teal-500 text-teal-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Staff count */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">How many people work in your business?</h2>
            <p className="text-sm text-slate-400">Include yourself, full-time, part-time, and regular contractors.</p>
          </div>
          <div className="space-y-2">
            {STAFF_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setStaffCount(opt)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                  staffCount === opt
                    ? "bg-teal-500/20 border-teal-500 text-teal-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Primary revenue stream */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Where does most of your revenue come from?</h2>
            <p className="text-sm text-slate-400">Choose the one that best describes your primary income source.</p>
          </div>
          <div className="space-y-2">
            {REVENUE_STREAMS.map((stream) => (
              <button
                key={stream}
                onClick={() => setPrimaryRevenue(stream)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                  primaryRevenue === stream
                    ? "bg-teal-500/20 border-teal-500 text-teal-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {stream}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Biggest time drain */}
      {step === 5 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">What takes up the most of your time — but probably should not?</h2>
            <p className="text-sm text-slate-400">Be honest. This is the most important question in the snapshot.</p>
          </div>
          <div className="space-y-2">
            {TIME_DRAINS.map((drain) => (
              <button
                key={drain}
                onClick={() => setBiggestTimeDrain(drain)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                  biggestTimeDrain === drain
                    ? "bg-teal-500/20 border-teal-500 text-teal-300"
                    : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {drain}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: One change */}
      {step === 6 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">If you could change one thing about your business right now, what would it be?</h2>
            <p className="text-sm text-slate-400">
              Write it in your own words. There is no wrong answer — this is your snapshot, not a test.
            </p>
          </div>
          <VoiceOrTextInput
            value={oneChange}
            onChange={setOneChange}
            placeholder="e.g. I would stop doing all the admin myself and hire someone to handle it..."
            rows={4}
            textareaClassName="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
            buttonClassName="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
          />
          <p className="text-xs text-slate-500">This field is optional — you can skip it if you prefer.</p>
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
          disabled={!canProceed() || advancing}
          className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold disabled:opacity-40"
        >
          {step === totalSteps ? "Build My Snapshot" : "Next"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
