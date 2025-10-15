import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

// Data store for sheet contents
export let sheetsData: Record<string, any[]> = {};

// Process sheet data into usable format
function processSheetData(sheetName: string, data: any[]): any[] {
  if (!data || data.length <= 1) {
    console.log(`Warning: Insufficient data in tab ${sheetName}`);
    return []; // Need at least headers + 1 row
  }
  
  // Convert to array of objects
  const headers = data[0];
  return data.slice(1).map((row: any) => {
    // Skip empty rows
    if (!row || row.length === 0) {
      return null;
    }
    
    const obj: any = {};
    
    // Add both header-keyed properties and numeric index properties
    headers.forEach((header: string, index: number) => {
      if (header && header.trim()) {
        obj[header] = row[index] || '';
      }
      // Always add numeric indices for easier access
      obj[index.toString()] = row[index] || '';
    });
    
    return obj;
  }).filter(item => item !== null); // Remove empty rows
}

// Format the knowledge base from all sheets
function formatKnowledgeBase(): string {
  let knowledgeBase = '# Clean Machine Auto Detail Information\n\n';
  
  // Add services information
  if (sheetsData['services'] && sheetsData['services'].length > 0) {
    knowledgeBase += '## Our Services\n\n';
    sheetsData['services'].forEach(service => {
      const name = service['Service'] || service['Service Name'] || service['0'] || 'Unnamed Service';
      const price = service['Price'] || service['Price Range'] || service['Cost'] || service['1'] || 'Price varies';
      const description = service['Description'] || service['2'] || '';
      knowledgeBase += `- ${name}: ${price} - ${description}\n`;
    });
    knowledgeBase += '\n';
  }
  
  // Add add-on services information
  if (sheetsData['addons'] && sheetsData['addons'].length > 0) {
    knowledgeBase += '## Add-on Services\n\n';
    sheetsData['addons'].forEach(addon => {
      const name = addon['Service'] || addon['Add-on'] || addon['0'] || 'Unnamed Add-on';
      const price = addon['Price'] || addon['Price Range'] || addon['Cost'] || addon['1'] || 'Price varies';
      const description = addon['Description'] || addon['2'] || '';
      knowledgeBase += `- ${name}: ${price} - ${description}\n`;
    });
    knowledgeBase += '\n';
  }
  
  return knowledgeBase;
}

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

// Force reload of sheets data
export async function forceReloadSheets(): Promise<boolean> {
  console.log('Force reloading sheets data...');
  return await loadAllSheets(true);
}

// Load all sheets from Google Sheets
async function loadAllSheets(forceReload: boolean = false): Promise<boolean> {
  // Use the spreadsheet ID from your shared Google Sheet
  const spreadsheetId = '1-xeX82TPoxxeyWXoCEXh-TdMkBHuJSXjoUSaiFjfv9g';
  
  console.log(`Loading spreadsheet with ID: ${spreadsheetId}`);
  
  const sheetsClient = await getGoogleSheetsClient();
  if (!sheetsClient) {
    return false;
  }

  try {
    // First, get the list of sheets
    const spreadsheet = await sheetsClient.spreadsheets.get({
      spreadsheetId
    });
    
    // Extract the sheet names
    const sheetNames = spreadsheet.data.sheets?.map((sheet: any) => 
      sheet.properties?.title
    ) || [];
    
    console.log('Google Sheets found:', JSON.stringify(sheetNames));
    
    // Define the exact tab names we're looking for
    const serviceTabNames = ["Services", "services", "Service", "service"];
    const addOnTabNames = ["Add-Ons", "Add-ons", "Add-on Services", "add-on services", "Addons"];
    
    // Try to find the services tab
    let servicesTab = null;
    for (const tabName of serviceTabNames) {
      const found = sheetNames.find(name => name === tabName);
      if (found) {
        servicesTab = found;
        break;
      }
    }
    
    // Try to find the add-on services tab
    let addOnsTab = null;
    for (const tabName of addOnTabNames) {
      const found = sheetNames.find(name => name === tabName);
      if (found) {
        addOnsTab = found;
        break;
      }
    }
    
    console.log(`Found tabs - Services: ${servicesTab}, Add-ons: ${addOnsTab}`);
    
    // Load Services tab
    if (servicesTab) {
      try {
        console.log(`Loading services from tab: ${servicesTab}`);
        
        // Get data from the sheet
        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: `${servicesTab}!A1:Z1000` // Get a large range
        });
        
        const sheetData = response.data.values || [];
        console.log(`Services tab has ${sheetData.length} rows of data`);
        
        // Process the data
        sheetsData['services'] = processSheetData('services', sheetData);
        
        console.log(`Successfully loaded ${servicesTab} tab with ${sheetsData['services'].length} rows`);
        
        if (sheetsData['services'].length > 0) {
          console.log(`Sample services data: ${JSON.stringify(sheetsData['services'][0]).substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`Error loading services tab ${servicesTab}:`, error);
      }
    } else {
      console.log(`Services tab not found in the provided sheet`);
    }
    
    // Load Add-On Services tab
    if (addOnsTab) {
      try {
        console.log(`Loading add-on services from tab: ${addOnsTab}`);
        
        // Get data from the sheet
        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: `${addOnsTab}!A1:Z1000` // Get a large range
        });
        
        const sheetData = response.data.values || [];
        console.log(`Add-on services tab has ${sheetData.length} rows of data`);
        
        // Process the data
        sheetsData['addons'] = processSheetData('addons', sheetData);
        
        console.log(`Successfully loaded ${addOnsTab} tab with ${sheetsData['addons'].length} rows`);
        
        if (sheetsData['addons'].length > 0) {
          console.log(`Sample add-on data: ${JSON.stringify(sheetsData['addons'][0]).substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`Error loading add-on services tab ${addOnsTab}:`, error);
      }
    } else {
      console.log(`Add-on services tab not found in the provided sheet`);
    }
    
    console.log('Finished loading sheets from Google Sheets');
    return true;
  } catch (error) {
    console.error('Error loading sheets from Google Sheets:', error);
    return false;
  }
}

// Generate a GPT prompt from user input and sheet data 
export function generatePrompt(userInput: string): string {
  const promptParts = [
    "You are Clean Machine Auto Detail in Tulsa. Answer with a friendly, professional, and knowledgeable tone. Always use proper grammar and complete sentences with correct punctuation. Do not refer to yourself by name or in the first person.",
    `Customer asked: ${userInput.trim()}`
  ];

  // Add knowledge base
  promptParts.push(extractKnowledgeBase());
  
  return promptParts.join('\n\n');
}

// Extract knowledge base for AI context
export function extractKnowledgeBase(): string {
  // If we have sheets data, format it
  if (Object.keys(sheetsData).length > 0) {
    return formatKnowledgeBase();
  }
  
  // Otherwise, return the default knowledge base
  return getDefaultKnowledgeBase();
}

// Default knowledge base for fallback
function getDefaultKnowledgeBase(): string {
  return `
# Clean Machine Auto Detail Knowledge Base

## Our Services
- Full Detail: $299 - Complete interior and exterior detailing service
- Interior Only: $179 - Deep interior cleansing with steam cleaning
- Exterior Only: $169 - Premium exterior wash, decontamination, polish
- Express Wash: $59 - Quick but thorough exterior wash with hand drying
- Ceramic Coating: $899 - Professional-grade ceramic coating application
- Maintenance Detail: $129 - Quick interior cleaning and exterior wash
- Paint Correction: $499 - Professional multi-stage paint correction
- Headlight Restoration: $89 - Complete restoration of foggy headlights

## Add-on Services
- Paint Protection: $199 - Premium ceramic-based paint protection
- Engine Bay Cleaning: $75 - Thorough cleaning and degreasing
- Leather/Upholstery Protection: $99 - Premium fabric or leather protectant
- Odor Elimination: $79 - Professional-grade odor removal
- Pet Hair Removal: $45 - Specialized treatment for pet hair
- Clay Bar Treatment: $65 - Deep cleaning of paint surface
- Wheel & Caliper Detailing: $85 - Comprehensive cleaning of wheels

## Business Information
- Location: Tulsa, OK
- Hours: Monday-Friday 8am-6pm, Saturday 9am-5pm, Closed Sunday
- Phone: (918) 555-7890
- Website: www.cleanmachineautodetail.com
- Email: info@cleanmachineautodetail.com
`;
}

// Load sheets data on module load
(async () => {
  await loadAllSheets();
})();