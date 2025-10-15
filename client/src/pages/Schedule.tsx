import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MultiVehicleAppointmentScheduler from "@/components/MultiVehicleAppointmentScheduler";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function SchedulePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleAppointmentSuccess = (appointmentDetails: any) => {
    toast({
      title: "Appointment Scheduled",
      description: `Your ${appointmentDetails.service} appointment has been confirmed for ${appointmentDetails.formattedTime}.`,
    });
    
    // Redirect to success page or home
    setTimeout(() => {
      setLocation("/");
    }, 3000);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
          <CardTitle className="text-2xl font-bold text-center">Schedule Your Detailing Service</CardTitle>
          <p className="text-center text-white/90 mt-2">
            Complete the form below to book your premium auto detailing service
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <MultiVehicleAppointmentScheduler 
            onClose={() => setLocation("/")} 
            onSuccess={handleAppointmentSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
}