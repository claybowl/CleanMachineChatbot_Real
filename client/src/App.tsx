import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ChatPage from "@/pages/chat";
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
import ReviewsPage from './pages/reviews';
import MonitorDashboard from './pages/monitor';
import MessagesPage from './pages/messages';
import SettingsPage from './pages/settings';
import LoginPage from './pages/login';
import ForgotPasswordPage from './pages/forgot-password';
import ResetPasswordPage from './pages/reset-password';
import ChangePasswordPage from './pages/change-password';
import AuthGuard from './components/AuthGuard';

function Router() {
  return (
    <Switch>
      {/* Public authentication routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/change-password" component={ChangePasswordPage} />

      {/* Protected admin routes */}
      <Route path="/dashboard">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/monitor">
        <AuthGuard><MonitorDashboard /></AuthGuard>
      </Route>
      <Route path="/messages">
        <AuthGuard><MessagesPage /></AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard><SettingsPage /></AuthGuard>
      </Route>
      <Route path="/live-conversations">
        <AuthGuard><LiveConversationsPage /></AuthGuard>
      </Route>
      <Route path="/conversation-insights">
        <AuthGuard><ConversationInsightsPage /></AuthGuard>
      </Route>
      <Route path="/customer-database">
        <AuthGuard><CustomerDatabasePage /></AuthGuard>
      </Route>
      <Route path="/business-settings">
        <AuthGuard><BusinessSettingsPage /></AuthGuard>
      </Route>
      <Route path="/formatter-test">
        <AuthGuard><FormatterTest /></AuthGuard>
      </Route>

      {/* Customer-facing pages (not protected) */}
      <Route path="/chat" component={ChatPage} />
      <Route path="/schedule" component={SchedulePage} />
      <Route path="/directions" component={DirectionsPage} />
      <Route path="/service-history" component={ServiceHistoryPage} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/rewards" component={LoyaltyPointsPage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/reviews" component={ReviewsPage} />

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
      '/formatter-test',
      '/monitor'
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