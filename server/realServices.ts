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
  
  // Try to extract hours 
  const hourMatch = durationStr.match(/(\d+)(?:\s*-\s*\d+)?\s*hours?/i);
  if (hourMatch && hourMatch[1]) {
    return parseInt(hourMatch[1], 10);
  }
  
  // Try to extract minutes and convert to hours
  const minuteMatch = durationStr.match(/(\d+)(?:\s*-\s*\d+)?\s*min/i);
  if (minuteMatch && minuteMatch[1]) {
    return Math.max(0.5, Math.round((parseInt(minuteMatch[1], 10) / 60) * 2) / 2);
  }
  
  return 2; // Default if no match
}

// Get services directly from the sheets data
export function getServicesFromSheets(): ServiceInfo[] {
  try {
    if (!sheetsData['Services'] || !Array.isArray(sheetsData['Services']) || sheetsData['Services'].length === 0) {
      console.log('No services found in sheets data, using fallback');
      return fallbackServices;
    }
    
    console.log(`Found ${sheetsData['Services'].length} services in sheets data`);
    
    return sheetsData['Services'].map(service => {
      // Map the sheet columns to our service interface with exact column names
      const name = service['Service Name'] || service['Service'] || '';
      const priceRange = service['Price'] || service['Price Range'] || service['Cost'] || 'Contact for pricing';
      const description = service['Service Description'] || service['Description'] || '';
      const duration = service['Duration'] || service['Time Estimate'] || '';
      const durationHours = extractDurationHours(duration);

      console.log(`Loading service: ${name} with price: ${priceRange}`); // Debug log
      
      return {
        name,
        priceRange,
        description,
        duration,
        durationHours
      };
    }).filter(service => service.name); // Only include services with a name
  } catch (error) {
    console.error('Error getting services from sheets:', error);
    return fallbackServices;
  }
}

// Fallback services list in case there's an issue with Google Sheets
const fallbackServices: ServiceInfo[] = [
  {
    name: "Full Detail",
    priceRange: "$250-350",
    description: "Complete interior and exterior cleaning, including clay bar treatment, wax, and leather conditioning",
    duration: "4-5 hours",
    durationHours: 4.5
  },
  {
    name: "Interior Only",
    priceRange: "$150-200",
    description: "Complete interior cleaning including steam cleaning, vacuuming, and surface protection",
    duration: "2-3 hours",
    durationHours: 2.5
  },
  {
    name: "Exterior Only",
    priceRange: "$120-180",
    description: "Thorough exterior wash, polish, and protection",
    duration: "1.5-2 hours",
    durationHours: 1.75
  },
  {
    name: "Express Wash",
    priceRange: "$50-70",
    description: "Quick exterior wash with hand drying",
    duration: "45 minutes",
    durationHours: 0.75
  },
  {
    name: "Ceramic Coating",
    priceRange: "$600-1200",
    description: "Professional ceramic coating application for long-lasting protection",
    duration: "8-10 hours",
    durationHours: 9
  }
];

// Main function to get services, trying sheets first, then fallback
export function getAllServices(): ServiceInfo[] {
  try {
    const sheetServices = getServicesFromSheets();
    if (sheetServices && sheetServices.length > 0) {
      return sheetServices;
    }
  } catch (error) {
    console.error('Error getting services from sheets:', error);
  }
  
  // Return fallback services if we can't get data from sheets
  return fallbackServices;
}

// Define interface for add-on services
export interface AddOnService {
  name: string;
  priceRange: string;
  description: string;
}

// Get add-on services from Google Sheets
function getAddOnsFromSheets(): AddOnService[] {
  try {
    if (!sheetsData['Add-Ons'] || !Array.isArray(sheetsData['Add-Ons']) || sheetsData['Add-Ons'].length === 0) {
      console.log('No add-ons found in sheets data, using fallback');
      return fallbackAddOns;
    }
    
    console.log(`Found ${sheetsData['Add-Ons'].length} add-ons in sheets data`);
    
    return sheetsData['Add-Ons']
      .map(addon => {
        // Map the sheet columns using exact column names from the Google Sheet
        const name = addon['Add-On Service'] || '';
        const priceRange = addon['Price'] || 'Contact for pricing';
        const description = addon['Description'] || '';
        
        // Debug log to see what we're getting
        console.log('Processing add-on:', { name, priceRange, description });
        
        if (!addon['Add-On Service']) {
          console.warn('Skipping invalid add-on entry:', addon);
          return null;
        }
        
        console.log(`Loading add-on: ${name} with price: ${priceRange}`); // Debug log
        
        // Update Ceramic Coating price if needed based on input
        if (name === 'Ceramic Coating Protection' && priceRange !== '$400-800') {
          console.log('Updating Ceramic Coating pricing to accurate range');
          return {
            name,
            priceRange: '$400-800',
            description: description + ' (starts at $400 for partial, $800+ for full vehicle)'
          };
        }
        
        return {
          name,
          priceRange,
          description
        };
      })
      .filter(addon => 
        // Filter out null entries and Clay Bar Treatment
        addon && addon.name && addon.name.trim() !== '' && addon.name !== 'Clay Bar Treatment'
      );
  } catch (error) {
    console.error('Error getting add-ons from sheets:', error);
    return fallbackAddOns;
  }
}

// Fallback add-on services list in case there's an issue with Google Sheets
const fallbackAddOns: AddOnService[] = [
  {
    name: "Leather Protector",
    priceRange: "$35-50",
    description: "Protection treatment for leather seats and surfaces"
  },
  {
    name: "Pet Hair Removal",
    priceRange: "$25-40",
    description: "Specialized removal of pet hair from upholstery and carpets"
  },
  {
    name: "Headlight Restoration",
    priceRange: "$60-90",
    description: "Restore cloudy, yellowed headlights to clear, like-new condition"
  },
  {
    name: "Odor Elimination",
    priceRange: "$30-60",
    description: "Professional-grade odor removal treatment for interior"
  },
  {
    name: "Ceramic Coating Protection",
    priceRange: "$400-800",
    description: "Add a layer of ceramic protection for long-lasting shine and protection (starts at $400 for partial, $800+ for full vehicle)"
  },
  {
    name: "Fabric Protection",
    priceRange: "$40-70",
    description: "Apply stain-resistant coating to fabric seats and carpets"
  }
];

// Main function to get add-on services
export function getAllAddOns(): AddOnService[] {
  try {
    const sheetAddOns = getAddOnsFromSheets();
    if (sheetAddOns && sheetAddOns.length > 0) {
      return sheetAddOns;
    }
  } catch (error) {
    console.error('Error getting add-ons from sheets:', error);
  }
  
  // Return fallback add-ons if we can't get data from sheets
  return fallbackAddOns;
}