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
  PlusCircle
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
  description: string;
  duration: string;
  durationHours: number;
  isAddon?: boolean;
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<NotificationDetails | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerNavigation | null>(null);
  const [activeTab, setActiveTab] = useState('today');
  const [showBusinessChat, setShowBusinessChat] = useState(false);
  const [chatCustomer, setChatCustomer] = useState<{ phone: string; name: string } | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState({
    taxRate: 0.0, // Default to 0% tax
    taxEnabled: false,
    autoFillEmail: true
  });
  const { toast } = useToast();

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
  }, [todayDate]);

  // Fetch services and messages when component mounts
  useEffect(() => {
    // Fetch main services from your API
    fetch('/api/services')
      .then(response => response.json())
      .then(data => {
        if (data.success && data.services) {
          // Mark these as main services (not add-ons)
          const mainServices = data.services.map(service => ({
            ...service,
            isAddon: false
          }));
          
          // Fetch add-on services
          fetch('/api/addon-services')
            .then(response => response.json())
            .then(addonData => {
              if (addonData.success && addonData.addOns) {
                // Mark these as add-on services
                const addonServices = addonData.addOns.map(addon => ({
                  name: addon.name,
                  priceRange: addon.price,
                  description: addon.description || 'Add-on service',
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
    <div className="container mx-auto py-6 space-y-8 relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 min-h-screen text-white rounded-lg shadow-xl">
      {/* Floating Instant Chat Button */}
      {/* Removed floating chat button from dashboard as requested */}
      <header className="flex flex-col justify-between items-center mb-6">
        <div className="text-center w-full mb-4">
          <h1 className="text-xl md:text-2xl font-bold flex items-center justify-center">
            <CleanMachineLogo size="md" className="mr-3" />
            Clean Machine Dashboard
          </h1>
          <p className="text-blue-500/80 text-sm">Manage your auto detailing business</p>
        </div>
        
        <div className="w-full flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-between items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search customers, services..."
              className="w-full pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-blue-400 text-blue-600 hover:bg-blue-50"
              onClick={() => window.open('/documentation.pdf', '_blank')}
            >
              📄 Documentation
            </Button>
            <Button onClick={() => setLocation('/')} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile-optimized tab dropdown for all devices */}
        <div className="md:hidden mb-4">
          <div
            className="flex items-center justify-between p-3 bg-blue-600 text-white rounded-lg shadow cursor-pointer"
            onClick={() => document.getElementById('tab-dropdown')?.classList.toggle('hidden')}
          >
            <div className="flex items-center">
              <span className="ml-2 font-medium">
                {activeTab === 'today' && 'Today\'s Appointments'}
                {activeTab === 'messages' && 'Messages'}
                {activeTab === 'services' && 'Services'}
                {activeTab === 'reviews' && 'Reviews'}
                {activeTab === 'formatter' && 'Formatter'}
                {activeTab === 'weather' && 'Weather'}
                {activeTab === 'settings' && 'Settings'}
                {activeTab === 'upsell' && 'Upsell Management'}
                {activeTab === 'loyalty' && 'Loyalty Program'}
                {activeTab === 'cancellation' && 'Cancellation Feedback'}
              </span>
            </div>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div id="tab-dropdown" className="hidden absolute z-10 mt-1 w-64 bg-white rounded-md shadow-lg">
            <div className="py-1">
              <button onClick={() => {
                setActiveTab('today');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Today's Appointments</button>
              
              <button onClick={() => {
                setActiveTab('messages');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Messages</button>
              
              <button onClick={() => {
                setActiveTab('services');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Services</button>
              
              <button onClick={() => {
                setActiveTab('reviews');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Reviews</button>
              
              <button onClick={() => {
                setActiveTab('formatter');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Formatter</button>
              
              <button onClick={() => {
                setActiveTab('weather');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Weather</button>
              
              <button onClick={() => {
                setActiveTab('settings');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Settings</button>
              
              <button onClick={() => {
                setActiveTab('upsell');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Upsell Management</button>
              
              <button onClick={() => {
                setActiveTab('loyalty');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Loyalty Program</button>
              
              <button onClick={() => {
                setActiveTab('cancellation');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Cancellation Feedback</button>
              
              <button onClick={() => {
                setActiveTab('email-campaigns');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Email Campaigns</button>
              
              <button onClick={() => {
                setActiveTab('agent');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Agent Settings</button>
              
              <button onClick={() => {
                setLocation('/live-conversations');
                document.getElementById('tab-dropdown')?.classList.add('hidden');
              }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-100">Live Chat</button>
            </div>
          </div>
        </div>
        
        {/* Desktop tabs - shown only on larger screens */}
        <div className="hidden md:block mb-4">
          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'today' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('today')}
            >
              Today's Appointments
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'messages' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('messages')}
            >
              Messages
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'services' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('services')}
            >
              Services
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'reviews' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'formatter' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('formatter')}
            >
              Formatter
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'weather' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('weather')}
            >
              Weather
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'upsell' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('upsell')}
            >
              Upsell Management
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'loyalty' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('loyalty')}
            >
              Loyalty Program
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'cancellation' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('cancellation')}
            >
              Cancellation Test
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'email-campaigns' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('email-campaigns')}
            >
              Email Campaigns
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'agent' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
              onClick={() => setActiveTab('agent')}
            >
              Agent Settings
            </button>
          </div>
        </div>
        
        {/* Today's Appointments Tab */}
        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Card className="bg-blue-50/95 text-gray-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <CalendarClock className="mr-2 h-5 w-5 text-blue-600" />
                    {format(todayDate, 'MMM d, yyyy') === format(new Date(), 'MMM d, yyyy') 
                      ? "Today's Schedule" 
                      : `Schedule for ${format(todayDate, 'MMM d, yyyy')}`} ({filteredAppointments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {filteredAppointments.map((appointment) => (
                        <Card key={appointment.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow duration-300 bg-white/90">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg text-blue-700">{appointment.customerName}</CardTitle>
                                <CardDescription>{appointment.service}</CardDescription>
                              </div>
                              <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700">
                                {formatDate(appointment.time).split(',')[1]}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2 space-y-2">
                            <div className="flex items-center text-sm text-gray-500">
                              <Car className="mr-2 h-4 w-4" />
                              {appointment.vehicleInfo || "Vehicle info not available"}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Navigation className="mr-2 h-4 w-4" />
                              {appointment.address}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
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
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300"
                                onClick={() => notifyOnMyWay(appointment)}
                              >
                                <Car className="h-4 w-4 mr-2" />
                                Send "On My Way"
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
                                onClick={() => openInvoiceModal(appointment)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Send Invoice
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? "No matching appointments found" : "No appointments scheduled for today"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Calendar</span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const testing = async () => {
                            try {
                              const response = await fetch('/api/test-calendar');
                              const data = await response.json();
                              
                              if (data.success) {
                                console.log('Calendar integration working!', data);
                                toast({
                                  title: "Success",
                                  description: `Connected to Google Calendar! Found ${data.eventCount} upcoming events.`,
                                });
                              } else {
                                console.error('Calendar test failed:', data.error);
                                toast({
                                  title: "Error",
                                  description: `Calendar integration issue: ${data.error}`,
                                  variant: "destructive"
                                });
                              }
                            } catch (error) {
                              console.error('Error testing calendar:', error);
                              toast({
                                title: "Error",
                                description: "Failed to test calendar integration. See console for details.",
                                variant: "destructive"
                              });
                            }
                          };
                          
                          testing();
                        }}
                      >
                        Test Calendar
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                        onClick={async () => {
                          // Selected appointment's address coordinates
                          // In a real implementation, we'd geocode the address
                          let latitude = 36.1236407; // Default Tulsa coordinates
                          let longitude = -95.9359214;
                          
                          // Get selected appointment if any
                          const selectedAppointment = filteredAppointments.length > 0 ? filteredAppointments[0] : null;
                          
                          if (selectedAppointment && selectedAppointment.address) {
                            try {
                              // Here we would geocode the address, but for now we'll use default
                              toast({
                                title: "Weather Check",
                                description: `Checking weather for upcoming appointments`,
                              });
                            } catch (err) {
                              console.error('Error getting coordinates:', err);
                            }
                          }
                        }}
                      >
                        <CloudRain className="h-4 w-4 mr-2" />
                        Weather Check
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={todayDate}
                    onSelect={(date) => {
                      if (date) {
                        setTodayDate(date);
                        // Fetch appointments for the selected date
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
                    className="rounded-md border"
                    modifiersClassNames={{
                      selected: "bg-primary text-primary-foreground",
                      today: "bg-accent text-accent-foreground",
                      busy1: "bg-blue-200 text-blue-800 font-bold", // Light blue for 1 appointment
                      busy2: "bg-blue-400 text-blue-900 font-bold", // Medium blue for 2 appointments
                      busy3: "bg-blue-600 text-white font-bold",    // Dark blue for 3+ appointments
                    }}
                    modifiers={{
                      busy1: (date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        return appointmentCounts[dateStr] === 1;
                      },
                      busy2: (date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        return appointmentCounts[dateStr] === 2;
                      },
                      busy3: (date) => {
                        const dateStr = date.toISOString().split('T')[0];
                        return appointmentCounts[dateStr] >= 3;
                      }
                    }}
                  />
                </CardContent>
              </Card>
              
              <Card className="mt-4 bg-white/95 text-gray-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-blue-800">Quick Actions</CardTitle>
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
          <Card className="bg-blue-50/95 text-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />
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
                    <Card key={message.id} className={`border-l-4 ${message.needsAttention ? 'border-l-red-500' : 'border-l-blue-300'} hover:shadow-md transition-shadow duration-300 bg-blue-50/90`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <div className="mr-2 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg text-blue-700">{message.customerName}</CardTitle>
                              <CardDescription>{message.phone}</CardDescription>
                            </div>
                          </div>
                          <Badge variant={message.needsAttention ? "destructive" : "outline"} className={`font-mono ${!message.needsAttention ? 'bg-blue-50 text-blue-700' : ''}`}>
                            {message.needsAttention ? "Needs Attention" : formatDate(message.timestamp).split(',')[1]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-gray-700">"{message.content}"</p>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewServiceHistory(message.phone)}
                          className="text-blue-700 border-blue-300 hover:bg-blue-50"
                        >
                          History
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCall(message.phone)}
                          className="text-blue-700 border-blue-300 hover:bg-blue-50"
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
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? "No matching messages found" : "No recent messages"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card className="bg-blue-50/95 text-gray-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center text-blue-800">
                  <DollarSign className="mr-2 h-5 w-5 text-blue-600" />
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
                        : 'bg-transparent text-blue-700 hover:bg-blue-200'
                    }`}
                    onClick={() => setServiceType('main')}
                  >
                    Main Services
                  </button>
                  <button
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      serviceType === 'addon' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-transparent text-blue-700 hover:bg-blue-200'
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
                    <TableHead className="w-[200px]">Service</TableHead>
                    <TableHead>Price Range</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="max-w-[500px]">Description</TableHead>
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
                            value={selectedService.duration}
                            onChange={(e) => setSelectedService({...selectedService, duration: e.target.value})}
                          />
                        ) : (
                          service.duration
                        )}
                      </TableCell>
                      <TableCell className="max-w-[500px]">
                        {isEditingService && selectedService?.name === service.name ? (
                          <Input 
                            value={selectedService.description}
                            onChange={(e) => setSelectedService({...selectedService, description: e.target.value})}
                          />
                        ) : (
                          service.description
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Weather Tab */}
        <TabsContent value="weather" className="space-y-4">
          <Card className="bg-blue-50/95 text-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <CloudRain className="mr-2 h-5 w-5 text-blue-600" />
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
          <Card className="bg-white/95 text-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />
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
                  <p className="text-xs text-gray-500">
                    Your business Place ID is used to fetch reviews from Google
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Label htmlFor="apiKey">Google Maps API Key</Label>
                  <div className="flex gap-2">
                    <Input id="apiKey" type="password" placeholder="Enter your Google Maps API key" />
                    <Button className="bg-blue-600 hover:bg-blue-700">Save API Key</Button>
                  </div>
                  <p className="text-xs text-blue-600 font-medium">
                    ⚠️ The current API key appears to be invalid. Please provide a valid Google Maps API key.
                  </p>
                </div>
                
                <div className="mt-6 p-4 border border-blue-200 rounded-md bg-blue-50">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Tips</h3>
                  <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
                    <li>Ensure your Google Maps API key has the Places API enabled</li>
                    <li>Verify the API key has proper billing set up in Google Cloud Console</li>
                    <li>Check that the Place ID is correct for your business location</li>
                    <li>Test the API key using the "Test Connection" button below</li>
                  </ul>
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
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
          <Card className="bg-blue-50/95 text-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <Settings className="mr-2 h-5 w-5 text-blue-600" />
                Dashboard Settings
              </CardTitle>
              <CardDescription>
                Configure when to escalate conversations to you directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Human Escalation Triggers</h3>
                <p className="text-sm text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
                        Offer direct connection for repeat customers with 3+ previous services
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Invoice Settings</h3>
                <p className="text-sm text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
                        Automatically populate email addresses from customer database
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                <p className="text-sm text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
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
          <Card className="bg-blue-50/95 text-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />
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
      </Tabs>
      
      {/* On My Way Notification Modal */}
      <Dialog open={showNotificationModal} onOpenChange={setShowNotificationModal}>
        <DialogContent className="bg-blue-50/95">
          <DialogHeader>
            <DialogTitle className="text-blue-800 flex items-center">
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
                  <User className="h-4 w-4 text-blue-700" />
                  <span className="font-semibold text-gray-800">{notificationDetails.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-blue-700" />
                  <span className="text-gray-700">{notificationDetails.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Navigation className="h-4 w-4 text-blue-700" />
                  <span className="text-gray-700">{notificationDetails.address}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="eta" className="text-blue-800">Estimated Arrival Time (in minutes)</Label>
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
                  <span className="ml-2 text-sm text-gray-700">minutes</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <Label className="text-blue-800">Preview Message</Label>
                <Card className="bg-blue-100/50 p-4 border-blue-200">
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
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
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
        <DialogContent className="bg-blue-50/95 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-800 flex items-center">
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
                  <User className="h-4 w-4 text-blue-700" />
                  <span className="font-semibold text-gray-800">{selectedCustomer.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-700" />
                  <span className="text-gray-700">Appointment at {selectedCustomer.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-blue-700" />
                  <span className="text-gray-700">{selectedCustomer.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-blue-700" />
                  <span className="text-gray-700">{selectedCustomer.service}</span>
                </div>
              </div>
              
              {/* Address & Navigation */}
              <div className="space-y-2">
                <Label htmlFor="customerAddress" className="text-blue-800">Address</Label>
                <div className="w-full p-3 bg-white border border-blue-200 rounded-md text-gray-800">
                  {selectedCustomer.address}
                </div>
              </div>
              
              {/* ETA Slider */}
              <div className="space-y-2 pt-2">
                <Label className="text-blue-800">Estimated Time of Arrival</Label>
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
                <Label className="text-blue-800">Message Preview</Label>
                <div className="p-3 bg-white border border-blue-200 rounded-md text-gray-800 text-sm">
                  "Hi {selectedCustomer.name}, this is Clean Machine Auto Detail. I'm on my way to your location for your {selectedCustomer.service} appointment. My ETA is about 15 minutes. See you soon!"
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline"
              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100"
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
        <DialogContent className="bg-blue-50/95 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-blue-800 flex items-center">
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
                  <h3 className="text-md font-semibold text-blue-800">Customer Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-blue-700" />
                      <span className="font-semibold text-gray-800">{invoiceDetails.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-blue-700" />
                      <span className="text-gray-700">{invoiceDetails.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Navigation className="h-4 w-4 text-blue-700" />
                      <span className="text-gray-700">{invoiceDetails.address}</span>
                    </div>
                    {invoiceDetails.vehicleInfo && (
                      <div className="flex items-center space-x-2">
                        <Car className="h-4 w-4 text-blue-700" />
                        <span className="text-gray-700">{invoiceDetails.vehicleInfo}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail" className="text-blue-800">Customer Email</Label>
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
                    <p className="text-xs text-gray-500">Required to send invoice via email</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-blue-800">Notification Options</h3>
                  
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
                        <p className="text-xs text-gray-500">
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
                        <p className="text-xs text-gray-500">
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
                        <p className="text-xs text-gray-500">
                          Add Google review link to thank you message
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Invoice Details Section */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-blue-800">Invoice Details</h3>
                
                <div className="rounded-md border border-blue-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-blue-200">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Service</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Actions</th>
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
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-blue-800 text-right">Subtotal:</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${invoiceDetails.subtotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-blue-800 text-right">Tax (8.5%):</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${invoiceDetails.tax.toFixed(2)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-blue-100">
                        <td colSpan={3} className="px-4 py-2 text-sm font-medium text-blue-800 text-right">Total:</td>
                        <td className="px-4 py-2 text-sm font-bold text-blue-900 text-right">${invoiceDetails.total.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline"
                  className="text-blue-700 border-blue-300 hover:bg-blue-100 text-sm"
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
                <Label htmlFor="invoiceNotes" className="text-blue-800">Notes & Thank You Message</Label>
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
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <h3 className="text-md font-semibold text-blue-800">Preview Message</h3>
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
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
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