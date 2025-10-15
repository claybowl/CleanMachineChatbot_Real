import { sheetsData } from './knowledge';

export interface ServiceInfo {
  name: string;
  priceRange: string;
  description: string;
  duration: string;
  durationHours: number;
}

// Helper function to extract duration hours from string
function extractDurationHours(durationStr: string): number {
  if (!durationStr) return 2; // Default

  const hourMatch = durationStr.match(/(\d+)(?:\s*-\s*\d+)?\s*hours?/i);
  if (hourMatch && hourMatch[1]) {
    return parseInt(hourMatch[1], 10);
  }

  const minuteMatch = durationStr.match(/(\d+)(?:\s*-\s*\d+)?\s*min/i);
  if (minuteMatch && minuteMatch[1]) {
    return Math.max(0.5, Math.round((parseInt(minuteMatch[1], 10) / 60) * 2) / 2);
  }

  return 2;
}

// Get all services from the knowledge base
export function getAllServices(): ServiceInfo[] {
  try {
    if (!sheetsData['services'] || !Array.isArray(sheetsData['services'])) {
      console.log('No services found in sheets data, using fallback');
      return getDefaultServices();
    }

    console.log(`Successfully loaded ${sheetsData['services'].length} services from Google Sheet`);

    const services = sheetsData['services']
      .filter(service => service && service['Service Name'])
      .map(service => {
        const name = service['Service Name'] || '';
        const priceRange = service['Price Range'] || 'Contact for pricing';
        const description = service['Description'] || '';
        const duration = service['Time Estimate'] || '';
        const durationHours = extractDurationHours(duration);

        return {
          name,
          priceRange,
          description,
          duration,
          durationHours
        };
      });

    return services.length > 0 ? services : getDefaultServices();
  } catch (error) {
    console.error('Error getting services:', error);
    return getDefaultServices();
  }
}

// Default services when Google Sheets fails
function getDefaultServices(): ServiceInfo[] {
  return [
    {
      name: "Full Detail",
      priceRange: "$225-300",
      description: "Complete interior and exterior detailing that restores your vehicle to showroom condition.",
      duration: "4-5 hours",
      durationHours: 4.5
    },
    {
      name: "Interior Only",
      priceRange: "$179",
      description: "Deep interior cleansing with steam cleaning, thorough vacuuming, stain removal, and conditioning of all interior surfaces including leather and plastics.",
      duration: "2-3 hours",
      durationHours: 2.5
    },
    {
      name: "Exterior Only",
      priceRange: "$169",
      description: "Premium exterior wash, decontamination, polish, and protection with high-grade carnauba wax. Includes wheels, tires, and all exterior trim.",
      duration: "1.5-2 hours",
      durationHours: 1.75
    },
    {
      name: "Express Wash",
      priceRange: "$59",
      description: "Quick but thorough exterior wash with hand drying, tire shine, and quick exterior protection. Perfect for regular maintenance.",
      duration: "45 minutes",
      durationHours: 0.75
    },
    {
      name: "Ceramic Coating",
      priceRange: "$899",
      description: "Professional-grade ceramic coating application for superior paint protection that lasts 2+ years. Includes complete paint correction before application.",
      duration: "8-10 hours",
      durationHours: 9
    },
    {
      name: "Maintenance Detail",
      priceRange: "$129",
      description: "Perfect for maintaining your vehicle between full details. Includes quick interior cleaning and exterior wash with protection refresh.",
      duration: "1.5 hours",
      durationHours: 1.5
    },
    {
      name: "Paint Correction",
      priceRange: "$499",
      description: "Professional multi-stage paint correction to remove swirls, scratches, and defects from your vehicle's paint. Includes final protection layer.",
      duration: "6-8 hours",
      durationHours: 7
    },
    {
      name: "Headlight Restoration",
      priceRange: "$89",
      description: "Complete restoration of foggy or yellowed headlights to like-new clarity. Includes UV protection to prevent future oxidation.",
      duration: "1 hour",
      durationHours: 1
    }
  ];
}

// Get all add-on services
export function getAddonServices(): ServiceInfo[] {
  try {
    if (!sheetsData['addons'] || !Array.isArray(sheetsData['addons'])) {
      console.log('No add-on services found in sheets data, using fallback');
      return getDefaultAddonServices();
    }

    console.log(`Successfully loaded ${sheetsData['addons'].length} add-on services from Google Sheet`);

    const addons = sheetsData['addons']
      .filter(addon => addon && addon['Add-On Service'])
      .map(addon => {
        const name = addon['Add-On Service'] || '';
        let priceRange = addon['Price'] || 'Contact for pricing';
        let description = addon['Description'] || '';
        
        // Special handling for headlight services
        if (name.toLowerCase().includes('headlight')) {
          // If price is $25 or similar, format as "per lens"
          if (priceRange.includes('25') || priceRange.includes('$25')) {
            priceRange = '$25 per lens (×2 typical)';
            description = description + ' Most customers need both headlight lenses restored. Price shown is per lens.';
          }
        }
        
        return {
          name,
          priceRange,
          description,
          duration: addon['Time Estimate'] || '',
          durationHours: extractDurationHours(addon['Time Estimate'])
        };
      });

    return addons.length > 0 ? addons : getDefaultAddonServices();
  } catch (error) {
    console.error('Error getting add-ons:', error);
    return getDefaultAddonServices();
  }
}

function getDefaultAddonServices(): ServiceInfo[] {
  return [
    {
      name: "Paint Protection",
      priceRange: "$199",
      description: "Premium ceramic-based paint protection",
      duration: "1-2 hours",
      durationHours: 1.5
    },
    {
      name: "Headlight Restoration",
      priceRange: "$25 per lens (×2 typical)",
      description: "Complete restoration of foggy or yellowed headlights to like-new clarity with UV protection to prevent future oxidation. Most customers need both headlight lenses restored. Price shown is per lens.",
      duration: "1 hour",
      durationHours: 1
    },
    {
      name: "Engine Bay Cleaning",
      priceRange: "$75",
      description: "Thorough cleaning and degreasing of your engine bay, followed by dressing of all plastic and rubber components for a showroom finish.",
      duration: "1 hour",
      durationHours: 1
    },
    {
      name: "Leather/Upholstery Protection",
      priceRange: "$99",
      description: "Premium fabric or leather protectant that repels liquids, prevents staining, and extends the life of your interior surfaces.",
      duration: "45 minutes",
      durationHours: 0.75
    },
    {
      name: "Odor Elimination",
      priceRange: "$79",
      description: "Professional-grade odor removal using ozone treatment and steam cleaning to eliminate even the toughest smells from your vehicle.",
      duration: "1-2 hours",
      durationHours: 1.5
    },
    {
      name: "Pet Hair Removal",
      priceRange: "$45",
      description: "Specialized treatment to remove embedded pet hair from carpet and upholstery using professional-grade tools and techniques.",
      duration: "30-45 minutes",
      durationHours: 0.5
    },
    {
      name: "Clay Bar Treatment",
      priceRange: "$65",
      description: "Deep cleaning of your paint surface to remove embedded contaminants that regular washing cannot remove, leaving a glass-smooth finish.",
      duration: "1 hour",
      durationHours: 1
    },
    {
      name: "Wheel & Caliper Detailing",
      priceRange: "$85",
      description: "Comprehensive cleaning and protection of wheels, wheel wells, and brake calipers with specialized products for maximum shine and protection.",
      duration: "1 hour",
      durationHours: 1
    }
  ];
}

export function searchServices(query: string): ServiceInfo[] {
  const services = getAllServices();
  if (!query) return services;

  const normalizedQuery = query.toLowerCase();
  return services.filter(service => 
    service.name.toLowerCase().includes(normalizedQuery) ||
    service.description.toLowerCase().includes(normalizedQuery)
  );
}