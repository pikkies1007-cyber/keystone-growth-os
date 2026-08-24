import { trpc } from "@/lib/trpc";
import { ToolkitProgressCard } from "@/components/ToolkitProgressCard";

const TOOLKIT_LABELS: Record<string, string> = {
  "business-snapshot": "Business Snapshot",
  "bottleneck-audit": "Bottleneck Audit",
  delegation: "10-80-10 Delegation",
  pricing: "Pricing Confidence",
  flywheel: "Flywheel Principle",
  "weekly-rhythm": "Weekly Rhythm",
  roadmap: "12-Month Roadmap",
};

export default function ProgressDashboard() {
  const { data: completed, isLoading } = trpc.toolkitSubmissions.listCompleted.useQuery();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading your progress…</div>;
  }

  if (!completed?.length) {
    return (
      <div className="p-8 text-center text-muted-foreground max-w-md mx-auto">
        No toolkits completed yet — once you finish one (starting with the Business Snapshot), it'll show up here
        with your suggested next actions and a place to log what actually happens.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Your Progress</h1>
        <p className="text-muted-foreground">
          Every toolkit you've completed, what it told you to do, and what's actually happened since.
        </p>
      </div>
      {completed.map((submission) => (
        <ToolkitProgressCard
          key={submission.toolkitKey}
          toolkitKey={submission.toolkitKey}
          label={TOOLKIT_LABELS[submission.toolkitKey] ?? submission.toolkitKey}
          completedAt={submission.submittedAt}
        />
      ))}
    </div>
  );
}
