import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UserPlus, Mail, Clock } from "lucide-react";

/**
 * Owner-only widget: invite employees by email. There's no separate signup —
 * the invitee just signs in (existing magic-link flow) with the email they
 * were invited on, and the backend recognises the pending invite and sets
 * up their account as an employee of this business automatically.
 */
export function TeamWidget() {
  const [email, setEmail] = useState("");
  const utils = trpc.useUtils();
  const { data: team } = trpc.team.list.useQuery();
  const { data: invites } = trpc.team.listInvites.useQuery();
  const invite = trpc.team.invite.useMutation({
    onSuccess: () => {
      utils.team.listInvites.invalidate();
      setEmail("");
    },
  });

  function handleInvite() {
    if (!email.trim()) return;
    invite.mutate({ email: email.trim() });
  }

  const pendingInvites = (invites ?? []).filter((i) => i.status === "pending");

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-primary)" }}>
        Your Team
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        Invite someone to see and work their own tasks here.
      </p>

      {(team && team.length > 0) || pendingInvites.length > 0 ? (
        <div className="space-y-2 mb-4">
          {(team ?? []).map((member) => (
            <div key={member.id} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-base)" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-primary)" }} />
              {member.name || member.email}
            </div>
          ))}
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-subtle)" }}>
              <Clock className="w-3 h-3 shrink-0" />
              {inv.email} — invited, not signed in yet
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm mb-4" style={{ color: "var(--color-text-subtle)" }}>
          No teammates yet.
        </p>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-subtle)" }} />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="employee@email.com"
            className="w-full text-sm pl-9 pr-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--color-border-light)", backgroundColor: "var(--color-bg-base)", color: "var(--color-text-base)" }}
          />
        </div>
        <button
          onClick={handleInvite}
          disabled={!email.trim() || invite.isPending}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
        >
          <UserPlus className="w-4 h-4" />
          Invite
        </button>
      </div>
      {invite.error && (
        <p className="text-xs mt-2" style={{ color: "#A32D2D" }}>
          {invite.error.message}
        </p>
      )}
    </div>
  );
}
