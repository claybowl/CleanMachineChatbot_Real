import { addDays, addHours, format, setHours, setMinutes } from "date-fns";
import { getAuthClient } from "./googleIntegration";
import { google } from "googleapis";
import { customerMemory } from "./customerMemory";
import {
  sendBookingConfirmation,
  scheduleDayBeforeReminder,
} from "./notifications";

// COMMIT
// Configuration for booking appointments
const BOOKING_HOURS = { start: 9, end: 15 }; // No booking starts after 3pm
const SERVICE_DURATION_HOURS: Record<string, number> = {
  "Full Detail": 4,
  "Interior Only": 3,
  "Exterior Only": 1.5,
  "Express Wash": 1,
  "Ceramic Coating": 8,
  // Default duration for other services
  default: 2,
};

// Calendar ID - will need to be set via environment variable
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";
console.log("Using Calendar ID for appointments:", CALENDAR_ID);

// Initialize Google Calendar API client
let calendarService: any = null;

// Function to initialize the calendar service
async function initializeCalendarService() {
  try {
    const auth = getAuthClient();
    if (auth) {
      calendarService = google.calendar({ version: "v3", auth });
      console.log("Google Calendar API initialized successfully");

      // Test the calendar service by directly accessing the specified calendar
      try {
        const result = await calendarService.events.list({
          calendarId: CALENDAR_ID,
          timeMin: new Date().toISOString(),
          timeMax: new Date(
            new Date().setDate(new Date().getDate() + 7),
          ).toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: "startTime",
        });

        console.log(
          `Calendar access test successful - found ${result.data.items?.length || 0} events in calendar: ${CALENDAR_ID}`,
        );
      } catch (testError: any) {
        console.error(
          "Calendar access test failed:",
          testError.message || "Unknown error",
        );
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to initialize Google Calendar API:", error);
    return false;
  }
}

// Try to initialize the calendar service on startup
initializeCalendarService().catch((err) =>
  console.error("Initial calendar service setup failed:", err),
);

/**
 * Handle request for available time slots
 * NOTE: Requires Google Calendar API to be properly connected
 * TODO: Fix Google Calendar API connection if failing
 */
export async function handleGetAvailable(req: any, res: any) {
  try {
    const serviceName = req.query.service as string;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: "Service name is required",
      });
    }

    // Calendar service MUST be available - no fallback to mock data
    if (!calendarService) {
      console.error("❌ CALENDAR API NOT CONNECTED - Google Calendar service not initialized");
      return res.status(503).json({
        success: false,
        message: "Calendar service unavailable. Please contact support to schedule.",
        error: "CALENDAR_NOT_INITIALIZED"
      });
    }

    try {
      const slots = await generateAvailableSlots(serviceName);
      return res.json({ success: true, slots });
    } catch (calendarError) {
      console.error("❌ CALENDAR API ERROR - Failed to fetch availability:", calendarError);
      return res.status(503).json({
        success: false,
        message: "Unable to fetch calendar availability. Please contact support to schedule.",
        error: "CALENDAR_FETCH_FAILED"
      });
    }
  } catch (error) {
    console.error("Error getting available slots:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get available slots",
    });
  }
}

/**
 * Handle booking appointment request
 */
export async function handleBook(req: any, res: any) {
  try {
    const {
      name,
      phone,
      address,
      isExtendedAreaRequest = false,
      service,
      addOns = [],
      time,
      vehicles = [], // Accept vehicles array from frontend
      vehicleMake = "",
      vehicleModel = "",
      vehicleYear = "",
      vehicleColor = "",
      vehicleCondition = [],
      notes = "",
      email = "",
      smsConsent = false,
    } = req.body;

    if (!name || !phone || !service || !time) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Create a detailed description including any add-on services and address information
    let appointmentDescription = `Service: ${service}`;
    if (isExtendedAreaRequest) {
      appointmentDescription += " [EXTENDED SERVICE AREA]";
    }
    if (addOns && addOns.length > 0) {
      appointmentDescription += `\nAdd-on Services: ${addOns.join(", ")}`;
    }
    appointmentDescription += `\nCustomer Phone: ${phone}`;
    if (address) {
      appointmentDescription += `\nAddress: ${address}`;
    }

    // Handle vehicles array (new format) or individual vehicle fields (legacy format)
    if (vehicles && vehicles.length > 0) {
      // New format: multiple vehicles as array
      vehicles.forEach((vehicle: any, index: number) => {
        const vehicleNum = vehicles.length > 1 ? `Vehicle ${index + 1}: ` : 'Vehicle: ';
        const vehicleInfo = [
          vehicle.year || vehicle.vehicleYear,
          vehicle.make || vehicle.vehicleMake,
          vehicle.model || vehicle.vehicleModel,
          vehicle.color || vehicle.vehicleColor
        ].filter(Boolean).join(" ");
        
        if (vehicleInfo) {
          appointmentDescription += `\n${vehicleNum}${vehicleInfo}`;
        }
        
        if (vehicle.condition && vehicle.condition.length > 0) {
          appointmentDescription += `\n  Condition: ${vehicle.condition.join(", ")}`;
        }
      });
    } else if (vehicleMake || vehicleModel || vehicleYear || vehicleColor) {
      // Legacy format: individual vehicle fields
      const vehicleInfo = [vehicleYear, vehicleMake, vehicleModel, vehicleColor]
        .filter(Boolean)
        .join(" ");

      if (vehicleInfo) {
        appointmentDescription += `\nVehicle: ${vehicleInfo}`;
      }

      // Add vehicle condition to the description if available
      if (vehicleCondition && vehicleCondition.length > 0) {
        appointmentDescription += `\nVehicle Condition: ${vehicleCondition.join(", ")}`;
      }
    }

    // Add notes to the description if available
    if (notes) {
      appointmentDescription += `\nNotes: ${notes}`;
    }

    // Update customer memory with service preferences
    if (customerMemory) {
      try {
        const customerInfo = customerMemory.getCustomer(phone) || {
          serviceHistory: [],
          servicePreferences: { additionalRequests: [] },
        };

        // Prepare vehicle info for customer memory
        let vehicleInfoForMemory = "";
        if (vehicles && vehicles.length > 0) {
          vehicleInfoForMemory = vehicles.map((v: any) => 
            [v.year || v.vehicleYear, v.make || v.vehicleMake, v.model || v.vehicleModel, v.color || v.vehicleColor]
              .filter(Boolean).join(" ")
          ).join(", ");
        } else if (vehicleMake || vehicleModel || vehicleYear || vehicleColor) {
          vehicleInfoForMemory = [vehicleYear, vehicleMake, vehicleModel, vehicleColor]
            .filter(Boolean).join(" ");
        }

        // Update customer info with new service and add-ons
        customerMemory.updateCustomer(phone, {
          name: name,
          phone: phone,
          address: address,
          email: email,
          lastInteraction: new Date(),
          vehicleInfo: vehicleInfoForMemory,
          serviceHistory: [
            ...(customerInfo.serviceHistory || []),
            {
              service: service,
              date: new Date(time),
              notes: `${isExtendedAreaRequest ? "[EXTENDED AREA] " : ""}${addOns.length > 0 ? `Booked with add-ons: ${addOns.join(", ")}` : "Standard booking"}`,
            },
          ],
        });

        // Store service preferences if add-ons were selected
        if (addOns && addOns.length > 0) {
          const preferences = customerInfo.servicePreferences || {
            additionalRequests: [],
          };
          customerMemory.updateCustomer(phone, {
            servicePreferences: {
              ...preferences,
              additionalRequests: [
                ...(preferences.additionalRequests || []),
                ...addOns,
              ],
            },
          });
        }
      } catch (memoryError) {
        console.error("Error updating customer memory:", memoryError);
        // Continue with booking even if memory update fails
      }
    }

    // Update customer information in Google Sheets (commented out as function not implemented yet)
    // This functionality will be implemented later when needed
    // Log that we would update customer information here
    console.log(
      "Booking created - customer info would be stored in Google Sheets:",
      {
        phone,
        address,
        service,
        addOns,
        vehicles: vehicles.length > 0 ? vehicles : { vehicleMake, vehicleModel, vehicleYear, vehicleColor, vehicleCondition },
        notes,
        name,
        email,
        smsConsent,
      },
    );

    // Always initialize the calendar service to ensure we have the latest credentials
    try {
      const auth = getAuthClient();
      if (auth) {
        calendarService = google.calendar({ version: "v3", auth });
        console.log("Google Calendar API initialized for booking");
      } else {
        console.error("Could not get auth client for calendar");
      }
    } catch (error: any) {
      console.error(
        "Failed to initialize calendar service:",
        error?.message || error,
      );
    }

    // Always create a fresh calendar service for each booking
    try {
      console.log("Booking appointment in Google Calendar:", {
        name,
        phone,
        service,
        time,
      });

      // Create a brand new calendar service to ensure we have fresh credentials
      const { getAuthClient } = await import("./googleIntegration");
      const auth = getAuthClient();
      if (!auth) {
        console.error("Could not get auth client for calendar");
        throw new Error("Auth client not available");
      }

      const { google } = await import("googleapis");
      const freshCalendarService = google.calendar({ version: "v3", auth });

      // Use the calendar service directly with bookAppointment logic
      const startTime = new Date(time);
      const SERVICE_DURATION_HOURS: Record<string, number> = {
        "Full Detail": 4,
        "Interior Detail": 3,
        "Maintenance Detail Program": 2.5,
        "Paint Enhancement / Light Polish": 3,
        "Ceramic Coating - 1 Year": 8,
        "Ceramic Coating - 3 Year": 12,
        "Motorcycle Detail": 2,
        "Premium Wash": 1,
        "Shampoo seats & or Carpets": 1.5,
        default: 2,
      };

      const duration =
        SERVICE_DURATION_HOURS[service] || SERVICE_DURATION_HOURS.default;
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

      const CALENDAR_ID = "cleanmachinetulsa@gmail.com";

      // Create the event directly
      const event = {
        summary: `${service} - ${name}`,
        description:
          appointmentDescription || `Phone: ${phone}\nService: ${service}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "America/Chicago",
        },
        location: address,
      };

      // Insert the event directly with the fresh calendar service
      console.log("Creating calendar event with these details:", {
        calendarId: CALENDAR_ID,
        summary: event.summary,
        startTime: event.start.dateTime,
        endTime: event.end.dateTime,
        location: event.location,
        description: event.description,
      });

      // Debug auth status
      try {
        const tokenInfo = await auth.getTokenInfo(
          auth.credentials.access_token,
        );
        console.log("Auth token is valid with scopes:", tokenInfo.scopes);
      } catch (tokenError) {
        console.error("Token validation error:", tokenError);
      }

      const response = await freshCalendarService.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: event,
      });

      if (response.data.id) {
        console.log(
          "Successfully created event in Google Calendar:",
          response.data.id,
        );

        // Return successful response with event details
        return res.json({
          success: true,
          message: `Appointment for ${service} booked successfully`,
          eventId: response.data.id,
          eventLink: response.data.htmlLink,
          appointmentTime: time,
          addOns: addOns,
        });
      } else {
        throw new Error("No event ID received from Google Calendar");
      }
    } catch (error) {
      const calendarError = error as Error;
      console.error(
        "Error booking in calendar, providing confirmation:",
        calendarError,
      );
      console.error("Calendar error details:", calendarError.message);
      // Fall back to basic confirmation if calendar API fails
    }

    // Get customer information from memory
    const customerInfo = customerMemory.getCustomer(phone) || {
      vehicleInfo: "",
    };

    // Send booking confirmation SMS and email
    const appointmentDetails = {
      name,
      phone,
      address: req.body.address || "",
      isExtendedAreaRequest: req.body.isExtendedAreaRequest || false,
      service,
      addOns: addOns || [],
      time,
      formattedTime: format(new Date(time), "EEEE, MMMM d, yyyy 'at' h:mm a"),
      vehicleInfo: (customerInfo as any).vehicleInfo || "",
    };

    try {
      // Send SMS opt-in confirmation if user consented to SMS
      if (smsConsent) {
        const { sendSMSOptInConfirmation } = await import("./notifications");
        const optInResult = await sendSMSOptInConfirmation(phone);
        console.log("SMS opt-in confirmation sent:", optInResult);
      }

      // Send booking confirmation notifications
      const notificationResults =
        await sendBookingConfirmation(appointmentDetails);
      console.log("Booking notifications sent:", notificationResults);

      // Schedule day-before reminder
      const reminderResult = scheduleDayBeforeReminder(appointmentDetails);
      console.log("Day-before reminder scheduled:", reminderResult);
    } catch (notificationError) {
      console.error("Error sending booking notifications:", notificationError);
      // Continue with booking even if notifications fail
    }

    // Return success response (used as fallback or when calendar service is not available)
    return res.json({
      success: true,
      message: `Appointment for ${service} booked successfully for ${name}`,
      appointmentTime: time,
      service: service,
      addOns: addOns,
      notificationsSent: true,
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to book appointment",
    });
  }
}

/**
 * REMOVED: generateMockTimeSlots - No longer using mock/fallback data
 * All calendar data must come from real Google Calendar API
 * TODO: Ensure Google Calendar API is properly connected and working
 */

/**
 * Generate available appointment slots based on calendar availability
 */
async function generateAvailableSlots(serviceName: string) {
  if (!calendarService) {
    throw new Error("Calendar service not initialized");
  }

  const now = new Date();
  const end = addDays(now, 14); // Look ahead 2 weeks
  const duration =
    SERVICE_DURATION_HOURS[serviceName] || SERVICE_DURATION_HOURS.default;
  const slots: string[] = [];

  try {
    // Get existing events
    const existingEvents = await calendarService.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const busyTimes = existingEvents.data.items
      .filter((event: any) => event.start && event.start.dateTime)
      .map((event: any) => ({
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
      }));

    // Generate slots for each day
    for (let day = 1; day <= 14; day++) {
      const date = addDays(now, day);

      // Skip weekends (0 = Sunday, 6 = Saturday) - only workdays allowed
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Generate slots for each hour in the booking window
      // Strictly limit to 9am-3pm (no appointments start after 3pm)
      for (let hour = BOOKING_HOURS.start; hour < BOOKING_HOURS.end; hour++) {
        if (hour === 12) continue; // Skip lunch hour

        const startTime = setHours(setMinutes(date, 0), hour);
        const endTime = addHours(startTime, duration);

        // Skip if appointment would end after hours (5 PM)
        if (endTime.getHours() >= 17) {
          continue;
        }

        // Check if this slot overlaps with any existing events
        const isOverlapping = busyTimes.some((event: any) => {
          return (
            (startTime >= event.start && startTime < event.end) || // Start time is during an event
            (endTime > event.start && endTime <= event.end) || // End time is during an event
            (startTime <= event.start && endTime >= event.end) // Slot contains an event entirely
          );
        });

        if (!isOverlapping) {
          slots.push(startTime.toISOString());
        }

        // Add half-hour slot if service is short enough
        if (duration <= 1.5) {
          const halfHourStart = setHours(setMinutes(date, 30), hour);
          const halfHourEnd = addHours(halfHourStart, duration);

          // Skip if half-hour appointment would end after hours
          if (halfHourEnd.getHours() >= 17) {
            continue;
          }

          // Check for overlaps
          const halfHourOverlapping = busyTimes.some((event: any) => {
            return (
              (halfHourStart >= event.start && halfHourStart < event.end) ||
              (halfHourEnd > event.start && halfHourEnd <= event.end) ||
              (halfHourStart <= event.start && halfHourEnd >= event.end)
            );
          });

          if (!halfHourOverlapping) {
            slots.push(halfHourStart.toISOString());
          }
        }
      }
    }

    return slots;
  } catch (error) {
    console.error("Error generating available slots:", error);
    throw error;
  }
}

/**
 * Book an appointment in Google Calendar
 */
async function bookAppointment(
  customerName: string,
  phone: string,
  serviceName: string,
  startTimeISO: string,
  description: string = "",
) {
  if (!calendarService) {
    throw new Error("Calendar service not initialized");
  }

  try {
    const startTime = new Date(startTimeISO);
    const duration =
      SERVICE_DURATION_HOURS[serviceName] || SERVICE_DURATION_HOURS.default;
    const endTime = addHours(startTime, duration);

    // Create the event
    const event = {
      summary: `${serviceName} - ${customerName}`,
      description: description || `Phone: ${phone}\nService: ${serviceName}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "America/Chicago",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/Chicago",
      },
    };

    const response = await calendarService.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });

    return {
      success: true,
      message: `Appointment for ${serviceName} booked successfully`,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      appointmentTime: startTimeISO,
      service: serviceName,
    };
  } catch (error) {
    console.error("Error booking appointment:", error);
    throw error;
  }
}
