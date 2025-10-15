import { Request, Response } from 'express';
import { customerMemory } from './customerMemory';
import { getAllServices } from './realServices';
import { google } from 'googleapis';
import { getAuthClient } from './googleIntegration';
import { addDays, addHours, format, parseISO, subDays } from 'date-fns';

// Calendar ID for Clean Machine - use environment variable if available
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
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
    
    const events = response.data.items;
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
    
    const events = response.data.items;
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
 */
export async function updateService(req: Request, res: Response) {
  try {
    const { name, priceRange, description, duration, durationHours } = req.body;
    
    if (!name || !priceRange || !description || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required service information'
      });
    }
    
    // Here you would update the service in your Google Sheets or database
    // For now, we'll just return success
    
    return res.json({
      success: true,
      message: `Service "${name}" updated successfully`
    });
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