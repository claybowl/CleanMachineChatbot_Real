import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar,
  Settings,
  Save
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

interface BusinessHours {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  lunchHour: number;
  lunchMinute: number;
  daysOfWeek: number[];
}

export default function BusinessSettings() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Business hours state
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    startHour: 9,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    lunchHour: 12,
    lunchMinute: 0,
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday (0 = Sunday, 6 = Saturday)
  });
  
  const [allowWeekendBookings, setAllowWeekendBookings] = useState<boolean>(false);
  const [halfHourIncrements, setHalfHourIncrements] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Available hours and minutes for select dropdowns
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];
  
  const daysOfWeek = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];
  
  const handleSaveBusinessHours = async () => {
    setIsSaving(true);
    try {
      // Simulate API call - in a real app, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would be an API call:
      // const response = await fetch('/api/business-settings', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ 
      //     businessHours,
      //     allowWeekendBookings,
      //     halfHourIncrements
      //   }),
      // });
      // const data = await response.json();
      
      toast({
        title: "Settings Saved",
        description: "Your business hours and settings have been updated.",
      });
      
      // In this demo, we'll just store settings in localStorage
      localStorage.setItem('businessHours', JSON.stringify({
        businessHours,
        allowWeekendBookings,
        halfHourIncrements
      }));
    } catch (error) {
      console.error('Error saving business hours:', error);
      toast({
        title: "Error",
        description: "Failed to save business settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Effect to load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('businessHours');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setBusinessHours(parsed.businessHours);
        setAllowWeekendBookings(parsed.allowWeekendBookings);
        setHalfHourIncrements(parsed.halfHourIncrements);
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }
  }, []);
  
  const formatTimeDisplay = (hour: number, minute: number) => {
    const hourDisplay = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${hourDisplay}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };
  
  const toggleDayOfWeek = (day: number) => {
    if (businessHours.daysOfWeek.includes(day)) {
      setBusinessHours({
        ...businessHours,
        daysOfWeek: businessHours.daysOfWeek.filter(d => d !== day)
      });
    } else {
      setBusinessHours({
        ...businessHours,
        daysOfWeek: [...businessHours.daysOfWeek, day].sort()
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Business Settings</h1>
          <p className="text-gray-500">Configure your business hours and booking settings</p>
        </div>
        
        <div className="mt-4 md:mt-0 space-y-2 md:space-y-0 md:flex items-center space-x-4">
          <Button onClick={() => setLocation('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </header>
      
      <Tabs defaultValue="hours">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="hours" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Business Hours
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Booking Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>
        
        {/* Business Hours Tab */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Business Hours
                </div>
              </CardTitle>
              <CardDescription>
                Set your business hours and availability for appointments
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Working Days */}
              <div className="space-y-2">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={businessHours.daysOfWeek.includes(day.value) ? "default" : "outline"}
                      className="capitalize"
                      onClick={() => toggleDayOfWeek(day.value)}
                    >
                      {day.label.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Start Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="startTime">Opening Time</Label>
                  <div className="flex space-x-2">
                    <Select
                      value={businessHours.startHour.toString()}
                      onValueChange={(value) => setBusinessHours({
                        ...businessHours,
                        startHour: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hours.map(hour => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={businessHours.startMinute.toString()}
                      onValueChange={(value) => setBusinessHours({
                        ...businessHours,
                        startMinute: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minutes.map(minute => (
                          <SelectItem key={minute} value={minute.toString()}>
                            {minute.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* End Time */}
                <div className="space-y-1">
                  <Label htmlFor="endTime">Closing Time</Label>
                  <div className="flex space-x-2">
                    <Select
                      value={businessHours.endHour.toString()}
                      onValueChange={(value) => setBusinessHours({
                        ...businessHours,
                        endHour: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hours.map(hour => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={businessHours.endMinute.toString()}
                      onValueChange={(value) => setBusinessHours({
                        ...businessHours,
                        endMinute: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minutes.map(minute => (
                          <SelectItem key={minute} value={minute.toString()}>
                            {minute.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Lunch Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="lunchTime">Lunch Time (Not bookable)</Label>
                  <div className="flex space-x-2">
                    <Select
                      value={businessHours.lunchHour.toString()}
                      onValueChange={(value) => setBusinessHours({
                        ...businessHours,
                        lunchHour: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hours.map(hour => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={businessHours.lunchMinute.toString()}
                      onValueChange={(value) => setBusinessHours({
                        ...businessHours,
                        lunchMinute: parseInt(value)
                      })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minutes.map(minute => (
                          <SelectItem key={minute} value={minute.toString()}>
                            {minute.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-2">Business Hours Summary</h3>
                <p>Working days: {businessHours.daysOfWeek.map(day => daysOfWeek.find(d => d.value === day)?.label.slice(0, 3)).join(', ')}</p>
                <p>Hours: {formatTimeDisplay(businessHours.startHour, businessHours.startMinute)} to {formatTimeDisplay(businessHours.endHour, businessHours.endMinute)}</p>
                <p>Lunch break: {formatTimeDisplay(businessHours.lunchHour, businessHours.lunchMinute)} (1 hour)</p>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleSaveBusinessHours} 
                disabled={isSaving}
                className="ml-auto"
              >
                {isSaving ? 'Saving...' : 'Save Business Hours'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Booking Settings Tab */}
        <TabsContent value="booking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Appointment Settings
                </div>
              </CardTitle>
              <CardDescription>
                Configure how customers can book appointments
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allowWeekendBookings">Allow Weekend Bookings</Label>
                  <p className="text-sm text-gray-500">For emergency services only</p>
                </div>
                <Switch
                  id="allowWeekendBookings"
                  checked={allowWeekendBookings}
                  onCheckedChange={setAllowWeekendBookings}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="halfHourIncrements">Half-hour Booking Increments</Label>
                  <p className="text-sm text-gray-500">Allow 30-minute booking slots</p>
                </div>
                <Switch
                  id="halfHourIncrements"
                  checked={halfHourIncrements}
                  onCheckedChange={setHalfHourIncrements}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Minimum Notice Period</Label>
                <Select defaultValue="24">
                  <SelectTrigger>
                    <SelectValue placeholder="Select hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No minimum</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Minimum time before a customer can book an appointment
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Maximum Future Booking</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 week</SelectItem>
                    <SelectItem value="14">2 weeks</SelectItem>
                    <SelectItem value="30">1 month</SelectItem>
                    <SelectItem value="90">3 months</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  How far in advance customers can book appointments
                </p>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleSaveBusinessHours} 
                disabled={isSaving}
                className="ml-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Notification Settings
                </div>
              </CardTitle>
              <CardDescription>
                Configure notification preferences for appointments
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive appointment notifications via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  defaultChecked={true}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="smsNotifications">SMS Notifications</Label>
                  <p className="text-sm text-gray-500">Receive appointment notifications via SMS</p>
                </div>
                <Switch
                  id="smsNotifications"
                  defaultChecked={true}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Reminder Timing</Label>
                <Select defaultValue="24">
                  <SelectTrigger>
                    <SelectValue placeholder="Select hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour before</SelectItem>
                    <SelectItem value="2">2 hours before</SelectItem>
                    <SelectItem value="24">24 hours before</SelectItem>
                    <SelectItem value="48">48 hours before</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  When to send appointment reminders
                </p>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={handleSaveBusinessHours} 
                disabled={isSaving}
                className="ml-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}