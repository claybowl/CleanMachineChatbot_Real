import { customerMemory } from './customerMemory';
import { sendBookingConfirmationEmail, sendReminderEmail } from './emailService';
import { WeatherCheckResult } from './weatherService';

// Set to true if you want to enable demo mode restrictions
const DEMO_MODE = process.env.DEMO_MODE === 'true';

/**
 * Notification Service for Clean Machine Auto Detail
 * Handles SMS and email notifications for appointments and reminders
 */

// Use environment variables for Twilio credentials
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Import Twilio if credentials are available
import * as Twilio from 'twilio';

let twilio: any = null;
if (twilioAccountSid && twilioAuthToken) {
  try {
    twilio = Twilio.default(twilioAccountSid, twilioAuthToken);
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
  }
}

// Required Service Reminders
const SERVICE_REMINDERS = `
Please ensure the vehicle is available and personal items are removed if possible. Anything not obviously trash will be placed into a bag and left in the vehicle for your review.

First I'll pull the vehicle under my pop-up canopy. I'll just need to connect to a power outlet and a water spigot (for exteriors). I'll have 100ft of extension/hose to reach your hookups. When I finish up I'll send a text message with payment links through Venmo, Cashapp & PayPal.
`;

/**
 * Send SMS opt-in confirmation to new users
 */
export async function sendSMSOptInConfirmation(
  phoneNumber: string
): Promise<{ success: boolean; error?: any }> {
  const confirmationMessage = "Clean Machine Auto Detail: You are now opted in for appointment updates and service reminders. Reply HELP for help. Reply STOP to opt out anytime.";

  return await sendSMS(phoneNumber, confirmationMessage);
}

/**
 * Send an SMS notification
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: any }> {
  if (DEMO_MODE) {
    // In demo mode, log the message but don't actually send it
    console.log(`[DEMO MODE] SMS would be sent to ${phoneNumber}: ${message}`);
    return { success: true };
  }

  if (!twilio) {
    console.error('Twilio client not initialized');
    return { success: false, error: 'SMS service not configured' };
  }

  if (!phoneNumber || !message) {
    return { success: false, error: 'Phone number and message are required' };
  }

  try {
    // Format phone number to E.164 format if not already
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Send SMS via Twilio
    const response = await twilio.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log(`SMS sent to ${phoneNumber}, SID: ${response.sid}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error };
  }
}

/**
 * Send an email notification
 */
export async function sendEmail(
  email: string,
  subject: string,
  message: string,
): Promise<{ success: boolean; error?: any }> {
  // Using SendGrid directly from emailService.ts
  // This is a placeholder for now
  console.log(`Sending email to ${email}`);
  return { success: false, error: 'Email service not yet implemented' };
}

/**
 * Send booking confirmation notifications
 */
export async function sendBookingConfirmation(
  appointmentDetails: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    isExtendedAreaRequest: boolean;
    service: string;
    addOns: string[];
    time: string;
    formattedTime: string;
    vehicleInfo?: string;
  }
): Promise<{ sms: boolean; email: boolean }> {
  const {
    name,
    phone,
    email,
    address,
    service,
    addOns,
    formattedTime,
    vehicleInfo,
  } = appointmentDetails;

  // Get customer information from memory
  const customerInfo = customerMemory.getCustomer(phone);
  const vehicle = vehicleInfo || (customerInfo?.vehicleInfo || 'your vehicle');

  // Create the confirmation message
  const servicesList = [service, ...(addOns || [])].join(', ');
  const confirmationMessage = `
Hi ${name}, this is Clean Machine Auto Detail confirming your appointment for ${formattedTime} at ${address}.

Services: ${servicesList}
Vehicle: ${vehicle}

${SERVICE_REMINDERS}

Need to reschedule? Reply to this message or call us.

Directions to your location: https://cleanmachine.app/directions?address=${encodeURIComponent(address)}
`;

  // Send SMS confirmation
  const smsResult = await sendSMS(phone, confirmationMessage);

  // Send email confirmation if email is provided
  let emailResult = { success: false };
  if (email) {
    // Use the SendGrid email service
    try {
      emailResult = await sendBookingConfirmationEmail(
        email,
        name,
        service,
        formattedTime,
        address,
        addOns,
        vehicle
      );
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      emailResult = { success: false };
    }

    if (emailResult.success) {
      console.log(`Booking confirmation email sent to ${email}`);
    } else {
      console.error(`Failed to send booking confirmation email to ${email}`);
    }
  }

  return {
    sms: smsResult.success,
    email: emailResult.success,
  };
}

/**
 * Schedule a day-before reminder for an appointment
 */
export function scheduleDayBeforeReminder(
  appointmentDetails: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    service: string;
    addOns: string[];
    time: string;
    formattedTime: string;
    vehicleInfo?: string;
  }
): { success: boolean; scheduledTime?: Date } {
  try {
    const appointmentTime = new Date(appointmentDetails.time);

    // Schedule for 4pm the day before
    const reminderTime = new Date(appointmentTime);
    reminderTime.setDate(appointmentTime.getDate() - 1);
    reminderTime.setHours(16, 0, 0, 0);

    // If the appointment is tomorrow and it's already past 4pm, send immediately
    const now = new Date();
    if (reminderTime < now) {
      // Appointment is less than 24 hours away, send reminder now
      sendReminderNotifications(appointmentDetails);
      return { success: true, scheduledTime: now };
    }

    // Calculate ms until the reminder should be sent
    const msUntilReminder = reminderTime.getTime() - now.getTime();

    // Schedule the reminder
    setTimeout(() => {
      sendReminderNotifications(appointmentDetails);
    }, msUntilReminder);

    console.log(`Reminder scheduled for ${reminderTime.toLocaleString()} (${msUntilReminder}ms from now)`);
    return { success: true, scheduledTime: reminderTime };
  } catch (error) {
    console.error('Error scheduling reminder:', error);
    return { success: false };
  }
}

/**
 * Send day-before reminder notifications
 */
async function sendReminderNotifications(
  appointmentDetails: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    service: string;
    addOns: string[];
    time: string;
    formattedTime: string;
    vehicleInfo?: string;
  }
): Promise<{ sms: boolean; email: boolean }> {
  const {
    name,
    phone,
    email,
    address,
    service,
    addOns,
    formattedTime,
    vehicleInfo,
  } = appointmentDetails;

  // Get customer information from memory
  const customerInfo = customerMemory.getCustomer(phone);
  const vehicle = vehicleInfo || (customerInfo?.vehicleInfo || 'your vehicle');

  // Create the reminder message
  const servicesList = [service, ...(addOns || [])].join(', ');
  const reminderMessage = `
Hi ${name}, this is Clean Machine Auto Detail reminding you of your appointment tomorrow at ${formattedTime} at ${address}.

Services: ${servicesList}
Vehicle: ${vehicle}

${SERVICE_REMINDERS}

To reschedule: Reply "RESCHEDULE" and we'll help you find a new time.
To cancel: Reply "CANCEL" and we'll confirm your cancellation.
For other changes: Call us at (918) 856-5304

Directions to your location: https://cleanmachine.app/directions?address=${encodeURIComponent(address)}
`;

  // Send SMS reminder
  const smsResult = await sendSMS(phone, reminderMessage);

  // Send email reminder if email is provided
  let emailResult = { success: false };
  if (email) {
    emailResult = await sendReminderEmail(
      email,
      name,
      service,
      formattedTime,
      address,
      addOns,
      vehicle
    );

    if (emailResult.success) {
      console.log(`Reminder email sent to ${email}`);
    } else {
      console.error(`Failed to send reminder email to ${email}`);
    }
  }

  return {
    sms: smsResult.success,
    email: emailResult.success,
  };
}

/**
 * Send an "on the way" notification with estimated arrival time
 */
export async function sendOnTheWayNotification(
  phoneNumber: string,
  address: string,
  estimatedMinutes: number
): Promise<{ success: boolean; error?: any }> {
  // Get customer information
  const customerInfo = customerMemory.getCustomer(phoneNumber);
  const name = customerInfo?.name || 'there';

  // Add a 10-minute buffer to the estimated time
  const minTime = estimatedMinutes;
  const maxTime = estimatedMinutes + 10;

  // Create the message
  const message = `
Hey ${name}, it's Jody with Clean Machine Auto Detail. Just wanted to let you know we're on the way and should arrive in ${minTime}-${maxTime} minutes.

See you soon!
`;

  // Send the SMS
  return await sendSMS(phoneNumber, message);
}

/**
 * Send weather alert notifications for upcoming appointments with inclement weather
 * @param appointmentDetails Appointment details including contact information
 * @param weatherResult Weather check result with severity information
 */
export async function sendWeatherAlertNotification(
  appointmentDetails: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    service: string;
    addOns?: string[];
    time: string;
    formattedTime: string;
    vehicleInfo?: string;
  },
  weatherResult: WeatherCheckResult
): Promise<{ sms: boolean; email: boolean }> {
  const {
    name,
    phone,
    email,
    address,
    formattedTime,
    service,
  } = appointmentDetails;

  // Generate message based on weather severity
  let severityText = '';
  let actionText = '';

  switch (weatherResult.weatherRiskLevel) {
    case 'severe':
      severityText = 'severe weather (80-100% chance of rain)';
      actionText = 'We strongly recommend rescheduling to ensure quality service.';
      break;
    case 'very-high':
      severityText = 'very high chance of rain (60-80%)';
      actionText = 'We recommend rescheduling to ensure quality service.';
      break;
    case 'high':
      severityText = 'high chance of rain (25-60%)';
      actionText = 'Consider rescheduling for better detailing results.';
      break;
    case 'moderate':
      severityText = 'moderate chance of rain (15-25%)';
      actionText = 'We can still perform service, but exterior detailing might be affected.';
      break;
    default:
      severityText = 'potential inclement weather';
      actionText = 'Please consider your options.';
  }

  // Create the weather alert message with booking link
  const rescheduleLink = `https://${process.env.REPL_SLUG || 'cleanmachine'}.replit.app/schedule?phone=${encodeURIComponent(phone)}&name=${encodeURIComponent(name)}&service=${encodeURIComponent(service)}`;

  const weatherAlertMessage = `
Hi ${name}, Clean Machine Auto Detail weather alert for ${formattedTime}:

${severityText} forecasted. ${actionText}

Reschedule easily: ${rescheduleLink}

Or reply RESCHEDULE for help, or KEEP to continue.

Questions? Call (918) 856-5304
`;

  // Send SMS weather alert
  const smsResult = await sendSMS(phone, weatherAlertMessage);

  // Send email weather alert if email is provided
  let emailResult = { success: false };
  if (email) {
    // Create email subject based on severity
    const subject = `Weather Alert for Your Clean Machine Appointment - ${formattedTime}`;

    // Basic email content (this would be replaced with a proper HTML template)
    const emailContent = {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Weather Update for Your Appointment</h2>
          <p>Hi ${name},</p>
          <p>${severityText} for your scheduled appointment time.</p>

          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Weather Forecast</h3>
            <p><strong>Date:</strong> ${formattedTime}</p>
            <p><strong>Service:</strong> ${service}</p>
            <p><strong>Precipitation Chance:</strong> ${severityText}</p>
            <p><strong>Action:</strong> ${actionText}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://${process.env.REPL_SLUG || 'your-repl'}.replit.app/schedule" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Available Dates
            </a>
          </div>

          <p>If you have any questions, please don't hesitate to reach out.</p>

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Clean Machine Tulsa
          </p>
        </div>
      `,
    };

    try {
      // For now, just use a basic email send until we create a weather alert email template
      emailResult = await sendEmail(email, subject, emailContent.html);
    } catch (error) {
      console.error('Error sending weather alert email:', error);
    }
  }

  return {
    sms: smsResult.success,
    email: emailResult.success
  };
}

/**
 * Format a phone number to E.164 format for Twilio
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Handle test phone numbers for development
  if (cleaned === '5551234567') {
    return process.env.TWILIO_PHONE_NUMBER || '+15551234567'; // Use our own number for testing
  }

  // If the number doesn't start with a country code, add US country code (1)
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }

  // Add the plus sign for E.164 format
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}