import React from 'react';
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
import { CloudRain, AlertTriangle } from 'lucide-react';

interface WeatherAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  onReschedule: () => void;
  weatherRiskLevel: 'none' | 'low' | 'moderate' | 'high' | 'very-high' | 'severe';
  precipitationChance: number;
  date: string;
}

const WeatherAlertDialog: React.FC<WeatherAlertDialogProps> = ({
  open,
  onOpenChange,
  onProceed,
  onReschedule,
  weatherRiskLevel,
  precipitationChance,
  date
}) => {
  // Helper function to get color and message based on risk level
  const getRiskData = () => {
    switch (weatherRiskLevel) {
      case 'severe':
        return {
          color: 'bg-red-600 bg-opacity-20 text-red-800',
          icon: <AlertTriangle className="h-5 w-5 text-red-800 mr-2" />,
          title: 'Severe Weather Warning',
          description: `There is an extremely high chance (${precipitationChance}%) of rain on the selected date. This will almost certainly prevent us from performing quality detailing work.`
        };
      case 'very-high':
        return {
          color: 'bg-orange-500 bg-opacity-30 text-orange-800',
          icon: <CloudRain className="h-5 w-5 text-orange-800 mr-2" />,
          title: 'Very High Chance of Rain',
          description: `There is a very high chance (${precipitationChance}%) of rain on the selected date. This may significantly impact our ability to provide quality service.`
        };
      case 'high':
        return {
          color: 'bg-orange-400 bg-opacity-25 text-orange-800',
          icon: <CloudRain className="h-5 w-5 text-orange-800 mr-2" />,
          title: 'High Chance of Rain',
          description: `There is a high chance (${precipitationChance}%) of rain on the selected date. This may affect the quality of our detailing service.`
        };
      case 'moderate':
        return {
          color: 'bg-yellow-400 bg-opacity-30 text-yellow-800',
          icon: <CloudRain className="h-5 w-5 text-yellow-800 mr-2" />,
          title: 'Moderate Chance of Rain',
          description: `There is a moderate chance (${precipitationChance}%) of rain on the selected date. We can still perform the service, but exterior detailing might be affected.`
        };
      default:
        return {
          color: 'bg-green-500 bg-opacity-20 text-green-800',
          icon: <CloudRain className="h-5 w-5 text-green-800 mr-2" />,
          title: 'Weather Notice',
          description: `There is a low chance (${precipitationChance}%) of rain on the selected date.`
        };
    }
  };

  const { color, icon, title, description } = getRiskData();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            {icon} {title}
          </AlertDialogTitle>
          <div className={`p-3 rounded-md ${color} mb-3 mt-1`}>
            <AlertDialogDescription className="text-inherit">
              {description}
            </AlertDialogDescription>
          </div>
          <AlertDialogDescription>
            Would you like to proceed with this appointment time or choose a different date?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onReschedule}>Choose Different Date</AlertDialogCancel>
          <AlertDialogAction onClick={onProceed}>
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default WeatherAlertDialog;