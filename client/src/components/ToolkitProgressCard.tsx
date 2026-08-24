import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoiceOrTextInput } from "@/components/VoiceOrTextInput";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

// Suggestion text is saved as plain text (e.g. "Open Flywheel Toolkit"), with
// no link stored alongside it. Map known toolkit labels back to their route
// so these can render as real clickable links instead of static text.
const TOOLKIT_LABEL_TO_ROUTE: Record<string, string> = {
  "Delegation Toolkit": "/os/delegation",
  "Flywheel Toolkit": "/os/flywheel",
  "Pricing Toolkit": "/os/pricing",
  "Weekly Rhythm": "/os/weekly",
  "12-Month Roadmap": "/os/roadmap",
  "Freedom Blueprint": "/os/blueprint",
  "Goal Dashboard": "/os/goals",
  "Wealth Reset Journey": "/os/wealth-reset",
};

function findToolkitRoute(suggestionText: string): string | null {
  for (const [label, route] of Object.entries(TOOLKIT_LABEL_TO_ROUTE)) {
    if (suggestionText.includes(label)) return route;
  }
  return null;
}

export function ToolkitProgressCard({
  toolkitKey,
  label,
  completedAt,
}: {
  toolkitKey: string;
  label: string;
  completedAt: string | Date;
}) {
  const utils = trpc.useUtils();
  const { data: suggestions } = trpc.suggestions.listByToolkit.useQuery({ toolkitKey });
  const { data: entries } = trpc.winsLearnings.listByToolkit.useQuery({ toolkitKey });

  const [statusError, setStatusError] = useState<string | null>(null);
  const updateStatus = trpc.suggestions.updateStatus.useMutation({
    onSuccess: () => {
      setStatusError(null);
      utils.suggestions.listByToolkit.invalidate({ toolkitKey });
    },
    onError: (err) => setStatusError(err.message),
  });
  const addEntry = trpc.winsLearnings.add.useMutation({
    onSuccess: () => {
      utils.winsLearnings.listByToolkit.invalidate({ toolkitKey });
      setNote("");
    },
  });

  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"win" | "learning">("win");

  const done = suggestions?.filter((s) => s.status === "done").length ?? 0;
  const total = suggestions?.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{label}</CardTitle>
          <p className="text-sm text-muted-foreground">Completed {format(new Date(completedAt), "d MMM yyyy")}</p>
        </div>
        {total > 0 && (
          <Badge variant="secondary">
            {done}/{total} actions done
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggested actions</p>
            {statusError && <p className="text-xs text-destructive">{statusError}</p>}
            {suggestions.map((s) => {
              const route = findToolkitRoute(s.suggestionText);
              return (
                <div key={s.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={s.status === "done"}
                    disabled={updateStatus.isPending}
                    onCheckedChange={(checked) =>
                      updateStatus.mutate({ id: s.id, status: checked ? "done" : "not_started" })
                    }
                  />
                  {route ? (
                    <Link href={route}>
                      <a
                        className={`flex items-center gap-1 hover:underline ${s.status === "done" ? "line-through text-muted-foreground" : "text-primary"}`}
                      >
                        {s.suggestionText}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </Link>
                  ) : (
                    <span className={s.status === "done" ? "line-through text-muted-foreground" : ""}>
                      {s.suggestionText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Wins &amp; learnings</p>
          {entries && entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="text-sm border-l-2 pl-3"
                  style={{ borderColor: e.type === "win" ? "#16a34a" : "#ca8a04" }}
                >
                  <span className="font-medium">{e.type === "win" ? "Win — " : "Learning — "}</span>
                  {e.content}
                  <span className="block text-xs text-muted-foreground">{format(new Date(e.createdAt), "d MMM")}</span>
                </div>
              ))}
            </div>
          )}
          <VoiceOrTextInput value={note} onChange={setNote} placeholder="What happened when you tried this?" rows={2} />
          <div className="flex items-center gap-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as "win" | "learning")}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="win">Win</option>
              <option value="learning">Learning</option>
            </select>
            <Button
              size="sm"
              disabled={!note.trim() || addEntry.isPending}
              onClick={() => addEntry.mutate({ toolkitKey, type: noteType, content: note.trim() })}
            >
              {addEntry.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
