import sgMail from '@sendgrid/mail';
import { RewardService } from "@shared/schema";

const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not found, email notifications will not be available');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid client initialized successfully');
}

// Your verified business email address
const BUSINESS_EMAIL = 'info@cleanmachinetulsa.com';

/**
 * Check if customer has consented to SMS communications
 * This will eventually check the Google Sheets database for consent status
 */
export async function hasCustomerSmsConsent(phone: string): Promise<boolean> {
  // For now, we'll implement the basic logic
  // In a full implementation, this would query the customer database
  // to check the SMS Consent column value
  console.log(`Checking SMS consent for phone: ${phone}`);
  // Return false by default to ensure we only send emails unless explicitly consented
  return false;
}

/**
 * Send communication respecting customer's SMS consent preferences
 * If SMS consent is given, send both email and SMS
 * If no SMS consent, only send email
 */
export async function sendCustomerCommunication(
  phone: string,
  email: string,
  subject: string,
  message: string,
  hasSmsConsent: boolean = false
): Promise<{ success: boolean; method: string; error?: any }> {
  
  if (hasSmsConsent) {
    // Customer consented to SMS, can send both email and SMS
    console.log(`Customer ${phone} has SMS consent - sending both email and SMS`);
    
    // Send email if email address provided
    if (email) {
      const emailResult = await sendBusinessEmail(email, subject, message);
      if (!emailResult.success) {
        console.error('Failed to send email:', emailResult.error);
      }
    }
    
    // Here we would also send SMS using Twilio or similar service
    console.log(`SMS would be sent to ${phone}: ${message.substring(0, 100)}...`);
    
    return { success: true, method: 'email and SMS' };
  } else {
    // No SMS consent, only send email
    console.log(`Customer ${phone} has NO SMS consent - sending email only`);
    
    if (!email) {
      return { success: false, method: 'none', error: 'No email provided and SMS consent not given' };
    }
    
    const emailResult = await sendBusinessEmail(email, subject, message);
    return { 
      success: emailResult.success, 
      method: 'email only',
      error: emailResult.error 
    };
  }
}

/**
 * Send an email using SendGrid
 */
export async function sendBusinessEmail(
  to: string,
  subject: string,
  textContent: string,
  htmlContent?: string
): Promise<{ success: boolean; error?: any }> {
  if (DEMO_MODE) {
    // In demo mode, log the email but don't actually send it
    console.log(`[DEMO MODE] Email would be sent to ${to}`);
    console.log(`[DEMO MODE] Subject: ${subject}`);
    console.log(`[DEMO MODE] Content: ${textContent.substring(0, 100)}...`);
    return { success: true };
  }

  if (!process.env.SENDGRID_API_KEY) {
    return { success: false, error: 'SendGrid API key not configured' };
  }

  try {
    await sgMail.send({
      to,
      from: BUSINESS_EMAIL,
      subject,
      text: textContent,
      html: htmlContent || textContent.replace(/\n/g, '<br>'),
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

/**
 * Send a booking confirmation email
 */
export async function sendBookingConfirmationEmail(
  toEmail: string,
  customerName: string,
  serviceName: string,
  appointmentTime: string,
  address: string,
  addOns: string[] = [],
  vehicleInfo: string = ''
): Promise<{ success: boolean; error?: any }> {
  const subject = `Your Clean Machine Auto Detail Appointment Confirmation`;
  
  // Format the add-ons list if any
  const addOnsText = addOns.length > 0
    ? `\nAdd-on Services: ${addOns.join(', ')}`
    : '';

  // Create preparation instructions
  const preparationInstructions = `
PREPARATION INSTRUCTIONS:
- Please ensure personal items are removed from the vehicle if possible.
- We'll need access to a power outlet and water spigot.
- We bring a 100ft extension cord and hose to reach your hookups.
- Please clear any other vehicles from the driveway to provide space for our canopy and equipment.
`;

  // Create the text content
  const textContent = `
Hello ${customerName},

Thank you for booking with Clean Machine Auto Detail. This email confirms your appointment details:

Service: ${serviceName}${addOnsText}
Date & Time: ${appointmentTime}
Location: ${address}

${preparationInstructions}

To reschedule or cancel your appointment, please reply to this email or call us at (918) 856-5304.

We look forward to making your vehicle shine!

Best regards,
Jody
Clean Machine Auto Detail
`;

  // Create HTML content for a more professional email
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e40af; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .details { margin: 20px 0; background-color: white; padding: 15px; border-left: 4px solid #1e40af; }
    .instructions { margin: 20px 0; background-color: #f0f9ff; padding: 15px; border-radius: 4px; }
    .footer { text-align: center; padding-top: 20px; font-size: 0.9em; color: #666; }
    h2 { color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Appointment Confirmation</h1>
    </div>
    <div class="content">
      <p>Hello ${customerName},</p>
      <p>Thank you for booking with <strong>Clean Machine Auto Detail</strong>. This email confirms your appointment details:</p>
      
      <div class="details">
        <p><strong>Service:</strong> ${serviceName}</p>
        ${addOns.length > 0 ? `<p><strong>Add-on Services:</strong> ${addOns.join(', ')}</p>` : ''}
        <p><strong>Date & Time:</strong> ${appointmentTime}</p>
        <p><strong>Location:</strong> ${address}</p>
      </div>
      
      <div class="instructions">
        <h2>Preparation Instructions</h2>
        <ul>
          <li>Please ensure personal items are removed from the vehicle if possible.</li>
          <li>We'll need access to a power outlet and water spigot.</li>
          <li>We bring a 100ft extension cord and hose to reach your hookups.</li>
          <li>Please clear any other vehicles from the driveway to provide space for our canopy and equipment.</li>
        </ul>
      </div>
      
      <div class="options" style="margin: 20px 0; background-color: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b;">
        <h2 style="color: #92400e; margin-top: 0;">Need to Change Your Appointment?</h2>
        <p><strong>To reschedule:</strong> Reply to this email with "RESCHEDULE" in the subject line.</p>
        <p><strong>To cancel:</strong> Reply to this email with "CANCEL" in the subject line.</p>
        <p><strong>For other questions:</strong> Call us at <strong>(918) 856-5304</strong>.</p>
      </div>
      
      <p>We look forward to making your vehicle shine!</p>
      
      <p>Best regards,<br>
      Jody<br>
      Clean Machine Auto Detail</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Clean Machine Auto Detail. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

  return await sendBusinessEmail(toEmail, subject, textContent, htmlContent);
}

/**
 * Send a reminder email for upcoming appointment
 */
export async function sendReminderEmail(
  toEmail: string,
  customerName: string,
  serviceName: string,
  appointmentTime: string,
  address: string,
  addOns: string[] = [],
  vehicleInfo: string = ''
): Promise<{ success: boolean; error?: any }> {
  const subject = `Reminder: Your Clean Machine Auto Detail Appointment Tomorrow`;
  
  // Format the add-ons list if any
  const addOnsText = addOns.length > 0
    ? `\nAdd-on Services: ${addOns.join(', ')}`
    : '';

  // Include vehicle info if available
  const vehicleText = vehicleInfo
    ? `\nVehicle: ${vehicleInfo}`
    : '';

  // Create the text content
  const textContent = `
Hello ${customerName},

This is a friendly reminder about your Clean Machine Auto Detail appointment tomorrow:

Service: ${serviceName}${addOnsText}${vehicleText}
Date & Time: ${appointmentTime}
Location: ${address}

PREPARATION INSTRUCTIONS:
- Please ensure personal items are removed from the vehicle if possible.
- We'll need access to a power outlet and water spigot.
- We bring a 100ft extension cord and hose to reach your hookups.
- Please clear any other vehicles from the driveway to provide space for our canopy and equipment.

NEED TO CHANGE YOUR APPOINTMENT?
To reschedule: Reply to this email with "RESCHEDULE" in the subject line.
To cancel: Reply to this email with "CANCEL" in the subject line.
For other questions: Call us at (918) 856-5304.

We look forward to seeing you tomorrow!

Best regards,
Jody
Clean Machine Auto Detail
`;

  // Create HTML content for a more professional email
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e40af; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .details { margin: 20px 0; background-color: white; padding: 15px; border-left: 4px solid #1e40af; }
    .instructions { margin: 20px 0; background-color: #f0f9ff; padding: 15px; border-radius: 4px; }
    .options { margin: 20px 0; background-color: #fffbeb; padding: 15px; border-radius: 4px; }
    .footer { text-align: center; padding-top: 20px; font-size: 0.9em; color: #666; }
    h2 { color: #1e40af; }
    .button { display: inline-block; padding: 10px 20px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Appointment Reminder</h1>
    </div>
    <div class="content">
      <p>Hello ${customerName},</p>
      <p>This is a friendly reminder about your <strong>Clean Machine Auto Detail</strong> appointment tomorrow:</p>
      
      <div class="details">
        <p><strong>Service:</strong> ${serviceName}</p>
        ${addOns.length > 0 ? `<p><strong>Add-on Services:</strong> ${addOns.join(', ')}</p>` : ''}
        ${vehicleInfo ? `<p><strong>Vehicle:</strong> ${vehicleInfo}</p>` : ''}
        <p><strong>Date & Time:</strong> ${appointmentTime}</p>
        <p><strong>Location:</strong> ${address}</p>
      </div>
      
      <div class="instructions">
        <h2>Preparation Instructions</h2>
        <ul>
          <li>Please ensure personal items are removed from the vehicle if possible.</li>
          <li>We'll need access to a power outlet and water spigot.</li>
          <li>We bring a 100ft extension cord and hose to reach your hookups.</li>
          <li>Please clear any other vehicles from the driveway to provide space for our canopy and equipment.</li>
        </ul>
      </div>
      
      <div class="options" style="margin: 20px 0; background-color: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b;">
        <h2 style="color: #92400e; margin-top: 0;">Need to Change Your Appointment?</h2>
        <p><strong>To reschedule:</strong> Reply to this email with "RESCHEDULE" in the subject line.</p>
        <p><strong>To cancel:</strong> Reply to this email with "CANCEL" in the subject line.</p>
        <p><strong>For other questions:</strong> Call us at <strong>(918) 856-5304</strong>.</p>
      </div>
      
      <p>We look forward to seeing you tomorrow!</p>
      
      <p>Best regards,<br>
      Jody<br>
      Clean Machine Auto Detail</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Clean Machine Auto Detail. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

  return await sendBusinessEmail(toEmail, subject, textContent, htmlContent);
}