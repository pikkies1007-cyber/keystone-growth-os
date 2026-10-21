import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, Plus, Trash2, Users } from "lucide-react";

/**
 * Day-to-day task list shown on the Dashboard. Owners see every task across
 * the business (and can assign one to an employee); employees see only
 * tasks assigned to them — the server (`tasks.list`) already filters this,
 * so the component itself doesn't need to know who's who beyond labelling.
 */
export function TodayTasksWidget({ isEmployee }: { isEmployee: boolean }) {
  const [title, setTitle] = useState("");
  const [assignTo, setAssignTo] = useState<string>("");

  const utils = trpc.useUtils();
  const { data: tasks, isLoading } = trpc.tasks.list.useQuery();
  const { data: team } = trpc.team.list.useQuery(undefined, { enabled: !isEmployee });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setTitle("");
      setAssignTo("");
    },
  });
  const updateStatus = trpc.tasks.updateStatus.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  });

  function handleAdd() {
    if (!title.trim()) return;
    createTask.mutate({
      title: title.trim(),
      dueDate: new Date().toISOString().slice(0, 10),
      assignedToUserId: assignTo ? Number(assignTo) : undefined,
    });
  }

  function toggle(id: number, current: string) {
    updateStatus.mutate({ id, status: current === "completed" ? "pending" : "completed" });
  }

  const open = (tasks ?? []).filter((t) => t.status !== "completed");
  const done = (tasks ?? []).filter((t) => t.status === "completed");

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-primary)" }}>
        Today
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        {isEmployee ? "Your tasks for the business" : "What needs to happen today, across the whole team"}
      </p>

      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
          Loading…
        </p>
      ) : (tasks ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
          Nothing on the list yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {[...open, ...done].map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 py-1.5 group">
              <button onClick={() => toggle(t.id, t.status)} className="shrink-0" aria-label="Toggle complete">
                {t.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                ) : (
                  <Circle className="w-4 h-4" style={{ color: "var(--color-text-subtle)" }} />
                )}
              </button>
              <span
                className="flex-1 text-sm"
                style={{
                  color: t.status === "completed" ? "var(--color-text-subtle)" : "var(--color-text-base)",
                  textDecoration: t.status === "completed" ? "line-through" : "none",
                }}
              >
                {t.title}
              </span>
              {!isEmployee && t.assignedToUserId && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-muted)" }}>
                  <Users className="w-2.5 h-2.5" /> assigned
                </span>
              )}
              <button
                onClick={() => deleteTask.mutate({ id: t.id })}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--color-text-subtle)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 flex flex-col sm:flex-row gap-2" style={{ borderTop: "1px solid var(--color-border)" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a task for today…"
          className="flex-1 text-sm px-3 py-2 rounded-lg"
          style={{ border: "1px solid var(--color-border-light)", backgroundColor: "var(--color-bg-base)", color: "var(--color-text-base)" }}
        />
        {!isEmployee && team && team.length > 0 && (
          <select
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--color-border-light)", backgroundColor: "var(--color-bg-base)", color: "var(--color-text-base)" }}
          >
            <option value="">Assign to me</option>
            {team.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || member.email}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleAdd}
          disabled={!title.trim() || createTask.isPending}
          className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
}
