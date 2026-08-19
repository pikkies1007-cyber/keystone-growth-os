import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import LandingPage from "./pages/LandingPage";
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
import BusinessCoach from "./pages/BusinessCoach";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Switch>
            {/* Marketing landing page — no app chrome, this is what keystonebusinessgroup.co.za shows */}
            <Route path="/" component={LandingPage} />

            {/* Everything else is the actual Growth OS app, under /os */}
            <Route>
              <AppLayout>
                <Switch>
                  <Route path="/os" component={Dashboard} />
                  <Route path="/os/audit" component={BottleneckAudit} />
                  <Route path="/os/blueprint" component={FreedomBlueprint} />
                  <Route path="/os/goals" component={GoalDashboard} />
                  <Route path="/os/money-identity" component={MoneyIdentityCheckpoint} />
                  <Route path="/os/wealth-reset" component={WealthResetJourney} />
                  <Route path="/os/delegation" component={DelegationToolkit} />
                  <Route path="/os/flywheel" component={FlywheelToolkit} />
                  <Route path="/os/snapshot" component={BusinessSnapshot} />
                  <Route path="/os/pricing" component={PricingToolkit} />
                  <Route path="/os/weekly" component={WeeklyRhythm} />
                  <Route path="/os/roadmap" component={FinancialRoadmap} />
                  <Route path="/os/coach" component={BusinessCoach} />
                  <Route path="/os/admin/leads" component={AdminLeads} />
                  <Route component={NotFound} />
                </Switch>
              </AppLayout>
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
