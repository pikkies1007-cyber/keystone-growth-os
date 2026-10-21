import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SignInForm } from "@/components/SignInForm";
import { Sparkles, Plus, X, TrendingUp, Users, Clock3, DollarSign } from "lucide-react";

type Stage = "lead" | "contacted" | "proposal" | "client" | "declined";

const STAGES: { key: Stage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "proposal", label: "Proposal Sent" },
  { key: "client", label: "Client" },
  { key: "declined", label: "Declined" },
];

type ClientRow = {
  id: number;
  name: string;
  businessName: string | null;
  contact: string | null;
  stage: Stage;
  value: string | null;
  source: string | null;
  notes: string | null;
  declinedReason: string | null;
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

  const totalPipelineValue = clients
    .filter((c) => c.stage !== "declined")
    .reduce((sum, c) => sum + (c.value ? Number(c.value) : 0), 0);
  const activeClients = clients.filter((c) => c.stage === "client").length;
  const today = new Date().toISOString().slice(0, 10);
  const needFollowUp = clients.filter((c) => c.followUpDate && c.followUpDate <= today && c.stage !== "declined" && c.stage !== "client").length;

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
              Keystone Business Group's own pipeline — not visible to subscribers
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
          { label: "Pipeline value", value: `R${totalPipelineValue.toLocaleString("en-ZA")}`, icon: DollarSign },
          { label: "Active clients", value: activeClients, icon: Users },
          { label: "Need follow-up", value: needFollowUp, icon: Clock3 },
          { label: "Total in pipeline", value: clients.length, icon: TrendingUp },
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
            const stageClients = clients.filter((c) => c.stage === stage.key);
            return (
              <div key={stage.key} className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                  {stage.label} <span style={{ color: "var(--color-text-subtle)" }}>({stageClients.length})</span>
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
  onSave: (v: { name: string; businessName?: string; contact?: string; value?: number; source?: string; notes?: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("");

  return (
    <div className="mb-6 rounded-xl p-5" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-base)" }}>Add a client</p>
        <button onClick={onCancel} aria-label="Close"><X className="w-4 h-4" style={{ color: "var(--color-text-subtle)" }} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Estimated value (R)" type="number" className="text-sm px-3 py-2 rounded-lg" style={inputStyle} />
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (referral, audit, etc.)" className="text-sm px-3 py-2 rounded-lg sm:col-span-2" style={inputStyle} />
      </div>
      <button
        onClick={() =>
          onSave({
            name: name.trim(),
            businessName: businessName.trim() || undefined,
            contact: contact.trim() || undefined,
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

function EditClientPanel({
  client,
  onClose,
  onSave,
  saving,
}: {
  client: ClientRow;
  onClose: () => void;
  onSave: (patch: { stage?: Stage; notes?: string; declinedReason?: string; followUpDate?: string; value?: number }) => void;
  saving: boolean;
}) {
  const [stage, setStage] = useState<Stage>(client.stage);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [followUpDate, setFollowUpDate] = useState(client.followUpDate ?? "");
  const [declinedReason, setDeclinedReason] = useState(client.declinedReason ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl p-5 max-h-[85vh] overflow-y-auto"
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

        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Stage</label>
        <select value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={inputStyle}>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        {stage === "declined" && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Why did they decline?</label>
            <textarea value={declinedReason} onChange={(e) => setDeclinedReason(e.target.value)} rows={2} className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={inputStyle} />
          </>
        )}

        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Follow-up date</label>
        <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg mb-3" style={inputStyle} />

        <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full text-sm px-3 py-2 rounded-lg mb-4" style={inputStyle} />

        <button
          onClick={() => onSave({ stage, notes: notes.trim() || undefined, declinedReason: declinedReason.trim() || undefined, followUpDate: followUpDate || undefined })}
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

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-border-light)",
  backgroundColor: "var(--color-bg-base)",
  color: "var(--color-text-base)",
};
