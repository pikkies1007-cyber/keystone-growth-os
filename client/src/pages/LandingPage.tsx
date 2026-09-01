import { activeBrand } from "@shared/brandConfig";
import { Link } from "wouter";
import { Target, MessageCircle } from "lucide-react";

const tiers = [
  {
    name: "Keystone Catalyst",
    tier: "Entry tier",
    price: "R499",
    audience: "solopreneur",
    features: [
      "Financial Wellness Passport (monthly)",
      "Discovery Session (R1,800 value)",
      "12-Month Strategic Roadmap",
      "Framework Vault (2 foundational frameworks)",
      "Monthly Scaling Toolkit",
      "Access to Trusted Partner Network",
    ],
    highlight: false,
  },
  {
    name: "Keystone Accelerator",
    tier: "Growth tier",
    price: "R2,799",
    audience: "growing SME",
    features: [
      "Everything in Catalyst, plus:",
      "Brand Uniformity Audit & Toolkit",
      "Custom AI Support Tools (Branded)",
      "Sales Funnel Strategy & Implementation",
      "Monthly Mastermind Workshop (1 hour)",
      "Stabilization Framework Implementation",
      "Preferred Network Access",
    ],
    highlight: true,
  },
  {
    name: "Keystone Apex",
    tier: "Premium tier",
    price: "R5,999",
    audience: "established business",
    features: [
      "Everything in Accelerator, plus:",
      "Growth Introduction Sessions",
      "In-Person Supply Channel Introductions",
      "Priority Support & Hotline Access",
      "All 10 Proprietary Frameworks",
      "Dedicated Growth Partner",
    ],
    highlight: false,
  },
];

const stats = [
  { value: "3", label: "Core Pillars" },
  { value: "10+", label: "Business Frameworks" },
  { value: "1 June", label: "Launch Date" },
  { value: "50", label: "Founding Member Spots" },
];

export default function LandingPage() {
  return (
    <div style={{ background: "var(--color-background)", color: "var(--color-text)", minHeight: "100vh" }}>
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-20">
        <img src={activeBrand.logoUrl} alt={activeBrand.appName} className="h-10 mb-12" />

        <p className="text-xs tracking-widest uppercase mb-4" style={{ color: "var(--color-accent)" }}>
          — South Africa's Business Membership
        </p>

        <h1 className="text-5xl md:text-6xl font-serif leading-tight mb-2">
          Your business, finally
        </h1>
        <h1 className="text-5xl md:text-6xl font-serif italic leading-tight mb-6" style={{ color: "var(--color-primary)" }}>
          {activeBrand.tagline}
        </h1>

        <p className="text-lg max-w-xl mb-8" style={{ color: "var(--color-text-muted, #9CA8B4)" }}>
          The first integrated membership combining financial wellness, AI-powered tools, and a vetted
          partner network into one affordable subscription — built for South African solopreneurs and SMEs.
        </p>

        <div className="flex items-center gap-6 mb-16">
          <Link href="/os/audit">
            <a
              className="inline-flex items-center gap-2 px-5 py-3 rounded-md font-medium"
              style={{ background: "var(--color-primary)", color: "#0F1923" }}
            >
              <Target size={18} />
              Take the Free Bottleneck Audit
            </a>
          </Link>
          <a
            href={`https://wa.me/27829026145?text=${encodeURIComponent("Hi Riana, I need a business coach.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
          >
            <MessageCircle size={16} />
            I need a business coach
          </a>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 pt-8 border-t" style={{ borderColor: "var(--color-border)" }}>
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-2xl font-serif">{s.value}</div>
              <div className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted, #9CA8B4)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-24">
        <p className="text-sm mb-8" style={{ color: "var(--color-text-muted, #9CA8B4)" }}>
          Founding member rates locked in for the first 50 sign-ups. After launch, pricing normalises.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map(t => (
            <div
              key={t.name}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: t.highlight ? "var(--color-primary-dark, #1a3a33)" : "var(--color-surface)",
                border: t.highlight ? "none" : "1px solid var(--color-border)",
              }}
            >
              {t.highlight && (
                <span
                  className="self-start text-xs font-semibold px-2 py-1 rounded-full mb-3"
                  style={{ background: "var(--color-primary)", color: "#0F1923" }}
                >
                  MOST POPULAR
                </span>
              )}
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--color-accent)" }}>{t.tier}</p>
              <h3 className="text-xl font-serif mb-3">{t.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-serif">{t.price}</span>
                <span className="text-sm" style={{ color: "var(--color-text-muted, #9CA8B4)" }}> / month · {t.audience}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {t.features.map(f => (
                  <li key={f} className="text-sm flex gap-2">
                    <span style={{ color: "var(--color-primary)" }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={`mailto:${"pikkies1007@gmail.com"}?subject=${encodeURIComponent(`Keystone Business Group — Waitlist (${t.name})`)}`}
                className="text-center py-2.5 rounded-md font-medium"
                style={{
                  background: t.highlight ? "var(--color-primary)" : "transparent",
                  color: t.highlight ? "#0F1923" : "var(--color-text)",
                  border: t.highlight ? "none" : "1px solid var(--color-border)",
                }}
              >
                Join Waitlist
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-12" style={{ color: "var(--color-text-muted, #9CA8B4)" }}>
          Already exploring? <Link href="/os"><a className="underline underline-offset-4">Open the Growth Operating System →</a></Link>
        </p>
      </div>
    </div>
  );
}
