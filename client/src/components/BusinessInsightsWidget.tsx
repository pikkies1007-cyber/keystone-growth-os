import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TrendingUp, UserX, Clock3, FileText, Plus, X } from "lucide-react";

/**
 * Owner-facing "Insights" widget for the main Dashboard — modelled on the
 * Insight panel from Sulette's own DebtSuccess CRM: a handful of plain-
 * English numbers about the business right now (inquiries, declined, need
 * follow-up, invoices sent), plus a quick way to log a new inquiry or
 * invoice without leaving the dashboard.
 */
export function BusinessInsightsWidget() {
  const [showAddInquiry, setShowAddInquiry] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [source, setSource] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.dashboard.insights.useQuery({ days: 30 });
  const createInquiry = trpc.inquiries.create.useMutation({
    onSuccess: () => {
      utils.dashboard.insights.invalidate();
      utils.inquiries.list.invalidate();
      setName("");
      setContact("");
      setSource("");
      setShowAddInquiry(false);
    },
  });

  function handleAdd() {
    if (!name.trim()) return;
    createInquiry.mutate({ name: name.trim(), contact: contact.trim() || undefined, source: source.trim() || undefined });
  }

  const tiles = [
    { label: "Inquiries (30d)", value: data?.inquiriesTotal ?? 0, icon: TrendingUp, color: "var(--color-primary)" },
    { label: "Declined", value: data?.inquiriesDeclined ?? 0, icon: UserX, color: "#A32D2D" },
    { label: "Need follow-up", value: data?.inquiriesNeedFollowUp ?? 0, icon: Clock3, color: "#854F0B" },
    { label: "Invoices sent", value: data?.invoicesSent ?? 0, icon: FileText, color: "var(--color-accent)" },
  ];

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>
            Your Business
          </p>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Last 30 days at a glance
          </p>
        </div>
        <button
          onClick={() => setShowAddInquiry((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
        >
          {showAddInquiry ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddInquiry ? "Cancel" : "Log Inquiry"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className="rounded-lg p-3"
              style={{ backgroundColor: "var(--color-bg-base)", border: "1px solid var(--color-border)" }}
            >
              <Icon className="w-4 h-4 mb-2" style={{ color: t.color }} />
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-base)" }}>
                {isLoading ? "–" : t.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {t.label}
              </p>
            </div>
          );
        })}
      </div>

      {showAddInquiry && (
        <div
          className="mt-4 pt-4 flex flex-col sm:flex-row gap-2"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Who's the inquiry from?"
            className="flex-1 text-sm px-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--color-border-light)", backgroundColor: "var(--color-bg-base)", color: "var(--color-text-base)" }}
          />
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone or email (optional)"
            className="flex-1 text-sm px-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--color-border-light)", backgroundColor: "var(--color-bg-base)", color: "var(--color-text-base)" }}
          />
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (optional)"
            className="sm:w-36 text-sm px-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--color-border-light)", backgroundColor: "var(--color-bg-base)", color: "var(--color-text-base)" }}
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim() || createInquiry.isPending}
            className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          >
            {createInquiry.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
