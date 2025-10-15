import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import EnhancedChatbotUI from "@/components/EnhancedChatbotUI";
import FormatterTest from "@/pages/formatter-test";
import DirectionsPage from "@/pages/directions";
import ServiceHistoryPage from "@/pages/service-history";
import Dashboard from "@/pages/dashboard";
import LiveConversationsPage from "@/pages/live-conversations";
import ConversationInsightsPage from "@/pages/conversation-insights";
import CustomerDatabasePage from "@/pages/customer-database";
import BusinessSettingsPage from "@/pages/business-settings";
import DemoPage from "@/pages/demo";
import HomePage from "@/pages/home";
import SchedulePage from "@/pages/Schedule";
import LoyaltyPointsPage from "@/pages/rewards";
import DashboardNavButton from "@/components/DashboardNavButton";
import { QuickActionButton } from "@/components/QuickActionButton";
import GalleryPage from './pages/gallery';

function Router() {
  return (
    <Switch>
      {/* Add pages below - more specific routes must come before the general ones */}
      <Route path="/chat" component={EnhancedChatbotUI} />
      <Route path="/schedule" component={SchedulePage} />
      <Route path="/formatter-test" component={FormatterTest} />
      <Route path="/directions" component={DirectionsPage} />
      <Route path="/service-history" component={ServiceHistoryPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/live-conversations" component={LiveConversationsPage} />
      <Route path="/conversation-insights" component={ConversationInsightsPage} />
      <Route path="/customer-database" component={CustomerDatabasePage} />
      <Route path="/business-settings" component={BusinessSettingsPage} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/rewards" component={LoyaltyPointsPage} />
      <Route path="/gallery" component={GalleryPage} />
      {/* Home route must come after other routes */}
      <Route path="/" component={HomePage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Get current location to determine if we're on an admin page
  const [location] = useLocation();

  // Check if current page is a customer-facing page
  const isCustomerFacingPage = () => {
    const adminPages = [
      '/dashboard', 
      '/live-conversations', 
      '/conversation-insights',
      '/customer-database',
      '/business-settings',
      '/formatter-test'
    ];
    return !adminPages.some(page => location.startsWith(page));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        {/* Only show dashboard button on admin pages (except dashboard itself) */}
        {!isCustomerFacingPage() && !location.startsWith('/dashboard') && <DashboardNavButton />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;