import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { activeBrand } from "../../../shared/brandConfig";
import {
  LayoutDashboard,
  Search,
  Compass,
  Target,
  Users,
  RefreshCw,
  Building2,
  TrendingUp,
  CalendarDays,
  Map,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignInForm } from "@/components/SignInForm";
import { useOSSession } from "../hooks/useOSSession";
import { useAuth } from "@/_core/hooks/useAuth";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  hidden?: boolean;
  /** Key in OSSessionState that must be true for this item to be unlocked */
  unlockKey?: "isPricingUnlocked" | "isWeeklyRhythmUnlocked" | "isRoadmapUnlocked";
  /** Short hint shown under the label when locked */
  lockHint?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/os",
    icon: LayoutDashboard,
    description: "Overview & progress",
  },
  {
    label: "Business Coach",
    path: "/os/coach",
    icon: Sparkles,
    description: "Ask anything, anytime",
  },
  // Business Snapshot moved to top — it feeds the Audit
  {
    label: "Business Snapshot",
    path: "/os/snapshot",
    icon: Building2,
    description: "Your business on one page",
  },
  {
    label: "Bottleneck Audit",
    path: "/os/audit",
    icon: Search,
    description: "Diagnose your constraints",
  },
  {
    label: "Freedom Blueprint",
    path: "/os/blueprint",
    icon: Compass,
    description: "Design your growth path",
  },
  {
    label: "Goal Dashboard",
    path: "/os/goals",
    icon: Target,
    description: "Your 90-day action focus",
  },
  {
    label: "Delegation Toolkit",
    path: "/os/delegation",
    icon: Users,
    description: "10-80-10 framework",
  },
  {
    label: "Flywheel Toolkit",
    path: "/os/flywheel",
    icon: RefreshCw,
    description: "Reactivate past customers",
  },
  {
    label: "Pricing Toolkit",
    path: "/os/pricing",
    icon: TrendingUp,
    description: "Margin & break-even check",
    unlockKey: "isPricingUnlocked",
    lockHint: "Unlocks after Wealth Reset or Cash audit",
  },
  {
    label: "Weekly Rhythm",
    path: "/os/weekly",
    icon: CalendarDays,
    description: "Plan, execute, review",
    unlockKey: "isWeeklyRhythmUnlocked",
    lockHint: "Unlocks after 21-Day Wealth Reset",
  },
  {
    label: "12-Month Roadmap",
    path: "/os/roadmap",
    icon: Map,
    description: "Your financial direction",
    unlockKey: "isRoadmapUnlocked",
    lockHint: "Unlocks after 21-Day Wealth Reset",
  },
  // Admin — hidden from nav array, rendered separately based on role
  // Money Identity and Wealth Reset are contextual — not in primary nav
  {
    label: "Money Identity",
    path: "/os/money-identity",
    icon: Target,
    description: "Contextual checkpoint",
    hidden: true,
  },
  {
    label: "Wealth Reset",
    path: "/os/wealth-reset",
    icon: Target,
    description: "Financial journey",
    hidden: true,
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const brand = activeBrand;
  const session = useOSSession();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const isPublicPage = location === "/os/audit";

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Prevent body scroll when mobile nav open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const visibleNav = navItems.filter((n) => !n.hidden);

  /** Returns true if the nav item is accessible to the user */
  function isUnlocked(item: NavItem): boolean {
    if (!item.unlockKey) return true;
    return session[item.unlockKey] === true;
  }

  // ── Shared nav item renderer ─────────────────────────────────────────────

  function renderNavItem(item: NavItem, mobile = false) {
    const isActive =
      location === item.path ||
      (item.path !== "/os" && location.startsWith(item.path));
    const unlocked = isUnlocked(item);
    const Icon = item.icon;

    const inner = (
      <div
        className={cn(
          "flex items-center gap-3 px-3 rounded-lg transition-all duration-150 group",
          mobile ? "py-3" : "py-2.5",
          unlocked
            ? isActive
              ? "sidebar-item-active"
              : "hover:bg-white/5 cursor-pointer"
            : "cursor-not-allowed opacity-50"
        )}
        title={!unlocked && item.lockHint ? item.lockHint : undefined}
      >
        {/* Icon */}
        <span
          style={{
            color: !unlocked
              ? "var(--color-text-subtle)"
              : isActive
              ? "var(--color-primary)"
              : "var(--color-text-muted)",
          }}
        >
          <Icon className={cn("shrink-0 transition-colors", mobile ? "w-5 h-5" : "w-4 h-4")} />
        </span>

        {/* Label + description */}
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-medium truncate"
            style={{
              color: !unlocked
                ? "var(--color-text-subtle)"
                : isActive
                ? "var(--color-primary)"
                : "var(--color-text-base)",
            }}
          >
            {item.label}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--color-text-subtle)" }}>
            {!unlocked && item.lockHint ? item.lockHint : item.description}
          </p>
        </div>

        {/* Right indicator */}
        {unlocked && isActive && (
          <ChevronRight
            className="w-3 h-3 ml-auto shrink-0"
            style={{ color: "var(--color-primary)" }}
          />
        )}
        {!unlocked && (
          <Lock
            className="w-3 h-3 ml-auto shrink-0 opacity-60"
            style={{ color: "var(--color-text-subtle)" }}
          />
        )}
      </div>
    );

    if (!unlocked) {
      // Render as non-navigable div when locked
      return <div key={item.path}>{inner}</div>;
    }

    return (
      <Link key={item.path} href={item.path}>
        {inner}
      </Link>
    );
  }

  if (!isPublicPage) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-base)" }}>
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--color-primary)" }} />
        </div>
      );
    }
    if (!user) {
      return <SignInForm />;
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--color-bg-base)" }}>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 fixed inset-y-0 left-0 z-30"
        style={{
          backgroundColor: "var(--color-bg-sidebar)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <img
            src={brand.logoUrl}
            alt={brand.appName}
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* App name + tagline */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-primary)" }}
          >
            {brand.appName}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
            {brand.tagline}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => renderNavItem(item, false))}
          {/* Admin-only entry */}
          {isAdmin && (
            <Link href="/os/admin/leads">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer mt-2",
                  location.startsWith("/os/admin") ? "sidebar-item-active" : "hover:bg-white/5"
                )}
                style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem", marginTop: "0.5rem" }}
              >
                <ShieldCheck
                  className="w-4 h-4 shrink-0"
                  style={{ color: location.startsWith("/os/admin") ? "var(--color-primary)" : "var(--color-text-muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: location.startsWith("/os/admin") ? "var(--color-primary)" : "var(--color-text-base)" }}>Admin</p>
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Leads &amp; diagnostics</p>
                </div>
              </div>
            </Link>
          )}
          {!user && (
            <Link href="/os/coach">
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer mt-2 hover:bg-white/5"
                style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem", marginTop: "0.5rem" }}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-base)" }}>Sign In</p>
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Access your account</p>
                </div>
              </div>
            </Link>
          )}
        </nav>

        {/* Sidebar footer */}
        <div
          className="px-5 py-4"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <a
            href={brand.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <ExternalLink className="w-3 h-3" />
            {brand.websiteUrl.replace("https://", "")}
          </a>
        </div>
      </aside>

      {/* ── Mobile Overlay ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden transition-transform duration-280",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: "var(--color-bg-sidebar)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Mobile header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <img
            src={brand.logoUrl}
            alt={brand.appName}
            className="h-9 w-auto object-contain"
          />
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-primary)" }}>
            {brand.appName}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => renderNavItem(item, true))}
          {isAdmin && (
            <Link href="/os/admin/leads">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 cursor-pointer",
                  location.startsWith("/os/admin") ? "sidebar-item-active" : "hover:bg-white/5"
                )}
                style={{ borderTop: "1px solid var(--color-border)", marginTop: "0.5rem", paddingTop: "0.75rem" }}
              >
                <ShieldCheck
                  className="w-5 h-5 shrink-0"
                  style={{ color: location.startsWith("/os/admin") ? "var(--color-primary)" : "var(--color-text-muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: location.startsWith("/os/admin") ? "var(--color-primary)" : "var(--color-text-base)" }}>Admin</p>
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Leads &amp; diagnostics</p>
                </div>
              </div>
            </Link>
          )}
          {!user && (
            <Link href="/os/coach">
              <div
                className="flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 cursor-pointer hover:bg-white/5"
                style={{ borderTop: "1px solid var(--color-border)", marginTop: "0.5rem", paddingTop: "0.75rem" }}
              >
                <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-base)" }}>Sign In</p>
                  <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>Access your account</p>
                </div>
              </div>
            </Link>
          )}
        </nav>

        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
          <a
            href={brand.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <ExternalLink className="w-3 h-3" />
            {brand.websiteUrl.replace("https://", "")}
          </a>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-20"
          style={{
            backgroundColor: "var(--color-bg-sidebar)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src={brand.logoUrl}
            alt={brand.appName}
            className="h-8 w-auto object-contain"
          />
          <div className="w-9" /> {/* spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
