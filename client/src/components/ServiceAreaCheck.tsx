import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServiceAreaCheckProps {
  onNext: (address: string, isExtendedArea?: boolean) => void;
  onBack: () => void;
}

export default function ServiceAreaCheck({ onNext, onBack }: ServiceAreaCheckProps) {
  const [address, setAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showOutOfAreaDialog, setShowOutOfAreaDialog] = useState<boolean>(false);
  const [formattedAddress, setFormattedAddress] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [driveTime, setDriveTime] = useState<string>("");
  const { toast } = useToast();

  // Real service area check using Google Maps Distance Matrix API
  const checkServiceArea = async (address: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // First, geocode the address to get coordinates
      const geocodeResponse = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      if (!geocodeResponse.ok) {
        throw new Error('Failed to geocode address');
      }
      
      const geocodeData = await geocodeResponse.json();
      if (!geocodeData.success || !geocodeData.location) {
        throw new Error('Invalid address or geocoding failed');
      }
      
      // Now check distance from business location (Tulsa)
      const distanceResponse = await fetch(`/api/distance-check?address=${encodeURIComponent(address)}`);
      if (!distanceResponse.ok) {
        throw new Error('Failed to check distance');
      }
      
      const distanceData = await distanceResponse.json();
      if (!distanceData.success) {
        throw new Error('Distance check failed');
      }
      
      // Store the formatted address and distance information
      if (distanceData.formattedAddress) {
        setFormattedAddress(distanceData.formattedAddress);
      }
      
      if (distanceData.distance && distanceData.distance.text) {
        setDistance(distanceData.distance.text);
      }
      
      if (distanceData.driveTime && distanceData.driveTime.text) {
        setDriveTime(distanceData.driveTime.text);
      }
      
      // If distance is less than or equal to the service radius (e.g., 30 miles), it's in the service area
      return distanceData.isInServiceArea;
    } catch (error) {
      console.error('Error checking service area:', error);
      toast({
        title: "Address Check Error",
        description: "We had trouble verifying your address. Please ensure it's entered correctly.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      toast({
        title: "Error",
        description: "Please enter an address to check",
        variant: "destructive",
      });
      return;
    }
    
    const isInServiceArea = await checkServiceArea(address);
    
    if (isInServiceArea) {
      // Address is in service area, proceed to next step
      toast({
        title: "Great news!",
        description: driveTime ? `You're in our service area (${driveTime} drive). Let's schedule your appointment.` : "You're in our service area. Let's schedule your appointment.",
      });
      // Use the formatted address from Google if available
      onNext(formattedAddress || address, false); // Not an extended area request
    } else {
      // Address is outside service area, show dialog
      setShowOutOfAreaDialog(true);
    }
  };

  const handleSubmitAnyway = () => {
    // Close dialog
    setShowOutOfAreaDialog(false);
    
    // Proceed to next step with flag indicating this is an extended area request
    // Use the formatted address from Google if available
    onNext(formattedAddress || address, true);
    
    toast({
      title: "Extended Area Request",
      description: "Your appointment will be marked as an extended service area request.",
    });
  };

  const handleCancelOutOfArea = () => {
    // Close dialog and let user try a different address
    setShowOutOfAreaDialog(false);
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
          <CardTitle className="text-xl font-bold">Check Service Area</CardTitle>
          <CardDescription className="text-white opacity-90">
            Please enter your address to check if you're in our service area
          </CardDescription>
        </CardHeader>
        
        <CardContent className="mt-4 w-full px-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Your Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full address"
                className="w-full"
                required
              />
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={isLoading || !address.trim()}
              >
                {isLoading ? "Checking..." : "Check Address"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Out of service area dialog */}
      <AlertDialog open={showOutOfAreaDialog} onOpenChange={setShowOutOfAreaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Outside Service Area</AlertDialogTitle>
            <AlertDialogDescription>
              Sorry, the address you entered {formattedAddress ? `(${formattedAddress})` : ""} is {driveTime ? `a ${driveTime} drive from our location` : distance ? `${distance} away from our location` : ""}, which is outside our regular service area of 26 minutes driving time. We do sometimes make exceptions for extended areas. Would you like to submit your request anyway as an extended service area request, or try a different address?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOutOfArea}>
              Try Different Address
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitAnyway} className="bg-blue-600 hover:bg-blue-700">
              Submit Request Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}