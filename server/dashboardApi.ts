import { Request, Response } from 'express';
import { customerMemory } from './customerMemory';
import { getAllServices } from './realServices';
import { google } from 'googleapis';
import { getAuthClient } from './googleIntegration';
import { addDays, addHours, format, parseISO, subDays } from 'date-fns';
import { getDailyWeatherSummary } from './weatherService';
import { calculateETAAndGenerateNavLink } from './googleMapsApi';
import { sendSMS } from './notifications';

// Calendar ID for Clean Machine - use environment variable if available
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cleanmachinetulsa@gmail.com';
let calendarService: any = null;

// Debug: Log the calendar ID we're using
console.log('Using Google Calendar ID for dashboard:', CALENDAR_ID);

/**
 * Initialize Google Calendar API for accessing appointment data
 */
export async function initializeDashboardCalendar() {
  if (calendarService) return true;
  
  try {
    const auth = await getAuthClient();
    calendarService = google.calendar({ version: 'v3', auth });
    console.log('Dashboard calendar service initialized successfully with calendar ID:', CALENDAR_ID);
    return true;
  } catch (error) {
    console.error('Failed to initialize calendar service for dashboard:', error);
    return false;
  }
}

/**
 * Sync appointments from Google Calendar to ensure we have the latest data
 * This can be called on a schedule to keep the dashboard up-to-date
 */
export async function syncAppointmentsFromGoogleCalendar() {
  try {
    await initializeDashboardCalendar();
    
    if (!calendarService) {
      console.error('Cannot sync appointments - calendar service not available');
      return false;
    }
    
    // Get appointments for the next 30 days
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = addDays(now, 30).toISOString();
    
    console.log(`Syncing appointments from ${timeMin} to ${timeMax} for calendar: ${CALENDAR_ID}`);
    
    const response = await calendarService.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });
    
    const events = response.data.items || [];
    console.log(`Found ${events.length} upcoming appointments in Google Calendar`);
    
    // Print event information for debugging
    events.forEach((event: any, index: number) => {
      const start = event.start.dateTime || event.start.date;
      console.log(`[${index + 1}] ${start} - ${event.summary}`);
    });
    
    return true;
  } catch (error) {
    console.error('Error syncing appointments from Google Calendar:', error);
    return false;
  }
}

/**
 * Get upcoming appointments from Google Calendar
 */
export async function getUpcomingAppointments(req: Request, res: Response) {
  try {
    await initializeDashboardCalendar();
    
    if (!calendarService) {
      return res.status(503).json({
        success: false,
        error: 'Calendar service not available'
      });
    }
    
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = addDays(now, 7).toISOString(); // Get appointments for the next week
    
    const response = await calendarService.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Defensive: Google Calendar API can return undefined items array
    const events = response.data.items || [];
    
    if (events.length === 0) {
      console.log(`No upcoming appointments found (${timeMin} to ${timeMax})`);
      return res.json({
        success: true,
        appointments: []
      });
    }
    
    const appointments = events.map((event: any) => {
      // Extract customer info from event description
      const customerPhone = extractPhoneFromDescription(event.description);
      const customerInfo = customerPhone ? customerMemory.getCustomer(customerPhone) : null;
      
      // Get service name from summary (usually in format "Service - Customer Name")
      const eventSummaryParts = event.summary ? event.summary.split('-') : ['Unknown Service'];
      const serviceName = eventSummaryParts[0].trim();
      
      return {
        id: event.id,
        customerName: customerInfo?.name || eventSummaryParts[1]?.trim() || 'Unknown Customer',
        service: serviceName,
        time: event.start.dateTime || event.start.date,
        address: event.location || customerInfo?.address || '',
        phone: customerPhone || '',
        vehicleInfo: customerInfo?.vehicleInfo || ''
      };
    });
    
    return res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments'
    });
  }
}

/**
 * Get today's appointments from Google Calendar
 */
export async function getTodaysAppointments(req: Request, res: Response) {
  try {
    await initializeDashboardCalendar();
    
    if (!calendarService) {
      return res.status(503).json({
        success: false,
        error: 'Calendar service not available'
      });
    }
    
    // Check if a specific date was requested
    const dateParam = req.query.date as string;
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    
    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999)).toISOString();
    
    const response = await calendarService.events.list({
      calendarId: CALENDAR_ID,
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Defensive: Google Calendar API can return undefined items array
    const events = response.data.items || [];
    
    if (events.length === 0) {
      console.log(`No appointments found for ${targetDate.toDateString()}`);
      return res.json({
        success: true,
        appointments: []
      });
    }
    
    const appointments = events.map((event: any) => {
      // Extract customer info from event description
      const customerPhone = extractPhoneFromDescription(event.description);
      const customerInfo = customerPhone ? customerMemory.getCustomer(customerPhone) : null;
      
      // Get service name from summary (usually in format "Service - Customer Name")
      const eventSummaryParts = event.summary ? event.summary.split('-') : ['Unknown Service'];
      const serviceName = eventSummaryParts[0].trim();
      
      return {
        id: event.id,
        customerName: customerInfo?.name || eventSummaryParts[1]?.trim() || 'Unknown Customer',
        service: serviceName,
        time: event.start.dateTime || event.start.date,
        address: extractAddress(event.description || '') || event.location || customerInfo?.address || '',
        phone: customerPhone || '',
        vehicleInfo: extractVehicleInfo(event.description || '') || customerInfo?.vehicleInfo || ''
      };
    });
    
    return res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s appointments'
    });
  }
}

/**
 * Update a service in the knowledge base
 * TODO: Re-implement with proper Google Sheets integration
 */
export async function updateService(req: Request, res: Response) {
  try {
    // Temporarily disabled - needs Google Sheets client refactor
    return res.status(501).json({
      success: false,
      error: 'Service update via API temporarily disabled'
    });
    
    /* COMMENTED OUT UNTIL GOOGLE SHEETS CLIENT IS AVAILABLE
    const { name, priceRange, description, detailedDescription, duration, isAddon } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Service name is required'
      });
    }

    // Import sheets client
    const { getGoogleSheetsClient } = await import('./googleIntegration');
    const sheetsClient = await getGoogleSheetsClient();
    
    if (!sheetsClient) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets client not available'
      });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheet ID not configured'
      });
    }

    // Determine which sheet to update
    const sheetName = isAddon ? 'Add-Ons' : 'Services';
    
    // Get all rows from the sheet
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1000`
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No data found in ${sheetName} sheet`
      });
    }

    // Find the row with this service name
    const headers = rows[0];
    const nameColIndex = 0; // Service Name is first column
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][nameColIndex] === name) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Service "${name}" not found in ${sheetName}`
      });
    }

    // Prepare the update data based on column headers
    const updates: Array<{ range: string; values: any[][] }> = [];
    
    // Map fields to column indices
    const priceColIndex = headers.findIndex((h: string) => h.toLowerCase().includes('price'));
    const overviewColIndex = headers.findIndex((h: string) => 
      h.toLowerCase() === 'overview' || 
      h.toLowerCase() === 'description' || 
      h.toLowerCase() === 'service description'
    );
    const detailedDescColIndex = headers.findIndex((h: string) => 
      h.toLowerCase().includes('detailed')
    );
    const durationColIndex = headers.findIndex((h: string) => 
      h.toLowerCase().includes('time') || h.toLowerCase().includes('duration')
    );

    // Add 2 to rowIndex because: +1 for 1-indexed, +1 for header row
    const actualRow = rowIndex + 1;

    if (priceRange && priceColIndex > -1) {
      const colLetter = String.fromCharCode(65 + priceColIndex);
      updates.push({
        range: `${sheetName}!${colLetter}${actualRow}`,
        values: [[priceRange]]
      });
    }

    // Save Overview (was previously "description")
    if (description !== undefined && overviewColIndex > -1) {
      const colLetter = String.fromCharCode(65 + overviewColIndex);
      updates.push({
        range: `${sheetName}!${colLetter}${actualRow}`,
        values: [[description]]
      });
    }

    // Save Detailed Description
    if (detailedDescription !== undefined && detailedDescColIndex > -1) {
      const colLetter = String.fromCharCode(65 + detailedDescColIndex);
      updates.push({
        range: `${sheetName}!${colLetter}${actualRow}`,
        values: [[detailedDescription]]
      });
    }

    if (duration && durationColIndex > -1) {
      const colLetter = String.fromCharCode(65 + durationColIndex);
      updates.push({
        range: `${sheetName}!${colLetter}${actualRow}`,
        values: [[duration]]
      });
    }

    // Perform batch update
    if (updates.length > 0) {
      await sheetsClient.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates
        }
      });
    }
    
    return res.json({
      success: true,
      message: `Service "${name}" updated successfully in Google Sheets`
    });
    */
  } catch (error) {
    console.error('Error updating service:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update service'
    });
  }
}

/**
 * Get recent customer messages/conversations
 */
export async function getRecentMessages(req: Request, res: Response) {
  try {
    // In a production environment, you would fetch these from your database
    // For now, we'll use some mock data with customer info from memory
    
    const customers = Array.from(customerMemory.getAllCustomers());
    
    const messages = customers.slice(0, 5).map((customer, index) => {
      const needsAttention = index === 0; // First customer needs attention for demo
      
      return {
        id: `msg-${index + 1}`,
        customerName: customer.name || 'Customer',
        phone: customer.phone || '',
        content: needsAttention 
          ? "I need to reschedule my appointment tomorrow, is that possible?"
          : "Thanks for the great service!",
        timestamp: new Date(Date.now() - (Math.random() * 86400000)).toISOString(), // Random time in last 24h
        needsAttention
      };
    });
    
    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent messages'
    });
  }
}

/**
 * Get monthly statistics for dashboard stats bar
 */
export async function getMonthlyStatistics(req: Request, res: Response) {
  try {
    await initializeDashboardCalendar();
    
    if (!calendarService) {
      return res.status(503).json({
        success: false,
        error: 'Calendar service not available'
      });
    }
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // Fetch this month's appointments
    const thisMonthResponse = await calendarService.events.list({
      calendarId: DASHBOARD_CALENDAR_ID,
      timeMin: thisMonthStart.toISOString(),
      timeMax: thisMonthEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    // Fetch last month's appointments
    const lastMonthResponse = await calendarService.events.list({
      calendarId: DASHBOARD_CALENDAR_ID,
      timeMin: lastMonthStart.toISOString(),
      timeMax: lastMonthEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const thisMonthEvents = thisMonthResponse.data.items || [];
    const lastMonthEvents = lastMonthResponse.data.items || [];
    
    // Helper to extract price from event description
    const extractPrice = (description: string = ''): number => {
      const priceMatch = description.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      return priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;
    };
    
    // Calculate this month stats
    const thisMonthCompleted = thisMonthEvents.filter(e => {
      const eventTime = new Date(e.start?.dateTime || e.start?.date || '');
      return eventTime < now;
    }).length;
    
    const thisMonthUpcoming = thisMonthEvents.filter(e => {
      const eventTime = new Date(e.start?.dateTime || e.start?.date || '');
      return eventTime >= now;
    }).length;
    
    const thisMonthRevenue = thisMonthEvents
      .filter(e => {
        const eventTime = new Date(e.start?.dateTime || e.start?.date || '');
        return eventTime < now;
      })
      .reduce((sum, event) => sum + extractPrice(event.description || ''), 0);
    
    const lastMonthRevenue = lastMonthEvents
      .reduce((sum, event) => sum + extractPrice(event.description || ''), 0);
    
    // Calculate growth percentages
    const appointmentGrowth = lastMonthEvents.length > 0
      ? ((thisMonthEvents.length - lastMonthEvents.length) / lastMonthEvents.length) * 100
      : 0;
      
    const revenueGrowth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;
    
    const monthlyStats = {
      thisMonth: {
        total: thisMonthEvents.length,
        completed: thisMonthCompleted,
        upcoming: thisMonthUpcoming,
        revenue: Math.round(thisMonthRevenue)
      },
      lastMonth: {
        total: lastMonthEvents.length,
        completed: lastMonthEvents.length,
        upcoming: 0,
        revenue: Math.round(lastMonthRevenue)
      },
      growth: {
        appointments: Math.round(appointmentGrowth * 10) / 10,
        revenue: Math.round(revenueGrowth * 10) / 10
      }
    };
    
    return res.json({
      success: true,
      stats: monthlyStats
    });
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly statistics'
    });
  }
}

/**
 * Get appointment counts per date for a month
 * This is used to highlight calendar dates based on appointment load
 */
export async function getMonthlyAppointmentCounts(req: Request, res: Response) {
  try {
    await initializeDashboardCalendar();
    
    if (!calendarService) {
      return res.status(503).json({
        success: false,
        error: 'Calendar service not available'
      });
    }
    
    // Get the start and end of the month from query params or use current month
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    
    const response = await calendarService.events.list({
      calendarId: CALENDAR_ID,
      timeMin: startOfMonth,
      timeMax: endOfMonth,
      singleEvents: true,
    });
    
    const events = response.data.items;
    const countsByDate: Record<string, number> = {};
    
    // Count events per day
    events.forEach((event: any) => {
      const startDate = event.start.dateTime || event.start.date;
      const dateKey = startDate.split('T')[0]; // YYYY-MM-DD format
      countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
    });
    
    return res.json({
      success: true,
      counts: countsByDate
    });
  } catch (error) {
    console.error('Error fetching appointment counts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get appointment counts'
    });
  }
}

/**
 * Helper function to extract phone number from event description
 */
function extractPhoneFromDescription(description: string): string {
  if (!description) return '';
  
  // Try to match "Phone: XXX" pattern
  const phoneMatch = description.match(/Phone:\s*([0-9+\-() ]+)/i);
  if (phoneMatch && phoneMatch[1]) {
    return phoneMatch[1].trim();
  }
  
  return '';
}

/**
 * Extract vehicle information from event description
 */
function extractVehicleInfo(description: string): string {
  if (!description) return '';
  
  // Try to match "Vehicle: XXX" pattern
  const vehicleMatch = description.match(/Vehicle:\s*([^\n]+)/i);
  if (vehicleMatch && vehicleMatch[1]) {
    return vehicleMatch[1].trim();
  }
  
  return '';
}

/**
 * Extract address from event description
 */
function extractAddress(description: string): string {
  if (!description) return '';
  
  // Try to match "Address: XXX" pattern
  const addressMatch = description.match(/Address:\s*([^\n]+)/i);
  if (addressMatch && addressMatch[1]) {
    return addressMatch[1].trim();
  }
  
  return '';
}

/**
 * Get weather forecasts for calendar dates
 * Uses Tulsa, OK as default location
 */
export async function getCalendarWeather(req: Request, res: Response) {
  try {
    // Clean Machine Auto Detail is in Tulsa, OK
    const tulsaLat = 36.1539;
    const tulsaLng = -95.9928;
    
    const days = parseInt(req.query.days as string) || 14;
    
    const forecasts = await getDailyWeatherSummary(tulsaLat, tulsaLng, days);
    
    // Convert to map for easier calendar lookup
    const weatherByDate: Record<string, any> = {};
    forecasts.forEach(f => {
      weatherByDate[f.date] = {
        icon: f.icon,
        description: f.description,
        high: f.highTemp,
        low: f.lowTemp,
        rainChance: f.chanceOfRain
      };
    });
    
    return res.json({
      success: true,
      weather: weatherByDate,
      forecasts // Also include the array format
    });
  } catch (error) {
    console.error('Error fetching calendar weather:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data'
    });
  }
}

/**
 * Navigate & Send ETA - Quick action for appointments
 * Calculates ETA and sends SMS to customer
 */
export async function navigateAndSendETA(req: Request, res: Response) {
  try {
    const { appointmentId } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID is required'
      });
    }
    
    // Initialize calendar service
    await initializeDashboardCalendar();
    
    if (!calendarService) {
      return res.status(503).json({
        success: false,
        error: 'Calendar service not available'
      });
    }
    
    // Fetch the appointment details from Google Calendar
    const event = await calendarService.events.get({
      calendarId: DASHBOARD_CALENDAR_ID,
      eventId: appointmentId
    });
    
    if (!event || !event.data) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    // Extract address and phone from event
    const address = extractAddress(event.data.description || '') || event.data.location || '';
    const phone = extractPhoneFromDescription(event.data.description || '');
    const customerName = event.data.summary?.split('-')[1]?.trim() || 'Customer';
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'No address found for this appointment'
      });
    }
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'No phone number found for this appointment'
      });
    }
    
    // Calculate ETA and generate navigation link
    const etaResult = await calculateETAAndGenerateNavLink(address);
    
    if (!etaResult.success) {
      return res.status(500).json({
        success: false,
        error: etaResult.error || 'Failed to calculate ETA'
      });
    }
    
    // Send SMS to customer with ETA
    const smsMessage = `Hi ${customerName}! This is Clean Machine Auto Detail. We're on our way! 🚗\n\nEstimated arrival: ${etaResult.eta.formatted}\n(About ${etaResult.eta.driveTimeText})\n\nSee you soon!`;
    
    try {
      await sendSMS(phone, smsMessage);
    } catch (smsError) {
      console.error('Failed to send ETA SMS:', smsError);
      // Don't fail the whole request if SMS fails - still return navigation data
    }
    
    return res.json({
      success: true,
      eta: etaResult.eta,
      navigation: etaResult.navigation,
      customer: {
        name: customerName,
        phone,
        address: etaResult.formattedAddress
      },
      smsSent: true,
      message: `ETA SMS sent to ${customerName}`
    });
  } catch (error) {
    console.error('Error in Navigate & Send ETA:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to navigate and send ETA'
    });
  }
}