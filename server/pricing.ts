import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export interface ServiceInfo {
  name: string;
  priceRange: string;
  description: string;
  duration: string;
  durationHours: number;
  included?: string;
  notes?: string;
}

// Google Sheet ID
const SPREADSHEET_ID = '1-xeX82TPoxxeyWXoCEXh-TdMkBHuJSXjoUSaiFjfv9g';

// Get Google Sheets client
async function getGoogleSheetsClient() {
  try {
    // Try to get credentials from environment first
    let credentials: any = null;
    
    if (process.env.GOOGLE_API_CREDENTIALS) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_API_CREDENTIALS);
        console.log('Using Google credentials from environment variable');
      } catch (parseError) {
        console.error('Failed to parse Google credentials from environment:', parseError);
      }
    }
    
    // If environment credentials failed, try to load from file
    if (!credentials) {
      try {
        const credentialsPath = path.join(__dirname, '../attached_assets/carbon-theorem-459017-j2-4be2fe1e8409.json');
        if (fs.existsSync(credentialsPath)) {
          const fileContent = fs.readFileSync(credentialsPath, 'utf8');
          credentials = JSON.parse(fileContent);
          console.log('Using Google credentials from file');
        }
      } catch (fileError) {
        console.error('Failed to load Google credentials from file:', fileError);
      }
    }
    
    // Exit if we couldn't get credentials from any source
    if (!credentials) {
      console.error('No valid Google API credentials found');
      return null;
    }
    
    // Set up authentication with the service account
    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    // Create and return the sheets client
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    return null;
  }
}

// Process the raw data from the sheet to our format
function processSheetData(data: any[]): ServiceInfo[] {
  if (!data || data.length <= 1) {
    return []; // Empty array if no data
  }
  
  // Get headers from first row
  const headers = data[0];
  
  // Process the rest of the rows
  return data.slice(1)
    .map(row => {
      // Skip empty rows
      if (!row || !row.length || !row.some(cell => cell && cell.toString().trim())) {
        return null;
      }
      
      // Create object with both named and indexed properties
      const obj: Record<string, any> = {};
      headers.forEach((header: string, index: number) => {
        if (header && header.trim()) {
          obj[header.trim()] = row[index] || '';
        }
        obj[index.toString()] = row[index] || '';
      });
      
      // Extract service information using various possible field names
      const name = obj['Service Name'] || obj['Service'] || obj['Add-On'] || obj['0'] || '';
      const category = obj['Category'] || obj['1'] || '';
      const priceRange = obj['Price Range'] || obj['Price'] || obj['2'] || '';
      const description = obj['Description'] || obj['3'] || '';
      const included = obj['Included'] || obj['4'] || '';
      const timeEstimate = obj['Time Estimate'] || obj['Duration'] || obj['5'] || '';
      const notes = obj['Notes'] || obj['6'] || '';
      
      // Combine some fields for better display if needed
      const fullDescription = description + 
                             (included ? `\n\nIncludes: ${included}` : '') + 
                             (notes ? `\n\nNotes: ${notes}` : '');
      
      // Parse duration to hours for scheduling
      let durationHours = parseDurationToHours(timeEstimate);
      
      // Create service object
      return {
        name: name.trim(),
        priceRange: formatPrice(priceRange.trim()),
        description: fullDescription.trim(),
        duration: timeEstimate.trim() || estimateDuration(name),
        durationHours,
        included: included.trim(),
        notes: notes.trim()
      };
    })
    .filter(service => service !== null && service.name)
    .map(service => service as ServiceInfo);
}

// Format price with $ if needed
function formatPrice(price: string): string {
  if (!price) return '';
  return price.includes('$') ? price : `$${price}`;
}

// Parse a duration string to hours
function parseDurationToHours(durationStr: string): number {
  if (!durationStr) return 1.5; // Default
  
  // Match patterns like "2-3 hours" or "45 minutes"
  const hourRangeMatch = durationStr.match(/(\d+)[-–](\d+)\s*(?:hours?|hrs?)/i);
  const hourMatch = durationStr.match(/(\d+)\s*(?:hours?|hrs?)/i);
  const minuteRangeMatch = durationStr.match(/(\d+)[-–](\d+)\s*(?:minutes?|mins?)/i);
  const minuteMatch = durationStr.match(/(\d+)\s*(?:minutes?|mins?)/i);
  
  if (hourRangeMatch) {
    // Average for range like "2-3 hours"
    return (parseInt(hourRangeMatch[1]) + parseInt(hourRangeMatch[2])) / 2;
  } else if (hourMatch) {
    // Direct hours
    return parseInt(hourMatch[1]);
  } else if (minuteRangeMatch) {
    // Average minutes converted to hours
    return (parseInt(minuteRangeMatch[1]) + parseInt(minuteRangeMatch[2])) / 2 / 60;
  } else if (minuteMatch) {
    // Direct minutes converted to hours
    return parseInt(minuteMatch[1]) / 60;
  }
  
  return 1.5; // Default to 1.5 hours if no pattern matched
}

// Estimate duration based on service name if not provided
function estimateDuration(serviceName: string): string {
  const name = serviceName.toLowerCase();
  
  if (name.includes('full') && name.includes('detail')) {
    return '4-5 hours';
  } else if (name.includes('interior') && name.includes('detail')) {
    return '2-3 hours';
  } else if (name.includes('wash') || name.includes('express')) {
    return '45-60 minutes';
  } else if (name.includes('ceramic') || name.includes('coating')) {
    return '6-8 hours';
  } else if (name.includes('maintenance')) {
    return '1-1.5 hours';
  } else if (name.includes('polish') || name.includes('paint')) {
    return '2-4 hours';
  } else if (name.includes('headlight')) {
    return '1 hour';
  }
  
  return '1-2 hours'; // Default estimate
}

// Get service data directly from Google Sheet
export async function getServiceData(): Promise<ServiceInfo[]> {
  try {
    console.log(`Loading services from Google Sheet: ${SPREADSHEET_ID}`);
    
    const sheetsClient = await getGoogleSheetsClient();
    if (!sheetsClient) {
      console.error('Unable to initialize Google Sheets client');
      return getDefaultServices();
    }
    
    // Get sheet names first to confirm exact tab names
    const spreadsheet = await sheetsClient.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    const sheetNames = spreadsheet.data.sheets?.map(sheet => 
      sheet.properties?.title
    ) || [];
    
    console.log('Available sheets:', sheetNames);
    
    // Look for a sheet that contains the word "service" but not "add"
    const servicesSheet = sheetNames.find(name => 
      name && 
      name.toLowerCase().includes('service') && 
      !name.toLowerCase().includes('add')
    );
    
    if (!servicesSheet) {
      console.error('No services sheet found');
      return getDefaultServices();
    }
    
    console.log(`Found services sheet: "${servicesSheet}"`);
    
    // Get the data from the services sheet
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${servicesSheet}!A1:Z1000` // Get a large range
    });
    
    const data = response.data.values;
    if (!data || data.length === 0) {
      console.error('No data found in services sheet');
      return getDefaultServices();
    }
    
    console.log(`Loaded ${data.length} rows from services sheet`);
    
    // Process the data into our format
    const services = processSheetData(data);
    console.log(`Processed ${services.length} services`);
    
    // Debug output of first service
    if (services.length > 0) {
      console.log('First service:', JSON.stringify(services[0]).substring(0, 200) + '...');
    }
    
    return services;
  } catch (error) {
    console.error('Error fetching service data from Google Sheet:', error);
    return getDefaultServices();
  }
}

// Get add-on services directly from Google Sheet
export async function getAddonServices(): Promise<ServiceInfo[]> {
  try {
    console.log(`Loading add-on services from Google Sheet: ${SPREADSHEET_ID}`);
    
    const sheetsClient = await getGoogleSheetsClient();
    if (!sheetsClient) {
      console.error('Unable to initialize Google Sheets client');
      return getDefaultAddonServices();
    }
    
    // Get sheet names first to confirm exact tab names
    const spreadsheet = await sheetsClient.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    const sheetNames = spreadsheet.data.sheets?.map(sheet => 
      sheet.properties?.title
    ) || [];
    
    // Look for a sheet that contains both "add" and "on" or similar
    const addOnSheet = sheetNames.find(name => 
      name && (
        (name.toLowerCase().includes('add') && name.toLowerCase().includes('on')) ||
        name.toLowerCase().includes('addon')
      )
    );
    
    if (!addOnSheet) {
      console.error('No add-on services sheet found');
      return getDefaultAddonServices();
    }
    
    console.log(`Found add-on services sheet: "${addOnSheet}"`);
    
    // Get the data from the add-on services sheet
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${addOnSheet}!A1:Z1000` // Get a large range
    });
    
    const data = response.data.values;
    if (!data || data.length === 0) {
      console.error('No data found in add-on services sheet');
      return getDefaultAddonServices();
    }
    
    console.log(`Loaded ${data.length} rows from add-on services sheet`);
    
    // Process the data into our format
    const addons = processSheetData(data);
    console.log(`Processed ${addons.length} add-on services`);
    
    // Debug output of first add-on
    if (addons.length > 0) {
      console.log('First add-on:', JSON.stringify(addons[0]).substring(0, 200) + '...');
    }
    
    return addons;
  } catch (error) {
    console.error('Error fetching add-on services data from Google Sheet:', error);
    return getDefaultAddonServices();
  }
}

// Default services if Google Sheet fails
function getDefaultServices(): ServiceInfo[] {
  return [
    {
      name: "Full Detail",
      priceRange: "$299",
      description: "Complete interior and exterior detailing that restores your vehicle to showroom condition. Includes clay bar treatment, wax protection, interior deep cleaning, and leather/vinyl conditioning.",
      duration: "4-5 hours",
      durationHours: 4.5
    },
    {
      name: "Interior Detail",
      priceRange: "$179",
      description: "Deep interior cleansing with steam cleaning, thorough vacuuming, stain removal, and conditioning of all interior surfaces including leather and plastics.",
      duration: "2-3 hours",
      durationHours: 2.5
    },
    {
      name: "Exterior Detail",
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
    }
  ];
}

// Default add-on services if Google Sheet fails
function getDefaultAddonServices(): ServiceInfo[] {
  return [
    {
      name: "Paint Protection",
      priceRange: "$199",
      description: "Premium ceramic-based paint protection that guards against UV damage, minor scratches, and environmental contaminants for up to 12 months.",
      duration: "1-2 hours",
      durationHours: 1.5
    },
    {
      name: "Headlight Restoration",
      priceRange: "$89",
      description: "Complete restoration of foggy or yellowed headlights to like-new clarity with UV protection to prevent future oxidation.",
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
    }
  ];
}

// Search services by name, description, etc.
export function searchServices(query: string, services: ServiceInfo[]): ServiceInfo[] {
  if (!query || !services || services.length === 0) {
    return services || [];
  }
  
  const normalizedQuery = query.toLowerCase();
  
  return services.filter(service => 
    service.name.toLowerCase().includes(normalizedQuery) ||
    service.description.toLowerCase().includes(normalizedQuery)
  );
}