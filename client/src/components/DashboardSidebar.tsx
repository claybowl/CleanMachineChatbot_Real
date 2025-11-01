import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarClock, MessageSquare, Car, Star, CloudRain, Settings, TrendingUp, Zap, Heart, Mail, Users, FileText, Home } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DashboardSidebar({ collapsed, onToggle, activeTab, onTabChange }: SidebarProps) {
  const navigationItems = [
    { id: 'today', label: "Today's Appointments", icon: CalendarClock },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'services', label: 'Services', icon: Car },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'formatter', label: 'Formatter', icon: FileText },
    { id: 'weather', label: 'Weather', icon: CloudRain },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'upsell', label: 'Upsell Management', icon: TrendingUp },
    { id: 'loyalty', label: 'Loyalty Program', icon: Heart },
    { id: 'cancellation', label: 'Cancellation Feedback', icon: FileText },
    { id: 'email-campaigns', label: 'Email Campaigns', icon: Mail },
    { id: 'agent', label: 'Agent Settings', icon: Zap },
    { id: 'customers', label: 'Customer Management', icon: Users },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-blue-950 border-r border-blue-800 transition-all duration-300 flex flex-col h-full overflow-hidden`}
    >
      {/* Sidebar Header with Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-blue-800">
        {!collapsed && <h2 className="font-semibold text-white">Navigation</h2>}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-white hover:bg-blue-900"
          data-testid="button-toggle-sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={`w-full ${
                collapsed ? 'justify-center px-2' : 'justify-start'
              } ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-blue-200 hover:bg-blue-900 hover:text-white'
              }`}
              onClick={() => onTabChange(item.id)}
              data-testid={`sidebar-nav-${item.id}`}
            >
              <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Button>
          ))}
        </div>
      </nav>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-blue-800 text-xs text-blue-300">
          <p>Clean Machine Dashboard</p>
          <p className="text-blue-400">v1.0.0</p>
        </div>
      )}
    </aside>
  );
}
