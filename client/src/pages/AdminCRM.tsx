import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SignInForm } from "@/components/SignInForm";
import { Sparkles, Plus, X, TrendingUp, Users, Clock3, DollarSign } from "lucide-react";

// Mirrors Sulette's real "Keystone deal" workflow from her DebtSuccess CRM —
// same stage names, same directors, same routes — so the pipeline feels
// identical to the one she already works in day to day.
const STAGES = [
  "Audit completed",
  "Discovery meeting booked",
  "Discovery meeting held",
  "SLA sent",
  "SLA signed",
  "Documents & baseline",
  "Term 1 (set-up, no fee)",
  "Profit share active",
  "Completed",
  "Lost",
] as const;
type Stage = (typeof STAGES)[number];

const DIRECTORS = [
  { name: "Sulette", role: "Systems, connection & finance" },
  { name: "Clifford", role: "Sales & websites" },
  { name: "Mauritz", role: "Contracts & accounting" },
] as const;
type Director = (typeof DIRECTORS)[number]["name"];

const ROUTES = ["Sales", "Delegation", "Funding"] as const;
type Route = (typeof ROUTES)[number];
const ROUTE_DIRECTOR: Record<Route, Director> = { Sales: "Clifford", Delegation: "Sulette", Funding: "Sulette" };

// Deals before "SLA signed" count as inquiry-stage; from there they're active.
const ACTIVE_FROM = STAGES.indexOf("SLA signed");

type ClientRow = {
  id: number;
  name: string;
  businessName: string | null;
  contact: string | null;
  stage: Stage;
  assignedTo: Director | null;
  route: Route | null;
  bottleneck: string | null;
  discoveryDate: string | null;
  slaSentDate: string | null;
  slaSignedDate: string | null;
  cipcReceived: boolean;
  financialsReceived: boolean;
  baselineNetProfit: string | null;
  baselineAgreedDate: string | null;
  startDate: string | null;
  sharePct: number;
  termMonths: number;
  contractMonths: number;
  value: string | null;
  source: string | null;
  notes: string | null;
  lostReason: string | null;
  followUpDate: string | null;
  createdAt: Date | string;
};

export default function AdminCRM() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<ClientRow | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.listClients.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });
  const clients = (data ?? []) as ClientRow[];

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/os");
  }, [user, navigate]);

  const createClient = trpc.admin.createClient.useMutation({
    onSuccess: () => {
      utils.admin.listClients.invalidate();
      setShowAdd(false);
    },
  });
  const updateClient = trpc.admin.updateClient.useMutation({
    onSuccess: () => {
      utils.admin.listClients.invalidate();
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)" }} />
      </div>
    );
  }
  if (!user) return <SignInForm />;
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)" }} />
      </div>
    );
  }

  const activeDeals = clients.filter((c) => STAGES.indexOf(c.stage) >= ACTIVE_FROM && c.stage !== "Lost");
  const totalPipelineValue = clients
    .filter((c) => c.stage !== "Lost" && c.stage !== "Completed")
    .reduce((sum, c) => sum + (c.value ? Number(c.value) : 0), 0);
  const profitShareActive = clients.filter((c) => c.stage === "Profit share active").length;
  const today = new Date().toISOString().slice(0, 10);
  const needFollowUp = clients.filter((c) => c.followUpDate && c.followUpDate <= today && c.stage !== "Lost" && c.stage !== "Completed").length;

  return (
    <div className="min-h-screen px-6 py-8 lg:px-10">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "oklch(55% 0.12 175 / 0.12)", border: "1px solid oklch(55% 0.12 175 / 0.2)" }}>
            <Sparkles className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
              Your Clients
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Keystone Business Group's own deal pipeline — not visible to subscribers
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg"
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* ── Insights bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Active pipeline value", value: `R${totalPipelineValue.toLocaleString("en-ZA")}`, icon: DollarSign },
          { label: "Active deals", value: activeDeals.length, icon: Users },
          { label: "Profit share active", value: profitShareActive, icon: TrendingUp },
          { label: "Need follow-up", value: needFollowUp, icon: Clock3 },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="rounded-lg p-3" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
              <Icon className="w-4 h-4 mb-2" style={{ color: "var(--color-primary)" }} />
              <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>{t.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{t.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Add client form ── */}
      {showAdd && <AddClientForm onCancel={() => setShowAdd(false)} onSave={(v) => createClient.mutate(v)} saving={createClient.isPending} />}

      {/* ── Pipeline board ── */}
      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STAGES.map((stage) => {
            const stageClients = clients.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                  {stage} <span style={{ color: "var(--color-text-subtle)" }}>({stageClients.length})</span>
                </p>
                <div className="space-y-2">
                  {stageClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="w-full text-left rounded-lg p-3 transition-colors hover:opacity-90"
                      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
                    >
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-base)" }}>{c.name}</p>
                      {c.businessName && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{c.businessName}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {c.assignedTo && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-muted)" }}>
                            {c.assignedTo}
                          </span>
                        )}
                        {c.route && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-muted)" }}>
                            {c.route}
                          </span>
                        )}
                      </div>
                      {c.value && (
                        <p className="text-xs mt-1 font-medium" style={{ color: "var(--color-primary)" }}>
                          R{Number(c.value).toLocaleString("en-ZA")}
                        </p>
                      )}
                      {c.followUpDate && c.followUpDate <= today && (
                        <p className="text-[10px] mt-1 font-semibold" style={{ color: "#854F0B" }}>Follow up due</p>
                      )}
                    </button>
                  ))}
                  {stageClients.length === 0 && (
                    <p className="text-xs italic" style={{ color: "var(--color-text-subtle)" }}>Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit panel ── */}
      {selected && (
        <EditClientPanel
          client={selected}
          onClose={() => setSelected(null)}
          onSave={(patch) => {
            updateClient.mutate({ id: selected.id, ...patch });
            setSelected(null);
          }}
          saving={updateClient.isPending}
        />
      )}
    </div>
  );
}

// ── Add client form ──────────────────────────────────────────────────────────

function AddClientForm({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: (v: {
    name: string;
    businessName?: string;
    contact?: string;
    route?: Route;
    assignedTo?: Director;
    bottleneck?: string;
    value?: number;
    source?: string;
  }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  const [route, setRoute] = useState<Route>("Delegation");
  const [bottleneck, setBottleneck] = useState("");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("");

  return (
    <div className="mb-6 rounded-xl p-5" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-base)" }}>Add a client</p>
        <button onClick={onCancel} aria-label="Close"><X className="w-4 h-4" style={{ color: "var(--color-text-subtle)" }} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name *" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <select value={route} onChange={(e) => setRoute(e.target.value as Route)} className="text-sm px-3 py-2 rounded-lg" style={inputStyle}>
          {ROUTES.map((r) => (
            <option key={r} value={r}>{r} — {ROUTE_DIRECTOR[r]}</option>
          ))}
        </select>
        <input value={bottleneck} onChange={(e) => setBottleneck(e.target.value)} placeholder="Bottleneck identified" className="text-sm px-3 py-2 rounded-lg sm:col-span-2" style={inputStyle} />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Estimated value (R)" type="number" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (referral, audit, etc.)" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
      </div>
      <button
        onClick={() =>
          onSave({
            name: name.trim(),
            businessName: businessName.trim() || undefined,
            contact: contact.trim() || undefined,
            route,
            assignedTo: ROUTE_DIRECTOR[route],
            bottleneck: bottleneck.trim() || undefined,
            value: value ? Number(value) : undefined,
            source: source.trim() || undefined,
          })
        }
        disabled={!name.trim() || saving}
        className="mt-3 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        style={{ backgroundColor: "var(--color-primary)", color: "white" }}
      >
        {saving ? "Saving…" : "Save client"}
      </button>
    </div>
  );
}

// ── Edit panel ───────────────────────────────────────────────────────────────

type ClientPatch = {
  stage?: Stage;
  assignedTo?: Director;
  route?: Route;
  bottleneck?: string;
  discoveryDate?: string;
  slaSentDate?: string;
  slaSignedDate?: string;
  cipcReceived?: boolean;
  financialsReceived?: boolean;
  baselineNetProfit?: number;
  baselineAgreedDate?: string;
  startDate?: string;
  sharePct?: number;
  termMonths?: number;
  contractMonths?: number;
  notes?: string;
  lostReason?: string;
  followUpDate?: string;
};

function EditClientPanel({
  client,
  onClose,
  onSave,
  saving,
}: {
  client: ClientRow;
  onClose: () => void;
  onSave: (patch: ClientPatch) => void;
  saving: boolean;
}) {
  const [stage, setStage] = useState<Stage>(client.stage);
  const [assignedTo, setAssignedTo] = useState<Director>(client.assignedTo ?? "Sulette");
  const [route, setRoute] = useState<Route>(client.route ?? "Delegation");
  const [bottleneck, setBottleneck] = useState(client.bottleneck ?? "");
  const [discoveryDate, setDiscoveryDate] = useState(client.discoveryDate ?? "");
  const [slaSentDate, setSlaSentDate] = useState(client.slaSentDate ?? "");
  const [slaSignedDate, setSlaSignedDate] = useState(client.slaSignedDate ?? "");
  const [cipcReceived, setCipcReceived] = useState(client.cipcReceived);
  const [financialsReceived, setFinancialsReceived] = useState(client.financialsReceived);
  const [baselineNetProfit, setBaselineNetProfit] = useState(client.baselineNetProfit ?? "");
  const [baselineAgreedDate, setBaselineAgreedDate] = useState(client.baselineAgreedDate ?? "");
  const [startDate, setStartDate] = useState(client.startDate ?? "");
  const [sharePct, setSharePct] = useState(String(client.sharePct ?? 30));
  const [notes, setNotes] = useState(client.notes ?? "");
  const [lostReason, setLostReason] = useState(client.lostReason ?? "");
  const [followUpDate, setFollowUpDate] = useState(client.followUpDate ?? "");

  const utils = trpc.useUtils();
  const { data: termsData } = trpc.admin.getClientTerms.useQuery({ clientId: client.id });
  const recordTerm = trpc.admin.recordClientTerm.useMutation({
    onSuccess: () => utils.admin.getClientTerms.invalidate({ clientId: client.id }),
  });
  const terms = termsData ?? [];
  const showTerms = STAGES.indexOf(stage) >= STAGES.indexOf("Term 1 (set-up, no fee)");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-semibold" style={{ color: "var(--color-text-base)" }}>{client.name}</p>
            {client.businessName && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{client.businessName}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"><X className="w-4 h-4" style={{ color: "var(--color-text-subtle)" }} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="w-full text-sm px-3 py-2 rounded-lg" style={inputStyle}>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Director</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value as Director)} className="w-full text-sm px-3 py-2 rounded-lg" style={inputStyle}>
              {DIRECTORS.map((d) => (
                <option key={d.name} value={d.name}>{d.name} — {d.role}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Route</label>
        <select value={route} onChange={(e) => setRoute(e.target.value as Route)} className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={inputStyle}>
          {ROUTES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Bottleneck identified</label>
        <input value={bottleneck} onChange={(e) => setBottleneck(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={inputStyle} />

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Discovery</label>
            <input type="date" value={discoveryDate} onChange={(e) => setDiscoveryDate(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded-lg" style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>SLA sent</label>
            <input type="date" value={slaSentDate} onChange={(e) => setSlaSentDate(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded-lg" style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>SLA signed</label>
            <input type="date" value={slaSignedDate} onChange={(e) => setSlaSignedDate(e.target.value)} className="w-full text-xs px-2 py-1.5 rounded-lg" style={inputStyle} />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-base)" }}>
            <input type="checkbox" checked={cipcReceived} onChange={(e) => setCipcReceived(e.target.checked)} />
            CIPC received
          </label>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-base)" }}>
            <input type="checkbox" checked={financialsReceived} onChange={(e) => setFinancialsReceived(e.target.checked)} />
            Financials received
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Baseline net profit (R)</label>
            <input type="number" value={baselineNetProfit} onChange={(e) => setBaselineNetProfit(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Baseline agreed</label>
            <input type="date" value={baselineAgreedDate} onChange={(e) => setBaselineAgreedDate(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Contract start</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Keystone fee %</label>
            <input type="number" value={sharePct} onChange={(e) => setSharePct(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg" style={inputStyle} />
          </div>
        </div>

        {showTerms && (
          <div className="mb-3">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Billing terms ({client.sharePct ?? 30}% of growth above baseline — term 1 is set-up, no fee)
            </label>
            <TermsTable
              clientId={client.id}
              baseline={baselineNetProfit ? Number(baselineNetProfit) : null}
              sharePct={Number(sharePct) || 30}
              terms={terms}
              onRecord={(t) => recordTerm.mutate(t)}
            />
          </div>
        )}

        {stage === "Lost" && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Why was this lost?</label>
            <textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={2} className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={inputStyle} />
          </>
        )}

        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Follow-up date</label>
        <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={inputStyle} />

        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full text-sm px-3 py-2 rounded-lg mb-4" style={inputStyle} />

        <button
          onClick={() =>
            onSave({
              stage,
              assignedTo,
              route,
              bottleneck: bottleneck.trim() || undefined,
              discoveryDate: discoveryDate || undefined,
              slaSentDate: slaSentDate || undefined,
              slaSignedDate: slaSignedDate || undefined,
              cipcReceived,
              financialsReceived,
              baselineNetProfit: baselineNetProfit ? Number(baselineNetProfit) : undefined,
              baselineAgreedDate: baselineAgreedDate || undefined,
              startDate: startDate || undefined,
              sharePct: sharePct ? Number(sharePct) : undefined,
              notes: notes.trim() || undefined,
              lostReason: lostReason.trim() || undefined,
              followUpDate: followUpDate || undefined,
            })
          }
          disabled={saving}
          className="w-full text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ── Billing terms table ─────────────────────────────────────────────────────

function TermsTable({
  clientId,
  baseline,
  sharePct,
  terms,
  onRecord,
}: {
  clientId: number;
  baseline: number | null;
  sharePct: number;
  terms: { termNumber: number; netProfit: string | null; feeAmount: string | null; paidDate: string | null }[];
  onRecord: (t: { clientId: number; termNumber: number; netProfit?: number; feeAmount?: number; paidDate?: string }) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const termNumbers = [1, 2, 3, 4];

  return (
    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "var(--color-text-muted)" }}>
          <th className="text-left py-1">Term</th>
          <th className="text-right py-1">Net profit (R)</th>
          <th className="text-right py-1">Growth</th>
          <th className="text-right py-1">Fee</th>
          <th className="text-right py-1">Paid</th>
        </tr>
      </thead>
      <tbody>
        {termNumbers.map((n) => {
          const existing = terms.find((t) => t.termNumber === n);
          const draft = drafts[n] ?? (existing?.netProfit ?? "");
          const netProfit = draft ? Number(draft) : null;
          const growth = netProfit != null && baseline != null ? netProfit - baseline : null;
          const fee = n === 1 ? 0 : growth != null && growth > 0 ? growth * (sharePct / 100) : growth != null ? 0 : null;
          return (
            <tr key={n} style={{ borderTop: "1px solid var(--color-border)" }}>
              <td className="py-1.5 font-semibold" style={{ color: "var(--color-text-base)" }}>
                Term {n} {n === 1 && <span className="font-normal" style={{ color: "var(--color-text-subtle)" }}>(set-up)</span>}
              </td>
              <td className="text-right py-1.5">
                <input
                  type="number"
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [n]: e.target.value }))}
                  placeholder="later"
                  className="w-20 text-right px-1.5 py-1 rounded"
                  style={inputStyle}
                />
              </td>
              <td className="text-right py-1.5" style={{ color: growth == null ? "var(--color-text-subtle)" : growth >= 0 ? "#2E7D32" : "#C62828" }}>
                {growth == null ? "—" : `R${growth.toLocaleString("en-ZA")}`}
              </td>
              <td className="text-right py-1.5 font-semibold" style={{ color: "var(--color-text-base)" }}>
                {fee == null ? "—" : `R${fee.toLocaleString("en-ZA")}`}
              </td>
              <td className="text-right py-1.5">
                {existing?.paidDate ? (
                  <span style={{ color: "#2E7D32" }}>✓ {existing.paidDate}</span>
                ) : (
                  <button
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "var(--color-bg-base)", border: "1px solid var(--color-border)" }}
                    onClick={() =>
                      onRecord({
                        clientId,
                        termNumber: n,
                        netProfit: netProfit ?? undefined,
                        feeAmount: fee ?? undefined,
                        paidDate: new Date().toISOString().slice(0, 10),
                      })
                    }
                  >
                    Save
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-border-light)",
  backgroundColor: "var(--color-bg-base)",
  color: "var(--color-text-base)",
};
