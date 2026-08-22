import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, ChevronDown } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8" style={{ backgroundColor: "var(--color-bg-base)" }}>
          <div className="flex flex-col items-center w-full max-w-md p-8 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: "oklch(60% 0.18 25 / 0.12)" }}
            >
              <AlertTriangle size={26} style={{ color: "oklch(60% 0.18 25)" }} />
            </div>

            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-base)" }}>
              Something went wrong on this page
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              This part of the app hit a snag. Reloading usually fixes it — your data is safe.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}
            >
              <RotateCcw size={15} />
              Reload Page
            </button>

            <button
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              className="flex items-center gap-1 mt-6 text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-subtle)" }}
            >
              Technical details
              <ChevronDown size={12} className={cn("transition-transform", this.state.showDetails && "rotate-180")} />
            </button>
            {this.state.showDetails && (
              <div
                className="mt-3 p-3 w-full rounded-lg overflow-auto text-left"
                style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border)", maxHeight: "12rem" }}
              >
                <pre className="text-xs whitespace-pre-wrap" style={{ color: "var(--color-text-subtle)" }}>
                  {this.state.error?.stack ?? this.state.error?.message}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
