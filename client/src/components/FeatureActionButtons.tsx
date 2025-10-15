import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Image,
  GiftIcon, 
  Star,
  Award,
  ExternalLink
} from 'lucide-react';
import { motion } from "framer-motion";

export default function FeatureActionButtons() {
  const { toast } = useToast();

  const handleGalleryClick = () => {
    window.open('/gallery', '_blank');
    toast({
      title: "Gallery",
      description: "Viewing our work gallery...",
    });
  };
  
  const handleGiftCardsClick = () => {
    window.open('https://squareup.com/gift/EDQKXPXWCXQWM/order', '_blank');
    toast({
      title: "Gift Cards",
      description: "Exploring our gift card options...",
    });
  };
  
  const handleReviewsClick = () => {
    window.open('https://g.page/r/CQo53O2yXrN8EBM/review', '_blank');
    toast({
      title: "Reviews",
      description: "Thank you for considering leaving a review!",
    });
  };
  
  const handleRewardsClick = () => {
    window.location.href = '/rewards';
    toast({
      title: "Loyalty Program",
      description: "Checking your loyalty points...",
    });
  };

  return (
    <motion.div 
      className="flex justify-center mt-5 mb-8 w-full max-w-xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
        <Button
          variant="ghost"
          onClick={handleGalleryClick}
          className="py-2 px-3 bg-blue-600/10 hover:bg-blue-600/30 text-white border-none rounded-md shadow-sm transition-all duration-300 transform hover:scale-105 hover:shadow-md hover:shadow-blue-800/20"
        >
          <Image className="h-4 w-4 mr-1 group-hover:animate-pulse" />
          Gallery
        </Button>

        <Button
          variant="ghost"
          onClick={handleGiftCardsClick}
          className="py-2 px-3 bg-blue-600/10 hover:bg-blue-600/30 text-white border-none rounded-md shadow-sm transition-all duration-300 transform hover:scale-105 hover:shadow-md hover:shadow-blue-800/20"
        >
          <GiftIcon className="h-4 w-4 mr-1 group-hover:animate-pulse" />
          Gift Cards
        </Button>

        <Button
          variant="ghost"
          onClick={handleReviewsClick}
          className="py-2 px-3 bg-blue-600/10 hover:bg-blue-600/30 text-white border-none rounded-md shadow-sm transition-all duration-300 transform hover:scale-105 hover:shadow-md hover:shadow-blue-800/20"
        >
          <Star className="h-4 w-4 mr-1 group-hover:animate-pulse" />
          Reviews
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleRewardsClick}
          className="py-2 px-3 bg-blue-600/10 hover:bg-blue-600/30 text-white border-none rounded-md shadow-sm transition-all duration-300 transform hover:scale-105 hover:shadow-md hover:shadow-blue-800/20"
        >
          <Award className="h-4 w-4 mr-1 group-hover:animate-pulse" />
          My Loyalty Points
        </Button>
      </div>
    </motion.div>
  );
}