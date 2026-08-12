import { useLocation } from "wouter";
import { activeBrand } from "../../../shared/brandConfig";
import { ArrowRight, CheckCircle, Heart, Shield, Zap, Star, ExternalLink } from "lucide-react";
import { notifyOSSessionChange } from "../hooks/useOSSession";
import { trpc } from "@/lib/trpc";

// ─── Archetype data for personalised display ─────────────────────────────────

const archetypeLabels: Record<string, { title: string; color: string }> = {
  hustler: { title: "The Hustler", color: "var(--color-danger)" },
  giver: { title: "The Giver", color: "var(--color-accent)" },
  protector: { title: "The Protector", color: "var(--color-info)" },
  enjoyer: { title: "The Enjoyer", color: "var(--color-success)" },
};

// ─── What you get items ───────────────────────────────────────────────────────

const programmeIncludes = [
  {
    icon: Zap,
    title: "Money Identity Deep Dive",
    description:
      "Understand the exact beliefs, memories, and patterns shaping every financial decision you make — and where they came from.",
  },
  {
    icon: Shield,
    title: "12-Month Financial Roadmap",
    description:
      "A personalised, step-by-step financial plan built around your archetype, your business stage, and your specific goals.",
  },
  {
    icon: Heart,
    title: "Emotional Money Patterns",
    description:
      "Identify and gently rewire the emotional triggers — fear, guilt, avoidance, over-spending — that keep your finances stuck.",
  },
  {
    icon: Star,
    title: "Business & Personal Integration",
    description:
      "Bridge the gap between your business finances and your personal financial life — because they are never truly separate.",
  },
  {
    icon: CheckCircle,
    title: "Ongoing Support Tools",
    description:
      "Access to tools, frameworks, and check-in resources that keep you connected to your financial plan throughout the year.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WealthResetJourney() {
  const [, navigate] = useLocation();
  const brand = activeBrand;

  // Try to read the money identity result from session storage
  let identityResult: { archetype: string; title: string; score: number } | null = null;
  try {
    const stored = sessionStorage.getItem("moneyIdentityResult");
    if (stored) identityResult = JSON.parse(stored);
  } catch {
    // no stored result — show generic version
  }

  // Try to read lead profile (name + email) stored after Money Identity capture
  let leadProfile: { name: string; email: string; archetype: string | null } | null = null;
  try {
    const stored = sessionStorage.getItem("leadProfile");
    if (stored) leadProfile = JSON.parse(stored);
  } catch {
    // no stored profile
  }

  const sendEnrolmentEmail = trpc.leads.sendWealthResetEmail.useMutation();

  const archetypeInfo = identityResult ? archetypeLabels[identityResult.archetype] : null;

  return (
    <div className="min-h-screen px-6 py-8 lg:px-10 max-w-3xl mx-auto">
      <div className="animate-fade-in space-y-6">

        {/* ── Empathy opener (Voss: label the emotion, acknowledge the situation) ── */}
        <div
          className="rounded-2xl p-7 lg:p-8"
          style={{
            background: "linear-gradient(135deg, oklch(55% 0.12 175 / 0.08) 0%, oklch(15% 0.04 220) 100%)",
            border: "1px solid oklch(55% 0.12 175 / 0.2)",
          }}
        >
          {archetypeInfo && identityResult ? (
            <>
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4"
                style={{ backgroundColor: `${archetypeInfo.color}18`, color: archetypeInfo.color }}
              >
                {identityResult.title}
              </div>
              <h1
                className="text-2xl lg:text-3xl font-bold mb-3"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
              >
                What would it mean to finally understand the pattern underneath the pressure?
              </h1>
              <p className="text-base leading-relaxed mb-4" style={{ color: "var(--color-text-muted)" }}>
                Your diagnostic shows a strong <strong style={{ color: archetypeInfo.color }}>{identityResult.title}</strong> pattern.
                That is not a problem — it is information. What would change in your business if you understood
                exactly how that pattern is shaping your financial decisions?
              </p>
              <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                The patterns you identified today did not appear overnight. They were shaped by years of experience,
                environment, and the beliefs you formed about money long before you started your business.
                How different would your next 12 months look if those patterns were no longer running the show?
              </p>
            </>
          ) : (
            <>
              <h1
                className="text-2xl lg:text-3xl font-bold mb-3"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
              >
                What would it mean to finally understand the pattern underneath the pressure?
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Most business owners who reach this point have been working hard for a long time. The question
                is not whether you are capable — it is whether the way you relate to money is working for you
                or against you. What would change if you knew the answer to that?
              </p>
            </>
          )}
        </div>

        {/* ── Carnegie: make the person feel understood before making an offer ── */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            You are not bad with money. You are working with an incomplete map.
          </h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--color-text-muted)" }}>
            Financial education teaches you how to manage money. But it rarely teaches you <em>why</em> you
            manage it the way you do. That "why" — your money identity — is the missing piece that no spreadsheet
            or budget template can fix on its own.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            The Financial Wellness Programme was built specifically for business owners and managers who are
            capable, hardworking, and intelligent — but who keep hitting the same financial ceiling. It does not
            judge where you are. It starts exactly where you are.
          </p>
        </div>

        {/* ── What's included ─────────────────────────────────────────────────── */}
        <div>
          <h2
            className="text-base font-semibold mb-4"
            style={{ color: "var(--color-text-base)" }}
          >
            What the {brand.modules.wealthReset.programmeLabel} includes
          </h2>
          <div className="space-y-3">
            {programmeIncludes.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-base)" }}>
                      {item.title}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Voss: label the hesitation, don't push ──────────────────────────── */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: "oklch(55% 0.12 175 / 0.06)",
            border: "1px solid oklch(55% 0.12 175 / 0.15)",
          }}
        >
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--color-text-muted)" }}>
            <strong style={{ color: "var(--color-text-base)" }}>What would it take for this to feel like the right step?</strong> Most people who reach this point
            feel a mix of recognition and hesitation — because understanding your patterns clearly for the first time
            can feel both freeing and confronting.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            You do not have to have everything figured out. The only question worth asking right now is:
            what would the next 21 days look like if you chose to use them differently?
          </p>
        </div>

        {/* ── CTA block ───────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-7 text-center"
          style={{
            background: "linear-gradient(135deg, oklch(55% 0.12 175 / 0.12) 0%, oklch(15% 0.04 220) 100%)",
            border: "1px solid oklch(55% 0.12 175 / 0.25)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary)" }}>
            {brand.modules.wealthReset.programmeLabel}
          </p>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}
          >
            {brand.modules.wealthReset.title}
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            {brand.modules.wealthReset.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={brand.modules.wealthReset.programmeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                sessionStorage.setItem("wealthResetComplete", "true");
                notifyOSSessionChange();
                // Fire enrolment email if we have lead contact info
                if (leadProfile?.email) {
                  sendEnrolmentEmail.mutate({
                    name: leadProfile.name,
                    email: leadProfile.email,
                    archetype: leadProfile.archetype ?? identityResult?.archetype ?? null,
                  });
                }
              }}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold transition-all duration-180"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              {brand.modules.wealthReset.ctaLabel}
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => navigate("/os/goals")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-180"
              style={{ border: "1px solid var(--color-border-light)", color: "var(--color-text-muted)" }}
            >
              Return to My Goal Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs mt-4" style={{ color: "var(--color-text-subtle)" }}>
            Powered by Keystone Business Group · Facilitated by Gentle Wind Coaching
          </p>
        </div>

      </div>
    </div>
  );
}
