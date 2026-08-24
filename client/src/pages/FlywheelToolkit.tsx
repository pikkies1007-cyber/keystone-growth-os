import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowLeft, RefreshCw, Star, Users, Repeat, TrendingUp, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Industry Definitions ─────────────────────────────────────────────────────
interface Industry {
  id: string;
  label: string;
  icon: string;
  reactivationMsg: string;
  reviewMsg: string;
  referralMsg: string;
  plan30: string[];
}

const INDUSTRIES: Industry[] = [
  {
    id: "retail",
    label: "Retail (Paint / Hardware / Building Supplies)",
    icon: "🏪",
    reactivationMsg: `Hi [Name], it's [Your Name] from [Business Name]. You purchased from us [X months] ago and I just wanted to check in — are you busy with a new project? We've just received some great new stock and I'd love to help you get the right product for whatever you're working on. When would be a good time to chat?`,
    reviewMsg: `Hi [Name], thank you for your recent purchase at [Business Name]. We'd love to hear how the project went! If you have 2 minutes, a Google review would mean the world to us — it helps other builders and homeowners find us. Here's the link: [Google Review Link]. Thank you so much!`,
    referralMsg: `Hi [Name], I hope the project turned out exactly how you imagined it! If you know anyone else who's planning a build, renovation, or paint job, I'd be grateful if you could send them our way. We look after every referral personally. Thank you for trusting us — it means a lot.`,
    plan30: [
      "Week 1: Pull your last 90 days of customer records. Identify the top 20 customers by spend.",
      "Week 1: Send the reactivation message to all 20. Track who responds.",
      "Week 2: Follow up with non-responders by phone — one call, no pressure.",
      "Week 2: Ask every customer who responds for a Google review. Send the template.",
      "Week 3: For every customer who leaves a review, send the referral message.",
      "Week 3: Create a simple referral card to hand out at point of sale.",
      "Week 4: Count your results — reviews received, referrals generated, reactivations made. Set next month's target.",
    ],
  },
  {
    id: "trade",
    label: "Trade (Plumber / Electrician / Builder / Painter)",
    icon: "🔧",
    reactivationMsg: `Hi [Name], it's [Your Name] from [Business Name]. We did some work at your property [X months] ago and I wanted to check in — is everything still holding up well? We're in your area again next week and I'd be happy to pop in for a quick check at no charge. Also, if you're planning any new work, we'd love to help. When suits you?`,
    reviewMsg: `Hi [Name], it was great working on your property! If you're happy with the job, would you mind leaving us a quick Google review? It only takes 2 minutes and it helps other homeowners find a tradesperson they can trust. Here's the link: [Google Review Link]. Really appreciate it!`,
    referralMsg: `Hi [Name], thank you for trusting us with your home. If any of your neighbours or family are looking for a reliable [trade], I'd really appreciate the referral. We treat every job like it's our own home. Feel free to pass on my number: [Your Number].`,
    plan30: [
      "Week 1: List every job completed in the last 6 months. Identify the top 15 clients.",
      "Week 1: Send the reactivation message to all 15. Note who responds.",
      "Week 2: Call the non-responders — one friendly check-in call.",
      "Week 2: Ask every active client for a Google review. Send the template.",
      "Week 3: For every review received, send the referral message.",
      "Week 3: Add a referral ask to every job completion — verbal and WhatsApp.",
      "Week 4: Review your numbers. Set a monthly referral target going forward.",
    ],
  },
  {
    id: "professional",
    label: "Professional Services (Accountant / Attorney / Consultant)",
    icon: "💼",
    reactivationMsg: `Hi [Name], it's [Your Name] from [Business Name]. We last worked together [X months] ago and I wanted to reach out — how is the business going? There have been some changes in [relevant area] recently that I think could be relevant to you. Would you be open to a 15-minute call this week to catch up? No agenda — just want to make sure you're covered.`,
    reviewMsg: `Hi [Name], thank you for trusting us with [specific matter]. If you found our service valuable, a Google review would help other business owners find the right professional support. It takes about 2 minutes: [Google Review Link]. We genuinely appreciate it.`,
    referralMsg: `Hi [Name], I hope things are going well on your end. If you know any other business owners who could benefit from [your service], I'd be grateful for an introduction. I treat every referral with the same care I've given you. Thank you for the trust.`,
    plan30: [
      "Week 1: Review your client list from the last 12 months. Identify 15 clients you haven't spoken to in 3+ months.",
      "Week 1: Send the reactivation message to all 15.",
      "Week 2: Schedule follow-up calls with anyone who responds.",
      "Week 2: Ask your 5 most satisfied clients for a Google review.",
      "Week 3: For every review received, send the referral message.",
      "Week 3: Add a referral ask to every client engagement close-out.",
      "Week 4: Measure results and set a quarterly referral target.",
    ],
  },
  {
    id: "food",
    label: "Food & Hospitality (Restaurant / Catering / Bakery)",
    icon: "🍽️",
    reactivationMsg: `Hi [Name], it's [Your Name] from [Business Name]. We haven't seen you in a while and we miss you! We've added some new items to the menu that I think you'd love. Come in this week and mention this message — we'd love to welcome you back. When are you free?`,
    reviewMsg: `Hi [Name], thank you for visiting [Business Name]! We hope you enjoyed your experience. If you have a moment, a Google review would mean so much to us — it helps other food lovers discover us. Here's the link: [Google Review Link]. See you again soon!`,
    referralMsg: `Hi [Name], we love having you as a regular! If you know anyone looking for a great [restaurant/caterer/bakery] for a special occasion or everyday dining, please send them our way. We'll take great care of them — just like we do with you.`,
    plan30: [
      "Week 1: Pull your customer contact list or loyalty programme data. Identify customers who haven't visited in 60+ days.",
      "Week 1: Send the reactivation message to the top 30.",
      "Week 2: Follow up with a special offer for non-responders.",
      "Week 2: Ask every customer who responds or visits for a Google review.",
      "Week 3: For every review, send the referral message.",
      "Week 3: Add a table card or receipt message asking for referrals.",
      "Week 4: Count reviews, referrals, and reactivations. Set next month's target.",
    ],
  },
  {
    id: "health",
    label: "Health & Wellness (Salon / Gym / Physio / Spa)",
    icon: "💆",
    reactivationMsg: `Hi [Name], it's [Your Name] from [Business Name]. It's been a while since your last visit and I just wanted to check in — how are you doing? We have some availability this week and I'd love to get you back in. Is there a day that works for you?`,
    reviewMsg: `Hi [Name], thank you for choosing [Business Name] for your [treatment/session]. If you enjoyed your experience, a Google review would help other people find us and feel confident booking. Here's the link: [Google Review Link]. It only takes 2 minutes and it means a lot to us!`,
    referralMsg: `Hi [Name], we love having you as a client! If any of your friends or family are looking for [your service], please send them our way. We'll look after them just as well as we look after you. Feel free to share our number: [Your Number].`,
    plan30: [
      "Week 1: Pull your booking history. Identify clients who haven't booked in 60+ days.",
      "Week 1: Send the reactivation message to the top 25.",
      "Week 2: Call non-responders — one friendly check-in.",
      "Week 2: Ask every client who books for a Google review after their appointment.",
      "Week 3: For every review, send the referral message.",
      "Week 3: Add a referral card to every appointment completion.",
      "Week 4: Review your numbers and set a monthly reactivation target.",
    ],
  },
  {
    id: "admin",
    label: "Admin / Office Services",
    icon: "🗂️",
    reactivationMsg: `Hi [Name], it's [Your Name] from [Business Name]. We worked together [X months] ago and I wanted to check in — how are things going with your operations? I've been thinking about some ways we could help streamline things further for you. Would you be open to a quick 10-minute call this week?`,
    reviewMsg: `Hi [Name], thank you for working with [Business Name]. If our support made a difference to how your business runs, a Google review would help other business owners find reliable admin support. Here's the link: [Google Review Link]. Really appreciate it!`,
    referralMsg: `Hi [Name], I hope the systems we put in place are still saving you time! If you know any other business owners who are drowning in admin, I'd love an introduction. A well-run back office changes everything — and I'd love to help them too.`,
    plan30: [
      "Week 1: List all clients from the last 12 months. Identify those you haven't engaged in 3+ months.",
      "Week 1: Send the reactivation message to the top 15.",
      "Week 2: Follow up with a specific value-add offer for non-responders.",
      "Week 2: Ask active clients for a Google review.",
      "Week 3: For every review, send the referral message.",
      "Week 3: Add a referral ask to every project close-out.",
      "Week 4: Measure and set a quarterly referral target.",
    ],
  },
  {
    id: "social",
    label: "Social Media / Creative Services",
    icon: "📱",
    reactivationMsg: `Hi [Name], it's [Your Name] from [Business Name]. We worked together [X months] ago and I've been thinking about your brand — there are some new content trends and platform changes that could really work in your favour right now. Would you be open to a quick 15-minute catch-up call? I have some ideas I'd love to share.`,
    reviewMsg: `Hi [Name], thank you for trusting [Business Name] with your brand! If our work helped your business grow online, a Google review would help other business owners find creative support they can trust. Here's the link: [Google Review Link]. It means a lot — thank you!`,
    referralMsg: `Hi [Name], I hope your social presence is still growing! If you know any other business owners who want to show up better online but don't know where to start, I'd love an introduction. I'll take great care of them — just like I did with you.`,
    plan30: [
      "Week 1: Review your client list from the last 12 months. Identify clients you haven't engaged in 3+ months.",
      "Week 1: Send the reactivation message to the top 15.",
      "Week 2: Follow up with a specific content idea or platform update relevant to each non-responder.",
      "Week 2: Ask active clients for a Google review.",
      "Week 3: For every review, send the referral message.",
      "Week 3: Add a referral ask to every project delivery.",
      "Week 4: Count results and set a monthly referral target.",
    ],
  },
];

type CopiedKey = "reactivation" | "review" | "referral" | null;

const FLYWHEEL_STAGES = [
  { icon: Star, label: "Reviews", color: "oklch(70% 0.10 75)", desc: "Social proof that attracts new customers" },
  { icon: Users, label: "Referrals", color: "oklch(55% 0.12 175)", desc: "Warm leads from people who already trust you" },
  { icon: Repeat, label: "Repeat", color: "oklch(65% 0.15 160)", desc: "Revenue from customers who already know you" },
  { icon: TrendingUp, label: "Momentum", color: "oklch(60% 0.13 290)", desc: "Each cycle makes the next one easier" },
];

export default function FlywheelToolkit() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [copied, setCopied] = useState<CopiedKey>(null);
  const [tracker, setTracker] = useState({ reviews: 0, referrals: 0, reactivations: 0 });
  const [done, setDone] = useState(false);

  function copyText(text: string, key: CopiedKey) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const saveSubmission = trpc.toolkitSubmissions.save.useMutation();

  function handleComplete() {
    sessionStorage.setItem(
      "flywheelResult",
      JSON.stringify({ industry: selectedIndustry?.id, completedAt: Date.now() })
    );
    setDone(true);

    // Fire-and-forget: shows up on /os/progress even if this fails, since
    // the sessionStorage result above already covers the immediate UX.
    saveSubmission.mutate({
      toolkitKey: "flywheel",
      inputData: { industry: selectedIndustry?.id ?? null, industryLabel: selectedIndustry?.label ?? null, tracker },
      resultSummary: { industryLabel: selectedIndustry?.label ?? null },
      suggestions: selectedIndustry?.plan30,
    });
  }

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
            Your Flywheel Is Ready to Spin
          </h1>
          <p className="text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
            Industry:{" "}
            <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
              {selectedIndustry?.label}
            </span>
          </p>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "var(--color-text-muted)" }}>
            How many of your past customers have heard from you in the last 30 days? That number is about to change.
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
            <RefreshCw className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
              Flywheel Principle Toolkit
            </span>
          </div>
          <h1
            className="text-2xl lg:text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            Activate Your Past Customers
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            The fastest cash is always from people who already know you. This toolkit gives you a 30-day plan to turn
            past customers into reviews, referrals, and repeat revenue.
          </p>
        </div>

        {/* Step tabs */}
        <div
          className="flex rounded-xl overflow-hidden mb-8"
          style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-surface)" }}
        >
          {["The Flywheel", "Your Industry", "Templates", "30-Day Plan", "Track"].map((label, i) => (
            <div
              key={i}
              className="flex-1 py-3 text-center"
              style={{
                backgroundColor: step === i + 1 ? "oklch(55% 0.12 175 / 0.1)" : "transparent",
                borderBottom: step === i + 1 ? "2px solid var(--color-primary)" : "2px solid transparent",
              }}
            >
              <span
                className="block text-base font-bold"
                style={{ color: step >= i + 1 ? "var(--color-primary)" : "var(--color-text-subtle)" }}
              >
                {i + 1}
              </span>
              <span
                className="text-xs font-medium uppercase tracking-wide hidden sm:block"
                style={{ color: step >= i + 1 ? "var(--color-text-muted)" : "var(--color-text-subtle)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1: The Flywheel ── */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-accent)" }}>
                Step 1 — The Principle
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
                How many of your past customers have heard from you in the last 90 days?
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Most business owners spend all their energy chasing new customers — while a warm database of people who
                already trust them sits untouched. The Flywheel changes that.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {FLYWHEEL_STAGES.map((stage) => (
                <div
                  key={stage.label}
                  className="rounded-xl p-4 text-center"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    border: `1px solid ${stage.color}40`,
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
                    style={{ backgroundColor: `${stage.color}18` }}
                  >
                    <stage.icon className="w-5 h-5" style={{ color: stage.color }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-base)" }}>
                    {stage.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {stage.desc}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl p-5 mb-8"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-base)" }}>
                Why the Flywheel works for cash flow
              </p>
              {[
                "A Google review costs nothing and brings in customers who are already pre-sold on trusting you.",
                "A referral from a happy customer closes faster and at a higher value than any cold lead.",
                "A reactivated past customer already knows your quality — the barrier to buying again is almost zero.",
                "Each cycle builds on the last. The more you spin it, the less effort each revolution takes.",
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {point}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                Choose My Industry <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Industry ── */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-accent)" }}>
                Step 2 — Your Industry
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
                What best describes your business?
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Your templates and 30-day plan will be tailored to your industry.
              </p>
            </div>
            <div className="space-y-2 mb-8">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setSelectedIndustry(ind)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
                  style={{
                    backgroundColor:
                      selectedIndustry?.id === ind.id ? "oklch(55% 0.12 175 / 0.15)" : "var(--color-bg-surface)",
                    border:
                      selectedIndustry?.id === ind.id
                        ? "1px solid var(--color-primary)"
                        : "1px solid var(--color-border)",
                  }}
                >
                  <span className="text-xl">{ind.icon}</span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        selectedIndustry?.id === ind.id ? "var(--color-primary)" : "var(--color-text-muted)",
                    }}
                  >
                    {ind.label}
                  </span>
                </button>
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
                disabled={!selectedIndustry}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                Get My Templates <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Templates ── */}
        {step === 3 && selectedIndustry && (
          <div>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-accent)" }}>
                Step 3 — Your Message Templates
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
                {selectedIndustry.icon} {selectedIndustry.label}
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Personalise each template with your name, business name, and customer details. Then send via WhatsApp or
                email. Replace all [bracketed] text before sending.
              </p>
            </div>

            {[
              {
                key: "reactivation" as CopiedKey,
                label: "Reactivation Message",
                icon: Repeat,
                color: "oklch(65% 0.15 160)",
                text: selectedIndustry.reactivationMsg,
                desc: "Send to past customers who haven't heard from you in 60+ days",
              },
              {
                key: "review" as CopiedKey,
                label: "Google Review Request",
                icon: Star,
                color: "oklch(70% 0.10 75)",
                text: selectedIndustry.reviewMsg,
                desc: "Send after a completed job or purchase — within 24 hours",
              },
              {
                key: "referral" as CopiedKey,
                label: "Referral Ask",
                icon: Users,
                color: "oklch(55% 0.12 175)",
                text: selectedIndustry.referralMsg,
                desc: "Send to happy customers — after a review or positive interaction",
              },
            ].map((tmpl) => (
              <div
                key={tmpl.key}
                className="rounded-xl p-5 mb-4"
                style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <tmpl.icon className="w-4 h-4" style={{ color: tmpl.color }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text-base)" }}>
                      {tmpl.label}
                    </p>
                  </div>
                  <button
                    onClick={() => copyText(tmpl.text, tmpl.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: copied === tmpl.key ? "oklch(65% 0.15 160 / 0.15)" : "oklch(55% 0.12 175 / 0.08)",
                      color: copied === tmpl.key ? "oklch(65% 0.15 160)" : "var(--color-primary)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {copied === tmpl.key ? (
                      <><CheckCircle2 className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--color-text-subtle)" }}>
                  {tmpl.desc}
                </p>
                <div
                  className="rounded-lg p-4 text-sm leading-relaxed"
                  style={{
                    backgroundColor: "oklch(55% 0.12 175 / 0.04)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    fontStyle: "italic",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {tmpl.text}
                </div>
              </div>
            ))}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
                style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                My 30-Day Plan <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: 30-Day Plan ── */}
        {step === 4 && selectedIndustry && (
          <div>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-accent)" }}>
                Step 4 — Your 30-Day Reactivation Plan
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
                What would change if you ran this plan every month for 90 days?
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                This is your week-by-week action plan for the next 30 days. It is designed to be done alongside your
                normal business — not instead of it.
              </p>
            </div>
            <div className="space-y-3 mb-8">
              {selectedIndustry.plan30.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: "oklch(55% 0.12 175 / 0.15)", color: "var(--color-primary)" }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {action}
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
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
              >
                Track My Progress <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Track ── */}
        {step === 5 && (
          <div>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-accent)" }}>
                Step 5 — Progress Tracker
              </p>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
                What gets measured, gets done
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Update these numbers as you go. Even one review, one referral, and one reactivation per week compounds
                significantly over 90 days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { key: "reviews" as const, label: "Google Reviews", icon: Star, color: "oklch(70% 0.10 75)" },
                { key: "referrals" as const, label: "Referrals Generated", icon: Users, color: "oklch(55% 0.12 175)" },
                { key: "reactivations" as const, label: "Customers Reactivated", icon: Repeat, color: "oklch(65% 0.15 160)" },
              ].map((metric) => (
                <div
                  key={metric.key}
                  className="rounded-xl p-5 text-center"
                  style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
                >
                  <metric.icon className="w-5 h-5 mx-auto mb-2" style={{ color: metric.color }} />
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>
                    {metric.label}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setTracker((p) => ({ ...p, [metric.key]: Math.max(0, p[metric.key] - 1) }))}
                      className="w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center"
                      style={{ backgroundColor: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                    >
                      −
                    </button>
                    <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: metric.color }}>
                      {tracker[metric.key]}
                    </span>
                    <button
                      onClick={() => setTracker((p) => ({ ...p, [metric.key]: p[metric.key] + 1 }))}
                      className="w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center"
                      style={{ backgroundColor: metric.color + "20", border: `1px solid ${metric.color}50`, color: metric.color }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl p-5 mb-8"
              style={{ backgroundColor: "oklch(55% 0.12 175 / 0.06)", border: "1px solid oklch(55% 0.12 175 / 0.2)" }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-base)" }}>
                Your Flywheel Score This Month
              </p>
              <p className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-primary)" }}>
                {tracker.reviews + tracker.referrals + tracker.reactivations}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Total touchpoints with past customers. Target: 20+ per month.
              </p>
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
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--color-accent)", color: "var(--color-bg-base)" }}
              >
                <TrendingUp className="w-4 h-4" /> Add to My 90-Day Goals
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
