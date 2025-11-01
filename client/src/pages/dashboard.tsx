import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WeatherForecast } from "@/components/WeatherForecast";
import InstantChatButton from "@/components/InstantChatButton";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import AgentSettings from "../components/AgentSettings";
import { UpsellManagement } from "../components/UpsellManagement";
import { LoyaltyPointsSystem } from "../components/LoyaltyPointsSystem";
import { EmailCampaignsManager } from "../components/EmailCampaignsManager";
import CleanMachineLogo from "../components/CleanMachineLogo";
import CancellationDemo from "../components/CancellationDemo";
import BusinessChatInterface from "../components/BusinessChatInterface";
import { CustomerManagement } from "../components/CustomerManagement";
import { AiHelpSearch } from "@/components/AiHelpSearch";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { 
  Car, 
  CalendarClock, 
  MessageSquare, 
  Navigation, 
  Phone, 
  User, 
  Settings, 
  DollarSign,
  Loader2,
  Search,
  Pencil,
  Save,
  CloudRain,
  Clock,
  FileText,
  Mail,
  ExternalLink,
  CheckCircle,
  Star,
  PlusCircle,
  RefreshCw,
  Moon,
  Sun,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Users,
  TrendingUp,
  Zap,
  Heart,
  HelpCircle
} from "lucide-react";

interface Appointment {
  id: string;
  customerName: string;
  service: string;
  time: string;
  date: string;
  address: string;
  phone: string;
  vehicleInfo?: string;
  email?: string;
  status?: string;
  price?: string;
}

interface Message {
  id: string;
  customerName: string;
  phone: string;
  content: string;
  timestamp: string;
  needsAttention: boolean;
}

interface ServiceInfo {
  name: string;
  priceRange: string;
  description: string; // This will now be 'overview'
  overview?: string; // For the main page card
  detailedDescription?: string; // For the dropdown data
  duration: string;
  durationHours: number;
  isAddon?: boolean;
  imageUrl?: string;
}

interface NotificationDetails {
  customerName: string;
  phone: string;
  address: string;
  serviceType: string;
  estimatedArrival: number;
}

interface InvoiceItem {
  service: string;
  price: number;
  quantity: number;
}

interface InvoiceDetails {
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  vehicleInfo: string;
  serviceDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  includeReviewLink: boolean;
}

interface CustomerNavigation {
  name: string;
  phone: string;
  address: string;
  time: string;
  service: string;
}

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [todayDate, setTodayDate] = useState<Date>(new Date());
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [isEditingService, setIsEditingService] = useState(false);
  const [serviceType, setServiceType] = useState<'main' | 'addon'>('main');
  const [searchQuery, setSearchQuery] = useState("");
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({});
  const [weatherData, setWeatherData] = useState<Record<string, any>>({});
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<NotificationDetails | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerNavigation | null>(null);
  const [activeTab, setActiveTab] = useState('today');
  const [showBusinessChat, setShowBusinessChat] = useState(false);
  const [chatCustomer, setChatCustomer] = useState<{ phone: string; name: string } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });
  const [invoiceSettings, setInvoiceSettings] = useState({
    taxRate: 0.0, // Default to 0% tax
    taxEnabled: false,
    autoFillEmail: true
  });
  const { toast } = useToast();

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Fetch appointments for a specific date
  const fetchAppointmentsForDate = async (date: Date) => {
    try {
      // Format date as ISO string for the API
      const formattedDate = date.toISOString();
      const response = await fetch(`/api/dashboard/today?date=${formattedDate}`);
      const data = await response.json();

      if (data.success && data.appointments) {
        setAppointments(data.appointments);
      } else {
        // If we can't get real data, show empty state
        setAppointments([]);
        console.error('Failed to fetch appointments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  };

  // Fetch appointments when component mounts or when selected date changes
  useEffect(() => {
    fetchAppointmentsForDate(todayDate);

    // Fetch appointment counts for the month for calendar highlighting
    const fetchAppointmentCounts = async () => {
      try {
        const year = todayDate.getFullYear();
        const month = todayDate.getMonth() + 1;
        const response = await fetch(`/api/dashboard/appointment-counts?year=${year}&month=${month}`);
        const data = await response.json();

        if (data.success && data.counts) {
          setAppointmentCounts(data.counts);
        }
      } catch (error) {
        console.error('Error fetching appointment counts:', error);
      }
    };

    fetchAppointmentCounts();
    
    // Fetch weather data for calendar tooltips
    const fetchWeatherData = async () => {
      try {
        const response = await fetch('/api/dashboard/weather?days=14');
        const data = await response.json();
        
        if (data.success && data.weather) {
          setWeatherData(data.weather);
        }
      } catch (error) {
        console.error('Error fetching weather data:', error);
      }
    };
    
    fetchWeatherData();
  }, [todayDate]);

  // Fetch services and messages when component mounts
  useEffect(() => {
    // Fetch main services from your API
    fetch('/api/services')
      .then(response => response.json())
      .then(data => {
        if (data.success && data.services) {
          // Mark these as main services (not add-ons)
          const mainServices = data.services.map((service: any) => ({
            ...service,
            isAddon: false
          }));

          // Fetch add-on services
          fetch('/api/addon-services')
            .then(response => response.json())
            .then(addonData => {
              if (addonData.success && addonData.addOns) {
                // Mark these as add-on services
                const addonServices = addonData.addOns.map((addon: any) => ({
                  name: addon.name,
                  priceRange: addon.price,
                  description: addon.description || 'Add-on service', // This will be 'overview'
                  overview: addon.overview || addon.description || 'Add-on service',
                  detailedDescription: addon.detailedDescription || addon.description || 'Add-on service',
                  duration: '30-60 min',
                  durationHours: 0.5,
                  isAddon: true
                }));

                // Combine main services and add-ons
                setServices([...mainServices, ...addonServices]);
              } else {
                setServices(mainServices);
              }
            })
            .catch(error => {
              console.error('Error fetching add-on services:', error);
              setServices(mainServices);
            });
        }
      })
      .catch(error => {
        console.error('Error fetching services:', error);
      });

    // Fetch recent messages from backend
    const fetchRecentMessages = async () => {
      try {
        const response = await fetch('/api/dashboard/messages');
        const data = await response.json();

        if (data.success && data.messages) {
          setMessages(data.messages);
        } else {
          setMessages([]);
          console.error('Failed to fetch messages:', data.error);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      }
    };

    fetchRecentMessages();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (error) {
      return dateString;
    }
  };

  // Navigate to directions page
  const goToDirections = (address: string, phone: string) => {
    setLocation(`/directions?address=${encodeURIComponent(address)}&phone=${encodeURIComponent(phone)}`);
  };

  // Navigate to service history
  const viewServiceHistory = (phone: string) => {
    setLocation(`/service-history?phone=${encodeURIComponent(phone)}`);
  };

  // Send an "On My Way" notification to the customer
  const notifyOnMyWay = (appointment: Appointment) => {
    // Show modal with pre-filled estimated time
    const estimatedTime = 15; // Default estimated time in minutes

    setNotificationDetails({
      customerName: appointment.customerName,
      phone: appointment.phone,
      address: appointment.address,
      serviceType: appointment.service,
      estimatedArrival: estimatedTime
    });

    setShowNotificationModal(true);
  };

  // Helper function to extract price from service description
  const extractPriceFromService = (serviceName: string): number => {
    // Find the service in the services list
    const service = services.find(s => s.name === serviceName);

    if (service) {
      // Extract the numeric part from the price range (e.g., "$150-250" -> 200)
      const priceRange = service.priceRange;
      const priceMatch = priceRange.match(/\$?(\d+)(?:–|\-)?\$?(\d+)?/);

      if (priceMatch) {
        if (priceMatch[2]) {
          // If there's a range, use the average
          return (parseInt(priceMatch[1]) + parseInt(priceMatch[2])) / 2;
        } else {
          // If there's a single price
          return parseInt(priceMatch[1]);
        }
      }
    }

    // Default fallback price
    return 150;
  };

  // Open invoice modal for an appointment
  const openInvoiceModal = async (appointment: Appointment) => {
    // Fetch customer email from database
    let customerEmail = "";
    if (invoiceSettings.autoFillEmail) {
      try {
        const response = await fetch(`/api/enhanced/customers/${encodeURIComponent(appointment.phone)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.customer && data.customer.email) {
            customerEmail = data.customer.email;
          }
        }
      } catch (error) {
        console.error('Error fetching customer email:', error);
      }
    }

    // Prepare the main service as the first invoice item
    const mainService = {
      service: appointment.service,
      price: extractPriceFromService(appointment.service),
      quantity: 1
    };

    const subtotal = mainService.price;
    const tax = invoiceSettings.taxEnabled ? Math.round(subtotal * invoiceSettings.taxRate * 100) / 100 : 0;
    const total = subtotal + tax;

    // Prepare the invoice details
    setInvoiceDetails({
      customerName: appointment.customerName,
      customerEmail: customerEmail,
      phone: appointment.phone,
      address: appointment.address,
      vehicleInfo: appointment.vehicleInfo || "",
      serviceDate: new Date().toLocaleDateString(),
      items: [mainService],
      subtotal,
      tax,
      total,
      notes: "Thank you for choosing Clean Machine Auto Detail!",
      includeReviewLink: true
    });

    setShowInvoiceModal(true);
  };

  // Handle service edit
  const handleServiceEdit = () => {
    if (selectedService) {
      setIsEditingService(true);
    } else {
      toast({
        title: "No Service Selected",
        description: "Please select a service to edit first.",
        variant: "destructive",
      });
    }
  };

  // Handle service save
  const handleServiceSave = () => {
    if (selectedService) {
      // Here you would update the service in your backend
      // For now, just update the local state
      const updatedServices = services.map(service => 
        service.name === selectedService.name ? selectedService : service
      );

      setServices(updatedServices);
      setIsEditingService(false);

      toast({
        title: "Service Updated",
        description: `${selectedService.name} has been updated successfully.`,
      });
    }
  };

  // Handle direct message
  const handleDirectMessage = (phone: string) => {
    // In a real app, this would open your messaging app with the customer's number
    toast({
      title: "Direct Message",
      description: `Opening direct message to ${phone}`,
    });

    // For web, you could open the SMS app with a prefilled number
    window.open(`sms:${phone}`);
  };

  // Handle call
  const handleCall = (phone: string) => {
    // Open the phone app with the number
    window.open(`tel:${phone}`);
  };

  // Filter appointments based on search
  const filteredAppointments = searchQuery 
    ? appointments.filter(apt => 
        apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.phone.includes(searchQuery) ||
        apt.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (apt.vehicleInfo && apt.vehicleInfo.toLowerCase().includes(searchQuery.toLowerCase())))
    : appointments;

  // Filter messages based on search
  const filteredMessages = searchQuery
    ? messages.filter(msg => 
        msg.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.phone.includes(searchQuery) ||
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white overflow-hidden">
      {/* Collapsible Sidebar */}
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area - Independently Scrollable */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-blue-950 border-b border-blue-800 p-4 flex-shrink-0">
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-xl md:text-2xl font-bold flex items-center">
                <CleanMachineLogo size="sm" className="mr-2" />
                Dashboard
              </h1>
            </div>

            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-md">
              <AiHelpSearch />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                onClick={() => setDarkMode(!darkMode)}
                data-testid="button-dark-mode"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                onClick={() => setLocation('/messages')}
                data-testid="button-messages"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Messages
              </Button>
              <Button onClick={() => setLocation('/')} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                <Home className="h-4 w-4 mr-1" />
                Home
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Today's Appointments Tab */}
        <TabsContent value="today" className="space-y-4">
          {/* Monthly Statistics Bar */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl">
            <CardContent className="py-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{Object.values(appointmentCounts).reduce((sum, count) => sum + count, 0)}</div>
                  <div className="text-xs text-blue-100">Total This Month</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Object.keys(appointmentCounts).length}</div>
                  <div className="text-xs text-blue-100">Busy Days</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{Math.max(...Object.values(appointmentCounts), 0)}</div>
                  <div className="text-xs text-blue-100">Peak Daily</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{filteredAppointments.length}</div>
                  <div className="text-xs text-blue-100">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    ${filteredAppointments.reduce((sum, apt) => {
                      const price = apt.price ? parseInt(apt.price.replace(/\D/g, '')) || 150 : 150;
                      return sum + price;
                    }, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-100">Today's Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {filteredAppointments.length > 0 
                      ? (() => {
                          const serviceCounts = filteredAppointments.reduce((acc: any, apt) => {
                            acc[apt.service] = (acc[apt.service] || 0) + 1;
                            return acc;
                          }, {});
                          const mostPopular = Object.entries(serviceCounts).sort((a: any, b: any) => b[1] - a[1])[0];
                          return mostPopular ? (mostPopular[1] as number) : 0;
                        })()
                      : 0
                    }
                  </div>
                  <div className="text-xs text-blue-100">Top Service Count</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Large Central Calendar */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-xl border-none bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-2xl overflow-hidden" data-testid="calendar-card">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white pb-6">
                  <CardTitle className="flex items-center justify-between text-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <CalendarClock className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{format(todayDate, 'MMMM yyyy')}</div>
                        <div className="text-sm text-blue-100 font-normal">
                          {appointmentCounts && Object.values(appointmentCounts).reduce((a, b) => a + b, 0)} appointments this month
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button 
                              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all"
                              data-testid="button-calendar-legend"
                            >
                              <HelpCircle className="h-4 w-4 text-white" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-sm p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                            <div className="space-y-3">
                              <div className="font-semibold text-sm border-b pb-2 dark:border-gray-600">
                                📖 Calendar Legend
                              </div>
                              
                              {/* Appointment Badges */}
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Appointment Indicators:</div>
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-[10px]">3</div>
                                  <span className="text-gray-600 dark:text-gray-400">Number of appointments</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex gap-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                  </div>
                                  <span className="text-gray-600 dark:text-gray-400">Quick visual count (max 3 dots)</span>
                                </div>
                              </div>
                              
                              {/* Appointment Card Colors */}
                              <div className="space-y-2 border-t pt-2 dark:border-gray-600">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Appointment Card Colors:</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Colors cycle to help distinguish between appointments</div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                                    <span className="text-[10px] text-gray-600 dark:text-gray-400">1st appointment</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                    <span className="text-[10px] text-gray-600 dark:text-gray-400">2nd appointment</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                                    <span className="text-[10px] text-gray-600 dark:text-gray-400">3rd appointment</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                                    <span className="text-[10px] text-gray-600 dark:text-gray-400">4th appointment</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 bg-pink-500 rounded"></div>
                                    <span className="text-[10px] text-gray-600 dark:text-gray-400">5th+ appointments</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Weather Icons */}
                              <div className="space-y-2 border-t pt-2 dark:border-gray-600">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Weather Icons:</div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-lg">☀️</span>
                                    <span className="text-gray-600 dark:text-gray-400">Sunny</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-lg">⛅</span>
                                    <span className="text-gray-600 dark:text-gray-400">Partly Cloudy</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-lg">☁️</span>
                                    <span className="text-gray-600 dark:text-gray-400">Cloudy</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-lg">🌧️</span>
                                    <span className="text-gray-600 dark:text-gray-400">Rainy</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-[10px] text-gray-500 dark:text-gray-500 border-t pt-2 dark:border-gray-600">
                                💡 Tip: Hover over any date to see details before clicking!
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm transition-all"
                        onClick={() => setTodayDate(new Date())}
                        data-testid="button-today"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Today
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm transition-all"
                        onClick={async () => {
                          toast({
                            title: "Checking Weather",
                            description: "Analyzing weather conditions for upcoming appointments...",
                          });
                        }}
                        data-testid="button-weather"
                      >
                        <CloudRain className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <style>
                    {`
                      .modern-calendar .rdp {
                        --rdp-cell-size: 70px;
                        --rdp-accent-color: #3b82f6;
                      }

                      .modern-calendar .rdp-months {
                        width: 100%;
                      }

                      .modern-calendar .rdp-month {
                        width: 100%;
                      }

                      .modern-calendar .rdp-table {
                        width: 100%;
                        max-width: 100%;
                      }

                      .modern-calendar .rdp-head_cell {
                        color: #6b7280;
                        font-weight: 600;
                        font-size: 0.875rem;
                        padding: 8px 0;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                      }

                      .modern-calendar .rdp-cell {
                        padding: 2px;
                      }

                      .modern-calendar .rdp-day {
                        width: 70px;
                        height: 70px;
                        font-size: 16px;
                        font-weight: 500;
                        border-radius: 12px;
                        position: relative;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        cursor: pointer;
                      }

                      .modern-calendar .rdp-day:hover:not(.rdp-day_selected):not(.rdp-day_disabled) {
                        background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                      }

                      .modern-calendar .rdp-day_selected {
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
                        color: white !important;
                        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
                        transform: scale(1.05);
                      }

                      .modern-calendar .rdp-day_today:not(.rdp-day_selected) {
                        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                        color: #1e40af;
                        font-weight: 700;
                        border: 2px solid #3b82f6;
                      }

                      .modern-calendar .rdp-day_disabled {
                        opacity: 0.3;
                        cursor: not-allowed;
                      }

                      .modern-calendar .rdp-button {
                        width: 100%;
                        height: 100%;
                      }

                      .modern-calendar .rdp-nav_button {
                        width: 40px;
                        height: 40px;
                        border-radius: 10px;
                        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                        transition: all 0.2s;
                      }

                      .modern-calendar .rdp-nav_button:hover {
                        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                        color: white;
                        transform: scale(1.1);
                      }

                      .modern-calendar .rdp-caption {
                        margin-bottom: 16px;
                      }

                      .appointment-badge {
                        position: absolute;
                        top: 6px;
                        right: 6px;
                        min-width: 22px;
                        height: 22px;
                        padding: 0 6px;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        color: white;
                        font-size: 11px;
                        font-weight: 700;
                        border-radius: 11px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
                        animation: pulse-badge 2s infinite;
                      }

                      @keyframes pulse-badge {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                      }

                      .appointment-dots {
                        position: absolute;
                        bottom: 6px;
                        left: 50%;
                        transform: translateX(-50%);
                        display: flex;
                        gap: 3px;
                        align-items: center;
                      }

                      .appointment-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        animation: dot-bounce 1.4s infinite ease-in-out;
                      }

                      .appointment-dot:nth-child(1) {
                        background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
                        animation-delay: -0.32s;
                      }

                      .appointment-dot:nth-child(2) {
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        animation-delay: -0.16s;
                      }

                      .appointment-dot:nth-child(3) {
                        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                      }

                      @keyframes dot-bounce {
                        0%, 80%, 100% { transform: scale(0.8); opacity: 0.7; }
                        40% { transform: scale(1.2); opacity: 1; }
                      }

                      .day-content {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      }
                    `}
                  </style>
                  <div className="modern-calendar">
                    <Calendar
                      mode="single"
                      selected={todayDate}
                      onSelect={(date) => {
                        if (date) {
                          setTodayDate(date);
                          const formattedDate = date.toISOString();
                          fetch(`/api/dashboard/today?date=${formattedDate}`)
                            .then(response => response.json())
                            .then(data => {
                              if (data.success && data.appointments) {
                                setAppointments(data.appointments);
                              } else {
                                setAppointments([]);
                              }
                            })
                            .catch(error => {
                              console.error('Error fetching appointments:', error);
                              setAppointments([]);
                            });
                        }
                      }}
                      className="w-full"
                      classNames={{
                        months: "w-full",
                        month: "w-full",
                        table: "w-full border-collapse",
                        head_row: "flex w-full",
                        head_cell: "flex-1 text-center",
                        row: "flex w-full mt-1",
                        cell: "flex-1 text-center p-0",
                        day: "w-full h-full",
                        nav_button_previous: "absolute left-2",
                        nav_button_next: "absolute right-2",
                        caption: "flex justify-center pt-1 relative items-center text-xl font-bold text-gray-800 mb-4",
                      }}
                      components={{
                        DayContent: ({ date }) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const count = appointmentCounts[dateStr] || 0;
                          const weather = weatherData[dateStr];
                          
                          const dayContent = (
                            <div className="day-content">
                              <span className="relative z-10">{date.getDate()}</span>
                              {count > 0 && (
                                <>
                                  <div className="appointment-badge" data-testid={`badge-appointment-${dateStr}`}>
                                    {count}
                                  </div>
                                  <div className="appointment-dots">
                                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                                      <div key={i} className="appointment-dot" />
                                    ))}
                                    {count > 3 && (
                                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 ml-1">
                                        +{count - 3}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                          
                          // Only show tooltip if there's appointment or weather data
                          if (count > 0 || weather) {
                            return (
                              <TooltipProvider>
                                <Tooltip delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    {dayContent}
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                                    <div className="space-y-2">
                                      <div className="font-semibold text-sm border-b pb-1 dark:border-gray-600">
                                        {format(date, 'EEE, MMM d')}
                                      </div>
                                      
                                      {count > 0 && (
                                        <div className="text-xs">
                                          <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                                            📅 {count} Appointment{count > 1 ? 's' : ''}
                                          </div>
                                          <div className="text-gray-600 dark:text-gray-400">
                                            Click to view details
                                          </div>
                                        </div>
                                      )}
                                      
                                      {weather && (
                                        <div className="text-xs border-t pt-2 dark:border-gray-600">
                                          <div className="flex items-center justify-between">
                                            <span className="text-2xl">{weather.icon}</span>
                                            <div className="text-right">
                                              <div className="font-medium">{weather.high}°F / {weather.low}°F</div>
                                              <div className="text-gray-500 dark:text-gray-400">{weather.description}</div>
                                            </div>
                                          </div>
                                          {weather.rainChance > 20 && (
                                            <div className="mt-1 text-blue-600 dark:text-blue-400">
                                              🌧️ {weather.rainChance}% chance of rain
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          
                          return dayContent;
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Selected Day Appointments */}
              <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                    <CalendarClock className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {format(todayDate, 'MMM d, yyyy') === format(new Date(), 'MMM d, yyyy') 
                      ? "Today's Schedule" 
                      : `Schedule for ${format(todayDate, 'MMM d, yyyy')}`} ({filteredAppointments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {filteredAppointments.map((appointment, index) => {
                        // Color-code appointments for easier distinction
                        const colors = [
                          'border-l-purple-500 bg-purple-50/90 dark:bg-purple-950/30',
                          'border-l-blue-500 bg-blue-50/90 dark:bg-blue-950/30',
                          'border-l-green-500 bg-green-50/90 dark:bg-green-950/30',
                          'border-l-orange-500 bg-orange-50/90 dark:bg-orange-950/30',
                          'border-l-pink-500 bg-pink-50/90 dark:bg-pink-950/30'
                        ];
                        const colorClass = colors[index % colors.length];
                        
                        return (
                        <Card key={appointment.id} className={`border-l-4 ${colorClass} hover:shadow-lg transition-all duration-300 dark:bg-gray-800/90`}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg text-blue-700 dark:text-blue-300">{appointment.customerName}</CardTitle>
                                <CardDescription>{appointment.service}</CardDescription>
                              </div>
                              <Badge variant="outline" className="font-mono bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300">
                                {formatDate(appointment.time).split(',')[1]}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2 space-y-2">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Car className="mr-2 h-4 w-4" />
                              {appointment.vehicleInfo || "Vehicle info not available"}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Navigation className="mr-2 h-4 w-4" />
                              {appointment.address}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Phone className="mr-2 h-4 w-4" />
                              {appointment.phone}
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-between pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewServiceHistory(appointment.phone)}
                            >
                              History
                            </Button>
                            <div className="space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCall(appointment.phone)}
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setChatCustomer({ phone: appointment.phone, name: appointment.customerName });
                                  setShowBusinessChat(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Chat
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => goToDirections(appointment.address, appointment.phone)}
                              >
                                <Navigation className="h-4 w-4 mr-2" />
                                Navigate
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-gray-600 border-blue-300 dark:border-gray-600"
                                onClick={() => notifyOnMyWay(appointment)}
                              >
                                <Car className="h-4 w-4 mr-2" />
                                Send "On My Way"
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 border-green-300 dark:border-green-700"
                                onClick={() => openInvoiceModal(appointment)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Send Invoice
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {searchQuery ? "No matching appointments found" : "No appointments scheduled for today"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side Panel - Quick Actions and Insights */}
            <div className="space-y-4">
              {/* Daily Insights Card */}
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 text-gray-800 shadow-lg border-purple-200">
                <CardHeader>
                  <CardTitle className="text-purple-800 flex items-center">
                    <Star className="mr-2 h-5 w-5 text-purple-600" />
                    {format(todayDate, 'MMM d')} Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredAppointments.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Appointments:</span>
                        <Badge className="bg-purple-600">{filteredAppointments.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Popular Service:</span>
                        <Badge variant="outline" className="border-purple-400 text-purple-700">
                          {(() => {
                            const serviceCounts = filteredAppointments.reduce((acc: any, apt) => {
                              acc[apt.service] = (acc[apt.service] || 0) + 1;
                              return acc;
                            }, {});
                            const mostPopular = Object.entries(serviceCounts).sort((a: any, b: any) => b[1] - a[1])[0];
                            return mostPopular ? mostPopular[0] : 'N/A';
                          })()}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Revenue:</span>
                        <span className="text-lg font-bold text-green-600">
                          ${(() => {
                            const total = filteredAppointments.reduce((sum, apt) => {
                              const price = apt.price ? parseInt(apt.price.replace(/\D/g, '')) || 150 : 150;
                              return sum + price;
                            }, 0);
                            return total.toLocaleString();
                          })()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <p>No appointments for this date</p>
                      <p className="text-sm mt-1">Select a different date to view insights</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-4 bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-blue-200">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* New Invoice Quick Action Button - auto-populates with last appointment info */}
                  <Button 
                    className="w-full justify-start bg-green-600 hover:bg-green-700" 
                    onClick={() => {
                      // Find most recently completed appointment to auto-populate invoice
                      const completedAppointments = appointments.filter(apt => 
                        new Date(apt.date) < new Date() && 
                        apt.status === 'completed'
                      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (completedAppointments.length > 0) {
                        const lastCompleted = completedAppointments[0];

                        // Extract price from the service (handle ranges like $150-200)
                        const extractPrice = (priceString?: string): number => {
                          if (!priceString) return 150;

                          // Extract the first number from strings like "$150-200" or "$150"
                          const match = priceString.match(/\$?(\d+)/);
                          if (match && match[1]) {
                            return parseFloat(match[1]);
                          }
                          return 150; // Default price if extraction fails
                        };

                        const basePrice = extractPrice(lastCompleted.price);
                        const calculatedTax = invoiceSettings.taxEnabled ? 
                          parseFloat((basePrice * invoiceSettings.taxRate).toFixed(2)) : 0;
                        const totalPrice = basePrice + calculatedTax;

                        // Auto-populate invoice details from the appointment
                        setInvoiceDetails({
                          customerName: lastCompleted.customerName,
                          phone: lastCompleted.phone,
                          customerEmail: lastCompleted.email || '',
                          address: lastCompleted.address,
                          vehicleInfo: lastCompleted.vehicleInfo || '',
                          serviceDate: format(new Date(lastCompleted.date), 'PPP'),
                          items: [{
                            service: lastCompleted.service,
                            price: basePrice,
                            quantity: 1
                          }],
                          subtotal: basePrice,
                          tax: calculatedTax,
                          total: totalPrice,
                          notes: `Thank you for choosing Clean Machine Auto Detail! We hope you're enjoying your freshly detailed ${lastCompleted.vehicleInfo || 'vehicle'}.`,
                          includeReviewLink: true
                        });

                        // Show the invoice modal
                        setShowInvoiceModal(true);
                      } else {
                        // No completed appointments found
                        toast({
                          title: "No Completed Appointments",
                          description: "No recently completed appointments found to generate an invoice.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Send Invoice & Thank You
                  </Button>

                  {/* Combined Navigation & Notification Button - auto-populates with next appointment */}
                  <Button 
                    className="w-full justify-start bg-blue-600 hover:bg-blue-700" 
                    onClick={() => {
                      // Find the next upcoming appointment
                      const upcomingAppointments = appointments.filter(apt => 
                        new Date(apt.date) > new Date()
                      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                      if (upcomingAppointments.length > 0) {
                        const nextAppointment = upcomingAppointments[0];

                        // Show navigation dialog with customer information
                        setSelectedCustomer({
                          name: nextAppointment.customerName,
                          phone: nextAppointment.phone,
                          address: nextAppointment.address,
                          time: new Date(nextAppointment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                          service: nextAppointment.service
                        });

                        // Open the navigation dialog
                        setShowNavigationDialog(true);
                      } else {
                        // No upcoming appointments found
                        toast({
                          title: "No Upcoming Appointments",
                          description: "No upcoming appointments found for navigation.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    Navigate & Send ETA
                  </Button>

                  <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700" onClick={() => setLocation('/service-history')}>
                    <User className="mr-2 h-4 w-4" />
                    Customer Service History
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                Recent Messages
              </CardTitle>
              <CardDescription>
                Manage customer communications and view chat history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMessages.length > 0 ? (
                <div className="space-y-4">
                  {filteredMessages.map((message) => (
                    <Card key={message.id} className={`border-l-4 ${message.needsAttention ? 'border-l-red-500' : 'border-l-blue-300'} hover:shadow-md transition-shadow duration-300 bg-blue-50/90 dark:bg-gray-800/90`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className="mr-2 h-8 w-8 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <CardTitle className="text-lg text-blue-700 dark:text-blue-300">{message.customerName}</CardTitle>
                              <CardDescription>{message.phone}</CardDescription>
                            </div>
                          </div>
                          <Badge variant={message.needsAttention ? "destructive" : "outline"} className={`font-mono ${!message.needsAttention ? 'bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300' : ''}`}>
                            {message.needsAttention ? "Needs Attention" : formatDate(message.timestamp).split(',')[1]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">"{message.content}"</p>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewServiceHistory(message.phone)}
                          className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700"
                        >
                          History
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCall(message.phone)}
                          className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        <InstantChatButton
                          mode="inline"
                          variant="default"
                          className="text-sm px-4 py-1 h-9"
                          customerPhone={message.phone}
                          customerName={message.customerName}
                        />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {searchQuery ? "No matching messages found" : "No recent messages"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          {/* Added refresh button and heading for the Services tab */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-100">Manage Services</h2>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/reload-sheets', { method: 'POST' });
                  const data = await response.json();
                  if (data.success) {
                    toast({
                      title: "Data Refreshed",
                      description: "Google Sheets data has been reloaded successfully",
                    });
                    // Refresh the services data
                    window.location.reload();
                  } else {
                    toast({
                      title: "Refresh Failed",
                      description: "Failed to reload Google Sheets data",
                      variant: "destructive"
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "An error occurred while refreshing data",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh from Google Sheets
            </Button>
          </div>

          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-900/50">
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="addons">Add-Ons</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
            </TabsList>
          
            <TabsContent value="services" className="space-y-4">
              <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                      <DollarSign className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Manage {serviceType === 'main' ? 'Main Services' : 'Add-on Services'}
                    </CardTitle>
                    <CardDescription>
                      View and update your service offerings and pricing
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {/* Toggle between Main Services and Add-ons */}
                    <div className="flex items-center bg-blue-100 rounded-lg p-1 mr-2">
                      <button
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          serviceType === 'main' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-transparent text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setServiceType('main')}
                      >
                        Main Services
                      </button>
                      <button
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          serviceType === 'addon' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-transparent text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setServiceType('addon')}
                      >
                        Add-ons
                      </button>
                    </div>
                    {isEditingService ? (
                      <Button onClick={handleServiceSave} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    ) : (
                      <Button onClick={handleServiceEdit} className="bg-blue-600 hover:bg-blue-700">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Services
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-blue-900">Image</TableHead>
                        <TableHead className="text-blue-900">Service Name</TableHead>
                        <TableHead className="text-blue-900">Price Range</TableHead>
                        <TableHead className="text-blue-900">Overview</TableHead>
                        <TableHead className="text-blue-900">Detailed Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services
                        .filter(service => 
                          serviceType === 'main' 
                            ? !service.isAddon 
                            : service.isAddon
                        )
                        .map((service) => (
                        <TableRow 
                          key={service.name}
                          className={selectedService?.name === service.name ? "bg-blue-50" : ""}
                          onClick={() => setSelectedService(service)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-2 items-center">
                              {service.imageUrl && (
                                <img 
                                  src={service.imageUrl} 
                                  alt={service.name}
                                  className="w-20 h-20 object-cover rounded-md"
                                />
                              )}
                              <input
                                id={`file-upload-${service.name}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const formData = new FormData();
                                    formData.append('image', file);
                                    try {
                                      // Upload the image
                                      const response = await fetch('/api/upload-service-image', {
                                        method: 'POST',
                                        body: formData
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        // Save the image URL to database
                                        await fetch('/api/save-service-image', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            serviceName: service.name,
                                            imageUrl: data.imageUrl
                                          })
                                        });
                                        
                                        // Update the service with the new image URL
                                        const updatedService = { ...service, imageUrl: data.imageUrl };
                                        setServices(services.map(s => s.name === service.name ? updatedService : s));
                                        toast({
                                          title: "Image uploaded",
                                          description: "Service image has been updated"
                                        });
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "Upload failed",
                                        description: "Failed to upload image",
                                        variant: "destructive"
                                      });
                                    }
                                  }
                                }}
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs"
                                type="button"
                                onClick={() => document.getElementById(`file-upload-${service.name}`)?.click()}
                                data-testid={`button-upload-image-${service.name}`}
                              >
                                {service.imageUrl ? 'Change' : 'Upload'} Image
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {isEditingService && selectedService?.name === service.name ? (
                              <Input 
                                value={selectedService.name}
                                onChange={(e) => setSelectedService({...selectedService, name: e.target.value})}
                              />
                            ) : (
                              service.name
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditingService && selectedService?.name === service.name ? (
                              <Input 
                                value={selectedService.priceRange}
                                onChange={(e) => setSelectedService({...selectedService, priceRange: e.target.value})}
                              />
                            ) : (
                              service.priceRange
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditingService && selectedService?.name === service.name ? (
                              <Input 
                                value={selectedService.overview}
                                onChange={(e) => setSelectedService({...selectedService, overview: e.target.value})}
                                placeholder="Brief overview for service card"
                              />
                            ) : (
                              service.overview
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditingService && selectedService?.name === service.name ? (
                              <textarea 
                                className="w-full min-h-[100px] p-2 border rounded-md"
                                value={selectedService.detailedDescription}
                                onChange={(e) => setSelectedService({...selectedService, detailedDescription: e.target.value})}
                                placeholder="Detailed description with bullet points (use • or - for bullets)"
                              />
                            ) : (
                              <div className="max-w-md text-sm whitespace-pre-line">
                                {service.detailedDescription}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            {/* Add TabsContent for addons, upcoming, and today if they exist elsewhere in your app */}
            <TabsContent value="addons" className="space-y-4">
              {/* Placeholder for Add-ons tab content */}
              <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                    <DollarSign className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Manage Add-on Services
                  </CardTitle>
                  <CardDescription>
                    View and update your add-on service offerings and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-blue-900">Image</TableHead>
                        <TableHead className="text-blue-900">Add-on Name</TableHead>
                        <TableHead className="text-blue-900">Price</TableHead>
                        <TableHead className="text-blue-900">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services
                        .filter(service => service.isAddon)
                        .map((service) => (
                        <TableRow key={service.name}>
                          <TableCell>
                            <div className="flex flex-col gap-2 items-center">
                              {service.imageUrl && (
                                <img 
                                  src={service.imageUrl} 
                                  alt={service.name}
                                  className="w-20 h-20 object-cover rounded-md"
                                />
                              )}
                              <input
                                id={`file-upload-addon-${service.name}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const formData = new FormData();
                                    formData.append('image', file);
                                    try {
                                      // Upload the image
                                      const response = await fetch('/api/upload-service-image', {
                                        method: 'POST',
                                        body: formData
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        // Save the image URL to database
                                        await fetch('/api/save-service-image', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            serviceName: service.name,
                                            imageUrl: data.imageUrl
                                          })
                                        });
                                        
                                        // Update the service with the new image URL
                                        const updatedService = { ...service, imageUrl: data.imageUrl };
                                        setServices(services.map(s => s.name === service.name ? updatedService : s));
                                        toast({
                                          title: "Image uploaded",
                                          description: "Add-on image has been updated"
                                        });
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "Upload failed",
                                        description: "Failed to upload image",
                                        variant: "destructive"
                                      });
                                    }
                                  }
                                }}
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs"
                                type="button"
                                onClick={() => document.getElementById(`file-upload-addon-${service.name}`)?.click()}
                                data-testid={`button-upload-image-${service.name}`}
                              >
                                {service.imageUrl ? 'Change' : 'Upload'} Image
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>{service.priceRange}</TableCell>
                          <TableCell>{service.overview}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {/* Placeholder for Upcoming tab content */}
              <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                    <CalendarClock className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Upcoming Appointments
                  </CardTitle>
                  <CardDescription>
                    View appointments scheduled for the future
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-500 dark:text-gray-400">Upcoming appointments list would go here.</p>
                  {/* Add logic to display upcoming appointments */}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="today" className="space-y-4">
              {/* Placeholder for Today tab content - already handled by the main 'today' tab */}
              <p>Today's appointments are displayed above.</p>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Weather Tab */}
        <TabsContent value="weather" className="space-y-4">
          <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                <CloudRain className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                Weather Forecast & Appointment Impact
              </CardTitle>
              <CardDescription>
                Monitor weather conditions for upcoming appointments to identify potential rescheduling needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeatherForecast 
                latitude={36.1236407}  
                longitude={-95.9359214}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formatter Tab */}
        <TabsContent value="formatter" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Settings className="mr-2 h-5 w-5 text-blue-400" />
                Message Formatter
              </CardTitle>
              <CardDescription className="text-blue-200">
                Configure how your communications look and feel across all channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full py-6 bg-blue-600 hover:bg-blue-700 mb-6"
                onClick={() => setLocation('/formatter-test')}
              >
                <div className="flex flex-col items-center">
                  <span className="text-lg font-semibold">Open Message Formatter Tool</span>
                  <span className="text-xs mt-1 opacity-80">Customize SMS, web app, and email communications</span>
                </div>
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-700/30">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-blue-400" />
                    SMS Settings
                  </h3>
                  <ul className="text-xs text-blue-200 space-y-1 list-disc ml-5">
                    <li>Character limits</li>
                    <li>Emoji usage</li>
                    <li>Branding options</li>
                    <li>Mobile optimization</li>
                  </ul>
                </div>

                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-700/30">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-blue-400" />
                    Web App Settings
                  </h3>
                  <ul className="text-xs text-blue-200 space-y-1 list-disc ml-5">
                    <li>Rich formatting</li>
                    <li>Interactive elements</li>
                    <li>Detailed content</li>
                    <li>Visual appearance</li>
                  </ul>
                </div>

                <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-700/30">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-blue-400" />
                    Email Settings
                  </h3>
                  <ul className="text-xs text-blue-200 space-y-1 list-disc ml-5">
                    <li>Formal tone controls</li>
                    <li>Signature options</li>
                    <li>Branding elements</li>
                    <li>Professional layout</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card className="bg-white/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                Google Reviews Configuration
              </CardTitle>
              <CardDescription>
                Manage your Google Reviews integration and troubleshoot any issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="placeId">Google Place ID</Label>
                  <div className="flex gap-2">
                    <Input id="placeId" defaultValue="2583-6965-7477-7672-412" />
                    <Button className="bg-blue-600 hover:bg-blue-700">Update</Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your business Place ID is used to fetch reviews from Google
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="apiKey">Google Maps API Key</Label>
                  <div className="flex gap-2">
                    <Input id="apiKey" type="password" placeholder="Enter your Google Maps API key" />
                    <Button className="bg-blue-600 hover:bg-blue-700">Save API Key</Button>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    ⚠️ The current API key appears to be invalid. Please provide a valid Google Maps API key.
                  </p>
                </div>

                <div className="mt-6 p-4 border border-blue-200 rounded-md bg-blue-50">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Troubleshooting Tips</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
                    <li>Ensure your Google Maps API key has the Places API enabled</li>
                    <li>Verify the API key has proper billing set up in Google Cloud Console</li>
                    <li>Check that the Place ID is correct for your business location</li>
                    <li>Test the API key using the "Test Connection" button below</li>
                  </ul>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700">
                    Test Connection
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Apply Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                <Settings className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                Dashboard Settings
              </CardTitle>
              <CardDescription>
                Configure when to escalate conversations to you directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Human Escalation Triggers</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure when the chatbot should offer to connect the customer directly to you.
                </p>

                <div className="space-y-4 mt-4">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="multipleFailures"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="multipleFailures">Multiple understanding failures</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Offer human support after 2-3 consecutive misunderstandings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="urgentRequests"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="urgentRequests">Urgent requests</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Escalate when customer mentions "emergency", "urgent", or "right away"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="explicitRequest"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="explicitRequest">Explicit human request</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Escalate when customer asks to "speak to a person" or "talk to a human"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="customQuotes"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="customQuotes">Custom quote requests</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Escalate requests for services not on your standard pricing list
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="highValueCustomer"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="highValueCustomer">High-value customers</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Offer direct connection for repeat customers with 3+ previous services
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Invoice Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure tax rates and email auto-fill preferences
                </p>

                <div className="space-y-4 mt-4">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="taxEnabled"
                      className="mt-1"
                      checked={invoiceSettings.taxEnabled}
                      onChange={(e) => setInvoiceSettings({
                        ...invoiceSettings,
                        taxEnabled: e.target.checked
                      })}
                    />
                    <div>
                      <Label htmlFor="taxEnabled">Enable Tax Calculation</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Add tax to invoice totals (currently disabled)
                      </p>
                    </div>
                  </div>

                  {invoiceSettings.taxEnabled && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="taxRate" className="text-sm font-medium">Tax Rate (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={invoiceSettings.taxRate * 100}
                        onChange={(e) => setInvoiceSettings({
                          ...invoiceSettings,
                          taxRate: parseFloat(e.target.value) / 100 || 0
                        })}
                        className="max-w-[100px]"
                        placeholder="8.5"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Current rate: {(invoiceSettings.taxRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="autoFillEmail"
                      className="mt-1"
                      checked={invoiceSettings.autoFillEmail}
                      onChange={(e) => setInvoiceSettings({
                        ...invoiceSettings,
                        autoFillEmail: e.target.checked
                      })}
                    />
                    <div>
                      <Label htmlFor="autoFillEmail">Auto-fill Customer Email</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Automatically populate email addresses from customer database
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure how you receive alerts about customer interactions
                </p>

                <div className="space-y-4 mt-4">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="newCustomers"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="newCustomers">New customer alerts</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Get notified when a new customer contacts you for the first time
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="bookingConfirmations"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="bookingConfirmations">Booking confirmations</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Get notified when a new appointment is booked
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="rescheduleRequests"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <Label htmlFor="rescheduleRequests">Reschedule requests</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Get notified when a customer requests to reschedule their appointment
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Settings Tab */}
        <TabsContent value="agent" className="space-y-4">
          <AgentSettings />
        </TabsContent>

        {/* Upsell Management Tab */}
        <TabsContent value="upsell" className="space-y-4">
          <UpsellManagement />
        </TabsContent>

        {/* Loyalty Program Tab */}
        <TabsContent value="loyalty" className="space-y-4">
          <LoyaltyPointsSystem />
        </TabsContent>

        {/* Email Campaigns Tab */}
        <TabsContent value="email-campaigns" className="space-y-4">
          <EmailCampaignsManager />
        </TabsContent>

        {/* Cancellation Feedback Test Tab */}
        <TabsContent value="cancellation" className="space-y-4">
          <Card className="bg-blue-50/95 dark:bg-gray-800/95 text-gray-800 dark:text-gray-100 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800 dark:text-blue-200">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                Cancellation Feedback System Test
              </CardTitle>
              <CardDescription>
                Test the cancellation feedback collection system to see how customer insights are gathered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CancellationDemo />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Management Tab */}
        <TabsContent value="customers" className="space-y-4">
          <CustomerManagement />
        </TabsContent>
      </Tabs>
        </main>
      </div>

      {/* On My Way Notification Modal */}
      <Dialog open={showNotificationModal} onOpenChange={setShowNotificationModal}>
        <DialogContent className="bg-blue-50/95 dark:bg-gray-800/95">
          <DialogHeader>
            <DialogTitle className="text-blue-800 dark:text-blue-200 flex items-center">
              <Car className="mr-2 h-5 w-5" /> 
              Send "On My Way" Notification
            </DialogTitle>
            <DialogDescription>
              Let your customer know you're on your way to their appointment
            </DialogDescription>
          </DialogHeader>

          {notificationDetails && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                  <span className="font-semibold text-gray-800">{notificationDetails.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                  <span className="text-gray-700 dark:text-gray-300">{notificationDetails.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Navigation className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                  <span className="text-gray-700 dark:text-gray-300">{notificationDetails.address}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eta" className="text-blue-800 dark:text-blue-200">Estimated Arrival Time (in minutes)</Label>
                <div className="flex items-center">
                  <Input 
                    id="eta" 
                    type="number" 
                    min="1" 
                    max="120"
                    value={notificationDetails.estimatedArrival}
                    onChange={(e) => setNotificationDetails({
                      ...notificationDetails,
                      estimatedArrival: parseInt(e.target.value) || 15
                    })}
                    className="max-w-[100px]"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">minutes</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Label className="text-blue-800 dark:text-blue-200">Preview Message</Label>
                <Card className="bg-blue-100/50 dark:bg-gray-700/50 p-4 border-blue-200 dark:border-gray-600">
                  <p className="text-gray-800">
                    "Hi {notificationDetails.customerName}, this is Clean Machine Auto Detail. I'm on my way to your {" "}
                    {notificationDetails.serviceType} appointment and should arrive in approximately {notificationDetails.estimatedArrival} minutes. 
                    See you soon!"
                  </p>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNotificationModal(false)}
              className="border-blue-300 dark:border-gray-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Here you would actually send the SMS notification
                toast({
                  title: "Notification Sent",
                  description: `On my way notification sent to ${notificationDetails?.customerName}`,
                });
                setShowNotificationModal(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Clock className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Navigation Dialog */}
      <Dialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <DialogContent className="bg-blue-50/95 dark:bg-gray-800/95 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-800 dark:text-blue-200 flex items-center">
              <Navigation className="mr-2 h-5 w-5" /> 
              Navigate to Customer
            </DialogTitle>
            <DialogDescription>
              Get directions and send an ETA notification
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4 py-2">
              {/* Customer Information */}
              <div className="space-y-2 pb-2 border-b border-blue-100">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                  <span className="font-semibold text-gray-800">{selectedCustomer.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                  <span className="text-gray-700 dark:text-gray-300">Appointment at {selectedCustomer.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                  <span className="text-gray-700 dark:text-gray-300">{selectedCustomer.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                  <span className="text-gray-700 dark:text-gray-300">{selectedCustomer.service}</span>
                </div>
              </div>

              {/* Address & Navigation */}
              <div className="space-y-2">
                <Label htmlFor="customerAddress" className="text-blue-800 dark:text-blue-200">Address</Label>
                <div className="w-full p-3 bg-white border border-blue-200 rounded-md text-gray-800">
                  {selectedCustomer.address}
                </div>
              </div>

              {/* ETA Slider */}
              <div className="space-y-2 pt-2">
                <Label className="text-blue-800 dark:text-blue-200">Estimated Time of Arrival</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <select 
                      className="w-full p-2 border border-blue-200 rounded-md"
                      defaultValue="15"
                    >
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="20">20 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">1 hour</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Send ETA Message Preview */}
              <div className="space-y-2 pt-2">
                <Label className="text-blue-800 dark:text-blue-200">Message Preview</Label>
                <div className="p-3 bg-white border border-blue-200 rounded-md text-gray-800 text-sm">
                  "Hi {selectedCustomer.name}, this is Clean Machine Auto Detail. I'm on my way to your {selectedCustomer.service} appointment. My ETA is about 15 minutes. See you soon!"
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              className="flex-1 border-blue-300 dark:border-gray-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
              onClick={() => {
                if (!selectedCustomer) return;

                // Open in maps app or browser
                const encodedAddress = encodeURIComponent(selectedCustomer.address);
                window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');

                toast({
                  title: "Navigation Started",
                  description: `Opening directions to ${selectedCustomer.name}'s location`,
                });
              }}
            >
              <Navigation className="mr-2 h-4 w-4" />
              Open Maps
            </Button>

            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (!selectedCustomer) return;

                // Here you would actually send the ETA notification
                toast({
                  title: "ETA Notification Sent",
                  description: `${selectedCustomer.name} has been notified you're on your way`,
                });

                setShowNavigationDialog(false);
              }}
            >
              <Phone className="mr-2 h-4 w-4" />
              Send ETA Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="bg-blue-50/95 dark:bg-gray-800/95 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-blue-800 dark:text-blue-200 flex items-center">
              <FileText className="mr-2 h-5 w-5" /> 
              Send Invoice & Thank You
            </DialogTitle>
            <DialogDescription>
              Review service details and send invoice information to your customer
            </DialogDescription>
          </DialogHeader>

          {invoiceDetails && (
            <div className="space-y-6 py-4">
              {/* Customer Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-blue-800 dark:text-blue-200">Customer Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                      <span className="font-semibold text-gray-800">{invoiceDetails.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                      <span className="text-gray-700 dark:text-gray-300">{invoiceDetails.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Navigation className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                      <span className="text-gray-700 dark:text-gray-300">{invoiceDetails.address}</span>
                    </div>
                    {invoiceDetails.vehicleInfo && (
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                        <span className="text-gray-700 dark:text-gray-300">{invoiceDetails.vehicleInfo}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerEmail" className="text-blue-800 dark:text-blue-200">Customer Email</Label>
                    <Input 
                      id="customerEmail" 
                      value={invoiceDetails.customerEmail}
                      onChange={(e) => setInvoiceDetails({
                        ...invoiceDetails,
                        customerEmail: e.target.value
                      })}
                      placeholder="customer@example.com"
                      className="border-blue-200"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Required to send invoice via email</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-blue-800 dark:text-blue-200">Notification Options</h3>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="sendSms"
                        className="mt-1"
                        checked={true}
                        disabled
                      />
                      <div>
                        <Label htmlFor="sendSms">SMS Notification</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Send invoice and thank you message via text message
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="sendEmail"
                        className="mt-1"
                        checked={invoiceDetails.customerEmail.trim() !== ''}
                        disabled={invoiceDetails.customerEmail.trim() === ''}
                      />
                      <div>
                        <Label htmlFor="sendEmail">Email Receipt</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Send professional invoice as PDF via email
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="includeReviewLink"
                        className="mt-1"
                        checked={invoiceDetails.includeReviewLink}
                        onChange={(e) => setInvoiceDetails({
                          ...invoiceDetails,
                          includeReviewLink: e.target.checked
                        })}
                      />
                      <div>
                        <Label htmlFor="includeReviewLink">Include Review Link</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Add Google review link to thank you message
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Details Section */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-blue-800 dark:text-blue-200">Invoice Details</h3>

                <div className="rounded-md border border-blue-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-blue-200">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wider">Service</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 dark:text-blue-200 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-100">
                      {invoiceDetails.items.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                          <td className="px-4 py-3 text-sm text-gray-800">{item.service}</td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-right">
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const updatedItems = [...invoiceDetails.items];
                                updatedItems[index].price = parseFloat(e.target.value) || 0;

                                const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                const newTax = invoiceSettings.taxEnabled ? 
                                  Math.round(newSubtotal * invoiceSettings.taxRate * 100) / 100 : 0;
                                const newTotal = newSubtotal + newTax;

                                setInvoiceDetails({
                                  ...invoiceDetails,
                                  items: updatedItems,
                                  subtotal: newSubtotal,
                                  tax: newTax,
                                  total: newTotal
                                });
                              }}
                              className="w-24 h-8 text-right border-blue-200"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 text-right">
                            <Input
                              type="number"
                              value={item.quantity}
                              min={1}
                              max={10}
                              onChange={(e) => {
                                const updatedItems = [...invoiceDetails.items];
                                updatedItems[index].quantity = parseInt(e.target.value) || 1;

                                const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                const newTax = invoiceSettings.taxEnabled ? 
                                  Math.round(newSubtotal * invoiceSettings.taxRate * 100) / 100 : 0;
                                const newTotal = newSubtotal + newTax;

                                setInvoiceDetails({
                                  ...invoiceDetails,
                                  items: updatedItems,
                                  subtotal: newSubtotal,
                                  tax: newTax,
                                  total: newTotal
                                });
                              }}
                              className="w-20 h-8 text-right border-blue-200"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${(item.price * item.quantity).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (invoiceDetails.items.length > 1) {
                                  const updatedItems = invoiceDetails.items.filter((_, i) => i !== index);

                                  const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                  const newTax = Math.round(newSubtotal * 0.085 * 100) / 100;
                                  const newTotal = newSubtotal + newTax;

                                  setInvoiceDetails({
                                    ...invoiceDetails,
                                    items: updatedItems,
                                    subtotal: newSubtotal,
                                    tax: newTax,
                                    total: newTotal
                                  });
                                }
                              }}
                              disabled={invoiceDetails.items.length <= 1}
                            >
                              &times;
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-blue-800 dark:text-blue-200 text-right">Subtotal:</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${invoiceDetails.subtotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-blue-800 dark:text-blue-200 text-right">Tax (8.5%):</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${invoiceDetails.tax.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-blue-100">
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-blue-800 dark:text-blue-200 text-right">Total:</td>
                        <td className="px-4 py-2 text-sm font-bold text-blue-900 text-right">${invoiceDetails.total.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <Button 
                  type="button" 
                  variant="outline"
                  className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-gray-600 hover:bg-blue-100 text-sm"
                  onClick={() => {
                    // Add a new service item to the invoice
                    const updatedItems = [...invoiceDetails.items, {
                      service: "Additional Service",
                      price: 0,
                      quantity: 1
                    }];

                    setInvoiceDetails({
                      ...invoiceDetails,
                      items: updatedItems
                    });
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>

              {/* Custom Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="invoiceNotes" className="text-blue-800 dark:text-blue-200">Notes & Thank You Message</Label>
                <textarea
                  id="invoiceNotes"
                  value={invoiceDetails.notes}
                  onChange={(e) => setInvoiceDetails({
                    ...invoiceDetails,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Add a thank you note or special instructions..."
                />
              </div>

              {/* Preview Section */}
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-blue-800 dark:text-blue-200">Preview Message</h3>
                <Card className="bg-blue-50/70 p-4 border-blue-200">
                  <p className="text-gray-800">
                    "Thank you {invoiceDetails.customerName} for choosing Clean Machine Auto Detail for your {invoiceDetails.items[0].service.toLowerCase()}! Your total is ${invoiceDetails.total.toFixed(2)}. {invoiceDetails.notes}"
                    {invoiceDetails.includeReviewLink && (
                      <span> We'd appreciate it if you could leave us a review here: [Google Review Link]</span>
                    )}
                  </p>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowInvoiceModal(false)}
              className="border-blue-300 dark:border-gray-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                // Here we send the invoice notifications and award loyalty points
                if (!invoiceDetails) return;

                const notificationMethods = [];

                // SMS is always sent
                notificationMethods.push('SMS');

                // Email is sent if provided
                if (invoiceDetails.customerEmail.trim() !== '') {
                  notificationMethods.push('email');
                }

                try {
                  // Award loyalty points (1 point per dollar spent)
                  const pointsToAward = Math.floor(invoiceDetails.total);

                  // Make API call to award loyalty points
                  const response = await fetch('/api/invoice/award-loyalty-points', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      customerPhone: invoiceDetails.phone,
                      invoiceId: Date.now(), // Using timestamp as a simple invoice ID
                      amount: invoiceDetails.total,
                      customerName: invoiceDetails.customerName
                    })
                  });

                  const result = await response.json();

                  if (response.ok && result.success) {
                    toast({
                      title: "Invoice Sent",
                      description: `Thank you message and invoice sent to ${invoiceDetails.customerName} via ${notificationMethods.join(' and ')}. ${pointsToAward} loyalty points were awarded!`,
                    });
                  } else {
                    // Still show invoice sent toast even if loyalty points failed
                    toast({
                      title: "Invoice Sent",
                      description: `Thank you message and invoice sent to ${invoiceDetails.customerName} via ${notificationMethods.join(' and ')}.`,
                    });

                    console.error('Failed to award loyalty points:', result.message);
                  }
                } catch (error) {
                  // If there's an error awarding points, still consider the invoice sent
                  toast({
                    title: "Invoice Sent",
                    description: `Thank you message and invoice sent to ${invoiceDetails.customerName} via ${notificationMethods.join(' and ')}.`,
                  });

                  console.error('Error awarding loyalty points:', error);
                }

                setShowInvoiceModal(false);
              }}
              className="bg-green-600 hover:bg-green-700"
              disabled={!invoiceDetails}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Invoice & Thank You
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business Chat Interface */}
      <Dialog open={showBusinessChat} onOpenChange={setShowBusinessChat}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          {chatCustomer && (
            <BusinessChatInterface
              customerPhone={chatCustomer.phone}
              customerName={chatCustomer.name}
              onClose={() => setShowBusinessChat(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}