
import { format } from 'date-fns';
import { checkAppointmentWeather } from './weatherService';
import { sendWeatherAlertNotification } from './notifications';
import { google } from 'googleapis';
import { getAuthClient } from './googleIntegration';
import { addDays } from 'date-fns';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cleanmachinetulsa@gmail.com';

interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  service: string;
  date: string;
  location: string;
}

/**
 * Fetch upcoming appointments from Google Calendar
 */
async function getUpcomingAppointments(): Promise<Appointment[]> {
  try {
    const auth = getAuthClient();
    if (!auth) {
      console.error('Could not get auth client for calendar');
      return [];
    }

    const calendar = google.calendar({ version: 'v3', auth });
    
    // Get appointments for the next 4 days
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = addDays(now, 4).toISOString();

    console.log(`Fetching appointments from ${timeMin} to ${timeMax}`);

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    const events = response.data.items || [];
    console.log(`Found ${events.length} upcoming appointments`);

    // Parse appointments from calendar events
    const appointments: Appointment[] = events.map((event: any) => {
      const description = event.description || '';
      
      // Extract phone number from description
      const phoneMatch = description.match(/Phone:\s*(\d{10}|\(\d{3}\)\s*\d{3}-\d{4})/);
      const phone = phoneMatch ? phoneMatch[1].replace(/\D/g, '') : '';
      
      // Extract email if present
      const emailMatch = description.match(/Email:\s*([^\n]+)/);
      const email = emailMatch ? emailMatch[1].trim() : '';
      
      // Extract customer name from summary (format: "Service - Customer Name")
      const summaryParts = (event.summary || '').split('-');
      const service = summaryParts[0]?.trim() || 'Unknown Service';
      const customerName = summaryParts[1]?.trim() || 'Unknown Customer';
      
      // Extract location
      const locationMatch = description.match(/Address:\s*([^\n]+)/);
      const location = event.location || (locationMatch ? locationMatch[1].trim() : 'Tulsa, OK');

      return {
        id: event.id,
        customerName,
        customerPhone: phone,
        customerEmail: email,
        service,
        date: event.start.dateTime || event.start.date,
        location,
      };
    }).filter(apt => apt.customerPhone); // Only include appointments with phone numbers

    return appointments;
  } catch (error) {
    console.error('Error fetching appointments from Google Calendar:', error);
    return [];
  }
}

/**
 * Check weather for an appointment and send alerts if needed
 */
async function processAppointmentWeather(appointment: Appointment) {
  try {
    const appointmentDate = new Date(appointment.date);
    const latitude = 36.1236407; // Tulsa, OK coordinates
    const longitude = -95.9359214;
    
    const weatherData = await checkAppointmentWeather(latitude, longitude, appointment.date);

    if (!weatherData || weatherData.weatherRiskLevel === 'none' || weatherData.weatherRiskLevel === 'low') {
      console.log(`✓ ${appointment.customerName} (${format(appointmentDate, 'MMM d')}) - Weather looks good`);
      return { needsAlert: false };
    }

    // Determine if we should send an alert based on risk level
    const shouldAlert = ['moderate', 'high', 'very-high', 'severe'].includes(weatherData.weatherRiskLevel);

    if (shouldAlert) {
      console.log(`⚠️  ${appointment.customerName} (${format(appointmentDate, 'MMM d')}) - ${weatherData.weatherRiskLevel.toUpperCase()} risk detected`);
      
      // Calculate average precipitation and temperature from forecast data
      const avgPrecip = weatherData.forecastData.length > 0
        ? weatherData.forecastData.reduce((sum, f) => sum + f.chanceOfRain, 0) / weatherData.forecastData.length
        : 0;
      
      const avgTemp = weatherData.forecastData.length > 0
        ? weatherData.forecastData.reduce((sum, f) => sum + f.temperature, 0) / weatherData.forecastData.length
        : 70;
      
      // Send weather alert notification
      const notificationResult = await sendWeatherAlertNotification({
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        customerEmail: appointment.customerEmail,
        appointmentDate: appointment.date,
        service: appointment.service,
        weatherRisk: weatherData.weatherRiskLevel,
        precipitationProbability: Math.round(avgPrecip),
        temperature: Math.round(avgTemp),
      });

      return {
        needsAlert: true,
        riskLevel: weatherData.weatherRiskLevel,
        notificationSent: notificationResult.success,
      };
    }

    return { needsAlert: false };
  } catch (error) {
    console.error(`Error processing weather for ${appointment.customerName}:`, error);
    return { needsAlert: false, error: true };
  }
}

/**
 * Main function to run daily weather checks
 */
async function runDailyWeatherCheck() {
  console.log('\n=== Starting Daily Weather Alert Check ===');
  console.log(`Time: ${format(new Date(), 'PPpp')}\n`);

  try {
    // Fetch upcoming appointments
    const appointments = await getUpcomingAppointments();

    if (appointments.length === 0) {
      console.log('No upcoming appointments found in the next 4 days.');
      return;
    }

    console.log(`Found ${appointments.length} appointments to check:\n`);

    // Process each appointment
    let alertsSent = 0;
    let appointmentsChecked = 0;

    for (const appointment of appointments) {
      const result = await processAppointmentWeather(appointment);
      appointmentsChecked++;

      if (result.needsAlert && result.notificationSent) {
        alertsSent++;
      }

      // Add a small delay between checks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n=== Weather Check Complete ===');
    console.log(`Appointments checked: ${appointmentsChecked}`);
    console.log(`Weather alerts sent: ${alertsSent}`);
    console.log(`Completed at: ${format(new Date(), 'PPpp')}\n`);

  } catch (error) {
    console.error('Error running daily weather check:', error);
    process.exit(1);
  }
}

// Run the weather check
runDailyWeatherCheck()
  .then(() => {
    console.log('Weather check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Weather check failed:', error);
    process.exit(1);
  });
