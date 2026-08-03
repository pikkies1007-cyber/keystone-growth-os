import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import BottleneckAudit from "./pages/BottleneckAudit";
import FreedomBlueprint from "./pages/FreedomBlueprint";
import GoalDashboard from "./pages/GoalDashboard";
import MoneyIdentityCheckpoint from "./pages/MoneyIdentityCheckpoint";
import WealthResetJourney from "./pages/WealthResetJourney";
import DelegationToolkit from "./pages/DelegationToolkit";
import FlywheelToolkit from "./pages/FlywheelToolkit";
import BusinessSnapshot from "./pages/BusinessSnapshot";
import PricingToolkit from "./pages/PricingToolkit";
import WeeklyRhythm from "./pages/WeeklyRhythm";
import FinancialRoadmap from "./pages/FinancialRoadmap";
import AdminLeads from "./pages/AdminLeads";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/audit" component={BottleneckAudit} />
        <Route path="/blueprint" component={FreedomBlueprint} />
        <Route path="/goals" component={GoalDashboard} />
        <Route path="/money-identity" component={MoneyIdentityCheckpoint} />
        <Route path="/wealth-reset" component={WealthResetJourney} />
        <Route path="/delegation" component={DelegationToolkit} />
        <Route path="/flywheel" component={FlywheelToolkit} />
        <Route path="/snapshot" component={BusinessSnapshot} />
        <Route path="/pricing" component={PricingToolkit} />
        <Route path="/weekly" component={WeeklyRhythm} />
        <Route path="/roadmap" component={FinancialRoadmap} />
        <Route path="/admin/leads" component={AdminLeads} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
