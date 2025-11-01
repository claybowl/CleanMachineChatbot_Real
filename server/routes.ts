import { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { db } from './db';
import { services as servicesTable } from '@shared/schema';
import { registerLoyaltyRoutes } from './routes.loyalty';
import { registerUpsellRoutes } from './routes.upsell';
import { registerEnhancedCustomerRoutes } from './enhancedCustomerRoutes';
import { registerFileUploadRoutes } from './fileUpload';
import { registerEmailRoutes } from './routes.email';
import { registerCancellationRoutes } from './routes.cancellation';
import { registerConversationRoutes } from './routes.conversations';
import { registerServiceManagementRoutes } from './serviceManagement';
import { initializeWebSocket } from './websocketService';
import quickReplyRoutes from './routes.quickReplies';
import appointmentRoutes from './routes.appointments';
import smsFallbackRoutes from './routes.smsFallback';
import { getLoyaltyPointsByPhone, getLoyaltyPointsByEmail, addLoyaltyPointsFromInvoice } from './loyaltyService';
import { updateLoyaltyPointsInSheets } from './googleLoyaltyIntegration';
import {
  handleGetAvailable,
  handleBook,
} from './calendarApi';
import {
  getAllServices,
  searchServices,
  getAddonServices
} from './services';
import {
  getUpcomingAppointments,
  getTodaysAppointments,
  getMonthlyAppointmentCounts,
  getMonthlyStatistics,
  getRecentMessages,
  updateService,
  getCalendarWeather,
  navigateAndSendETA
} from './dashboardApi';
import {
  getGoogleReviews,
  getGoogleBusinessPhotos
} from './googleIntegration';
import {
  getWeatherForecast
} from './weatherService';
import {
  geocodeAddress,
  checkDistanceToBusinessLocation
} from './googleMapsApi';
import { responseFormatter } from './responseFormatter';
import { getFormatterSettings, updateFormatterSettings, resetFormatterSettings } from './formatterConfig';
import axios from 'axios';
import {
  sendBookingConfirmationEmail,
  sendReminderEmail,
  sendBusinessEmail,
} from './emailService';
import { registerAuthRoutes } from './routes.auth';
import { registerWebAuthnRoutes } from './routes.webauthn';
import { registerSearchRoutes } from './routes.search';
import { requireAuth } from './authMiddleware';

// Main function to register all routes
export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Register authentication routes
  registerAuthRoutes(app);
  
  // Register WebAuthn biometric authentication routes
  registerWebAuthnRoutes(app);
  
  // Register AI-powered search routes
  registerSearchRoutes(app);

  // Dashboard routes - protected by authentication
  app.get('/api/dashboard/today', requireAuth, getTodaysAppointments);
  app.get('/api/dashboard/upcoming', requireAuth, getUpcomingAppointments);
  app.get('/api/dashboard/appointment-counts', requireAuth, getMonthlyAppointmentCounts);
  app.get('/api/dashboard/monthly-stats', requireAuth, getMonthlyStatistics);
  app.get('/api/dashboard/messages', requireAuth, getRecentMessages);
  app.get('/api/dashboard/weather', requireAuth, getCalendarWeather);
  app.post('/api/dashboard/navigate-and-send-eta', requireAuth, navigateAndSendETA);
  app.put('/api/dashboard/services/:id', requireAuth, updateService);

  // Formatter configuration endpoints
  app.get('/api/formatter/settings', (req: Request, res: Response) => {
    try {
      const settings = getFormatterSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error getting formatter settings:', error);
      res.status(500).json({ success: false, error: 'Failed to get formatter settings' });
    }
  });

  app.post('/api/formatter/settings', (req: Request, res: Response) => {
    try {
      const { settings } = req.body;
      updateFormatterSettings(settings);
      res.json({ success: true, message: 'Formatter settings updated successfully' });
    } catch (error) {
      console.error('Error updating formatter settings:', error);
      res.status(500).json({ success: false, error: 'Failed to update formatter settings' });
    }
  });

  app.post('/api/formatter/reset', (req: Request, res: Response) => {
    try {
      resetFormatterSettings();
      const settings = getFormatterSettings();
      res.json({ success: true, settings, message: 'Formatter settings reset to defaults' });
    } catch (error) {
      console.error('Error resetting formatter settings:', error);
      res.status(500).json({ success: false, error: 'Failed to reset formatter settings' });
    }
  });

  app.post('/api/test-formatting', async (req: Request, res: Response) => {
    try {
      const baseMessage = "Thanks for contacting Clean Machine Auto Detail. We offer Full Detail services starting at $150. Our business hours are Monday-Friday 9am-5pm. Would you like to schedule an appointment?";

      const responses = {
        sms: responseFormatter.formatSmsResponse(baseMessage, '+1234567890'),
        web: responseFormatter.formatWebResponse(baseMessage, '+1234567890'),
        email: responseFormatter.formatEmailResponse(baseMessage, '+1234567890'),
        smsAppointment: responseFormatter.formatAppointmentResponse(baseMessage, 'sms', '+1234567890'),
        webAppointment: responseFormatter.formatAppointmentResponse(baseMessage, 'web', '+1234567890'),
        emailAppointment: responseFormatter.formatAppointmentResponse(baseMessage, 'email', '+1234567890'),
        smsService: responseFormatter.formatServiceInfoResponse(baseMessage, 'sms', '+1234567890'),
        webService: responseFormatter.formatServiceInfoResponse(baseMessage, 'web', '+1234567890'),
        emailService: responseFormatter.formatServiceInfoResponse(baseMessage, 'email', '+1234567890')
      };

      res.json(responses);
    } catch (error) {
      console.error('Error testing formatter:', error);
      res.status(500).json({ success: false, error: 'Failed to test formatter' });
    }
  });

  app.post('/api/test-email/booking', async (req: Request, res: Response) => {
    try {
      const result = await sendBookingConfirmationEmail(
        'info@cleanmachinetulsa.com',
        'Test Customer',
        'Full Detail Service',
        new Date(Date.now() + 86400000).toLocaleString(),
        '123 Test Street, Tulsa, OK 74105',
        ['Interior Shampoo', 'Headlight Restoration'],
        '2020 Honda Civic'
      );
      res.json(result);
    } catch (error) {
      console.error('Error sending test booking email:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post('/api/test-email/reminder', async (req: Request, res: Response) => {
    try {
      const result = await sendReminderEmail(
        'info@cleanmachinetulsa.com',
        'Test Customer',
        'Full Detail Service',
        new Date(Date.now() + 86400000).toLocaleString(),
        '123 Test Street, Tulsa, OK 74105'
      );
      res.json(result);
    } catch (error) {
      console.error('Error sending test reminder email:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post('/api/test-email/business', async (req: Request, res: Response) => {
    try {
      const result = await sendBusinessEmail(
        'info@cleanmachinetulsa.com',
        'Test Email - Communications Hub',
        'This is a test email from the Clean Machine Communications Hub. If you receive this, the SendGrid integration is working correctly!'
      );
      res.json(result);
    } catch (error) {
      console.error('Error sending test business email:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.post('/api/test-formatting-custom', async (req: Request, res: Response) => {
    try {
      const { sms, web, email, baseMessage } = req.body;

      // Update the formatter settings
      updateFormatterSettings({ sms, web, email });

      // Test with the custom base message
      const testMessage = baseMessage || "Thanks for contacting Clean Machine Auto Detail. We offer Full Detail services starting at $150. Our business hours are Monday-Friday 9am-5pm. Would you like to schedule an appointment?";

      const responses = {
        sms: responseFormatter.formatSmsResponse(testMessage, '+1234567890'),
        web: responseFormatter.formatWebResponse(testMessage, '+1234567890'),
        email: responseFormatter.formatEmailResponse(testMessage, '+1234567890'),
        smsAppointment: responseFormatter.formatAppointmentResponse(testMessage, 'sms', '+1234567890'),
        webAppointment: responseFormatter.formatAppointmentResponse(testMessage, 'web', '+1234567890'),
        emailAppointment: responseFormatter.formatAppointmentResponse(testMessage, 'email', '+1234567890'),
        smsService: responseFormatter.formatServiceInfoResponse(testMessage, 'sms', '+1234567890'),
        webService: responseFormatter.formatServiceInfoResponse(testMessage, 'web', '+1234567890'),
        emailService: responseFormatter.formatServiceInfoResponse(testMessage, 'email', '+1234567890'),
        configurationSaved: true
      };

      res.json(responses);
    } catch (error) {
      console.error('Error testing custom formatter:', error);
      res.status(500).json({ success: false, error: 'Failed to test custom formatter' });
    }
  });

  // Set up routes
  app.get('/api/services', async (req, res) => {
    try {
      // First try to get services from database (has IDs needed for appointments)
      const dbServices = await db.select().from(servicesTable);

      if (dbServices && dbServices.length > 0) {
        console.log(`Successfully loaded ${dbServices.length} services from database`);
        return res.json({ success: true, services: dbServices });
      }
    } catch (dbError) {
      console.error('Failed to load services from database:', dbError);
    }

    // Fallback to Google Sheet services
    try {
      const googleSheetServices = await getAllServices();

      if (googleSheetServices && Array.isArray(googleSheetServices) && googleSheetServices.length > 0) {
        console.log(`Successfully loaded ${googleSheetServices.length} services from Google Sheet`);
        // Add temporary IDs to Google Sheet services for compatibility
        const servicesWithIds = googleSheetServices.map((service, index) => ({
          id: index + 1,
          ...service,
        }));
        return res.json({ success: true, services: servicesWithIds });
      }
    } catch (error) {
      console.error('Failed to load services from Google Sheet:', error);
    }

    // Last fallback: Hardcoded services with IDs
    console.log('Using hardcoded service data');
    const fallbackServices = [
      {
        id: 1,
        name: "Full Detail",
        priceRange: "$299",
        overview: "Complete interior and exterior detailing",
        detailedDescription: "Complete interior and exterior detailing that restores your vehicle to showroom condition. Includes clay bar treatment, wax protection, interior deep cleaning, and leather/vinyl conditioning.",
        duration: "4-5 hours",
        durationHours: "4.5"
      },
      {
        id: 2,
        name: "Interior Detail",
        priceRange: "$179",
        overview: "Deep interior cleansing",
        detailedDescription: "Deep interior cleansing with steam cleaning, thorough vacuuming, stain removal, and conditioning of all interior surfaces including leather and plastics.",
        duration: "2-3 hours",
        durationHours: "2.5"
      },
      {
        id: 3,
        name: "Exterior Detail",
        priceRange: "$169",
        overview: "Premium exterior wash and protection",
        detailedDescription: "Premium exterior wash, decontamination, polish, and protection with high-grade carnauba wax. Includes wheels, tires, and all exterior trim.",
        duration: "1.5-2 hours",
        durationHours: "1.75"
      },
    ];
    res.json({ success: true, services: fallbackServices });
  });

  app.get('/api/services/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ success: false, message: 'Search query is required' });
      }

      const services = await searchServices(query);
      res.json({ success: true, services });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to search services',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/addon-services', async (req, res) => {
    // Hardcoded add-on services that will always work
    const addOns = [
      {
        name: 'Paint Protection',
        priceRange: '$199',
        description: 'Premium ceramic-based paint protection that guards against UV damage, minor scratches, and environmental contaminants for up to 12 months.',
        duration: '1-2 hours',
        durationHours: 1.5
      },
      {
        name: 'Headlight Restoration',
        priceRange: '$89',
        description: 'Complete restoration of foggy or yellowed headlights to like-new clarity with UV protection to prevent future oxidation.',
        duration: '1 hour',
        durationHours: 1
      },
      {
        name: 'Engine Bay Cleaning',
        priceRange: '$75',
        description: 'Thorough cleaning and degreasing of your engine bay, followed by dressing of all plastic and rubber components for a showroom finish.',
        duration: '1 hour',
        durationHours: 1
      },
      {
        name: 'Leather/Upholstery Protection',
        priceRange: '$99',
        description: 'Premium fabric or leather protectant that repels liquids, prevents staining, and extends the life of your interior surfaces.',
        duration: '45 minutes',
        durationHours: 0.75
      },
      {
        name: 'Odor Elimination',
        priceRange: '$79',
        description: 'Professional-grade odor removal using ozone treatment and steam cleaning to eliminate even the toughest smells from your vehicle.',
        duration: '1-2 hours',
        durationHours: 1.5
      },
      {
        name: 'Pet Hair Removal',
        priceRange: '$45',
        description: 'Specialized treatment to remove embedded pet hair from carpet and upholstery using professional-grade tools and techniques.',
        duration: '30-45 minutes',
        durationHours: 0.5
      },
      {
        name: 'Clay Bar Treatment',
        priceRange: '$65',
        description: 'Deep cleaning of your paint surface to remove embedded contaminants that regular washing cannot remove, leaving a glass-smooth finish.',
        duration: '1 hour',
        durationHours: 1
      },
      {
        name: 'Wheel & Caliper Detailing',
        priceRange: '$85',
        description: 'Comprehensive cleaning and protection of wheels, wheel wells, and brake calipers with specialized products for maximum shine and protection.',
        duration: '1 hour',
        durationHours: 1
      }
    ];

    // Try to get add-ons from Google Sheet first
    try {
      const googleSheetAddOns = await getAddonServices();

      // Only use Google Sheet data if it's valid and has entries
      if (googleSheetAddOns && Array.isArray(googleSheetAddOns) && googleSheetAddOns.length > 0) {
        console.log(`Successfully loaded ${googleSheetAddOns.length} add-on services from Google Sheet`);
        return res.json({ success: true, addOns: googleSheetAddOns });
      }
    } catch (error) {
      console.error('Failed to load add-on services from Google Sheet, using defaults:', error);
    }

    // Fallback to hardcoded add-on services
    console.log('Using hardcoded add-on service data');
    res.json({ success: true, addOns });
  });

  // SMS endpoint for chat and actual SMS
  app.post('/sms', async (req: Request, res: Response) => {
    try {
      const { Body, From, customerName } = req.body;
      const message = Body || '';
      const phone = From || 'web-client';

      if (!message.trim()) {
        return res.status(400).send('Message is required');
      }

      // Handle STOP command
      if (message.trim().toLowerCase() === 'stop') {
        // Return unsubscribe confirmation
        const response = 'You have been unsubscribed from SMS notifications. Reply START to re-subscribe.';
        res.set('Content-Type', 'text/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${response}</Message></Response>`);
      }

      // Determine if this is a web client or SMS
      // Web clients send isWebClient in the body, SMS comes from Twilio webhook
      const platform = req.headers['x-client-type'] === 'web' ? 'web' : 'sms';
      const isWebClient = req.body.isWebClient === true ||
                          req.body.isWebClient === 'true' ||
                          platform === 'web';

      console.log(`[PLATFORM DETECTION] isWebClient: ${isWebClient}, req.body.isWebClient: ${req.body.isWebClient}, platform: ${platform}`);


      // Get or create conversation
      const { getOrCreateConversation, addMessage } = await import('./conversationService');
      let conversation = await getOrCreateConversation(phone, customerName || null, platform);

      console.log(`[SMS/CHAT] Received message. isWebClient: ${isWebClient}, platform: ${platform}, controlMode: ${conversation.controlMode}, conversationId: ${conversation.id}`);

      // For web chat, ALWAYS reset to auto mode regardless of current state
      // Web chat should always get AI responses - manual control is only for SMS
      if (isWebClient && conversation.controlMode !== 'auto') {
        console.log(`[WEB CHAT] Auto-resetting conversation ${conversation.id} to auto mode (was ${conversation.controlMode})`);
        const { handoffConversation } = await import('./conversationService');
        // Update the conversation in the database and get the refreshed object
        conversation = await handoffConversation(conversation.id);
        console.log(`[WEB CHAT] After handoff, controlMode is now: ${conversation.controlMode}`);
      }

      await addMessage(conversation.id, message, 'customer', platform);

      // Check for handoff needs (only for auto mode conversations)
      if (conversation.controlMode === 'auto') {
        const { detectHandoffNeed, triggerHandoff } = await import('./handoffDetectionService');
        const { notifyHandoffRequest } = await import('./smsNotificationService');
        const { getConversationById } = await import('./conversationService');

        // Get message history for better detection
        const fullConversation = await getConversationById(conversation.id);
        const messageHistory = fullConversation?.messages || [];

        const handoffDetection = await detectHandoffNeed(message, conversation.id, messageHistory);

        if (handoffDetection.shouldHandoff && platform === 'sms') {
          console.log(`[HANDOFF DETECTION] Triggering handoff for conversation ${conversation.id}. Reason: ${handoffDetection.reason}`);

          // Trigger the handoff
          await triggerHandoff(conversation.id, handoffDetection.reason);

          // Send notification to business owner
          await notifyHandoffRequest(
            conversation.id,
            conversation.customerName,
            conversation.customerPhone || phone,
            handoffDetection.reason,
            message
          );

          // Update local conversation object
          conversation.controlMode = 'manual';
          conversation.needsHumanAttention = true;
        }
      }

      // SMS-ONLY: Check if conversation is in manual or paused mode
      // Web chat should NEVER hit this block
      console.log(`[MODE CHECK] About to check mode. isWebClient: ${isWebClient}, controlMode: ${conversation.controlMode}`);

      if (!isWebClient && (conversation.controlMode === 'manual' || conversation.controlMode === 'paused')) {
        console.log(`[SMS] Conversation in ${conversation.controlMode} mode - sending holding message`);
        // Don't generate AI response for SMS in manual/paused mode
        const holdingMessage = conversation.controlMode === 'manual'
          ? 'Thank you for your message. One of our team members will respond shortly.'
          : 'We\'re currently reviewing your message. Please wait for a response.';

        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${holdingMessage}</Message></Response>`);
        return;
      }

      // Import the unified AI system (with scheduling tools integrated)
      const { generateAIResponse } = await import('./openai');

      // Get behavior settings from conversation
      const behaviorSettings = conversation.behaviorSettings as any || {};

      console.log(`[AI RESPONSE] Generating AI response for conversation ${conversation.id}, platform: ${platform}`);

      // Use unified AI system - handles both general chat AND intelligent scheduling
      const response = await generateAIResponse(
        message,
        phone,
        platform,
        behaviorSettings
      );

      // Save AI response
      await addMessage(conversation.id, response, 'ai', platform);

      // Return appropriate format
      if (isWebClient) {
        // For web chat, return JSON
        res.json({ success: true, message: response });
      } else {
        // For actual SMS, return TwiML
        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${response}</Message></Response>`);
      }

    } catch (error) {
      console.error('SMS endpoint error:', error);
      res.status(500).send('Sorry, I encountered an error processing your message. Please try again.');
    }
  });

  // Chat API endpoint - unified AI system for /chat page and popup chat
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, channel, customerPhone, customerName } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      const phone = customerPhone || 'web-anonymous-' + Date.now();
      const platform = channel || 'web';

      console.log(`[API/CHAT] Received message from ${phone}, platform: ${platform}`);

      // Get or create conversation
      const { getOrCreateConversation, addMessage } = await import('./conversationService');
      let conversation = await getOrCreateConversation(phone, customerName || null, platform);

      console.log(`[API/CHAT] Conversation ${conversation.id}, controlMode: ${conversation.controlMode}`);

      // Web chat always uses auto mode
      if (conversation.controlMode !== 'auto') {
        console.log(`[API/CHAT] Resetting conversation ${conversation.id} to auto mode`);
        const { handoffConversation } = await import('./conversationService');
        conversation = await handoffConversation(conversation.id);
      }

      // Save customer message
      await addMessage(conversation.id, message, 'customer', platform);

      // Get behavior settings from conversation
      const behaviorSettings = conversation.behaviorSettings as any || {};

      console.log(`[API/CHAT] Generating AI response for conversation ${conversation.id}`);

      // Use unified AI system with scheduling tools
      const { generateAIResponse } = await import('./openai');
      const aiResponse = await generateAIResponse(
        message,
        phone,
        platform,
        behaviorSettings
      );

      // Save AI response
      await addMessage(conversation.id, aiResponse, 'ai', platform);

      // Return JSON format expected by frontend
      res.json({
        success: true,
        response: aiResponse
      });

    } catch (error) {
      console.error('[API/CHAT] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: 'Sorry, I encountered an error. Please try again.'
      });
    }
  });

  // Calendar API routes
  app.get('/api/get-available', handleGetAvailable);
  app.get('/api/available-slots', handleGetAvailable);
  app.post('/api/book', handleBook);
  app.post('/api/book-appointment', handleBook);

  // Dashboard API routes
  app.get('/api/dashboard/upcoming', getUpcomingAppointments);
  app.get('/api/dashboard/today', getTodaysAppointments);
  app.get('/api/dashboard/appointment-counts', getMonthlyAppointmentCounts);
  app.get('/api/dashboard/messages', getRecentMessages);
  app.put('/api/services/update', updateService);

  // Google reviews
  app.get('/api/google-reviews', async (req, res) => {
    try {
      const placeId = req.query.placeId as string | undefined;
      const reviews = await getGoogleReviews(placeId);
      res.json({ success: true, reviews });
    } catch (error) {
      console.error('Error fetching Google reviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch Google reviews',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/google-places/search', async (req, res) => {
    try {
      const { query, location } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter is required'
        });
      }

      const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

      if (!GOOGLE_API_KEY) {
        return res.status(500).json({
          success: false,
          message: 'Google API key not configured'
        });
      }

      const searchQuery = location ? `${query} in ${location}` : query;
      const url = 'https://places.googleapis.com/v1/places:searchText';

      const response = await axios.post(url, {
        textQuery: searchQuery
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount'
        }
      });

      const places = (response.data.places || []).map((place: any) => ({
        placeId: place.id,
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        rating: place.rating || 0,
        totalReviews: place.userRatingCount || 0
      }));

      res.json({
        success: true,
        places,
        message: places.length > 0 ? `Found ${places.length} place(s)` : 'No places found'
      });
    } catch (error: any) {
      console.error('Error searching for place:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to search for place',
        error: error.message
      });
    }
  });

  app.get('/api/google-business-photos', async (req, res) => {
    try {
      const placeId = req.query.placeId as string | undefined;
      const photos = await getGoogleBusinessPhotos(placeId);
      res.json({ success: true, photos });
    } catch (error) {
      console.error('Error fetching Google Business photos:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch Google Business photos',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/weather', async (req, res) => {
    try {
      const { lat, lon } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const weatherData = await getWeatherForecast(
        parseFloat(lat as string),
        parseFloat(lon as string)
      );

      res.json({ success: true, data: weatherData });
    } catch (error) {
      console.error('Error fetching weather data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weather data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/weather-forecast', async (req, res) => {
    try {
      const { latitude, longitude, days } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const forecastDays = days ? parseInt(days as string) : 3;
      const weatherData = await getWeatherForecast(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        forecastDays
      );

      res.json({ success: true, forecast: weatherData });
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weather forecast',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/appointment-weather', async (req, res) => {
    try {
      const { latitude, longitude, date } = req.query;

      if (!latitude || !longitude || !date) {
        return res.status(400).json({
          success: false,
          message: 'Latitude, longitude, and date are required'
        });
      }

      const { checkAppointmentWeather } = await import('./weatherService');
      const weatherCheck = await checkAppointmentWeather(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        date as string
      );

      res.json({ success: true, ...weatherCheck });
    } catch (error) {
      console.error('Error checking appointment weather:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check appointment weather',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/geocode', async (req: Request, res: Response) => {
    try {
      const { address } = req.query;

      if (!address) {
        return res.status(400).json({
          success: false,
          message: 'Address is required'
        });
      }

      const result = await geocodeAddress(address as string);
      res.json(result);
    } catch (error) {
      console.error('Error geocoding address:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/api/distance-check', async (req: Request, res: Response) => {
    try {
      const { address } = req.query;

      if (!address) {
        return res.status(400).json({
          success: false,
          message: 'Address is required'
        });
      }

      const result = await checkDistanceToBusinessLocation(address as string);
      res.json(result);
    } catch (error) {
      console.error('Error checking distance:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post('/api/calculate-travel-time', async (req: Request, res: Response) => {
    try {
      const { origin, destination, customerPhone } = req.body;

      if (!origin || !destination || !customerPhone) {
        return res.status(400).json({
          success: false,
          message: 'Origin, destination, and customer phone are required'
        });
      }

      const { calculateAndNotifyOnTheWay } = await import('./navigationService');
      const result = await calculateAndNotifyOnTheWay(origin, destination, customerPhone);

      if (result.success) {
        res.json({
          success: true,
          durationMinutes: result.durationMinutes,
          notificationSent: result.notificationSent
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to calculate travel time and notify customer'
        });
      }
    } catch (error) {
      console.error('Error in calculate-travel-time route:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  app.get('/api/chat/history', async (req: Request, res: Response) => {
    try {
      const { phone } = req.query;

      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      res.json({
        success: true,
        messages: []
      });
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chat history'
      });
    }
  });

  app.post('/api/chat/send-business-message', async (req: Request, res: Response) => {
    try {
      const { customerPhone, message, messageId } = req.body;

      if (!customerPhone || !message) {
        return res.status(400).json({
          success: false,
          message: 'Customer phone and message are required'
        });
      }

      const { sendSMS } = await import('./notifications');
      const smsResult = await sendSMS(customerPhone, message);

      if (smsResult.success) {
        res.json({
          success: true,
          messageId,
          message: 'Message sent successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: smsResult.error || 'Failed to send SMS'
        });
      }
    } catch (error) {
      console.error('Error sending business message:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      });
    }
  });

  app.post('/api/invoice/award-loyalty-points', async (req: Request, res: Response) => {
    try {
      const { customerId, customerPhone, invoiceId, amount } = req.body;

      if (!invoiceId || !amount || (!customerId && !customerPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for awarding loyalty points'
        });
      }

      const pointsToAdd = Math.floor(Number(amount));
      let dbResult = null;

      if (customerId) {
        dbResult = await addLoyaltyPointsFromInvoice(
          Number(customerId),
          Number(invoiceId),
          Number(amount)
        );
      }

      let sheetsResult = false;
      if (customerPhone) {
        sheetsResult = await updateLoyaltyPointsInSheets(
          customerPhone,
          pointsToAdd,
          invoiceId.toString(),
          Number(amount)
        );
      }

      res.json({
        success: true,
        message: `Successfully awarded ${pointsToAdd} loyalty points`,
        dbResult,
        sheetsUpdated: sheetsResult
      });
    } catch (error) {
      console.error('Error awarding loyalty points:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to award loyalty points',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post('/api/reload-sheets', async (req: Request, res: Response) => {
    try {
      const { forceReloadSheets } = await import('./knowledge');
      const success = await forceReloadSheets();

      if (success) {
        res.json({
          success: true,
          message: 'Google Sheets data reloaded successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to reload Google Sheets data'
        });
      }
    } catch (error) {
      console.error('Error reloading sheets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reload sheets data'
      });
    }
  });

  app.get('/api/google-photos', async (req: Request, res: Response) => {
    try {
      const { getGooglePlacePhotos } = await import('./googleIntegration');
      const photos = await getGooglePlacePhotos();

      res.json({
        success: true,
        photos
      });
    } catch (error) {
      console.error('Error fetching Google Photos:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch photos from Google Places'
      });
    }
  });

  // New endpoint to test sending a business email
  app.post('/api/test-email', async (req: Request, res: Response) => {
    try {
      const recipient = 'info@cleanmachinetulsa.com';
      const subject = 'Test Email from Clean Machine Auto Detail';
      const body = 'This is a test email to verify that email sending is working correctly.';

      await sendBusinessEmail(recipient, subject, body);

      res.json({
        success: true,
        message: `Test email sent successfully to ${recipient}.`
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test email.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  registerLoyaltyRoutes(app);
  registerUpsellRoutes(app);
  registerEnhancedCustomerRoutes(app);

  app.post('/api/customers/update', async (req, res) => {
    const { updateCustomer } = await import('./updateCustomer');
    return updateCustomer(req, res);
  });

  app.get('/api/customer-info', async (req: Request, res: Response) => {
    try {
      const { phone } = req.query;

      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
      }

      console.log(`Looking up customer info for phone: ${phone}`);

      const { getEnhancedCustomerServiceHistory } = await import('./enhancedCustomerSearch');
      const customerData = await getEnhancedCustomerServiceHistory(phone);

      if (!customerData.found) {
        return res.json({
          success: false,
          error: 'No customer found with this phone number'
        });
      }

      const customerInfo = {
        name: customerData.name || 'Unknown Customer',
        phone: customerData.phone,
        address: customerData.address || '',
        email: customerData.email || '',
        vehicleInfo: customerData.vehicleInfo || '',
        serviceHistory: customerData.serviceHistory || [],
        lastInteraction: customerData.lastInvoiceDate || 'Unknown'
      };

      res.json({
        success: true,
        customerInfo
      });
    } catch (error) {
      console.error('Error fetching customer info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve customer information'
      });
    }
  });

  registerFileUploadRoutes(app);
  registerEmailRoutes(app);
  registerCancellationRoutes(app);
  registerConversationRoutes(app);
  registerServiceManagementRoutes(app);

  // Register quick reply templates routes
  app.use('/api/quick-replies', quickReplyRoutes);

  // Register appointment management routes
  app.use('/api', appointmentRoutes);

  // Register SMS fallback routes
  app.use(smsFallbackRoutes);

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  initializeWebSocket(io);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    socket.on('customer_message', (data) => {
      console.log('Received customer message:', data);
      io.emit('new_customer_message', {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    socket.on('staff_response', (data) => {
      console.log('Staff responded:', data);
      io.emit('new_staff_response', {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...data
      });
    });
  });

  return server;
}