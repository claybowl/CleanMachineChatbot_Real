import { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerLoyaltyRoutes } from './routes.loyalty';
import { registerUpsellRoutes } from './routes.upsell';
import { registerEnhancedCustomerRoutes } from './enhancedCustomerRoutes';
import { registerFileUploadRoutes } from './fileUpload';
import { registerEmailRoutes } from './routes.email';
import { registerCancellationRoutes } from './routes.cancellation';
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
  getRecentMessages,
  updateService
} from './dashboardApi';
import {
  getGoogleReviews
} from './googleIntegration';
import {
  getWeatherForecast
} from './weatherService';
import {
  geocodeAddress,
  checkDistanceToBusinessLocation
} from './googleMapsApi';

// Main function to register all routes
export async function registerRoutes(app: Express) {
  const server = createServer(app);
  
  // Set up routes
  app.get('/api/services', async (req, res) => {
    // Hardcoded services that will always work
    const services = [
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
      },
      {
        name: "Maintenance Detail",
        priceRange: "$129",
        description: "Perfect for maintaining your vehicle between full details. Includes quick interior cleaning and exterior wash with protection refresh.",
        duration: "1.5 hours",
        durationHours: 1.5
      },
      {
        name: "Paint Correction",
        priceRange: "$499",
        description: "Professional multi-stage paint correction to remove swirls, scratches, and defects from your vehicle's paint. Includes final protection layer.",
        duration: "6-8 hours",
        durationHours: 7
      },
      {
        name: "Headlight Restoration",
        priceRange: "$89",
        description: "Complete restoration of foggy or yellowed headlights to like-new clarity. Includes UV protection to prevent future oxidation.",
        duration: "1 hour",
        durationHours: 1
      }
    ];
    
    // First try to get services from your Google Sheet
    try {
      const googleSheetServices = await getAllServices();
      
      // Only use Google Sheet data if it's valid and has entries
      if (googleSheetServices && Array.isArray(googleSheetServices) && googleSheetServices.length > 0) {
        console.log(`Successfully loaded ${googleSheetServices.length} services from Google Sheet`);
        return res.json({ success: true, services: googleSheetServices });
      }
    } catch (error) {
      console.error('Failed to load services from Google Sheet, using defaults:', error);
    }
    
    // Fallback to hardcoded services
    console.log('Using hardcoded service data');
    res.json({ success: true, services });
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
      const { Body, From } = req.body;
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

      // Import the AI response system
      const { generateAIResponse } = await import('./openai');
      
      // Detect if this is from web chat or actual SMS
      const isWebClient = req.headers['x-client-type'] === 'web';
      const platform = isWebClient ? 'web' : 'sms';
      
      // Generate AI response using your existing system
      const response = await generateAIResponse(message, phone, platform);
      
      // Return appropriate format
      if (isWebClient) {
        // For web chat, return plain text
        res.set('Content-Type', 'text/plain');
        res.send(response);
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

  // Calendar API routes
  app.get('/api/get-available', handleGetAvailable);
  app.get('/api/available-slots', handleGetAvailable); // Add alias for frontend compatibility
  app.post('/api/book', handleBook);
  app.post('/api/book-appointment', handleBook); // Add the correct route name that frontend uses
  
  // Dashboard API routes
  app.get('/api/dashboard/upcoming', getUpcomingAppointments);
  app.get('/api/dashboard/today', getTodaysAppointments);
  app.get('/api/dashboard/appointment-counts', getMonthlyAppointmentCounts);
  app.get('/api/dashboard/messages', getRecentMessages);
  app.put('/api/services/update', updateService);
  
  // Google reviews
  app.get('/api/google-reviews', async (req, res) => {
    try {
      const reviews = await getGoogleReviews();
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
  
  // Weather API
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
  
  // Invoice loyalty points API
  // Google Maps API - Geocode an address
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
  
  // Google Maps API - Check distance to business location
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

  // Navigation and travel time calculation
  app.post('/api/calculate-travel-time', async (req: Request, res: Response) => {
    try {
      const { origin, destination, customerPhone } = req.body;
      
      if (!origin || !destination || !customerPhone) {
        return res.status(400).json({
          success: false,
          message: 'Origin, destination, and customer phone are required'
        });
      }
      
      // Import the navigation service
      const { calculateAndNotifyOnTheWay } = await import('./navigationService');
      
      // Calculate travel time and notify customer
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

  // Business chat endpoints for direct customer communication
  app.get('/api/chat/history', async (req: Request, res: Response) => {
    try {
      const { phone } = req.query;
      
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }
      
      // For now, return empty history - this can be enhanced to store/retrieve from database
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
      
      // Import the SMS sending function
      const { sendSMS } = await import('./notifications');
      
      // Send SMS to customer
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
      
      // Calculate points to add (1:1 ratio with dollars spent)
      const pointsToAdd = Math.floor(Number(amount));
      let dbResult = null;
      
      // If we have a database customerId, update points in PostgreSQL
      if (customerId) {
        dbResult = await addLoyaltyPointsFromInvoice(
          Number(customerId), 
          Number(invoiceId), 
          Number(amount)
        );
      }
      
      // If we have a phone number, also update Google Sheets 
      // (this ensures both systems stay in sync)
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
  
  // Google Photos endpoint for gallery
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

  // Register feature-specific route files
  registerLoyaltyRoutes(app);
  registerUpsellRoutes(app);
  registerEnhancedCustomerRoutes(app);
  
  // Customer update endpoint
  app.post('/api/customers/update', async (req, res) => {
    const { updateCustomer } = await import('./updateCustomer');
    return updateCustomer(req, res);
  });
  
  // Customer info endpoint for service history page
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
      
      // Use the enhanced customer search to get customer data
      const { getEnhancedCustomerServiceHistory } = await import('./enhancedCustomerSearch');
      const customerData = await getEnhancedCustomerServiceHistory(phone);
      
      if (!customerData.found) {
        return res.json({
          success: false,
          error: 'No customer found with this phone number'
        });
      }

      // Format the response to match what the frontend expects
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
  
  // Create a WebSocket server instance
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Set up WebSocket event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
    
    // Example: Customer messaging event
    socket.on('customer_message', (data) => {
      console.log('Received customer message:', data);
      // Here we would process the message, potentially storing it and
      // triggering notifications to staff
      
      // Broadcast to staff app
      io.emit('new_customer_message', {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...data
      });
    });
    
    // Example: Staff response event
    socket.on('staff_response', (data) => {
      console.log('Staff responded:', data);
      
      // Send the response to the customer app
      io.emit('new_staff_response', {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...data
      });
    });
  });
  
  return server;
}