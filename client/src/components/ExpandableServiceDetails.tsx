import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExpandableServiceDetailsProps {
  name: string;
  priceRange: string;
}

// Define service detail content based on the provided text
const serviceDetails: Record<string, {
  tagline?: string;
  priceRange: string;
  interior?: string[];
  exterior?: string[];
  features?: string[];
  process?: string[];
  duration?: string;
  additionalNotes?: string;
}> = {
  "Full Detail": {
    tagline: "Aimed at making your vehicle look and feel like brand new, this is our most popular service.",
    priceRange: "$299",
    interior: [
      "Carpet & upholstery steamed & shampooed",
      "Leather cleaned & conditioned",
      "Thorough vacuuming",
      "Spot treat headliner",
      "Interior windows and glass cleaned",
      "Trim, dash, plastics cleaned & dressed with UV protection"
    ],
    exterior: [
      "Gentle hand Wash",
      "Durable ceramic spray wax on paint & glass",
      "Clay paint- removes imbedded contaminates",
      "Clean wheels | Tires | Dress Tires"
    ],
    duration: "Usually takes 2-4 hours",
    additionalNotes: "Excessive pet hair, stains, or debris that add significant time may result in an additional fee ($25+). We'll always let you know first"
  },
  "Interior Only": {
    tagline: "Aims to clean the interior to it's best possible condition, top-to-bottom, front-to-back.",
    priceRange: "$179",
    interior: [
      "Thorough vacuuming",
      "Carpet & upholstery steamed & shampooed",
      "Leather cleaned & conditioned",
      "Spot treat headliner",
      "Interior windows and glass cleaned",
      "Trim, dash, plastics cleaned & dressed with UV protection"
    ],
    duration: "Usually takes 1-4 hours",
    additionalNotes: "*Add leather/upholstery protectant!"
  },
  "Maintenance Detail": {
    tagline: "A hand wash & spray wax, vacuum and interior wipedown is the best way to keep your vehicle protected and looking great in-between details. Recommended every 3 months.",
    priceRange: "$129",
    interior: [
      "Wipedown Dash | Console | Panels",
      "Spot treat small stains",
      "Vacuum Interior",
      "Glass Cleaned inside & out"
    ],
    exterior: [
      "Thorough hand Wash",
      "Hydrophobic ceramic spray wax on paint & glass",
      "Clean wheels | Tires | Dress Tires"
    ],
    duration: "Takes 1-2 hours"
  },
  "Paint Correction": {
    tagline: "The complete exterior detail. Removes many water spots and swirls dramatically enhancing your paint's shine & gloss while waxing paint for over 3 months with top-of-the-line Rupes Uno Protect.",
    priceRange: "$499",
    exterior: [
      "Hand wash, wheels | tires | tire dressing",
      "Bug and tar removal",
      "Paint decontamination - Iron removal & clay",
      "Machine Polish & Wax w/ Rupes Uno Protect",
      "Ceramic sealant on windows & wheels",
      "Clean interior windows",
      "Black trim treatment",
      "Polish exhaust tips"
    ],
    duration: "Takes 1-3 hours"
  },
  "Ceramic Coating - 1 Year": {
    tagline: "Ceramic Coatings offer the best paint protection and gloss available on the market today. Including our 1-step polish, a true SiO2 coating is certainly the best thing you can do for the health and appearance of your vehicle.",
    priceRange: "$300",
    features: [
      "SiO2 coatings act as a 'Super-Wax', so you don't need to apply waxes throughout its lifetime",
      "Our coating offers protection from UV and sun, weather erosion and acid rain",
      "Protection from tree gunk and bird droppings while providing more gloss than the finest waxes"
    ],
    exterior: [
      "Hand wash, wheels | tires | tire dressing",
      "Paint decontamination - Iron removal & clay",
      "1-stage compound & polish 60-90% correction",
      "Window Sealant",
      "Black trim conditioner",
      "Polish exhaust tips",
      "1 year Nasial SiO2 coating hand applied to exterior paint and wheel faces"
    ],
    additionalNotes: "*Guaranteed by Clean Machine!"
  },
  "Ceramic Coating - 3 Year": {
    tagline: "Ceramic Coatings offer the best paint protection and gloss available on the market today. Including our 2-step polish, a true SiO2 coating is certainly the best thing you can do for the health and appearance of your vehicle.",
    priceRange: "$750",
    features: [
      "SiO2 coatings act as a 'Super-Wax', so you don't need to apply waxes throughout its lifetime",
      "Our coating offers 3-5 years of protection from UV and sun, weather erosion and acid rain",
      "Protection from tree gunk and bird droppings while providing more gloss than the finest waxes"
    ],
    exterior: [
      "Hand wash, wheels | tires | tire dressing",
      "Paint decontamination - Iron removal & clay",
      "2-stage compound & polish 60-90% correction",
      "Window Sealant",
      "Black trim conditioner",
      "Polish exhaust tips",
      "3 year Nasial SiO2 coating hand applied to exterior paint and wheel faces"
    ],
    additionalNotes: "*Guaranteed by Clean Machine!"
  },
  "Motorcycle Detail": {
    tagline: "",
    priceRange: "$150-175",
    exterior: [
      "Machine polish remove light swirls and renew the shine & luster of your paint",
      "Thorough hand wash",
      "Wax paint and windscreen",
      "Condition leather, vinyl, rubber or plastic seats/trim"
    ]
  },
  "Premium Wash": {
    tagline: "Thorough hand wash with durable ceramic wax.",
    priceRange: "$75",
    exterior: [
      "Hand wash paint",
      "Clay paint- removes imbedded contaminates",
      "Hand wash wheels, tires & wheel wells",
      "Clean and seal exterior glass and windows",
      "Durable ceramic spray wax for 3-months of protection"
    ]
  },
  "Shampoo seats & or Carpets": {
    tagline: "",
    priceRange: "$80-150",
    interior: [
      "Deep cleaning of seats and carpets",
      "Stain treatment",
      "Steam extraction",
      "Deep soil removal"
    ]
  },
  // Add-on services
  "Leather Conditioning": {
    tagline: "Premium conditioning treatment to protect and restore leather surfaces",
    priceRange: "$35-50",
    process: [
      "Deep cleaning of leather surfaces",
      "Application of specialized leather conditioner",
      "UV protection treatment",
      "Helps prevent cracking and drying"
    ]
  },
  "Headlight Restoration": {
    tagline: "Restore cloudy, yellowed headlights to clear, like-new condition",
    priceRange: "$25 per lens",
    process: [
      "Multiple-stage sanding process",
      "Professional polishing technique",
      "UV protective coating application",
      "Dramatically improves visibility & appearance"
    ]
  },
  "Excessive Pet Hair Removal": {
    tagline: "Specialized removal of excessive pet hair from upholstery and carpets",
    priceRange: "$25-40",
    process: [
      "Specialized tools for deep-embedded excessive pet hair",
      "Complete surface treatment",
      "Extra attention to problem areas",
      "Finishing vacuum process"
    ]
  }
};

// Default fallback details when specific service details are not found
const defaultDetails = {
  tagline: "",
  priceRange: "Contact for pricing",
  interior: ["Professional interior cleaning"],
  exterior: ["Professional exterior detailing"]
};

export const ExpandableServiceDetails: React.FC<ExpandableServiceDetailsProps> = ({ name, priceRange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get details for this service, or use defaults
  const details = serviceDetails[name] || {
    ...defaultDetails,
    priceRange
  };
  
  return (
    <div className="w-full mt-3 border-t border-gray-800 pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-0 h-auto text-blue-400 hover:text-blue-300 bg-transparent hover:bg-transparent focus:bg-transparent"
      >
        <span className="font-medium text-sm">View Service Details</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden text-left bg-gray-950 p-4 mt-2 rounded-md"
          >
            <div className="py-3 space-y-4">
              {details.tagline && (
                <p className="text-sm text-gray-200 italic text-center font-medium">{details.tagline}</p>
              )}
              
              {details.interior && details.interior.length > 0 && (
                <div>
                  <h4 className="text-center text-white font-bold uppercase text-sm mb-3">INTERIOR</h4>
                  <ul className="space-y-2">
                    {details.interior.map((item, idx) => (
                      <li key={`interior-${idx}`} className="flex items-start text-gray-200 text-sm">
                        <span className="text-blue-400 mr-2 pt-0.5 font-bold">•</span>
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {details.exterior && details.exterior.length > 0 && (
                <div>
                  <h4 className="text-center text-white font-bold uppercase text-sm mb-3">EXTERIOR</h4>
                  <ul className="space-y-2">
                    {details.exterior.map((item, idx) => (
                      <li key={`exterior-${idx}`} className="flex items-start text-gray-200 text-sm">
                        <span className="text-blue-400 mr-2 pt-0.5 font-bold">•</span>
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {details.features && details.features.length > 0 && (
                <div>
                  <h4 className="text-center text-white font-bold uppercase text-sm mb-3">FEATURES</h4>
                  <ul className="space-y-2">
                    {details.features.map((item, idx) => (
                      <li key={`feature-${idx}`} className="flex items-start text-gray-200 text-sm">
                        <span className="text-blue-400 mr-2 pt-0.5 font-bold">•</span>
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {details.process && details.process.length > 0 && (
                <div>
                  <h4 className="text-center text-white font-bold uppercase text-sm mb-3">PROCESS</h4>
                  <ul className="space-y-2">
                    {details.process.map((item, idx) => (
                      <li key={`process-${idx}`} className="flex items-start text-gray-200 text-sm">
                        <span className="text-blue-400 mr-2 pt-0.5 font-bold">•</span>
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {details.duration && (
                <p className="text-gray-300 text-sm text-center italic font-medium mt-2 border-t border-gray-800 pt-3">
                  {details.duration}
                </p>
              )}
              
              {details.additionalNotes && (
                <p className="text-gray-300 text-sm text-center mt-2 font-medium">
                  {details.additionalNotes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpandableServiceDetails;