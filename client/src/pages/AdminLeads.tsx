import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SignInForm } from "@/components/SignInForm";
import {
  ShieldCheck,
  Users,
  TrendingUp,
  Search,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Mail,
  Phone,
  Calendar,
  Brain,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedLead = {
  id: number;
  name: string;
  email: string;
  whatsapp: string | null;
  moneyArchetype: "hustler" | "giver" | "protector" | "enjoyer" | null;
  archetypeScore: number | null;
  diagnosticAnswers: Record<string, number> | null;
  source: string | null;
  clientId: string | null;
  notified: number | null;
  createdAt: Date;
  // Enriched from audit join
  primaryBottleneck: string | null;
  moneyFrictionDetected: number | null;
  auditScores: Record<string, number> | null;
};

type AuditResult = {
  id: number;
  sessionId: string;
  scores: Record<string, number>;
  primaryBottleneck: string | null;
  moneyFrictionDetected: number | null;
  clientId: string | null;
  createdAt: Date;
};

type SortKey = "name" | "archetype" | "bottleneck" | "date";
type SortDir = "asc" | "desc";

// ─── Display helpers ──────────────────────────────────────────────────────────

const ARCHETYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  hustler:   { label: "Hustler",   color: "oklch(60% 0.18 25)",  bg: "oklch(60% 0.18 25 / 0.12)"  },
  giver:     { label: "Giver",     color: "oklch(60% 0.16 150)", bg: "oklch(60% 0.16 150 / 0.12)" },
  protector: { label: "Protector", color: "oklch(60% 0.16 220)", bg: "oklch(60% 0.16 220 / 0.12)" },
  enjoyer:   { label: "Enjoyer",   color: "oklch(65% 0.16 60)",  bg: "oklch(65% 0.16 60 / 0.12)"  },
};

const BOTTLENECK_META: Record<string, { label: string; color: string }> = {
  sales:          { label: "Sales",           color: "oklch(60% 0.18 25)"  },
  cash:           { label: "Cash Flow",       color: "oklch(55% 0.16 50)"  },
  staff:          { label: "Staff",           color: "oklch(60% 0.16 280)" },
  systems:        { label: "Systems",         color: "oklch(60% 0.16 220)" },
  ownerBehaviour: { label: "Owner Behaviour", color: "oklch(60% 0.16 150)" },
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function ArchetypeBadge({ archetype }: { archetype: string | null }) {
  if (!archetype) return <span style={{ color: "var(--color-text-subtle)" }} className="text-xs">—</span>;
  const meta = ARCHETYPE_META[archetype] ?? { label: archetype, color: "var(--color-text-muted)", bg: "transparent" };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
    >
      <Brain className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function BottleneckBadge({ bottleneck }: { bottleneck: string | null }) {
  if (!bottleneck) return <span style={{ color: "var(--color-text-subtle)" }} className="text-xs">—</span>;
  const meta = BOTTLENECK_META[bottleneck] ?? { label: bottleneck, color: "var(--color-text-muted)" };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${meta.color}18`,
        color: meta.color,
        border: `1px solid ${meta.color}30`,
      }}
    >
      <AlertTriangle className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function SortButton({ label, sortKey, current, dir, onSort }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors"
      style={{ color: active ? "var(--color-primary)" : "var(--color-text-subtle)" }}
    >
      {label}
      {active ? (
        dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3 opacity-30" />
      )}
    </button>
  );
}

// ─── Lead Detail Drawer ───────────────────────────────────────────────────────

function LeadDrawer({ lead, onClose }: { lead: EnrichedLead; onClose: () => void }) {
  const archMeta = lead.moneyArchetype ? ARCHETYPE_META[lead.moneyArchetype] : null;
  const bottleneckMeta = lead.primaryBottleneck ? BOTTLENECK_META[lead.primaryBottleneck] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "oklch(0% 0 0 / 0.5)" }} />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto flex flex-col"
        style={{ backgroundColor: "var(--color-bg-surface)", borderLeft: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 z-10"
          style={{ backgroundColor: "var(--color-bg-surface)", borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>Lead Profile</p>
            <h3 className="text-base font-bold" style={{ color: "var(--color-text-base)" }}>{lead.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:opacity-70" style={{ color: "var(--color-text-subtle)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Contact */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>Contact Details</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />
                <a href={`mailto:${lead.email}`} className="text-sm" style={{ color: "var(--color-text-base)" }}>{lead.email}</a>
              </div>
              {lead.whatsapp && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />
                  <span className="text-sm" style={{ color: "var(--color-text-base)" }}>{lead.whatsapp}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-subtle)" }} />
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Captured {formatDate(lead.createdAt)}</span>
              </div>
            </div>
          </section>

          {/* Money Identity */}
          {lead.moneyArchetype && archMeta && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>Money Identity</p>
              <div className="rounded-xl p-4" style={{ backgroundColor: archMeta.bg, border: `1px solid ${archMeta.color}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4" style={{ color: archMeta.color }} />
                  <span className="text-sm font-semibold" style={{ color: archMeta.color }}>{archMeta.label}</span>
                  {lead.archetypeScore !== null && (
                    <span className="text-xs ml-auto" style={{ color: archMeta.color }}>{lead.archetypeScore}% alignment</span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Bottleneck */}
          {lead.primaryBottleneck && bottleneckMeta && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>Primary Bottleneck</p>
              <div className="rounded-xl p-4" style={{ backgroundColor: `${bottleneckMeta.color}10`, border: `1px solid ${bottleneckMeta.color}30` }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: bottleneckMeta.color }} />
                  <span className="text-sm font-semibold" style={{ color: bottleneckMeta.color }}>{bottleneckMeta.label}</span>
                  {lead.moneyFrictionDetected ? (
                    <span className="text-xs ml-auto px-2 py-0.5 rounded-full" style={{ backgroundColor: "oklch(60% 0.18 25 / 0.12)", color: "oklch(60% 0.18 25)" }}>
                      Money friction detected
                    </span>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {/* Audit Scores */}
          {lead.auditScores && Object.keys(lead.auditScores).length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>Bottleneck Audit Scores</p>
              <div className="space-y-2">
                {Object.entries(lead.auditScores).map(([dim, val]) => {
                  const dimMeta = BOTTLENECK_META[dim];
                  const barColor = dimMeta?.color ?? "var(--color-primary)";
                  const pct = Math.min((val / 10) * 100, 100);
                  return (
                    <div key={dim} className="flex items-center gap-3">
                      <span className="text-xs w-28 capitalize shrink-0" style={{ color: "var(--color-text-muted)" }}>
                        {dimMeta?.label ?? dim.replace(/([A-Z])/g, " $1")}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="text-xs font-medium w-5 text-right" style={{ color: "var(--color-text-base)" }}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Diagnostic Answers */}
          {lead.diagnosticAnswers && Object.keys(lead.diagnosticAnswers).length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>Money Identity Diagnostic</p>
              <div className="space-y-2">
                {Object.entries(lead.diagnosticAnswers).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs capitalize" style={{ color: "var(--color-text-muted)" }}>{key.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(val * 10, 80)}px`, backgroundColor: "var(--color-primary)", opacity: 0.6 }} />
                      <span className="text-xs font-medium w-4 text-right" style={{ color: "var(--color-text-base)" }}>{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Metadata */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-subtle)" }}>Metadata</p>
            <div className="space-y-1.5">
              {[
                { label: "Source", value: lead.source ?? "direct" },
                { label: "Client", value: lead.clientId ?? "keystone" },
                { label: "Owner notified", value: lead.notified ? "Yes" : "No" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span style={{ color: "var(--color-text-subtle)" }}>{label}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-180"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          >
            <Mail className="w-4 h-4" />
            Email {lead.name.split(" ")[0]}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Audit Sessions Tab ───────────────────────────────────────────────────────

function AuditSessionsTab({ audits }: { audits: AuditResult[] }) {
  const [search, setSearch] = useState("");
  const [filterBottleneck, setFilterBottleneck] = useState<string>("all");

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      const matchSearch = !search || a.sessionId.toLowerCase().includes(search.toLowerCase());
      const matchBottleneck = filterBottleneck === "all" || a.primaryBottleneck === filterBottleneck;
      return matchSearch && matchBottleneck;
    });
  }, [audits, search, filterBottleneck]);

  const bottleneckCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    audits.forEach((a) => { if (a.primaryBottleneck) counts[a.primaryBottleneck] = (counts[a.primaryBottleneck] ?? 0) + 1; });
    return counts;
  }, [audits]);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {Object.entries(bottleneckCounts).map(([key, count]) => {
          const meta = BOTTLENECK_META[key] ?? { label: key, color: "var(--color-text-muted)" };
          return (
            <button
              key={key}
              onClick={() => setFilterBottleneck(filterBottleneck === key ? "all" : key)}
              className="rounded-xl p-3 text-left transition-all duration-150"
              style={{
                backgroundColor: filterBottleneck === key ? `${meta.color}18` : "var(--color-bg-surface)",
                border: `1px solid ${filterBottleneck === key ? `${meta.color}40` : "var(--color-border)"}`,
              }}
            >
              <p className="text-xl font-bold" style={{ color: meta.color }}>{count}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{meta.label}</p>
            </button>
          );
        })}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-subtle)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by session ID…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-base)" }}
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--color-bg-sidebar)", borderBottom: "1px solid var(--color-border)" }}>
              {["Session ID", "Primary Bottleneck", "Money Friction", "Scores", "Date"].map((h, i) => (
                <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider${i >= 2 ? " hidden md:table-cell" : ""}${i === 3 ? " hidden lg:table-cell" : ""}`} style={{ color: "var(--color-text-subtle)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-subtle)" }}>No audit sessions found.</td></tr>
            ) : (
              filtered.map((audit, i) => {
                const scores = audit.scores as Record<string, number>;
                return (
                  <tr key={audit.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--color-border)" : "none", backgroundColor: "var(--color-bg-base)" }}>
                    <td className="px-4 py-3"><span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{audit.sessionId.slice(0, 12)}…</span></td>
                    <td className="px-4 py-3"><BottleneckBadge bottleneck={audit.primaryBottleneck} /></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: audit.moneyFrictionDetected ? "oklch(60% 0.18 25 / 0.12)" : "oklch(40% 0 0 / 0.08)", color: audit.moneyFrictionDetected ? "oklch(60% 0.18 25)" : "var(--color-text-subtle)" }}>
                        {audit.moneyFrictionDetected ? "Detected" : "None"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(scores).map(([dim, val]) => (
                          <span key={dim} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                            {dim.slice(0, 3).toUpperCase()} {val}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{formatDate(audit.createdAt)}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminLeads() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"leads" | "audits">("leads");
  const [search, setSearch] = useState("");
  const [filterArchetype, setFilterArchetype] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);

  const { data, isLoading, error } = trpc.admin.getLeads.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  // Auto-redirect signed-in non-admins back to the main app
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)" }} />
      </div>
    );
  }

  if (!user) {
    return <SignInForm />;
  }

  // Signed in but not admin — redirect effect above is handling navigation
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)" }} />
      </div>
    );
  }

  const leads: EnrichedLead[] = (data?.leads ?? []) as EnrichedLead[];
  const audits: AuditResult[] = (data?.audits ?? []) as AuditResult[];

  // ── Sort handler ───────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ── Filter + sort leads ────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    const filtered = leads.filter((l) => {
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
      const matchArch = filterArchetype === "all" || l.moneyArchetype === filterArchetype;
      return matchSearch && matchArch;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "archetype") cmp = (a.moneyArchetype ?? "").localeCompare(b.moneyArchetype ?? "");
      else if (sortKey === "bottleneck") cmp = (a.primaryBottleneck ?? "").localeCompare(b.primaryBottleneck ?? "");
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [leads, search, filterArchetype, sortKey, sortDir]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const archetypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => { if (l.moneyArchetype) counts[l.moneyArchetype] = (counts[l.moneyArchetype] ?? 0) + 1; });
    return counts;
  }, [leads]);

  return (
    <div className="min-h-screen px-6 py-8 lg:px-10">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)", border: "1px solid oklch(55% 0.12 175 / 0.2)" }}>
            <ShieldCheck className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>Admin</p>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>Leads & Diagnostics</h1>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>All captured leads and bottleneck audit sessions across the OS.</p>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Leads", value: leads.length, icon: Users, color: "var(--color-primary)" },
          { label: "Audit Sessions", value: audits.length, icon: BarChart3, color: "var(--color-accent)" },
          { label: "Money Friction", value: audits.filter((a) => a.moneyFrictionDetected).length, icon: AlertTriangle, color: "oklch(60% 0.18 25)" },
          {
            label: "This Month",
            value: leads.filter((l) => {
              const d = new Date(l.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length,
            icon: TrendingUp,
            color: "oklch(60% 0.16 150)",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{stat.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
        {(["leads", "audits"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-150"
            style={{ backgroundColor: activeTab === tab ? "var(--color-primary)" : "transparent", color: activeTab === tab ? "white" : "var(--color-text-muted)" }}
          >
            {tab === "leads" ? `Leads (${leads.length})` : `Audit Sessions (${audits.length})`}
          </button>
        ))}
      </div>

      {/* ── Loading / Error ── */}
      {isLoading && (
        <div className="flex items-center gap-3 py-12 justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)" }} />
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading data…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "oklch(60% 0.18 25 / 0.08)", border: "1px solid oklch(60% 0.18 25 / 0.2)" }}>
          <p className="text-sm font-medium" style={{ color: "oklch(60% 0.18 25)" }}>Failed to load data</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>{error.message}</p>
        </div>
      )}

      {/* ── Leads Tab ── */}
      {!isLoading && !error && activeTab === "leads" && (
        <div>
          {/* Archetype filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilterArchetype("all")}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
              style={{ backgroundColor: filterArchetype === "all" ? "var(--color-primary)" : "var(--color-bg-surface)", color: filterArchetype === "all" ? "white" : "var(--color-text-muted)", border: `1px solid ${filterArchetype === "all" ? "var(--color-primary)" : "var(--color-border)"}` }}
            >
              All ({leads.length})
            </button>
            {Object.entries(archetypeCounts).map(([arch, count]) => {
              const meta = ARCHETYPE_META[arch];
              return (
                <button
                  key={arch}
                  onClick={() => setFilterArchetype(filterArchetype === arch ? "all" : arch)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                  style={{ backgroundColor: filterArchetype === arch ? meta.bg : "var(--color-bg-surface)", color: filterArchetype === arch ? meta.color : "var(--color-text-muted)", border: `1px solid ${filterArchetype === arch ? `${meta.color}40` : "var(--color-border)"}` }}
                >
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--color-text-subtle)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-base)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4" style={{ color: "var(--color-text-subtle)" }} />
              </button>
            )}
          </div>

          {/* Leads table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--color-bg-sidebar)", borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-left px-4 py-3"><SortButton label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} /></th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>Email</th>
                  <th className="text-left px-4 py-3"><SortButton label="Archetype" sortKey="archetype" current={sortKey} dir={sortDir} onSort={handleSort} /></th>
                  <th className="text-left px-4 py-3 hidden md:table-cell"><SortButton label="Bottleneck" sortKey="bottleneck" current={sortKey} dir={sortDir} onSort={handleSort} /></th>
                  <th className="text-left px-4 py-3"><SortButton label="Date" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} /></th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "var(--color-text-subtle)" }}>
                      {leads.length === 0
                        ? "No leads captured yet. Leads appear here when users complete the Money Identity Checkpoint."
                        : "No leads match your current filters."}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, i) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer transition-colors hover:opacity-90"
                      onClick={() => setSelectedLead(lead)}
                      style={{ borderBottom: i < filteredLeads.length - 1 ? "1px solid var(--color-border)" : "none", backgroundColor: "var(--color-bg-base)" }}
                    >
                      <td className="px-4 py-3"><span className="font-medium text-sm" style={{ color: "var(--color-text-base)" }}>{lead.name}</span></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{lead.email}</span></td>
                      <td className="px-4 py-3"><ArchetypeBadge archetype={lead.moneyArchetype} /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><BottleneckBadge bottleneck={lead.primaryBottleneck} /></td>
                      <td className="px-4 py-3"><span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{formatDate(lead.createdAt)}</span></td>
                      <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 ml-auto" style={{ color: "var(--color-text-subtle)" }} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Audit Sessions Tab ── */}
      {!isLoading && !error && activeTab === "audits" && (
        <AuditSessionsTab audits={audits} />
      )}

      {/* ── Lead Detail Drawer ── */}
      {selectedLead && (
        <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
