import { google } from 'googleapis';
import { addDays, addHours, format, isAfter, isBefore, parseISO, setHours, setMinutes } from 'date-fns';
import { customerMemory } from './customerMemory';

// Configuration for booking appointments
const BOOKING_HOURS = { start: 9, end: 15 }; // No booking starts after 3pm
const SERVICE_DURATION_HOURS: Record<string, number> = {
  "Full Detail": 4,
  "Interior Only": 3,
  "Exterior Only": 1.5,
  "Ceramic Coating": 8,
  // Default duration for other services
  "default": 2
};

// Calendar ID - will need to be set via environment variable
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// Google Calendar API client
let calendarService: any = null;

/**
 * Initialize Google Calendar API
 */
export function initializeCalendarAPI(auth: any) {
  try {
    calendarService = google.calendar({ version: 'v3', auth });
    console.log('Google Calendar API initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Google Calendar API:', error);
    return false;
  }
}

/**
 * Get existing events from Google Calendar
 */
export async function getExistingEvents() {
  if (!calendarService) {
    console.error('Calendar service not initialized');
    return [];
  }

  try {
    const now = new Date().toISOString();
    const events = await calendarService.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return events.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

/**
 * Generate available appointment slots for a service
 */
export async function generateAvailableSlots(serviceName: string) {
  if (!calendarService) {
    console.error('Calendar service not initialized');
    return [];
  }

  const now = new Date();
  const end = addDays(now, 30);
  const duration = SERVICE_DURATION_HOURS[serviceName] || SERVICE_DURATION_HOURS.default;
  const slots: string[] = [];

  try {
    // Get existing events
    const existingEvents = await getExistingEvents();
    const busyTimes = existingEvents
      .filter((event: any) => event.start && event.start.dateTime)
      .map((event: any) => ({
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime)
      }));

    // Generate slots for the next 30 days
    for (let day = 0; day < 30; day++) {
      const date = addDays(now, day);
      
      // Skip generating slots for past dates
      if (day === 0 && now.getHours() >= BOOKING_HOURS.end) {
        continue;
      }

      // Generate slots for each hour in the booking window
      for (let hour = BOOKING_HOURS.start; hour < BOOKING_HOURS.end; hour++) {
        // Create start and end times for this slot
        const startTime = setHours(setMinutes(date, 0), hour);
        const endTime = addHours(startTime, duration);

        // Skip if the slot ends after business hours (6 PM)
        if (endTime.getHours() > 18) {
          continue;
        }

        // Skip if the slot is in the past
        if (isAfter(now, startTime)) {
          continue;
        }

        // Check if this slot overlaps with any existing event
        const overlaps = busyTimes.some(
          (event: any) => isBefore(startTime, event.end) && isAfter(endTime, event.start)
        );

        if (!overlaps) {
          slots.push(startTime.toISOString());
        }
      }
    }

    return slots;
  } catch (error) {
    console.error('Error generating available slots:', error);
    return [];
  }
}

/**
 * Book an appointment in Google Calendar
 */
export async function bookAppointment(
  customerName: string,
  phone: string,
  serviceName: string,
  startTimeISO: string
) {
  if (!calendarService) {
    console.error('Calendar service not initialized');
    return false;
  }

  try {
    const startTime = parseISO(startTimeISO);
    const duration = SERVICE_DURATION_HOURS[serviceName] || SERVICE_DURATION_HOURS.default;
    const endTime = addHours(startTime, duration);

    // Get customer info for more detailed event description
    const customerInfo = customerMemory.getCustomer(phone) || {};
    const vehicle = customerInfo?.vehicleInfo || '';
    const address = customerInfo?.address || '';
    
    // Create a detailed event description with all customer information
    const eventDescription = `
Service: ${serviceName}
Customer: ${customerName}
Phone: ${phone}
${address ? `Address: ${address}` : ''}
${vehicle ? `Vehicle: ${vehicle}` : ''}

${address ? `Directions: https://maps.google.com/maps?daddr=${encodeURIComponent(address)}` : ''}

Notes: ${customerInfo?.conversationContext?.recentTopics?.join(', ') || 'N/A'}
    `.trim();
    
    const event = {
      summary: `${serviceName} - ${customerName}`,
      description: eventDescription,
      location: address,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Chicago'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Chicago'
      }
    };

    const createdEvent = await calendarService.events.insert({
      calendarId: CALENDAR_ID,
      resource: event
    });

    console.log(`Event created: ${createdEvent.data.htmlLink}`);
    
    return {
      success: true,
      eventLink: createdEvent.data.htmlLink,
      startTime: format(startTime, 'MMMM do, yyyy h:mm a'),
      endTime: format(endTime, 'h:mm a')
    };
  } catch (error: any) {
    console.error('Error booking appointment:', error);
    return { 
      success: false, 
      error: `Failed to book appointment: ${error.message || 'Unknown error'}` 
    };
  }
}